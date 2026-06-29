package com.produttivita.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Registra il plugin PRIMA di super.onCreate()
        registerPlugin(TimerPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
