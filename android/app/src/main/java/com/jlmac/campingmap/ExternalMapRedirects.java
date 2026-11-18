package com.jlmac.campingmap;

import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.Proxy;
import java.net.URI;
import java.util.Locale;
import java.util.regex.Pattern;

/** Only short-link routing headers are read. No destination page or API is fetched. */
final class ExternalMapRedirects {
    private static final Pattern BAIDU = Pattern.compile("/[A-Za-z0-9_-]{1,64}(/[A-Za-z0-9_-]{1,64})?");
    private static final Pattern GOOGLE = Pattern.compile("/[A-Za-z0-9]{1,64}");
    private static final Pattern GOOGLE_OLD = Pattern.compile("/maps/[A-Za-z0-9]{1,64}");
    private static final int MAX_REQUESTS = 2;
    private static final int TIMEOUT_MS = 3000;

    interface LocationReader {
        String read(URI current) throws IOException;
    }

    private ExternalMapRedirects() {}

    private static URI parse(String value) {
        if (value == null || value.length() > 8192) return null;
        try {
            URI uri = new URI(value);
            if (uri.getHost() == null || uri.getRawUserInfo() != null || uri.getPort() != -1 ||
                uri.getRawFragment() != null || !uri.getRawAuthority().equalsIgnoreCase(uri.getHost())) return null;
            return uri;
        } catch (java.net.URISyntaxException e) {
            return null;
        }
    }

    // The native caller sees only normalized HTTPS URLs, with tracking parameters removed.
    private static String shortProvider(URI uri) {
        if (uri == null || !"https".equals(uri.getScheme()) || uri.getRawQuery() != null) return null;
        String host = uri.getHost().toLowerCase(Locale.ROOT);
        String path = uri.getRawPath();
        if ("j.map.baidu.com".equals(host) && BAIDU.matcher(path).matches()) return "baidu";
        if ("maps.app.goo.gl".equals(host) && GOOGLE.matcher(path).matches() ||
            "goo.gl".equals(host) && GOOGLE_OLD.matcher(path).matches()) return "google";
        return null;
    }

    private static boolean terminal(URI uri, String provider) {
        if (uri == null) return false;
        String host = uri.getHost().toLowerCase(Locale.ROOT);
        String path = uri.getRawPath();
        if ("baidu".equals(provider)) {
            // A legacy cleartext URL is safe to inspect as data only; never request it.
            if (!"https".equalsIgnoreCase(uri.getScheme()) && !"http".equalsIgnoreCase(uri.getScheme())) return false;
            return "api.map.baidu.com".equals(host) && "/marker".equals(path) ||
                   "map.baidu.com".equals(host) && (path.isEmpty() || "/".equals(path) || "/mobile/".equals(path)) ||
                   "https".equalsIgnoreCase(uri.getScheme()) && "map.baidu.com".equals(host) && path.startsWith("/poi/");
        }
        return "https".equalsIgnoreCase(uri.getScheme()) &&
               ("www.google.com".equals(host) || "google.com".equals(host) || "maps.google.com".equals(host)) &&
               path.startsWith("/maps/");
    }

    static String resolve(String input, LocationReader reader) throws IOException {
        URI first = parse(input);
        String provider = shortProvider(first);
        if (provider == null) throw new IllegalArgumentException("invalid_external_map_link");
        URI current = first;
        for (int i = 0; i < MAX_REQUESTS; i++) {
            String location = reader.read(current);
            // Only absolute, provider-owned HTTPS short hops. Do not follow arbitrary destination URLs.
            URI next = parse(location);
            if (terminal(next, provider)) return next.toASCIIString();
            if (next != null && next.getRawQuery() != null) {
                next = parse(next.toASCIIString().split("\\?", 2)[0]);
            }
            if (!provider.equals(shortProvider(next)) || next.equals(current) || next.equals(first)) break;
            current = next;
        }
        throw new IOException("external_map_location_unavailable");
    }

    static String readLocation(URI uri) throws IOException {
        HttpURLConnection request = (HttpURLConnection) uri.toURL().openConnection(Proxy.NO_PROXY);
        try {
            request.setRequestMethod("GET");
            request.setInstanceFollowRedirects(false);
            request.setConnectTimeout(TIMEOUT_MS);
            request.setReadTimeout(TIMEOUT_MS);
            request.setUseCaches(false);
            int status = request.getResponseCode();
            if (status != 301 && status != 302 && status != 303 && status != 307 && status != 308) return null;
            return request.getHeaderField("Location");
        } finally {
            request.disconnect();
        }
    }
}
