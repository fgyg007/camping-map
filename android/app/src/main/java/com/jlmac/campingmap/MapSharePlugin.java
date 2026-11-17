package com.jlmac.campingmap;

import android.content.Intent;
import android.content.ActivityNotFoundException;
import android.net.Uri;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.regex.Pattern;

@CapacitorPlugin(name = "MapShare")
public class MapSharePlugin extends Plugin {
    private static final Pattern SHORT = Pattern.compile("https://surl\\.amap\\.com/[A-Za-z0-9]{1,64}");
    private String pending;

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
