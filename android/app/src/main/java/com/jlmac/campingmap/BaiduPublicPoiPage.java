package com.jlmac.campingmap;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.CookieHandler;
import java.net.HttpURLConnection;
import java.net.Proxy;
import java.net.URI;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.json.JSONException;
import org.json.JSONObject;
import org.json.JSONTokener;

/** Reads only the embedded POI record in Baidu's ordinary public mobile web page, without executing it. */
final class BaiduPublicPoiPage {
    private static final String USER_AGENT = "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36";
    private static final int MAX_PAGE_BYTES = 512 * 1024;
    private static final int MAX_JSON_CHARS = 64 * 1024;
    private static final int MAX_JSON_DEPTH = 32;
    private static final Pattern UID = Pattern.compile("[A-Za-z0-9_-]{1,128}");
    private static final Pattern SCRIPT = Pattern.compile("<script(?:\\s[^>]*?)?>", Pattern.CASE_INSENSITIVE);
    private static final Pattern SCRIPT_SRC = Pattern.compile("\\s+src\\s*=", Pattern.CASE_INSENSITIVE);
    private static final Pattern END_SCRIPT = Pattern.compile("</script\\s*>", Pattern.CASE_INSENSITIVE);
    private static final Pattern ASSIGN = Pattern.compile("(?m)^[ \\t]*var dataAll[ \\t]*=[ \\t]*");
    private static final Pattern DETAIL_WIDGET = Pattern.compile(
        "require\\([\"']place:widget/detailpoicard/detailpoicard\\.js[\"']\\)\\.init\\(");
    private static final Pattern DECIMAL = Pattern.compile("-?(?:0|[1-9][0-9]{0,8})(?:\\.[0-9]{1,12})?");
    private static final Pattern BLOCK_PAGE_TITLE = Pattern.compile(
        "<title>\\s*(?:百度安全验证|安全验证|访问验证|百度账号登录|登录百度帐号)\\s*</title>",
        Pattern.CASE_INSENSITIVE);

    private BaiduPublicPoiPage() {}

    static final class Point {
        final String uid;
        final String name;
        final double x;
        final double y;

        private Point(String uid, String name, String x, String y) {
            this.uid = uid;
            this.name = name;
            this.x = Double.parseDouble(x);
            this.y = Double.parseDouble(y);
        }
    }

    /** Only verified first-party mobile POI routes from short-link responses are admitted. */
    static URI pageUri(String mobileLocation, String expectedUid) {
        if (!validUid(expectedUid) ||
            !expectedUid.equals(BaiduPoiCandidatePolicy.mobileReferenceUid(mobileLocation))) return null;
        return URI.create(mobileLocation);
    }

    static Point fetchCandidate(String mobileLocation, String expectedUid) {
        URI page = pageUri(mobileLocation, expectedUid);
        // The resolver runs in its own process. Fail closed if a browser/Capacitor
        // cookie handler ever gets registered there; never transmit or persist cookies.
        if (page == null || CookieHandler.getDefault() != null) return null;
        HttpURLConnection conn = null;
        try {
            long started = System.nanoTime();
            conn = (HttpURLConnection) page.toURL().openConnection(Proxy.NO_PROXY);
            conn.setRequestMethod("GET");
            conn.setInstanceFollowRedirects(false);
            conn.setConnectTimeout(3500);
            conn.setReadTimeout(4500);
            conn.setUseCaches(false);
            conn.setRequestProperty("User-Agent", USER_AGENT);
            conn.setRequestProperty("Accept", "text/html");
            conn.setRequestProperty("Accept-Encoding", "identity");
            conn.setRequestProperty("Cookie", "");
            if (conn.getResponseCode() != 200 || !acceptsHtml(conn.getHeaderField("Content-Type"))) return null;
            String encoding = conn.getHeaderField("Content-Encoding");
            if (encoding != null && !"identity".equalsIgnoreCase(encoding.trim())) return null;
            long length = conn.getContentLengthLong();
            if (length > MAX_PAGE_BYTES || length == 0) return null;
            try (InputStream in = conn.getInputStream()) {
                byte[] bytes = readBounded(in, started);
                if (bytes == null || (length >= 0 && length != bytes.length)) return null;
                return parsePage(decodeUtf8(bytes), expectedUid);
            }
        } catch (IOException | RuntimeException unavailable) {
            return null;
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    static boolean acceptsHtml(String contentType) {
        if (contentType == null) return false;
        String[] parts = contentType.toLowerCase(Locale.ROOT).split(";");
        if (!"text/html".equals(parts[0].trim())) return false;
        for (int i = 1; i < parts.length; i++) {
            String param = parts[i].trim();
            if (param.startsWith("charset") && !param.matches("charset\\s*=\\s*(?:utf-8|\"utf-8\")")) return false;
        }
        return true;
    }

    private static byte[] readBounded(InputStream in, long started) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buffer = new byte[4096];
        int count;
        while ((count = in.read(buffer)) != -1) {
            if (out.size() + count > MAX_PAGE_BYTES ||
                TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - started) > 8500) return null;
            out.write(buffer, 0, count);
        }
        return out.toByteArray();
    }

