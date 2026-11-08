package com.courtrise.mobile;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/** Only bundled, trusted app code is loaded in the WebView. */
final class NativeBridge {
  private static final String KEY="court-rise-ai-v1";
  private static final int OPEN=2201, SAVE=2202, LIMIT=20*1024*1024;
  private final Activity activity; private final WebView view;
  private int documentId=-1; private byte[] pendingData;
  NativeBridge(Activity a,WebView v){activity=a;view=v;}
  private SecretKey key() throws Exception {
    KeyStore store=KeyStore.getInstance("AndroidKeyStore");store.load(null);
    if(!store.containsAlias(KEY)){KeyGenerator generator=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");generator.init(new KeyGenParameterSpec.Builder(KEY,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());generator.generateKey();}
    return (SecretKey)store.getKey(KEY,null);
  }
  @JavascriptInterface public boolean secureAvailable(){try{key();return true;}catch(Exception e){return false;}}
  @JavascriptInterface public String encrypt(String plain){try{Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.ENCRYPT_MODE,key());byte[] iv=c.getIV(),payload=c.doFinal(plain.getBytes(StandardCharsets.UTF_8));byte[] all=new byte[iv.length+payload.length];System.arraycopy(iv,0,all,0,iv.length);System.arraycopy(payload,0,all,iv.length,payload.length);return Base64.encodeToString(all,Base64.NO_WRAP);}catch(Exception e){return "";}}
  @JavascriptInterface public String decrypt(String encoded){try{byte[] all=Base64.decode(encoded,Base64.DEFAULT);if(all.length<29)return "";Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.DECRYPT_MODE,key(),new GCMParameterSpec(128,all,0,12));return new String(c.doFinal(all,12,all.length-12),StandardCharsets.UTF_8);}catch(Exception e){return "";}}
  private void reply(int id,JSONObject value){activity.runOnUiThread(()->view.evaluateJavascript("window.__courtNativeReply("+id+","+JSONObject.quote(value.toString())+")",null));}
  private JSONObject result(boolean ok,String value){JSONObject o=new JSONObject();try{o.put("ok",ok);o.put("value",value);}catch(Exception ignored){}return o;}
  @JavascriptInterface public void openDocument(int id){activity.runOnUiThread(()->{if(documentId!=-1){reply(id,result(false,"已有文件操作正在进行"));return;}documentId=id;Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("application/json");try{activity.startActivityForResult(i,OPEN);}catch(Exception e){documentId=-1;reply(id,result(false,"无法打开文件选择器"));}});}
  @JavascriptInterface public void saveDocument(int id,String filename,String encoded){activity.runOnUiThread(()->{if(documentId!=-1){reply(id,result(false,"已有文件操作正在进行"));return;}try{pendingData=Base64.decode(encoded,Base64.DEFAULT);if(pendingData.length>LIMIT)throw new Exception();documentId=id;Intent i=new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType(filename.endsWith(".json")?"application/json":"application/octet-stream").putExtra(Intent.EXTRA_TITLE,filename);activity.startActivityForResult(i,SAVE);}catch(Exception e){pendingData=null;documentId=-1;reply(id,result(false,"无法保存文件"));}});}
  boolean onActivityResult(int request,int resultCode,Intent data){if(request!=OPEN&&request!=SAVE)return false;int id=documentId;documentId=-1;byte[] bytes=pendingData;pendingData=null;if(id<0)return true;if(resultCode!=Activity.RESULT_OK||data==null||data.getData()==null){reply(id,result(true,""));return true;}Uri uri=data.getData();new Thread(()->{try{if(request==SAVE){try(OutputStream out=activity.getContentResolver().openOutputStream(uri,"wt")){if(out==null)throw new Exception();out.write(bytes);}reply(id,result(true,"已保存"));}else{try(InputStream in=activity.getContentResolver().openInputStream(uri)){if(in==null)throw new Exception();byte[] read=readLimited(in);reply(id,result(true,Base64.encodeToString(read,Base64.NO_WRAP)));}}}catch(Exception e){reply(id,result(false,"文件读写失败或文件超过 20 MB"));}}).start();return true;}
  private static byte[] readLimited(InputStream in)throws Exception{ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] buf=new byte[8192];int n,total=0;while((n=in.read(buf))!=-1){total+=n;if(total>LIMIT)throw new IOException("too large");out.write(buf,0,n);}return out.toByteArray();}
  @JavascriptInterface public void request(int id,String url,String headers,String body){new Thread(()->{HttpURLConnection conn=null;try{URL target=new URL(url);if(!"https".equalsIgnoreCase(target.getProtocol()))throw new Exception("仅支持 HTTPS 服务");conn=(HttpURLConnection)target.openConnection();conn.setInstanceFollowRedirects(false);conn.setRequestMethod("POST");conn.setConnectTimeout(15000);conn.setReadTimeout(55000);conn.setDoOutput(true);JSONObject h=new JSONObject(headers);conn.setRequestProperty("Content-Type","application/json");String auth=h.optString("Authorization","");if(!auth.isEmpty())conn.setRequestProperty("Authorization",auth);try(OutputStream o=conn.getOutputStream()){o.write(body.getBytes(StandardCharsets.UTF_8));}int status=conn.getResponseCode();InputStream in=status<400?conn.getInputStream():conn.getErrorStream();String text=in==null?"":new String(readLimited(in),StandardCharsets.UTF_8);JSONObject response=new JSONObject();response.put("status",status);response.put("body",text);reply(id,result(true,response.toString()));}catch(Exception e){reply(id,result(false,"连接失败，请检查网络与服务地址"));}finally{if(conn!=null)conn.disconnect();}}).start();}
}
