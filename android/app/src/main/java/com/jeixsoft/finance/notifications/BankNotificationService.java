package com.jeixsoft.finance.notifications;

import android.app.Notification;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;

import org.json.JSONException;
import org.json.JSONObject;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.text.SimpleDateFormat;
import java.util.Arrays;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;
import java.util.regex.Pattern;

/**
 * Lee las notificaciones de Bancolombia y NU aunque la app esté cerrada.
 * Cada una se guarda en el celular y se sube sola a Firestore
 * ("Por confirmar") con UploadWorker, sin necesidad de abrir la app.
 */
public class BankNotificationService extends NotificationListenerService {

    private static final String TAG = "JxBankNotifications";

    // Apps de los bancos: se toman todas sus notificaciones con un monto
    private static final List<String> BANK_PACKAGES = Arrays.asList(
        "co.com.bancolombia.personas.superapp",
        "com.todo1.mobile",
        "com.nu.production"
    );

    // Mensajes de texto: solo si mencionan al banco
    private static final List<String> SMS_PACKAGES = Arrays.asList(
        "com.google.android.apps.messaging",
        "com.android.mms",
        "com.transsion.messaging",
        // Notificaciones de prueba enviadas por USB (adb)
        "com.android.shell"
    );

    private static final Pattern BANK_TEXT = Pattern.compile("bancolombia|nubank|\\bnu\\b", Pattern.CASE_INSENSITIVE);
    // Un movimiento siempre trae un monto: $1.000, COP27.800,00, 1,887,533.00
    private static final Pattern MONEY = Pattern.compile("(\\$|COP)\\s?\\d|\\d{1,3}([.,]\\d{3})+");

    // Repaso del panel como mucho cada 2 minutos
    private static final long SWEEP_INTERVAL_MS = 2 * 60 * 1000;

    // Lector conectado en este proceso (lo usa el vigilante para repasar el panel)
    private static volatile BankNotificationService instance;
    private long lastSweep = 0;
    private ConnectivityManager.NetworkCallback networkCallback;

    public static BankNotificationService getInstance() {
        return instance;
    }

    @Override
    public void onListenerConnected() {
        Log.i(TAG, "Listener conectado");
        instance = this;
        KeepAliveWorker.schedule(this);
        watchNetwork();

        // Recupera lo que llegó mientras el lector estuvo caído y siga en el panel
        // (los ids fijos evitan subir dos veces la misma notificación)
        sweep(true);
        UploadWorker.uploadNow(this);
    }

