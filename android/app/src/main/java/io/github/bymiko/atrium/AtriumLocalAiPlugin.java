package io.github.bymiko.atrium;
import android.app.ActivityManager;
import android.content.Context;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONObject;
@CapacitorPlugin(name = "AtriumLocalAi")
public class AtriumLocalAiPlugin extends Plugin {
    private static boolean nativeLoaded = false; private static String nativeLoadError = "";
    static {
        try {
            System.loadLibrary("atrium_llama");
            nativeLoaded = true;
        } catch (Throwable t) {
            nativeLoaded = false; nativeLoadError = t.toString();
        }
    }
    private native void nativeInit();
    private native void nativeAbort();
    private native void nativeFree();
    private native boolean nativeLoadModel(String path, int nCtx);
    private native String nativeGenerate(String prompt, float temp, int maxTokens);
    private final ExecutorService ioExecutor = Executors.newSingleThreadExecutor();
    private final ExecutorService aiExecutor = Executors.newSingleThreadExecutor();
    private String loadedModelId = null;
    @Override
    public void load() {
        super.load();
        if (nativeLoaded) nativeInit();
    }
    public void onNativeToken(String token) {
        JSObject data = new JSObject();
        data.put("token", token);
        notifyListeners("token", data);
    }
    @PluginMethod
    public void getDeviceMemoryGb(PluginCall call) {
        ActivityManager am = (ActivityManager) getContext().getSystemService(Context.ACTIVITY_SERVICE);
        ActivityManager.MemoryInfo memInfo = new ActivityManager.MemoryInfo();
        double totalGb = 6.0;
        if (am != null) {
            am.getMemoryInfo(memInfo);
            totalGb = Math.round((memInfo.totalMem / (1024.0 * 1024.0 * 1024.0)) * 10.0) / 10.0;
        }
        JSObject ret = new JSObject();
        ret.put("totalGb", totalGb);
        call.resolve(ret);
    }
    @PluginMethod
    public void downloadModel(PluginCall call) {
        String urlStr = call.getString("url", "");
        String rawFilename = call.getString("filename", "model.gguf");
        String safeFilename = rawFilename.replaceAll("[^a-zA-Z0-9._-]", "_");
        if (!safeFilename.endsWith(".gguf")) safeFilename = safeFilename + ".gguf";
        if (!urlStr.startsWith("https://")) {
            JSObject err = new JSObject();
            err.put("ok", false);
            err.put("error", "Only HTTPS URLs are allowed.");
            call.resolve(err);
            return;
        }
        final String finalFilename = safeFilename;
        ioExecutor.execute(() -> {
            File modelsDir = new File(getContext().getFilesDir(), "models");
            if (!modelsDir.exists()) modelsDir.mkdirs();
            File tempFile = new File(modelsDir, finalFilename + ".part");
            File targetFile = new File(modelsDir, finalFilename);
            HttpURLConnection conn = null;
            try {
                URL url = new URL(urlStr);
                conn = (HttpURLConnection) url.openConnection();
                conn.setConnectTimeout(15000);
                conn.setReadTimeout(30000);
                conn.setInstanceFollowRedirects(true);
                int code = conn.getResponseCode();
                if (code < 200 || code >= 300) throw new Exception("HTTP " + code);
                long totalBytes = conn.getContentLengthLong();
                long receivedBytes = 0;
                long lastEmit = 0;
                try (InputStream in = new BufferedInputStream(conn.getInputStream());
                     FileOutputStream out = new FileOutputStream(tempFile)) {
                    byte[] buffer = new byte[8192];
                    int len;
                    while ((len = in.read(buffer)) != -1) {
                        out.write(buffer, 0, len);
                        receivedBytes += len;
                        long now = System.currentTimeMillis();
                        if (now - lastEmit > 250) {
                            lastEmit = now;
                            JSObject prog = new JSObject();
                            prog.put("receivedBytes", receivedBytes);
                            if (totalBytes > 0) prog.put("totalBytes", totalBytes);
                            notifyListeners("downloadProgress", prog);
                        }
                    }
                }
                if (!verifyGgufMagicHeader(tempFile)) {
                    tempFile.delete();
                    throw new Exception("Invalid GGUF binary header.");
                }
                if (targetFile.exists()) targetFile.delete();
                if (!tempFile.renameTo(targetFile)) throw new Exception("Failed to finalize GGUF.");
                JSObject ok = new JSObject();
                ok.put("ok", true);
                ok.put("path", targetFile.getAbsolutePath());
                ok.put("sizeBytes", targetFile.length());
                call.resolve(ok);
            } catch (Exception e) {
                if (tempFile.exists()) tempFile.delete();
                JSObject err = new JSObject();
                err.put("ok", false);
                err.put("error", e.getMessage());
                call.resolve(err);
            } finally {
                if (conn != null) conn.disconnect();
            }
        });
    }
    private boolean verifyGgufMagicHeader(File file) {
        if (file == null || !file.exists() || file.length() < 4) return false;
        try (FileInputStream fis = new FileInputStream(file)) {
            byte[] magic = new byte[4];
            if (fis.read(magic) != 4) return false;
            return (magic[0] & 0xFF) == 0x47 && (magic[1] & 0xFF) == 0x47 && (magic[2] & 0xFF) == 0x55 && (magic[3] & 0xFF) == 0x46;
        } catch (Exception e) {
            return false;
        }
    }
    @PluginMethod
    public void loadModel(PluginCall call) {
        String id = call.getString("id", "");
        String rawFilename = call.getString("filename", "");
        int ctx = call.getInt("contextLength", 2048);
        String safeFilename = rawFilename.replaceAll("[^a-zA-Z0-9._-]", "_");
        File modelFile = new File(new File(getContext().getFilesDir(), "models"), safeFilename);
        if (safeFilename.isEmpty() || !modelFile.exists() || !verifyGgufMagicHeader(modelFile)) {
            JSObject err = new JSObject();
            err.put("ok", false);
            err.put("error", "Valid GGUF model file not found.");
            call.resolve(err);
            return;
        }
        if (!nativeLoaded) {
            JSObject err = new JSObject();
            err.put("ok", false);
            err.put("error", "Native llama.cpp unavailable: " + nativeLoadError + "");
            call.resolve(err);
            return;
        }
        aiExecutor.execute(() -> {
            if (!nativeLoadModel(modelFile.getAbsolutePath(), ctx)) {
                JSObject err = new JSObject();
                err.put("ok", false);
                err.put("error", "Failed to load GGUF in RAM.");
                call.resolve(err);
                return;
            }
            loadedModelId = id;
            long sizeMb = (modelFile.length() / (1024 * 1024)) + 350;
            JSObject ok = new JSObject();
            ok.put("ok", true);
            ok.put("estimatedRamMb", sizeMb);
            call.resolve(ok);
        });
    }
    @PluginMethod
    public void unloadModel(PluginCall call) {
        aiExecutor.execute(() -> {
            if (nativeLoaded) nativeFree();
            loadedModelId = null;
            System.gc();
            JSObject ok = new JSObject();
            ok.put("ok", true);
            call.resolve(ok);
        });
    }
    @PluginMethod
    public void deleteModel(PluginCall call) {
        String id = call.getString("id", "");
        String rawFilename = call.getString("filename", "");
        String safeFilename = rawFilename.replaceAll("[^a-zA-Z0-9._-]", "_");
        if (id.equals(loadedModelId)) {
            if (nativeLoaded) nativeAbort();
            loadedModelId = null;
        }
        ioExecutor.execute(() -> {
            if (nativeLoaded && loadedModelId == null) nativeFree();
            File modelFile = new File(new File(getContext().getFilesDir(), "models"), safeFilename);
            boolean deleted = !modelFile.exists() || modelFile.delete();
            JSObject ok = new JSObject();
            ok.put("ok", deleted);
            call.resolve(ok);
        });
    }

    @PluginMethod
    public void generateChat(PluginCall call) {
        if (!nativeLoaded || loadedModelId == null || loadedModelId.isEmpty()) {
            JSObject err = new JSObject();
            err.put("error", "No GGUF model loaded in RAM.");
            call.resolve(err);
            return;
        }
        JSArray messages = call.getArray("messages");
        float temp = call.getFloat("temperature", 0.75f);
        int maxTokens = call.getInt("maxTokens", 512);
        StringBuilder prompt = new StringBuilder();
        if (messages != null) {
            for (int i = 0; i < messages.length(); i++) {
                try {
                    JSONObject m = messages.getJSONObject(i);
                    String role = m.optString("role", "user");
                    String content = m.optString("content", "");
                    prompt.append("<|im_start|>").append(role).append("\n").append(content).append("<|im_end|>\n");
                } catch (Exception ignored) {}
            }
        }
        prompt.append("<|im_start|>assistant\n");
        final String finalPrompt = prompt.toString();
        aiExecutor.execute(() -> {
            String reply = nativeGenerate(finalPrompt, temp, maxTokens);
            JSObject res = new JSObject();
            res.put("text", reply);
            call.resolve(res);
        });
    }
}