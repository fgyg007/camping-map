package com.jlmac.campingmap;

import android.app.Activity;
import android.content.Intent;
import android.content.ActivityNotFoundException;
import android.net.Uri;
import android.os.SystemClock;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.regex.Pattern;

@CapacitorPlugin(name = "MapShare")
public class MapSharePlugin extends Plugin {
    private static final Pattern SHORT = Pattern.compile("https://surl\\.amap\\.com/[A-Za-z0-9]{1,64}");
    private String pending;
    // In-memory one-shot continuation from our own allowlisted HTTP redirect.
    // A WebView caller can't submit an arbitrary provider URL or a fabricated UID.
    private String recentBaiduUidLocation;
    private long recentBaiduUidExpiry;
    private final AtomicBoolean baiduResolverOpen = new AtomicBoolean(false);

    private synchronized void rememberBaiduUidLocation(String location) {
        recentBaiduUidLocation = location;
        recentBaiduUidExpiry = SystemClock.elapsedRealtime() + 20000;
    }

    private synchronized boolean consumeBaiduUidLocation(String location) {
        boolean allowed = location != null && location.equals(recentBaiduUidLocation) &&
            SystemClock.elapsedRealtime() <= recentBaiduUidExpiry;
        recentBaiduUidLocation = null;
        recentBaiduUidExpiry = 0;
        return allowed;
    }


    private synchronized void capture(Intent intent) {
        if (intent == null || !Intent.ACTION_SEND.equals(intent.getAction()) ||
            !"text/plain".equals(intent.getType())) return;
        String text = null;
        try {
            CharSequence shared = intent.getCharSequenceExtra(Intent.EXTRA_TEXT);
            if (shared != null && shared.length() <= 8192) text = shared.toString();
        } catch (RuntimeException ignored) {
            // Reject malformed parcel extras without recording user data.
        }
        intent.removeExtra(Intent.EXTRA_TEXT);
        if (text != null) {
            pending = text;
            notifyListeners("sharedText", new JSObject());
        }
    }

    @Override protected void handleOnNewIntent(Intent intent) { capture(intent); }

    @PluginMethod
    public synchronized void takePending(PluginCall call) {
        if (pending == null) capture(getActivity().getIntent());
        JSObject answer = new JSObject();
        if (pending != null) answer.put("text", pending);
        pending = null;
        call.resolve(answer);
    }

    private static boolean coordinate(Double value, double max) {
        return value != null && Double.isFinite(value) && Math.abs(value) <= max;
    }

    @PluginMethod
    public void openAmapRoute(PluginCall call) {
        Double lat = call.getDouble("lat"), lng = call.getDouble("lng");
        Double gcjLat = call.getDouble("gcjLat"), gcjLng = call.getDouble("gcjLng");
        if (!coordinate(lat, 90) || !coordinate(lng, 180) ||
            !coordinate(gcjLat, 90) || !coordinate(gcjLng, 180)) {
            call.reject("invalid_amap_destination");
            return;
        }
        Uri route = new Uri.Builder().scheme("amapuri").authority("route").path("/plan/")
            .appendQueryParameter("sourceApplication", "camping-map")
            .appendQueryParameter("dlat", lat.toString()).appendQueryParameter("dlon", lng.toString())
            .appendQueryParameter("dev", "1").appendQueryParameter("t", "0")
            .build();
        Intent open = new Intent(Intent.ACTION_VIEW, route).addCategory(Intent.CATEGORY_DEFAULT)
            .setPackage("com.autonavi.minimap");
        getActivity().runOnUiThread(() -> {
            JSObject answer = new JSObject();
            try {
                getActivity().startActivity(open);
                answer.put("target", "app");
            } catch (ActivityNotFoundException | SecurityException unavailable) {
                Uri fallback = new Uri.Builder().scheme("https").authority("uri.amap.com").path("/navigation")
                    .appendQueryParameter("to", gcjLng + "," + gcjLat)
                    .appendQueryParameter("mode", "car").appendQueryParameter("coordinate", "gaode")
                    .appendQueryParameter("callnative", "0").appendQueryParameter("src", "camping-map").build();
                try {
                    getActivity().startActivity(new Intent(Intent.ACTION_VIEW, fallback));
                    answer.put("target", "web");
                } catch (ActivityNotFoundException | SecurityException noHandler) {
                    call.reject("amap_route_unavailable");
                    return;
                }
            }
            call.resolve(answer);
        });
    }

