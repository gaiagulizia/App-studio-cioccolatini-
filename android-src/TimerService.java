package com.produttivita.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;

import androidx.core.app.NotificationCompat;

/**
 * TimerService — Foreground Service
 *
 * Mantiene il conto del tempo anche con lo schermo spento.
 * Usa un WakeLock CPU per impedire che il processore vada in sleep.
 * Trasmette ogni secondo un Intent che TimerPlugin riceve
 * e invia al layer JavaScript via Capacitor.
 */
public class TimerService extends Service {

    public static final String CHANNEL_ID   = "produttivita_timer";
    public static final int    NOTIF_ID     = 42;
    public static final int    NOTIF_DONE   = 43;

    public static final String ACTION_START_SW    = "START_STOPWATCH";
    public static final String ACTION_START_TIMER = "START_TIMER";
    public static final String ACTION_STOP        = "STOP";
    public static final String ACTION_RESET       = "RESET";

    public static final String BROADCAST_ACTION = "com.produttivita.TIMER_UPDATE";

    private Handler          handler;
    private Runnable         ticker;
    private PowerManager.WakeLock wakeLock;

    private int     seconds   = 0;
    private boolean countdown = false;
    private boolean running   = false;

    /* ---- Lifecycle ---- */

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        handler = new Handler(Looper.getMainLooper());

        PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
        wakeLock = pm.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "produttivita:TimerWakeLock"
        );
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) return START_NOT_STICKY;

        String action = intent.getAction();
        if (action == null) return START_NOT_STICKY;

        switch (action) {
            case ACTION_START_SW:
                seconds  = intent.getIntExtra("seconds", 0);
                countdown = false;
                startForeground(NOTIF_ID, buildNotification());
                acquireWake();
                startTicking();
                break;

            case ACTION_START_TIMER:
                seconds  = intent.getIntExtra("seconds", 1500);
                countdown = true;
                startForeground(NOTIF_ID, buildNotification());
                acquireWake();
                startTicking();
                break;

            case ACTION_STOP:
                stopTicking();
                // Rimane in foreground (l'utente può riprendere)
                break;

            case ACTION_RESET:
                stopTicking();
                releaseWake();
                stopForeground(true);
                stopSelf();
                break;
        }
        return START_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }

    @Override
    public void onDestroy() {
        stopTicking();
        releaseWake();
        super.onDestroy();
    }

    /* ---- Tick ---- */

    private void startTicking() {
        if (running) return;
        running = true;

        ticker = new Runnable() {
            @Override
            public void run() {
                if (!running) return;

                if (countdown) {
                    seconds--;
                    if (seconds <= 0) {
                        seconds = 0;
                        broadcast("timer-done", 0);
                        showDoneNotification();
                        releaseWake();
                        stopForeground(false);
                        stopSelf();
                        return;
                    }
                    broadcast("timer-tick", seconds);
                } else {
                    seconds++;
                    broadcast("sw-tick", seconds);
                }

                updateNotification();
                handler.postDelayed(this, 1000);
            }
        };
        handler.postDelayed(ticker, 1000);
    }

    private void stopTicking() {
        running = false;
        if (ticker != null) {
            handler.removeCallbacks(ticker);
            ticker = null;
        }
    }

    /* ---- Broadcast verso TimerPlugin ---- */

    private void broadcast(String type, int secs) {
        Intent i = new Intent(BROADCAST_ACTION);
        i.putExtra("type", type);
        i.putExtra("seconds", secs);
        sendBroadcast(i);
        // Notifica anche Capacitor direttamente
        TimerPlugin.dispatchEvent(type, secs);
    }

    /* ---- WakeLock ---- */

    private void acquireWake() {
        if (!wakeLock.isHeld()) wakeLock.acquire();
    }

    private void releaseWake() {
        if (wakeLock.isHeld()) wakeLock.release();
    }

    /* ---- Notifiche ---- */

    private String formatTime(int sec) {
        int h = sec / 3600, m = (sec % 3600) / 60, s = sec % 60;
        if (h > 0) return String.format("%02d:%02d:%02d", h, m, s);
        return String.format("%02d:%02d", m, s);
    }

    private Notification buildNotification() {
        String text = formatTime(seconds) + (countdown ? " rimanenti" : " trascorsi");
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("⏱ Produttività — Timer attivo")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setOngoing(true)
            .setSilent(true)
            .build();
    }

    private void updateNotification() {
        NotificationManager nm =
            (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        nm.notify(NOTIF_ID, buildNotification());
    }

    private void showDoneNotification() {
        Notification n = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("⏱ Produttività")
            .setContentText("Tempo finito! 🎉")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setAutoCancel(true)
            .build();
        NotificationManager nm =
            (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        nm.notify(NOTIF_DONE, n);
    }

    private void createNotificationChannel() {
        NotificationChannel ch = new NotificationChannel(
            CHANNEL_ID,
            "Timer Produttività",
            NotificationManager.IMPORTANCE_LOW
        );
        ch.setDescription("Mostra il timer in esecuzione in background");
        ch.setSound(null, null);
        NotificationManager nm =
            (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        nm.createNotificationChannel(ch);
    }
}
