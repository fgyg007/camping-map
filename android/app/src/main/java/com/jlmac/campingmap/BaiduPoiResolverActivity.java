package com.jlmac.campingmap;

import android.app.Activity;
import android.app.Application;
import android.annotation.SuppressLint;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.webkit.ClientCertRequest;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.HttpAuthHandler;
import android.webkit.JsPromptResult;
import android.webkit.JsResult;
import android.webkit.PermissionRequest;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.SafeBrowsingResponse;
import android.webkit.ServiceWorkerClient;
import android.webkit.ServiceWorkerController;
import android.webkit.SslErrorHandler;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebStorage;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.annotation.RequiresApi;
import java.io.ByteArrayInputStream;
import java.util.Collections;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Temporary, read-only Baidu page. No script injection, API key or app bridge. */
public final class BaiduPoiResolverActivity extends Activity {
    static final String EXTRA_LOCATION = "baidu_poi_candidate_location";
    static final String EXTRA_UID = "baidu_poi_candidate_uid";
    static final String EXTRA_NAME = "baidu_poi_candidate_name";
    static final String EXTRA_X = "baidu_poi_candidate_x";
    static final String EXTRA_Y = "baidu_poi_candidate_y";
    private static final String EXTRA_MOBILE_PAGE = "baidu_poi_mobile_page";
    private static final String PROCESS_SUFFIX = ":baidu_poi_resolver";
    private static final long TIMEOUT_MS = 16000;
    private static final Pattern CHROME_VERSION = Pattern.compile("Chrome/([0-9.]+)");
    private static boolean configured;
    private final Handler ui = new Handler(Looper.getMainLooper());
    private WebView web;
    private LinearLayout layout;
    private String expectedUid;
    private volatile boolean finished;

