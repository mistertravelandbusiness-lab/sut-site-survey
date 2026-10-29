package org.karidz.sutsurvey.user;

import android.Manifest;
import android.app.Activity;
import android.app.DownloadManager;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Log;
import android.view.KeyEvent;
import android.view.View;
import android.webkit.ConsoleMessage;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.GeolocationPermissions;
import android.webkit.JsResult;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.File;

/**
 * SUT Site Survey — enveloppe WebView.
 * - charge l'app web depuis assets/www
 * - autorise l'appareil photo ET la galerie pour les <input type=file>
 * - autorise la géolocalisation (GPS du rapport)
 * - gère les téléchargements (export Excel .xlsx)
 */
public class MainActivity extends Activity {

    private static final String TAG = "SUT";
    /* Origine https interne : le stockage local (session, IndexedDB) fonctionne
       comme sur un vrai site, et l'accès aux assets reste local (aucun réseau). */
    private static final String APP_HOST = "appassets.androidplatform.net";
    private static final String APP_URL = "https://" + APP_HOST + "/assets/www/index.html";
    private static final int REQ_FILE = 1001;
    private static final int REQ_PERMS = 1002;
    private static final int REQ_EXPORT = 1003;
    private byte[] pendingExport;

    private WebView web;
    private ValueCallback<Uri[]> filePathCallback;
    private Uri cameraOutputUri;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        web = new WebView(this);
        web.setBackgroundColor(0xFF060B18);
        setContentView(web);
        web.setOnApplyWindowInsetsListener((v, insets) -> {
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets bars = insets.getInsets(android.view.WindowInsets.Type.systemBars() | android.view.WindowInsets.Type.displayCutout());
                v.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            } else {
                v.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(), insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            }
            return insets;
        });
        web.requestApplyInsets();
        configure(web);

        web.loadUrl(APP_URL);
        askPermissions();
    }

    private void askPermissions() {
        if (Build.VERSION.SDK_INT < 23) return;
        java.util.ArrayList<String> need = new java.util.ArrayList<>();
        need.add(Manifest.permission.CAMERA);
        need.add(Manifest.permission.ACCESS_FINE_LOCATION);
        need.add(Manifest.permission.ACCESS_COARSE_LOCATION);
        if (Build.VERSION.SDK_INT >= 33) {
            need.add(Manifest.permission.READ_MEDIA_IMAGES);
            need.add(Manifest.permission.POST_NOTIFICATIONS);
        } else {
            need.add(Manifest.permission.READ_EXTERNAL_STORAGE);
            need.add(Manifest.permission.WRITE_EXTERNAL_STORAGE);
        }
        java.util.ArrayList<String> missing = new java.util.ArrayList<>();
        for (String p : need) {
            if (Build.VERSION.SDK_INT >= 33 && p.equals(Manifest.permission.WRITE_EXTERNAL_STORAGE)) continue;
            if (checkSelfPermission(p) != PackageManager.PERMISSION_GRANTED) missing.add(p);
        }
        if (!missing.isEmpty()) requestPermissions(missing.toArray(new String[0]), REQ_PERMS);
    }

    private void configure(WebView w) {
        w.addJavascriptInterface(new ExportBridge(), "SUTExport");
        WebSettings s = w.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setGeolocationEnabled(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        s.setUserAgentString(s.getUserAgentString() + " SUTSurvey/1.0");
        if (Build.VERSION.SDK_INT >= 21) CookieManager.getInstance().setAcceptThirdPartyCookies(w, true);

        w.setWebViewClient(new WebViewClient() {
            /* Sert les fichiers de assets/www sous https://appassets.androidplatform.net */
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest request) {
                return intercept(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                String sc = u.getScheme() == null ? "" : u.getScheme();
                if ("https".equals(sc) && APP_HOST.equals(u.getHost())) return false;
                if (sc.startsWith("http") && !u.toString().startsWith("file://")) {
                    // liens externes -> navigateur
                    try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception e) { }
                    return true;
                }
                return false;
            }

            @Override
            public void onReceivedError(WebView v, int code, String desc, String failingUrl) {
                Log.e(TAG, "erreur web " + code + " " + desc + " " + failingUrl);
            }
        });

        w.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback cb) {
                cb.invoke(origin, true, false); // GPS : toujours autorisé pour l'app
            }

            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> request.grant(request.getResources()));
            }

            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams params) {
                if (filePathCallback != null) filePathCallback.onReceiveValue(null);
                filePathCallback = cb;
                boolean capture = params.isCaptureEnabled();
                if (capture) return openCamera();
                return openGallery();
            }

            @Override
            public boolean onJsAlert(WebView v, String url, String msg, JsResult r) { return false; }

            @Override
            public boolean onConsoleMessage(ConsoleMessage m) {
                Log.d(TAG, m.message() + " @" + m.lineNumber());
                return true;
            }
        });

        // Téléchargements (export .xlsx -> dossier Téléchargements + notification)
        w.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String ua, String cd, String mime, long len) {
                try {
                    if (url.startsWith("blob:") || url.startsWith("data:")) {
                        Toast.makeText(MainActivity.this, "Export non supporté dans l'aperçu", Toast.LENGTH_SHORT).show();
                        return;
                    }
                    DownloadManager.Request r = new DownloadManager.Request(Uri.parse(url));
                    r.setMimeType(mime);
                    r.addRequestHeader("Cookie", CookieManager.getInstance().getCookie(url));
                    r.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                    String name = android.webkit.URLUtil.guessFileName(url, cd, mime);
                    r.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, name);
                    DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
                    if (dm != null) {
                        dm.enqueue(r);
                        Toast.makeText(MainActivity.this, "Téléchargement : " + name, Toast.LENGTH_LONG).show();
                    }
                } catch (Exception e) {
                    Log.e(TAG, "download " + e.getMessage());
                    Toast.makeText(MainActivity.this, "Téléchargement impossible", Toast.LENGTH_SHORT).show();
                }
            }
        });
    }

    /** Save the generated workbook via the Android document picker, without storage permission. */
    private class ExportBridge {
        @android.webkit.JavascriptInterface
        public void saveWorkbook(String filename, String encoded) {
            if (encoded == null || encoded.length() > 40000000) return;
            runOnUiThread(() -> {
                Uri current = Uri.parse(web.getUrl() == null ? "" : web.getUrl());
                if (!"https".equals(current.getScheme()) || !APP_HOST.equals(current.getHost())) return;
                try {
                    if (pendingExport != null) { Toast.makeText(MainActivity.this, "Un export est déjà en cours", Toast.LENGTH_SHORT).show(); return; }
                    pendingExport = android.util.Base64.decode(encoded, android.util.Base64.DEFAULT);
                    String name = filename == null ? "rapport.xlsx" : filename.replaceAll("[^a-zA-Z0-9._-]", "_");
                    if (!name.toLowerCase(java.util.Locale.ROOT).endsWith(".xlsx")) name += ".xlsx";
                    Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    intent.setType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
                    intent.putExtra(Intent.EXTRA_TITLE, name);
                    startActivityForResult(intent, REQ_EXPORT);
                } catch (Exception e) {
                    pendingExport = null;
                    Toast.makeText(MainActivity.this, "Impossible d'ouvrir l'enregistrement", Toast.LENGTH_LONG).show();
                }
            });
        }
    }

    /** Lecture d'un asset local pour un appel https://appassets.androidplatform.net */
    private WebResourceResponse intercept(Uri uri) {
        try {
            if (uri == null || !APP_HOST.equals(uri.getHost())) return null;
            String path = uri.getPath() == null ? "" : uri.getPath();
            if (path.startsWith("/")) path = path.substring(1);
            if (!path.startsWith("assets/")) return null;
            String assetPath = path.substring("assets/".length());
            java.io.InputStream is = getAssets().open(assetPath);
            String mime = guessMime(assetPath);
            String enc = mime.startsWith("text/") || mime.contains("javascript") || mime.contains("json") ? "utf-8" : null;
            java.util.Map<String,String> headers = new java.util.HashMap<>();
            headers.put("Access-Control-Allow-Origin", "*");
            headers.put("Cache-Control", "no-cache");
            return new WebResourceResponse(mime, enc, 200, "OK", headers, is);
        } catch (Exception e) {
            Log.w(TAG, "asset introuvable: " + uri + " (" + e.getMessage() + ")");
            return null;
        }
    }

    private String guessMime(String p) {
        String s = p.toLowerCase();
        if (s.endsWith(".html")) return "text/html";
        if (s.endsWith(".js")) return "application/javascript";
        if (s.endsWith(".css")) return "text/css";
        if (s.endsWith(".json")) return "application/json";
        if (s.endsWith(".png")) return "image/png";
        if (s.endsWith(".jpg") || s.endsWith(".jpeg")) return "image/jpeg";
        if (s.endsWith(".svg")) return "image/svg+xml";
        if (s.endsWith(".woff2")) return "font/woff2";
        if (s.endsWith(".webmanifest")) return "application/manifest+json";
        return "application/octet-stream";
    }

    /** Appareil photo : sortie vers MediaStore (aucune dépendance androidx nécessaire). */
    private boolean openCamera() {
        try {
            if (checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                askPermissions();
                Toast.makeText(this, "Autorise l'appareil photo puis réessaie", Toast.LENGTH_LONG).show();
                if (filePathCallback != null) { filePathCallback.onReceiveValue(null); filePathCallback = null; }
                return false;
            }
            ContentValues cv = new ContentValues();
            cv.put(MediaStore.Images.Media.DISPLAY_NAME, "sut_" + System.currentTimeMillis() + ".jpg");
            cv.put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg");
            cameraOutputUri = getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, cv);
            Intent i = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
            i.putExtra(MediaStore.EXTRA_OUTPUT, cameraOutputUri);
            i.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            startActivityForResult(i, REQ_FILE);
            return true;
        } catch (Exception e) {
            Log.e(TAG, "camera " + e.getMessage());
            Toast.makeText(this, "Appareil photo indisponible", Toast.LENGTH_SHORT).show();
            if (filePathCallback != null) { filePathCallback.onReceiveValue(null); filePathCallback = null; }
            return false;
        }
    }

    /** Galerie : sélection d'images. */
    private boolean openGallery() {
        try {
            Intent i = new Intent(Intent.ACTION_GET_CONTENT);
            i.addCategory(Intent.CATEGORY_OPENABLE);
            i.setType("image/*");
            startActivityForResult(Intent.createChooser(i, "Choisir une photo"), REQ_FILE);
            return true;
        } catch (Exception e) {
            if (filePathCallback != null) { filePathCallback.onReceiveValue(null); filePathCallback = null; }
            Toast.makeText(this, "Galerie indisponible", Toast.LENGTH_SHORT).show();
            return false;
        }
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        if (req == REQ_EXPORT) {
            byte[] bytes = pendingExport;
            pendingExport = null;
            if (res == RESULT_OK && data != null && data.getData() != null && bytes != null) {
                try (java.io.OutputStream out = getContentResolver().openOutputStream(data.getData())) {
                    if (out == null) throw new java.io.IOException("Output stream unavailable");
                    out.write(bytes);
                    Toast.makeText(this, "Rapport Excel enregistré", Toast.LENGTH_LONG).show();
                } catch (Exception e) {
                    Toast.makeText(this, "Échec de l'enregistrement du rapport", Toast.LENGTH_LONG).show();
                }
            } else {
                Toast.makeText(this, "Export annulé", Toast.LENGTH_SHORT).show();
            }
            return;
        }
        if (req == REQ_FILE) {
            Uri[] result = null;
            if (res == RESULT_OK) {
                if (cameraOutputUri != null) {
                    result = new Uri[]{ cameraOutputUri };
                } else if (data != null) {
                    if (data.getClipData() != null) {
                        int n = data.getClipData().getItemCount();
                        result = new Uri[n];
                        for (int k = 0; k < n; k++) result[k] = data.getClipData().getItemAt(k).getUri();
                    } else if (data.getData() != null) {
                        result = new Uri[]{ data.getData() };
                    }
                }
            }
            if (filePathCallback != null) {
                filePathCallback.onReceiveValue(result);
                filePathCallback = null;
            }
            cameraOutputUri = null;
            return;
        }
        super.onActivityResult(req, res, data);
    }

    @Override
    public void onRequestPermissionsResult(int req, String[] perms, int[] res) {
        super.onRequestPermissionsResult(req, perms, res);
        if (req == REQ_PERMS) {
            for (int i = 0; i < perms.length; i++) {
                Log.d(TAG, "perm " + perms[i] + " = " + res[i]);
            }
        }
    }

    /** Bouton retour : on laisse l'app web décider, sinon on quitte. */
    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            web.evaluateJavascript(
                "(function(){try{return window.androidBack?window.androidBack():'exit'}catch(e){return 'exit'}})()",
                value -> {
                    boolean handled = value != null && value.contains("handled");
                    if (!handled) {
                        if (web.canGoBack()) web.goBack();
                        else moveTaskToBack(true);
                    }
                });
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    protected void onDestroy() {
        if (web != null) {
            web.loadUrl("about:blank");
            web.destroy();
        }
        super.onDestroy();
    }
}
