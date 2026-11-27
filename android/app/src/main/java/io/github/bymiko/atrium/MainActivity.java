package io.github.bymiko.atrium;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AtriumLocalAiPlugin.class);
        super.onCreate(savedInstanceState);
    }
}