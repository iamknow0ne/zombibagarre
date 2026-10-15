package games.zombibagarre.quarantine;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.WindowManager;
import android.webkit.*;
import android.widget.FrameLayout;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import org.json.JSONObject;
import java.nio.charset.StandardCharsets;
import java.io.OutputStream;
import android.widget.Toast;
import java.io.ByteArrayInputStream;
import java.util.Collections;

/** Offline shell. Only the bundled main frame may request a user-selected backup export. */
public class MainActivity extends Activity {
    private static final String ORIGIN = "https://appassets.androidplatform.net";
    private static final String HOME = ORIGIN + "/assets/game/index.html";
    private WebView game;
    private FrameLayout root;
    private View customView;
    private WebChromeClient.CustomViewCallback customCallback;
    private ValueCallback<Uri[]> fileCallback;
    private final int FILE_PICKER = 41, FILE_EXPORT = 42;
    private byte[] pendingExport;
    private boolean activityActive=true;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        root = new FrameLayout(this); root.setBackgroundColor(Color.rgb(22,35,39)); setContentView(root);
        createGame();
    }
    @SuppressWarnings("SetJavaScriptEnabled") private void createGame() {
        game = new WebView(this); root.addView(game, new FrameLayout.LayoutParams(-1,-1));
        game.setBackgroundColor(Color.rgb(22,35,39));
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        WebSettings settings = game.getSettings();
        settings.setJavaScriptEnabled(true); settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false); settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setSupportMultipleWindows(false);
        settings.setUserAgentString(settings.getUserAgentString()+" ZombieBagarreAndroid/"+BuildConfig.VERSION_NAME);
        final WebViewAssetLoader.AssetsPathHandler bundled = new WebViewAssetLoader.AssetsPathHandler(this);
        final WebViewAssetLoader assets = new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", path->{
                WebResourceResponse response=bundled.handle(path.endsWith(".gz")?path+".asset":path);
                if(response!=null&&path.endsWith(".gz"))response.setMimeType("application/gzip");
                return response;
            }).build();
        game.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri=request.getUrl();
                if(uri.getPath().endsWith("/"))uri=uri.buildUpon().path(uri.getPath()+"index.html").build();
                WebResourceResponse response = assets.shouldInterceptRequest(uri);
                if(response!=null&&uri.getPath().endsWith(".wasm"))response.setMimeType("application/wasm");
                if(response != null) return response;
                return new WebResourceResponse("text/plain", "UTF-8", 404, "Not bundled", Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri=request.getUrl();
                return !"https".equals(uri.getScheme()) || !"appassets.androidplatform.net".equals(uri.getHost()) || !uri.getPath().startsWith("/assets/game/");
            }
            @Override public void onPageFinished(WebView view, String url) { immersive(); Log.i("ZombieBagarre", "PAGE READY " + url); }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                Log.e("ZombieBagarre", "LOAD " + request.getUrl()+": "+error.getDescription());
                if(request.isForMainFrame()) showFailure("The bundled game could not open. Your saved character is retained.");
            }
            @Override public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
                Log.e("ZombieBagarre", "HTTP " + response.getStatusCode()+" "+request.getUrl());
                if(request.isForMainFrame())showFailure("A bundled game page is missing. Reinstall the complete APK; your character data is retained by an update.");
            }
            @Override public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                hideCustomView(); root.removeView(view); view.destroy(); game=null;
                showFailure("Android closed the graphics process. Reload to start a fresh expedition; your saved character is retained."); return true;
            }
        });
        game.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onConsoleMessage(ConsoleMessage message) {
                Log.println(message.messageLevel()==ConsoleMessage.MessageLevel.ERROR?Log.ERROR:Log.INFO,"ZombieBagarre",message.message()+" @"+message.lineNumber()); return true;
            }
            @Override public void onShowCustomView(View view, CustomViewCallback callback) {
                if(customView!=null){callback.onCustomViewHidden();return;}
                customView=view;customCallback=callback;root.addView(view,new FrameLayout.LayoutParams(-1,-1));game.setVisibility(View.GONE);immersive();
            }
            @Override public void onHideCustomView() { hideCustomView(); }
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if(fileCallback!=null)fileCallback.onReceiveValue(null); fileCallback=callback;
                Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("application/json");
                try { startActivityForResult(intent,FILE_PICKER); } catch(Exception error) { fileCallback.onReceiveValue(null); fileCallback=null; }
                return true;
            }
        });
        if(WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            WebViewCompat.addWebMessageListener(game,"BagarreAndroid",Collections.singleton(ORIGIN),(view,message,origin,isMainFrame,reply)->{
                if(!isMainFrame||!ORIGIN.equals(origin.toString()))return;
                try {
                    JSONObject data=new JSONObject(message.getData());
                    if(!"export".equals(data.optString("type"))||pendingExport!=null)return;
                    String text=data.getString("text");byte[] bytes=text.getBytes(StandardCharsets.UTF_8);
                    if(bytes.length>256*1024)throw new IllegalArgumentException("Backup exceeds 256 KB.");
                    pendingExport=bytes;
                    Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("application/json")
                        .putExtra(Intent.EXTRA_TITLE,"zombie-bagarre-backup.json");
                    startActivityForResult(intent,FILE_EXPORT);
                } catch(Exception error) { pendingExport=null;backupResult("Backup could not be exported.",true); }
            });
        }
        game.loadUrl(HOME); immersive();
    }
    private void showFailure(String message) { runOnUiThread(()->new AlertDialog.Builder(this).setTitle("Zombie Bagarre").setMessage(message)
        .setPositiveButton("Reload",(dialog,which)->{if(game!=null){root.removeView(game);game.destroy();game=null;}createGame();})
        .setNegativeButton("Close",(dialog,which)->finish()).show()); }
    private void immersive() { getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY|View.SYSTEM_UI_FLAG_FULLSCREEN|View.SYSTEM_UI_FLAG_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_LAYOUT_STABLE|View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN|View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION); }
    private void hideCustomView(){if(customView==null)return;root.removeView(customView);customView=null;customCallback.onCustomViewHidden();customCallback=null;if(game!=null)game.setVisibility(View.VISIBLE);immersive();}
    private void backupResult(String message,boolean error){
        runOnUiThread(()->{Toast.makeText(this,message,Toast.LENGTH_LONG).show();if(game!=null)game.evaluateJavascript("window.dispatchEvent(new CustomEvent('bagarre-android-export',{detail:{message:"+JSONObject.quote(message)+",error:"+error+"}}))",null);});
    }
    @Override protected void onActivityResult(int request,int result,Intent data){
        super.onActivityResult(request,result,data);
        if(request==FILE_PICKER&&fileCallback!=null){fileCallback.onReceiveValue(result==RESULT_OK&&data!=null?new Uri[]{data.getData()}:null);fileCallback=null;}
        if(request==FILE_EXPORT){
            byte[] bytes=pendingExport;pendingExport=null;
            if(result!=RESULT_OK||data==null||data.getData()==null||bytes==null){backupResult("Export cancelled. Your character is unchanged.",false);return;}
            Uri uri=data.getData();new Thread(()->{try(OutputStream out=getContentResolver().openOutputStream(uri,"wt")){if(out==null)throw new java.io.IOException("No output stream");out.write(bytes);backupResult("Backup saved to the chosen location.",false);}catch(Exception error){backupResult("Backup could not be saved. Please try again.",true);}},"backup-export").start();
        }
    }
    @Override public void onBackPressed(){
        if(customView!=null){hideCustomView();return;}if(game==null){finish();return;}
        game.evaluateJavascript("(()=>{const menu=document.getElementById('menu');if(menu&&!menu.hidden&&!document.querySelector('dialog[open]'))return 'exit';window.dispatchEvent(new CustomEvent('bagarre-android-back'));return 'handled';})()",value->{
            if("\"exit\"".equals(value))new AlertDialog.Builder(this).setTitle("Leave Zombie Bagarre?").setMessage("Your character is saved. Use Save expedition & exit in the pause menu to keep an expedition for next time.").setPositiveButton("Close game",(d,w)->finish()).setNegativeButton("Stay",null).show();
        });
    }
    @Override protected void onPause(){activityActive=false;if(game!=null){WebView current=game;game.evaluateJavascript("window.dispatchEvent(new CustomEvent('bagarre-android-pause'));window.dispatchEvent(new Event('blur'))",ignored->{if(!activityActive&&game==current)current.pauseTimers();});game.onPause();}super.onPause();}
    @Override protected void onResume(){super.onResume();activityActive=true;if(game!=null){game.onResume();game.resumeTimers();game.evaluateJavascript("window.dispatchEvent(new CustomEvent('bagarre-android-resume'))",null);}immersive();}
    @Override public void onWindowFocusChanged(boolean focused){
        super.onWindowFocusChanged(focused);
        if(focused)immersive();
        // System overlays can take input focus without pausing this Activity.
        // Pause combat/audio underneath them; regaining focus never resumes combat.
        if(activityActive&&game!=null)game.evaluateJavascript(focused
            ?"window.dispatchEvent(new CustomEvent('bagarre-android-resume'))"
            :"window.dispatchEvent(new CustomEvent('bagarre-android-pause'));window.dispatchEvent(new Event('blur'))",null);
    }
    @Override protected void onDestroy(){if(fileCallback!=null)fileCallback.onReceiveValue(null);hideCustomView();if(game!=null){root.removeView(game);game.destroy();game=null;}super.onDestroy();}
}
