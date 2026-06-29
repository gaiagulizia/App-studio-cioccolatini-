package com.produttivita.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * TimerPlugin — Capacitor Plugin
 *
 * Espone al JavaScript i metodi:
 *   TimerNative.startStopwatch({ seconds })
 *   TimerNative.startTimer({ seconds })
 *   TimerNative.stop()
 *
 * Emette l'evento "timerUpdate" con { type, seconds }.
 */
@CapacitorPlugin(name = "TimerNative")
public class TimerPlugin extends Plugin {

    private static TimerPlugin instance;
    private BroadcastReceiver  receiver;

    @Override
    public void load() {
        instance = this;

        // Ricevi i broadcast inviati da TimerService
        receiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context ctx, Intent intent) {
                String type    = intent.getStringExtra("type");
                int    seconds = intent.getIntExtra("seconds", 0);
                dispatchEvent(type, seconds);
            }
        };

        IntentFilter filter = new IntentFilter(TimerService.BROADCAST_ACTION);
        getContext().registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED);
    }

    /** Chiamato da TimerService direttamente (stesso processo) */
    public static void dispatchEvent(String type, int seconds) {
        if (instance == null) return;
        JSObject data = new JSObject();
        data.put("type", type);
        data.put("seconds", seconds);
        instance.notifyListeners("timerUpdate", data);
    }

    /* ---- Metodi esposti al JavaScript ---- */

    @PluginMethod
    public void startStopwatch(PluginCall call) {
        int seconds = call.getInt("seconds", 0);
        Intent i = new Intent(getContext(), TimerService.class);
        i.setAction(TimerService.ACTION_START_SW);
        i.putExtra("seconds", seconds);
        getContext().startForegroundService(i);
        call.resolve();
    }

    @PluginMethod
    public void startTimer(PluginCall call) {
        int seconds = call.getInt("seconds", 1500);
        Intent i = new Intent(getContext(), TimerService.class);
        i.setAction(TimerService.ACTION_START_TIMER);
        i.putExtra("seconds", seconds);
        getContext().startForegroundService(i);
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        Intent i = new Intent(getContext(), TimerService.class);
        i.setAction(TimerService.ACTION_STOP);
        getContext().startService(i);
        call.resolve();
    }

    @PluginMethod
    public void reset(PluginCall call) {
        Intent i = new Intent(getContext(), TimerService.class);
        i.setAction(TimerService.ACTION_RESET);
        getContext().startService(i);
        call.resolve();
    }

    /* ---- Cleanup ---- */

    @Override
    protected void handleOnDestroy() {
        try { getContext().unregisterReceiver(receiver); } catch (Exception ignored) {}
        instance = null;
        super.handleOnDestroy();
    }
}
