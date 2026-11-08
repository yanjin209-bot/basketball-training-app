package com.courtrise.mobile;

import android.app.Activity;
import android.Manifest;
import android.content.pm.PackageManager;
import android.webkit.PermissionRequest;
import android.app.AlertDialog;
import android.webkit.JsResult;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.MimeTypeMap;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.io.IOException;
import java.io.InputStream;
import java.util.Locale;

/** Serves only bundled assets on a secure, intercepted origin. No network permission is granted. */
public final class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final int PICK_FILE = 118;
    private WebView webView;
    private ValueCallback<Uri[]> fileCallback;
    private NativeBridge bridge;
    private PermissionRequest cameraRequest;
    private static final int CAMERA_PERMISSION = 119;
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        webView.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) { return true; }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri=request.getUrl();
                if (!"https".equals(uri.getScheme()) || !HOST.equals(uri.getHost()) || !uri.getPath().startsWith("/assets/") || uri.getPath().contains("..")) return new WebResourceResponse("text/plain", "utf-8", 403, "Forbidden", null, null);
                String path=uri.getPath().substring("/assets/".length());
                try { InputStream stream=getAssets().open(path);String ext=MimeTypeMap.getFileExtensionFromUrl(path).toLowerCase(Locale.ROOT);String mime=MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext);if ("js".equals(ext) || "mjs".equals(ext)) mime="application/javascript";if ("wasm".equals(ext)) mime="application/wasm";if ("woff2".equals(ext)) mime="font/woff2";return new WebResourceResponse(mime == null ? "application/octet-stream" : mime, "utf-8", stream); }
                catch(IOException e){return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", null, null);}
            }
        });
        webView.setWebChromeClient(new WebChromeClient(){
            @Override public void onPermissionRequest(PermissionRequest request) {
                runOnUiThread(() -> {
                    Uri origin = request.getOrigin();
                    if (!"https".equals(origin.getScheme()) || !HOST.equals(origin.getHost())) { request.deny(); return; }
                    for (String resource : request.getResources()) if (!PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) { request.deny(); return; }
                    if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) request.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
                    else { if (cameraRequest != null) { request.deny(); return; } cameraRequest = request; requestPermissions(new String[]{Manifest.permission.CAMERA}, CAMERA_PERMISSION); }
                });
            }
            @Override public void onPermissionRequestCanceled(PermissionRequest request) { if (cameraRequest == request) cameraRequest = null; }
            @Override public boolean onJsConfirm(WebView v,String url,String message,JsResult result){new AlertDialog.Builder(MainActivity.this).setMessage(message).setPositiveButton("确定",(d,w)->result.confirm()).setNegativeButton("取消",(d,w)->result.cancel()).setOnCancelListener(d->result.cancel()).show();return true;}
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params){
                if(fileCallback!=null)fileCallback.onReceiveValue(null);fileCallback=callback;
                try{startActivityForResult(params.createIntent(),PICK_FILE);return true;}catch(Exception e){fileCallback=null;callback.onReceiveValue(null);return false;}
            }
        });
        bridge=new NativeBridge(this,webView);
        webView.addJavascriptInterface(bridge,"CourtNative");
        webView.setOnApplyWindowInsetsListener((view,insets)->{ view.setPadding(0,insets.getSystemWindowInsetTop(),0,0); return insets; });
        setContentView(webView);
        webView.loadUrl("https://"+HOST+"/assets/index.html");
    }
    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        if (requestCode == CAMERA_PERMISSION && cameraRequest != null) {
            PermissionRequest request = cameraRequest; cameraRequest = null;
            if (results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED) request.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE}); else request.deny();
        }
    }
    @Override protected void onActivityResult(int requestCode,int resultCode,Intent data){super.onActivityResult(requestCode,resultCode,data);if(bridge!=null && bridge.onActivityResult(requestCode,resultCode,data))return;if(requestCode==PICK_FILE&&fileCallback!=null){fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode,data));fileCallback=null;}}
    @Override public void onBackPressed() { webView.evaluateJavascript("window.courtBack && window.courtBack()", null); }
    @Override protected void onDestroy() { if(fileCallback!=null)fileCallback.onReceiveValue(null);if(cameraRequest!=null){cameraRequest.deny();cameraRequest=null;}webView.destroy();super.onDestroy(); }
}