    @Override
    public void onListenerDisconnected() {
        Log.w(TAG, "Listener desconectado: se pide reconectar");
        instance = null;
        unwatchNetwork();
        KeepAliveWorker.rebind(this);
    }

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        try {
            handle(sbn);
        } catch (Exception e) {
            Log.e(TAG, "Error leyendo notificación", e);
        }
        // Cualquier notificación (de cualquier app) sirve para repasar el panel
        // por si el celular durmió el lector cuando llegó un SMS del banco
        sweep(false);
    }

    /**
     * Revisa las notificaciones que siguen en el panel y guarda las del banco
     * que no se hayan visto. force=false respeta el intervalo mínimo.
     */
    public synchronized void sweep(boolean force) {
        long now = System.currentTimeMillis();
        if (!force && now - lastSweep < SWEEP_INTERVAL_MS) return;
        lastSweep = now;

        try {
            StatusBarNotification[] active = getActiveNotifications();
            if (active == null) return;
            for (StatusBarNotification sbn : active) handle(sbn);
        } catch (Exception e) {
            Log.e(TAG, "Error repasando el panel", e);
        }
    }

    // Sube la cola apenas Android confirma internet real (Wi-Fi o datos con saldo)
    private void watchNetwork() {
        if (networkCallback != null) return;
        ConnectivityManager cm = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
        if (cm == null) return;

        networkCallback = new ConnectivityManager.NetworkCallback() {
            @Override
            public void onCapabilitiesChanged(@NonNull Network network, @NonNull NetworkCapabilities caps) {
                if (caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
                    && PendingStore.get(BankNotificationService.this).getQueue().length() > 0) {
                    Log.i(TAG, "Internet disponible: subiendo cola");
                    UploadWorker.uploadNow(BankNotificationService.this);
                }
            }
        };

        try {
            cm.registerDefaultNetworkCallback(networkCallback);
        } catch (Exception e) {
            Log.e(TAG, "No se pudo vigilar la red", e);
            networkCallback = null;
        }
    }

    private void unwatchNetwork() {
        if (networkCallback == null) return;
        ConnectivityManager cm = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
        try {
            if (cm != null) cm.unregisterNetworkCallback(networkCallback);
        } catch (Exception ignored) {
            // Ya estaba sin registrar
        }
        networkCallback = null;
    }

    private void handle(StatusBarNotification sbn) throws JSONException {
        String pkg = sbn.getPackageName();
        boolean isBankApp = BANK_PACKAGES.contains(pkg);
        boolean isSms = SMS_PACKAGES.contains(pkg);
        if (!isBankApp && !isSms) return;

        Notification notification = sbn.getNotification();
        if ((notification.flags & Notification.FLAG_GROUP_SUMMARY) != 0) return;

        Bundle extras = notification.extras;
        String title = text(extras.getCharSequence(Notification.EXTRA_TITLE));

        // Conversaciones de SMS (Google Mensajes): todos los mensajes del mismo
        // número vienen en UNA notificación; se toma cada mensaje por separado
        NotificationCompat.MessagingStyle style =
            NotificationCompat.MessagingStyle.extractMessagingStyleFromNotification(notification);
        if (style != null && !style.getMessages().isEmpty()) {
            for (NotificationCompat.MessagingStyle.Message message : style.getMessages()) {
                long time = message.getTimestamp() > 0 ? message.getTimestamp() : sbn.getPostTime();
                save(pkg, title, text(message.getText()), time, isSms);
            }
            return;
        }

        String body = text(extras.getCharSequence(Notification.EXTRA_BIG_TEXT));
        if (body.isEmpty()) body = text(extras.getCharSequence(Notification.EXTRA_TEXT));
        if (body.isEmpty()) {
            CharSequence[] lines = extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES);
            if (lines != null) {
                StringBuilder sb = new StringBuilder();
                for (CharSequence line : lines) sb.append(line).append(' ');
                body = sb.toString().trim();
            }
        }

        save(pkg, title, body, sbn.getPostTime(), isSms);
    }

    // Guarda en la cola un mensaje del banco (si trae un monto) y lo sube
    private void save(String pkg, String title, String body, long time, boolean isSms) throws JSONException {
        String full = title + " " + body;
        if (body.isEmpty() || !MONEY.matcher(full).find()) return;
        if (isSms && !BANK_TEXT.matcher(full).find()) return;

        JSONObject item = new JSONObject();
        item.put("id", idFor(body));
        item.put("package", pkg);
        item.put("bank", bankFor(pkg, full));
        item.put("title", title);
        item.put("text", body);
        item.put("receivedAt", isoDate(time));

        if (PendingStore.get(this).enqueue(item)) {
            Log.i(TAG, "Guardada notificación de " + pkg);
            UploadWorker.uploadNow(this);
        }
    }

    private static String bankFor(String pkg, String full) {
        if (pkg.equals("com.nu.production")) return "nu";
        if (BANK_PACKAGES.contains(pkg)) return "bancolombia";
        return full.toLowerCase(Locale.ROOT).contains("bancolombia") ? "bancolombia" : "nu";
    }

    private static String text(CharSequence value) {
        return value == null ? "" : value.toString().trim();
    }

    private static String isoDate(long millis) {
        SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        format.setTimeZone(TimeZone.getTimeZone("UTC"));
        return format.format(new Date(millis));
    }

    // Id estable por texto: si llega dos veces (push y SMS, o se actualiza) no se duplica
    private static String idFor(String body) {
        String normalized = body.replaceAll("\\s+", " ").trim().toLowerCase(Locale.ROOT);
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(normalized.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder("ntf_");
            for (int i = 0; i < 12; i++) hex.append(String.format("%02x", hash[i]));
            return hex.toString();
        } catch (Exception e) {
            return "ntf_" + Integer.toHexString(normalized.hashCode());
        }
    }
}
