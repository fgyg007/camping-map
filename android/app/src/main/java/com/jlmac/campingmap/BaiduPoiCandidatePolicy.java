package com.jlmac.campingmap;

import java.net.URI;
import java.net.URISyntaxException;
import java.net.URLDecoder;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Validates browser URLs, never reads provider HTML or calls a POI API. */
final class BaiduPoiCandidatePolicy {
    private static final String MAP = "map.baidu.com";
    private static final Pattern UID = Pattern.compile("[A-Za-z0-9_-]{1,128}");
    private static final Pattern REF = Pattern.compile("inf&uid=([A-Za-z0-9_-]{1,128})");
    private static final String NUMBER = "[+-]?(?:[0-9]{1,12}(?:\\.[0-9]{1,15})?|\\.[0-9]{1,15})";
    private static final Pattern POI = Pattern.compile(
        "/poi/([^/]+?)/@(" + NUMBER + "),(" + NUMBER + "),(?:[1-9]|1[0-9]|2[01])z/?"
    );
    private static final Pattern INTERACTIVE_PATH = Pattern.compile(
        "(?:^|/)(?:login|signin|sign-in|passport|oauth2?|sso|download)(?=/|$)",
        Pattern.CASE_INSENSITIVE
    );
    // Public map/API origins and exact first-party static script hosts observed
    // on the public desktop map. Downloads, analytics and unrelated media/CDN
    // are not included. These hosts are never allowed as top-level destinations.
    private static final Set<String> RESOURCES = new HashSet<>(
        Arrays.asList(MAP, "api.map.baidu.com", "maponline0.bdimg.com",
            "fex.bdstatic.com", "ss0.bdstatic.com", "webmap0.bdimg.com",
            "map-mobile-static.cdn.bcebos.com", "map-mobile-resource.cdn.bcebos.com")
    );

    private BaiduPoiCandidatePolicy() {}

    private static URI https(String value) {
        if (value == null || value.length() > 8192) return null;
        try {
            URI uri = new URI(value);
            if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null ||
                uri.getRawUserInfo() != null || uri.getPort() != -1 || uri.getRawFragment() != null ||
                !uri.getRawAuthority().equalsIgnoreCase(uri.getHost())) return null;
            return uri;
        } catch (URISyntaxException ignored) {
            return null;
        }
    }

    private static URI mapUri(String value) {
        URI uri = https(value);
        return uri != null && MAP.equalsIgnoreCase(uri.getHost()) ? uri : null;
    }

    private static String uniqueParam(URI uri, String key) {
        String query = uri.getRawQuery();
        String result = null;
        if (query == null) return null;
        for (String field : query.split("&", -1)) {
            int eq = field.indexOf('=');
            try {
                String k = URLDecoder.decode(eq < 0 ? field : field.substring(0, eq), "UTF-8");
                if (!key.equals(k)) continue;
                if (result != null || eq < 0) return null;
                result = URLDecoder.decode(field.substring(eq + 1), "UTF-8");
            } catch (Exception ignored) {
                return null;
            }
        }
        return result;
    }

    static String referenceUid(String value) {
        URI uri = mapUri(value);
        if (uri == null || !("/".equals(uri.getRawPath()) || "/mobile/".equals(uri.getRawPath()))) return null;
        String nested = uniqueParam(uri, "s");
        if (nested == null) return null;
        Matcher match = REF.matcher(nested);
        return match.matches() ? match.group(1) : null;
    }

    static String publicPage(String uid) {
        if (uid == null || !UID.matcher(uid).matches()) return null;
        return "https://" + MAP + "/?newmap=1&s=inf%26uid%3D" + uid + "&sharecallbackflag=poiDetailPage";
    }

    static String candidate(String value, String expectedUid) {
        URI uri = mapUri(value);
        if (uri == null || expectedUid == null || !UID.matcher(expectedUid).matches() ||
            !expectedUid.equals(uniqueParam(uri, "uid"))) return null;
        Matcher path = POI.matcher(uri.getRawPath());
        if (!path.matches()) return null;
        double x = Double.parseDouble(path.group(2)), y = Double.parseDouble(path.group(3));
        if (Math.abs(x) > 20037727 || Math.abs(y) > 12900000) return null;
        // The browser supplies a view center only, not a parking entrance.
        // Return just the vetted path + needed params, not tracking or nested URLs.
        return URI.create("https://" + MAP + uri.getRawPath() + "?uid=" + expectedUid +
            "&querytype=detailConInfo").toASCIIString();
    }

    static boolean allowsNavigation(String value, String expectedUid) {
        return expectedUid != null &&
            (expectedUid.equals(referenceUid(value)) || candidate(value, expectedUid) != null);
    }

    static boolean allowsResource(String value, String method) {
        if (!"GET".equals(method) && !"HEAD".equals(method)) return false;
        URI uri = https(value);
        return uri != null && RESOURCES.contains(uri.getHost().toLowerCase(Locale.ROOT)) &&
            !INTERACTIVE_PATH.matcher(uri.getPath()).find();
    }
}
