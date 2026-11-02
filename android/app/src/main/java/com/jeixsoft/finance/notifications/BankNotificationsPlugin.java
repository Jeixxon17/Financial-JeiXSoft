package com.jeixsoft.finance.notifications;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.Context;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.PowerManager;
import android.provider.Settings;

import androidx.core.app.NotificationManagerCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/** Puente entre la app web y el lector de notificaciones nativo. */
@CapacitorPlugin(
    name = "BankNotifications",
    permissions = { @Permission(strings = { Manifest.permission.READ_SMS }, alias = "sms") }
)
public class BankNotificationsPlugin extends Plugin {

    @Override
    public void load() {
        // Si Android desconectó el lector, se le pide reconectarse al abrir la app
        KeepAliveWorker.ensureConnected(getContext());
        KeepAliveWorker.schedule(getContext());
        UploadWorker.uploadNow(getContext());
    }

    private boolean isPermissionGranted() {
        return NotificationManagerCompat.getEnabledListenerPackages(getContext()).contains(getContext().getPackageName());
    }

    private boolean isIgnoringBatteryOptimizations() {
        PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
        return pm != null && pm.isIgnoringBatteryOptimizations(getContext().getPackageName());
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject result = new JSObject();
        result.put("permission", isPermissionGranted());
        result.put("battery", isIgnoringBatteryOptimizations());
        result.put("session", PendingStore.get(getContext()).hasSession());
        result.put("queued", PendingStore.get(getContext()).getQueue().length());
        call.resolve(result);
    }

    @PluginMethod
    public void openPermissionSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    // Pide que Android no cierre el lector para ahorrar batería
    @SuppressLint("BatteryLife")
    @PluginMethod
    public void requestIgnoreBatteryOptimizations(PluginCall call) {
        if (!isIgnoringBatteryOptimizations()) {
            Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        }
        call.resolve();
    }

    // La app entrega la sesión al desbloquear con el PIN, para subir sin abrirla
    @PluginMethod
    public void setSession(PluginCall call) {
        String apiKey = call.getString("apiKey");
        String projectId = call.getString("projectId");
        String refreshToken = call.getString("refreshToken");
        if (apiKey == null || projectId == null || refreshToken == null) {
            call.reject("Faltan datos de sesión");
            return;
        }
        PendingStore.get(getContext()).saveSession(apiKey, projectId, refreshToken);
        UploadWorker.uploadNow(getContext());
        call.resolve();
    }

    @PluginMethod
    public void flush(PluginCall call) {
        UploadWorker.uploadNow(getContext());
        call.resolve();
    }

    // SMS del banco guardados en el celular entre dos fechas (from/to en ms),
    // para recuperar movimientos que el lector no alcanzó a tomar
    @PluginMethod
    public void readBankSms(PluginCall call) {
        if (getPermissionState("sms") != PermissionState.GRANTED) {
            requestPermissionForAlias("sms", call, "smsPermissionCallback");
            return;
        }
        querySms(call);
    }

    @PermissionCallback
    private void smsPermissionCallback(PluginCall call) {
        if (getPermissionState("sms") == PermissionState.GRANTED) querySms(call);
        else call.reject("Sin permiso para leer los SMS", "SMS_DENIED");
    }

    private void querySms(PluginCall call) {
        long from = call.getLong("from", 0L);
        long to = call.getLong("to", System.currentTimeMillis());
        JSArray messages = new JSArray();

        try (Cursor cursor = getContext().getContentResolver().query(
            Uri.parse("content://sms/inbox"),
            new String[] { "address", "body", "date" },
            "date >= ? AND date <= ?",
            new String[] { String.valueOf(from), String.valueOf(to) },
            "date DESC"
        )) {
            if (cursor != null) {
                while (cursor.moveToNext()) {
                    String address = cursor.getString(0) == null ? "" : cursor.getString(0);
                    String body = cursor.getString(1) == null ? "" : cursor.getString(1).trim();
                    String full = address + " " + body;
                    // Mismo filtro que el lector: del banco y con un monto
                    if (body.isEmpty() || !BankNotificationService.MONEY.matcher(full).find()) continue;
                    if (!BankNotificationService.BANK_TEXT.matcher(full).find()) continue;

                    JSObject item = new JSObject();
                    item.put("id", BankNotificationService.idFor(body));
                    item.put("package", "sms");
                    item.put("bank", BankNotificationService.bankFor("sms", full));
                    item.put("title", address);
                    item.put("text", body);
                    item.put("receivedAt", BankNotificationService.isoDate(cursor.getLong(2)));
                    messages.put(item);
                }
            }
        } catch (Exception e) {
            call.reject("No se pudieron leer los SMS: " + e.getMessage());
            return;
        }

        JSObject result = new JSObject();
        result.put("messages", messages);
        call.resolve(result);
    }
}