    static Intent createIntent(Context context, String location, String mobilePage) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) return null;
        String uid = BaiduPoiCandidatePolicy.referenceUid(location);
        if (uid == null) return null;
        Intent intent = new Intent(context, BaiduPoiResolverActivity.class).putExtra(EXTRA_UID, uid);
        if (BaiduPublicPoiPage.pageUri(mobilePage, uid) != null) intent.putExtra(EXTRA_MOBILE_PAGE, mobilePage);
        return intent;
    }

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setResult(RESULT_CANCELED);
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P || savedInstanceState != null ||
            !Application.getProcessName().equals(getPackageName() + PROCESS_SUFFIX)) {
            complete(null);
            return;
        }
        expectedUid = getIntent().getStringExtra(EXTRA_UID);
        String page = BaiduPoiCandidatePolicy.publicPage(expectedUid);
        if (page == null) {
            complete(null);
            return;
        }
        initializeStatus();
        String mobilePage = getIntent().getStringExtra(EXTRA_MOBILE_PAGE);
        if (mobilePage == null) {
            beginBrowser(page);
        } else {
            // This process has no Capacitor plugin or ambient Java cookie handler.
            new Thread(() -> {
                BaiduPublicPoiPage.Point point = BaiduPublicPoiPage.fetchCandidate(mobilePage, expectedUid);
                ui.post(() -> {
                    if (finished) return;
                    if (point != null) completeMarker(point);
                    else beginBrowser(page);
                });
            }, "baidu-public-poi").start();
        }
    }

    @RequiresApi(Build.VERSION_CODES.P)
    private void beginBrowser(String page) {
        try {
            initializeBrowser();
            web.loadUrl(page);
            ui.postDelayed(() -> complete(null), TIMEOUT_MS);
            ui.postDelayed(this::pollLocation, 180);
        } catch (RuntimeException ignored) {
            // Includes unavailable/outdated WebView. Preserve the manual fallback.
            complete(null);
        }
    }

    @RequiresApi(Build.VERSION_CODES.P)
    private void initializeBrowser() {
        if (!configured) {
            // Must be before any android.webkit API in the dedicated process.
            WebView.setDataDirectorySuffix("baidu_poi_resolver");
            configured = true;
        }
        WebView.setWebContentsDebuggingEnabled(false);
        CookieManager.getInstance().setAcceptCookie(false);
        // Only the isolated resolver profile can see this storage, never the main app's records.
        WebStorage.getInstance().deleteAllData();
        ServiceWorkerController workers = ServiceWorkerController.getInstance();
        workers.getServiceWorkerWebSettings().setBlockNetworkLoads(true);
        workers.getServiceWorkerWebSettings().setAllowContentAccess(false);
        workers.getServiceWorkerWebSettings().setAllowFileAccess(false);
        workers.setServiceWorkerClient(new ServiceWorkerClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebResourceRequest request) {
                return blocked();
            }
        });

        web = new WebView(this);
        layout.addView(web, new LinearLayout.LayoutParams(-1, 0, 1));
        web.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS);
        web.setFocusable(false);
        web.setFocusableInTouchMode(false);
        web.setOnTouchListener((view, event) -> true); // view-only, never operate or sign in
        web.setDownloadListener((url, agent, disposition, mime, size) -> complete(null));
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, false);
        configureWebSettings();
    }

    private void initializeStatus() {
        layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setBackgroundColor(Color.WHITE);
        TextView title = new TextView(this);
        title.setText(R.string.baidu_resolver_status);
        title.setTextColor(Color.rgb(24, 46, 35));
        title.setPadding(24, 24, 24, 12);
        title.setTextSize(16);
        layout.addView(title);
        Button cancel = new Button(this);
        cancel.setText(android.R.string.cancel);
        cancel.setOnClickListener(ignored -> complete(null));
        layout.addView(cancel);
        setContentView(layout);
    }

    @RequiresApi(Build.VERSION_CODES.P)
    @SuppressLint("SetJavaScriptEnabled") // Remote page has no app bridge, cookies or file permissions.
    private void configureWebSettings() {
        WebSettings settings = web.getSettings();
        // Enable the provider's own public page behavior, never inject JavaScript.
        settings.setJavaScriptEnabled(true);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        // The public map initializes its viewport using localStorage even when signed out.
        // Clear this isolated profile before use and again on teardown; cookies stay off.
        settings.setDomStorageEnabled(true);
        settings.setGeolocationEnabled(false);
        settings.setSupportMultipleWindows(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSafeBrowsingEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        Matcher engine = CHROME_VERSION.matcher(settings.getUserAgentString());
        if (engine.find()) {
            // Request normal desktop presentation with the actual Chromium version.
            // No retry or alternate mode on login/interstitial/bot pages.
            settings.setUserAgentString("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 " +
                "(KHTML, like Gecko) Chrome/" + engine.group(1) + " Safari/537.36");
        }
        web.setWebViewClient(new RestrictedClient());
        web.setWebChromeClient(new RestrictedChrome());
    }

    private final class RestrictedClient extends WebViewClient {
        @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            if (finished) return true;
            String url = request.getUrl().toString();
            if (!request.isForMainFrame()) return !BaiduPoiCandidatePolicy.allowsResource(url, request.getMethod());
            if (BaiduPoiCandidatePolicy.allowsNavigation(url, expectedUid)) return false;
            ui.post(() -> complete(null));
            return true;
        }

        @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            if (finished) return blocked();
            String url = request.getUrl().toString();
            // WebView reports the initial request here, not every subresource redirect hop.
            if (!BaiduPoiCandidatePolicy.allowsResource(url, request.getMethod())) return blocked();
            if (request.isForMainFrame() && !BaiduPoiCandidatePolicy.allowsNavigation(url, expectedUid)) {
                ui.post(() -> complete(null));
                return blocked();
            }
            return null;
        }

        @Override public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
            if (!finished && !BaiduPoiCandidatePolicy.allowsNavigation(url, expectedUid)) complete(null);
        }

        @Override public void doUpdateVisitedHistory(WebView view, String url, boolean isReload) {
            // The normal desktop page may use the history API without another request.
            observeLocation(url);
        }

        @Override public void onPageFinished(WebView view, String url) {
            observeLocation(url);
        }

        @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            if (request.isForMainFrame()) complete(null);
        }

        @Override public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse error) {
            if (request.isForMainFrame()) complete(null);
        }

        @Override public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
            handler.cancel();
            complete(null);
        }

        @RequiresApi(Build.VERSION_CODES.O_MR1)
        @Override public void onSafeBrowsingHit(WebView view, WebResourceRequest request,
                                                int threatType, SafeBrowsingResponse response) {
            // Stop instead of bypassing, and don't ask WebView to report this URL.
            response.backToSafety(false);
            complete(null);
        }

        @Override public void onReceivedHttpAuthRequest(WebView view, HttpAuthHandler handler, String host, String realm) {
            handler.cancel();
            complete(null);
        }

        @Override public void onReceivedClientCertRequest(WebView view, ClientCertRequest request) {
            request.cancel();
            complete(null);
        }

        @Override public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
            complete(null);
            return true;
        }
    }

    private final class RestrictedChrome extends WebChromeClient {
        @Override public boolean onCreateWindow(WebView view, boolean dialog, boolean gesture, android.os.Message reply) {
            return false;
        }

        @Override public void onPermissionRequest(PermissionRequest request) {
            request.deny();
        }

        @Override public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
            callback.invoke(origin, false, false);
        }

        @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> reply, FileChooserParams options) {
            reply.onReceiveValue(null);
            return true;
        }

        @Override public boolean onJsAlert(WebView view, String url, String message, JsResult result) {
            result.cancel();
            return true;
        }

        @Override public boolean onJsConfirm(WebView view, String url, String message, JsResult result) {
            result.cancel();
            return true;
        }

        @Override public boolean onJsPrompt(WebView view, String url, String message, String initial, JsPromptResult result) {
            result.cancel();
            return true;
        }

        @Override public boolean onJsBeforeUnload(WebView view, String url, String message, JsResult result) {
            result.cancel();
            return true;
        }
    }

    private static WebResourceResponse blocked() {
        return new WebResourceResponse("text/plain", "UTF-8", 403, "Blocked",
            Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
    }

    private void pollLocation() {
        if (finished || web == null) return;
        observeLocation(web.getUrl());
        if (!finished) ui.postDelayed(this::pollLocation, 180);
    }

    private void observeLocation(String url) {
        if (finished || url == null || url.isEmpty()) return;
        String point = BaiduPoiCandidatePolicy.candidate(url, expectedUid);
        if (point != null) ui.post(() -> complete(point));
    }

    private void complete(String point) {
        if (finished) return;
        finished = true;
        if (point != null) setResult(RESULT_OK, new Intent().putExtra(EXTRA_LOCATION, point));
        cleanUp();
        finish();
    }

    private void completeMarker(BaiduPublicPoiPage.Point point) {
        if (finished) return;
        finished = true;
        setResult(RESULT_OK, new Intent().putExtra(EXTRA_UID, point.uid).putExtra(EXTRA_NAME, point.name)
            .putExtra(EXTRA_X, point.x).putExtra(EXTRA_Y, point.y));
        cleanUp();
        finish();
    }

    private void cleanUp() {
        ui.removeCallbacksAndMessages(null);
        if (web == null) return;
        WebView view = web;
        web = null;
        if (layout != null) layout.removeView(view);
        try {
            view.stopLoading();
            view.clearCache(true);
            view.clearHistory();
            view.clearFormData();
            view.destroy();
            WebStorage.getInstance().deleteAllData();
            CookieManager.getInstance().removeAllCookies(null);
        } catch (RuntimeException ignored) {
            // Browser teardown remains isolated from the app's normal data directory.
        }
    }

    @Override protected void onStop() {
        super.onStop();
        if (!finished) complete(null);
    }

    @Override protected void onDestroy() {
        cleanUp();
        super.onDestroy();
    }
}
