package io.github.bymiko.atrium;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.view.Display;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.PermissionRequest;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AtriumLocalAiPlugin.class);
        super.onCreate(savedInstanceState);
        enableHighRefreshRate();

        if (this.bridge != null && this.bridge.getWebView() != null) {
            this.bridge.getWebView().setWebChromeClient(new BridgeWebChromeClient(this.bridge) {
                @Override
                public void onPermissionRequest(final PermissionRequest request) {
                    runOnUiThread(() -> {
                        if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                            ActivityCompat.requestPermissions(MainActivity.this, new String[]{Manifest.permission.RECORD_AUDIO}, 1001);
                        }
                        request.grant(request.getResources());
                    });
                }
            });
        }
    }

    private void enableHighRefreshRate() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Window window = getWindow();
            if (window == null) return;
            Display display = Build.VERSION.SDK_INT >= Build.VERSION_CODES.R
                ? getDisplay()
                : getWindowManager().getDefaultDisplay();
            if (display == null) return;
            Display.Mode[] modes = display.getSupportedModes();
            Display.Mode bestMode = display.getMode();
            for (Display.Mode mode : modes) {
                if (mode.getPhysicalWidth() == bestMode.getPhysicalWidth()
                    && mode.getPhysicalHeight() == bestMode.getPhysicalHeight()
                    && mode.getRefreshRate() > bestMode.getRefreshRate()) {
                    bestMode = mode;
                }
            }
            WindowManager.LayoutParams params = window.getAttributes();
            params.preferredDisplayModeId = bestMode.getModeId();
            window.setAttributes(params);
        }
    }
}