    @PluginMethod
    public void openBaiduMarker(PluginCall call) {
        Double lat = call.getDouble("lat"), lng = call.getDouble("lng");
        if (!BaiduMarker.valid(lat, lng)) {
            call.reject("invalid_baidu_destination");
            return;
        }
        final Intent open = new Intent(Intent.ACTION_VIEW, Uri.parse(BaiduMarker.app(lat, lng)))
            .setPackage(BaiduMarker.PACKAGE);
        getActivity().runOnUiThread(() -> {
            String target = "app";
            try {
                // Start directly: Android package visibility is not required for startActivity.
                getActivity().startActivity(open);
            } catch (ActivityNotFoundException | SecurityException unavailable) {
                try {
                    Uri fallback = Uri.parse(BaiduMarker.web(lat, lng));
                    getActivity().startActivity(new Intent(Intent.ACTION_VIEW, fallback));
                    target = "web";
                } catch (ActivityNotFoundException | SecurityException noHandler) {
                    call.reject("baidu_marker_unavailable");
                    return;
                }
            }
            JSObject answer = new JSObject();
            answer.put("target", target);
            call.resolve(answer);
        });
    }

    @PluginMethod
    public void resolveExternalMapLink(PluginCall call) {
        try {
            String url = call.getString("url");
            String location = ExternalMapRedirects.resolve(url, ExternalMapRedirects::readLocation);
            if (url.startsWith("https://j.map.baidu.com/") &&
                BaiduPoiResolverActivity.createIntent(getContext(), location) != null) {
                rememberBaiduUidLocation(location);
            }
            JSObject result = new JSObject();
            result.put("location", location);
            call.resolve(result);
        } catch (IllegalArgumentException ignored) {
            call.reject("invalid_external_map_link");
        } catch (Exception ignored) {
            call.reject("external_map_location_unavailable");
        }
    }


    @PluginMethod
    public void resolveBaiduPoiCandidate(PluginCall call) {
        String location = call.getString("location");
        if (!consumeBaiduUidLocation(location)) {
            call.reject("baidu_poi_candidate_unavailable");
            return;
        }
        Intent intent = BaiduPoiResolverActivity.createIntent(getContext(), location);
        if (intent == null || !baiduResolverOpen.compareAndSet(false, true)) {
            call.reject("baidu_poi_candidate_unavailable");
            return;
        }
        Activity activity = getActivity();
        if (activity == null) {
            baiduResolverOpen.set(false);
            call.reject("baidu_poi_candidate_unavailable");
            return;
        }
        activity.runOnUiThread(() -> {
            try {
                startActivityForResult(call, intent, "finishBaiduPoiCandidate");
            } catch (ActivityNotFoundException | SecurityException | IllegalStateException failure) {
                baiduResolverOpen.set(false);
                call.reject("baidu_poi_candidate_unavailable");
            }
        });
    }

    @ActivityCallback
    private void finishBaiduPoiCandidate(PluginCall call, ActivityResult result) {
        baiduResolverOpen.set(false);
        if (call == null) return;
        Intent data = result.getData();
        String location = result.getResultCode() == Activity.RESULT_OK && data != null
            ? data.getStringExtra(BaiduPoiResolverActivity.EXTRA_LOCATION) : null;
        if (location == null) {
            call.reject("baidu_poi_candidate_unavailable");
            return;
        }
        JSObject answer = new JSObject();
        answer.put("location", location);
        call.resolve(answer);
    }

    @PluginMethod
    public void resolveAmap(PluginCall call) {
        String link = call.getString("url");
        if (link == null || !SHORT.matcher(link).matches()) {
            call.reject("invalid_amap_link");
            return;
        }
        HttpURLConnection request = null;
        try {
            request = (HttpURLConnection) new URL(link).openConnection(java.net.Proxy.NO_PROXY);
            request.setRequestMethod("GET");
            request.setInstanceFollowRedirects(false);
            request.setConnectTimeout(4500);
            request.setReadTimeout(4500);
            request.setUseCaches(false);
            int status = request.getResponseCode();
            String location = request.getHeaderField("Location");
            if (status != 302 || location == null || location.length() > 8192) {
                call.reject("amap_location_unavailable");
                return;
            }
            // No response body is read; redirect destinations are never fetched.
            JSObject result = new JSObject();
            result.put("location", location);
            call.resolve(result);
        } catch (Exception ignored) {
            call.reject("amap_network_unavailable");
        } finally {
            if (request != null) request.disconnect();
        }
    }
}
