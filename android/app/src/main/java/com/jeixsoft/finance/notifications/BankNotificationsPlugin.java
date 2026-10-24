package com.jeixsoft.finance.notifications;

import android.annotation.SuppressLint;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.PowerManager;
import android.provider.Settings;

import androidx.core.app.NotificationManagerCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Puente entre la app web y el lector de notificaciones nativo. */
@CapacitorPlugin(name = "BankNotifications")
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
}
