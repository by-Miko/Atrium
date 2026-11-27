package io.github.bymiko.atrium;

import android.app.ActivityManager;
import android.content.Context;
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

@CapacitorPlugin(name = "AtriumLocalAi")
public class AtriumLocalAiPlugin extends Plugin {
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private String loadedModelId = null;

    @PluginMethod
    public void getDeviceMemoryGb(PluginCall call) {
        ActivityManager am = (ActivityManager) getContext().getSystemService(Context.ACTIVITY_SERVICE);
        ActivityManager.MemoryInfo memInfo = new ActivityManager.MemoryInfo();
        if (am != null) {
            am.getMemoryInfo(memInfo);
            double totalGb = Math.round((memInfo.totalMem / (1024.0 * 1024.0 * 1024.0)) * 10.0) / 10.0;
            JSObject ret = new JSObject();
            ret.put("totalGb", totalGb);
            call.resolve(ret);
        } else {
            JSObject ret = new JSObject();
            ret.put("totalGb", 6.0);
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void downloadModel(PluginCall call) {
        String urlStr = call.getString("url", "");
        String rawFilename = call.getString("filename", "model.gguf");
        String safeFilename = rawFilename.replaceAll("[^a-zA-Z0-9._-]", "_");
        if (!safeFilename.endsWith(".gguf")) {
            safeFilename = safeFilename + ".gguf";
        }
        if (!urlStr.startsWith("https://")) {
            JSObject err = new JSObject();
            err.put("ok", false);
            err.put("error", "Only HTTPS URLs are allowed for model downloads.");
            call.resolve(err);
            return;
        }
        final String finalFilename = safeFilename;
        executor.execute(() -> {
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
                if (code < 200 || code >= 300) {
                    throw new Exception("HTTP " + code);
                }
                long totalBytes = conn.getContentLengthLong();
                long receivedBytes = 0;
                long lastEmit = 0;
                try (InputStream in = new BufferedInputStream(conn.getInputStream());
                     FileOutputStream out = new FileOutputStream(tempFile)) {
                    byte[] buffer = new byte[32768];
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
                    throw new Exception("Invalid GGUF binary header (expected 0x47475546).");
                }
                if (targetFile.exists()) targetFile.delete();
                if (!tempFile.renameTo(targetFile)) {
                    throw new Exception("Failed to finalize GGUF file.");
                }
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
            return magic[0] == 0x47 && magic[1] == 0x47 && magic[2] == 0x55 && magic[3] == 0x46;
        } catch (Exception e) {
            return false;
        }
    }

    @PluginMethod
    public void loadModel(PluginCall call) {
        String id = call.getString("id", "");
        String rawFilename = call.getString("filename", "");
        String safeFilename = rawFilename.replaceAll("[^a-zA-Z0-9._-]", "_");
        File modelFile = new File(new File(getContext().getFilesDir(), "models"), safeFilename);
        if (!safeFilename.isEmpty() && (!modelFile.exists() || !verifyGgufMagicHeader(modelFile))) {
            JSObject err = new JSObject();
            err.put("ok", false);
            err.put("error", "Valid GGUF model file not found on device.");
            call.resolve(err);
            return;
        }
        loadedModelId = id;
        long sizeMb = modelFile.exists() ? (modelFile.length() / (1024 * 1024)) + 350 : 1400;
        JSObject ok = new JSObject();
        ok.put("ok", true);
        ok.put("estimatedRamMb", sizeMb);
        call.resolve(ok);
    }

    @PluginMethod
    public void unloadModel(PluginCall call) {
        loadedModelId = null;
        System.gc();
        JSObject ok = new JSObject();
        ok.put("ok", true);
        call.resolve(ok);
    }

    @PluginMethod
    public void generateChat(PluginCall call) {
        if (loadedModelId == null || loadedModelId.isEmpty()) {
            JSObject err = new JSObject();
            err.put("error", "No GGUF model loaded in RAM.");
            call.resolve(err);
            return;
        }
        JSObject res = new JSObject();
        res.put("error", "Native JNI llama.cpp runtime pending Phase 2 binary link; use 127.0.0.1 loopback server or Desktop Mobile Link.");
        call.resolve(res);
    }
}