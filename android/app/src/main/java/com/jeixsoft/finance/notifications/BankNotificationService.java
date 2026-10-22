package com.jeixsoft.finance.notifications;

import android.app.Notification;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;

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

    @Override
    public void onListenerConnected() {
        Log.i(TAG, "Listener conectado");
        KeepAliveWorker.schedule(this);

        // Recupera lo que llegó mientras el lector estuvo caído y siga en el panel
        // (los ids fijos evitan subir dos veces la misma notificación)
        try {
            StatusBarNotification[] active = getActiveNotifications();
            if (active != null) {
                for (StatusBarNotification sbn : active) handle(sbn);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error recuperando notificaciones activas", e);
        }

        UploadWorker.uploadNow(this);
    }

    @Override
    public void onListenerDisconnected() {
        Log.w(TAG, "Listener desconectado: se pide reconectar");
        KeepAliveWorker.rebind(this);
    }

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        try {
            handle(sbn);
        } catch (Exception e) {
            Log.e(TAG, "Error leyendo notificación", e);
        }
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

        String full = title + " " + body;
        if (body.isEmpty() || !MONEY.matcher(full).find()) return;
        if (isSms && !BANK_TEXT.matcher(full).find()) return;

        JSONObject item = new JSONObject();
        item.put("id", idFor(body));
        item.put("package", pkg);
        item.put("bank", bankFor(pkg, full));
        item.put("title", title);
        item.put("text", body);
        item.put("receivedAt", isoDate(sbn.getPostTime()));

        if (new PendingStore(this).enqueue(item)) {
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