    private static String decodeUtf8(byte[] bytes) throws CharacterCodingException {
        return StandardCharsets.UTF_8.newDecoder().decode(ByteBuffer.wrap(bytes)).toString();
    }

    static Point parsePage(String html, String expectedUid) {
        if (!validUid(expectedUid) || html == null || html.length() > MAX_PAGE_BYTES ||
            BLOCK_PAGE_TITLE.matcher(html).find()) return null;
        Point result = null;
        Matcher starts = SCRIPT.matcher(html);
        Matcher ends = END_SCRIPT.matcher(html);
        int next = 0;
        while (starts.find(next) && ends.find(starts.end())) {
            int close = ends.start();
            next = ends.end();
            // Only inline scripts may contain the page's structured record; no external fetches.
            if (SCRIPT_SRC.matcher(starts.group()).find()) continue;
            Matcher assignments = ASSIGN.matcher(html).region(starts.end(), close);
            if (!assignments.find()) continue;
            int start = assignments.end();
            int end = objectEnd(html, start, close);
            if (end < 0 || assignments.find()) return null;
            int semi = end;
            while (semi < close && Character.isWhitespace(html.charAt(semi))) semi++;
            // Tie the record to the page's designated POI detail widget, never arbitrary inline data.
            if (semi >= close || html.charAt(semi) != ';' ||
                !DETAIL_WIDGET.matcher(html).region(semi + 1, close).find()) continue;
            Point candidate = parseRecord(html.substring(start, end), expectedUid);
            if (candidate == null || result != null) return null;
            result = candidate;
        }
        return result;
    }

    private static Point parseRecord(String json, String expectedUid) {
        try {
            JSONTokener input = new JSONTokener(json);
            JSONObject data = new JSONObject(input);
            if (input.more() || !expectedUid.equals(data.opt("uid"))) return null;
            JSONObject content = data.optJSONObject("content");
            if (content == null || !expectedUid.equals(content.opt("uid"))) return null;
            Object nameValue = content.opt("name");
            if (!(nameValue instanceof String)) return null;
            String name = ((String) nameValue).trim();
            if (name.isEmpty() || name.length() > 160 ||
                name.codePoints().anyMatch(c -> Character.isISOControl(c) || c == 0xfffd ||
                    (c >= 0xd800 && c <= 0xdfff))) return null;
            JSONObject ext = content.optJSONObject("ext");
            JSONObject info = ext == null ? null : ext.optJSONObject("detail_info");
            JSONObject point = info == null ? null : info.optJSONObject("point");
            if (point == null) return null;
            String x = decimal(point.opt("x"));
            String y = decimal(point.opt("y"));
            if (x == null || y == null) return null;
            Point result = new Point(expectedUid, name, x, y);
            if (result.x == 0 && result.y == 0 || Math.abs(result.x) > 20037727 ||
                Math.abs(result.y) > 12900000) return null;
            return result;
        } catch (JSONException | IllegalArgumentException invalid) {
            return null;
        }
    }

    private static String decimal(Object value) {
        if (!(value instanceof String) && !(value instanceof Number)) return null;
        String text = value.toString();
        return DECIMAL.matcher(text).matches() ? text : null;
    }

    private static boolean validUid(String uid) {
        return uid != null && UID.matcher(uid).matches();
    }

    private static int objectEnd(String text, int start, int limit) {
        if (start >= limit || text.charAt(start) != '{') return -1;
        boolean quoted = false;
        boolean escape = false;
        int depth = 0;
        int cap = Math.min(start + MAX_JSON_CHARS, limit);
        for (int i = start; i < cap; i++) {
            char c = text.charAt(i);
            if (quoted) {
                if (escape) escape = false;
                else if (c == '\\') escape = true;
                else if (c == '"') quoted = false;
            } else if (c == '"') quoted = true;
            else if (c == '{' || c == '[') {
                if (++depth > MAX_JSON_DEPTH) return -1;
            } else if (c == '}' || c == ']') {
                if (--depth == 0) return c == '}' ? i + 1 : -1;
            }
        }
        return -1;
    }

}
