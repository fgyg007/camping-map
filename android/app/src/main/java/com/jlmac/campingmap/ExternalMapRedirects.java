package com.jlmac.campingmap;

import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.Proxy;
import java.net.SocketTimeoutException;
import java.net.UnknownHostException;
import javax.net.ssl.SSLException;
import java.net.URI;
import java.util.Locale;
import java.util.regex.Pattern;

/** Only short-link routing headers are read. No destination page or API is fetched. */
final class ExternalMapRedirects {
    private static final Pattern BAIDU = Pattern.compile("/[A-Za-z0-9_-]{1,64}(/[A-Za-z0-9_-]{1,64})?");
    private static final Pattern GOOGLE = Pattern.compile("/[A-Za-z0-9]{1,64}");
    private static final Pattern GOOGLE_OLD = Pattern.compile("/maps/[A-Za-z0-9]{1,64}");
    private static final Pattern TENCENT = Pattern.compile("l=[0-9a-f]{32}");
    private static final int MAX_REQUESTS = 2;
    private static final int TIMEOUT_MS = 3000;

    interface LocationReader {
        String read(URI current) throws IOException;
    }

    static final class Resolved {
        final String location;
        final String mobilePoi;

        Resolved(String location, String mobilePoi) {
            this.location = location;
            this.mobilePoi = mobilePoi;
        }
    }

    private ExternalMapRedirects() {}

    /** Fixed reason codes only; never include a provider URL or exception message. */
    static String failureCode(Exception failure) {
        if (failure instanceof IllegalArgumentException) return "invalid_external_map_link";
        if (failure instanceof SocketTimeoutException) return "external_map_timeout";
        if (failure instanceof UnknownHostException) return "external_map_dns";
        if (failure instanceof SSLException) return "external_map_tls";
        if (failure instanceof RoutingFailure) return "external_map_unrecognized_response";
        return "external_map_location_unavailable";
    }

    private static final class RoutingFailure extends IOException {
        private static final long serialVersionUID = 1L;
    }


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
        if (uri == null || !"https".equals(uri.getScheme())) return null;
        String host = uri.getHost().toLowerCase(Locale.ROOT);
        String path = uri.getRawPath();
        String query = uri.getRawQuery();
        if ("mmapgwh.map.qq.com".equals(host) && "/shortlink/short".equals(path) &&
            query != null && TENCENT.matcher(query).matches()) return "tencent";
        if (query != null) return null;
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
        if ("tencent".equals(provider)) {
            return "https".equalsIgnoreCase(uri.getScheme()) &&
                ("map.qq.com".equals(host) && "/m/map-app/share/poi".equals(path) ||
                 "mapapi.qq.com".equals(host) && "/web/mapComponents/locationMarker/v/index.html".equals(path) ||
                 "apis.map.qq.com".equals(host) && ("/uri/v1/marker".equals(path) || "/tools/poimarker".equals(path)));
        }
        return "https".equalsIgnoreCase(uri.getScheme()) &&
               ("www.google.com".equals(host) || "google.com".equals(host) || "maps.google.com".equals(host)) &&
               path.startsWith("/maps/");
    }

    static String resolve(String input, LocationReader reader) throws IOException {
        return resolveDetailed(input, reader).location;
    }

    static Resolved resolveDetailed(String input, LocationReader reader) throws IOException {
        URI first = parse(input);
        String provider = shortProvider(first);
        if (provider == null) throw new IllegalArgumentException("invalid_external_map_link");
        URI current = first;
        for (int i = 0; i < MAX_REQUESTS; i++) {
            String location = reader.read(current);
            // Only absolute, provider-owned HTTPS short hops. Do not follow arbitrary destination URLs.
            URI next = parse(location);
            if ("baidu".equals(provider) && next != null) {
                String mobileUid = BaiduPoiCandidatePolicy.mobileReferenceUid(next.toASCIIString());
                if (mobileUid != null) return new Resolved(
                    BaiduPoiCandidatePolicy.publicPage(mobileUid), next.toASCIIString());
            }
            if (terminal(next, provider)) return new Resolved(next.toASCIIString(), null);
            if (!"tencent".equals(provider) && next != null && next.getRawQuery() != null) {
                next = parse(next.toASCIIString().split("\\?", 2)[0]);
            }
            if (!provider.equals(shortProvider(next)) || next.equals(current) || next.equals(first)) break;
            current = next;
        }
        throw new RoutingFailure();
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
