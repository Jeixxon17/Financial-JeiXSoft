package com.jeixsoft.finance.notifications;

import android.content.ComponentName;
import android.content.Context;
import android.content.pm.PackageManager;
import android.service.notification.NotificationListenerService;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationManagerCompat;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import java.util.concurrent.TimeUnit;

/**
 * Vigilante: cada 15 minutos le pide a Android reconectar el lector de
 * notificaciones. Algunos celulares (TECNO/HiOS) matan el proceso y no lo
 * reinician solos; al reconectarse, el lector recupera lo que siga en el panel.
 */
public class KeepAliveWorker extends Worker {

    private static final String TAG = "JxBankNotifications";
    private static final String WORK_NAME = "jx-keepalive-listener";

    public KeepAliveWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    public static void schedule(Context context) {
        PeriodicWorkRequest request = new PeriodicWorkRequest.Builder(KeepAliveWorker.class, 15, TimeUnit.MINUTES).build();
        WorkManager.getInstance(context.getApplicationContext())
            .enqueueUniquePeriodicWork(WORK_NAME, ExistingPeriodicWorkPolicy.KEEP, request);
    }

    public static void rebind(Context context) {
        if (!isGranted(context)) return;
        NotificationListenerService.requestRebind(new ComponentName(context, BankNotificationService.class));
    }

    /**
     * Asegura que el lector esté conectado a ESTE proceso. HiOS reinicia el
     * proceso y Android sigue creyendo que el lector está conectado (a la
     * conexión vieja), así que requestRebind no hace nada y no llegan
     * notificaciones. Apagar y encender el componente fuerza una conexión nueva.
     */
    public static void ensureConnected(Context context) {
        if (!isGranted(context) || BankNotificationService.getInstance() != null) return;

        Log.w(TAG, "Lector sin conexión en este proceso: forzando reconexión");
        ComponentName component = new ComponentName(context, BankNotificationService.class);
        PackageManager pm = context.getPackageManager();
        pm.setComponentEnabledSetting(component,
            PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP);
        pm.setComponentEnabledSetting(component,
            PackageManager.COMPONENT_ENABLED_STATE_ENABLED, PackageManager.DONT_KILL_APP);
        NotificationListenerService.requestRebind(component);
    }

    private static boolean isGranted(Context context) {
        return NotificationManagerCompat.getEnabledListenerPackages(context)
            .contains(context.getPackageName());
    }

    @NonNull
    @Override
    public Result doWork() {
        Log.i(TAG, "Vigilante: revisando lector");
        ensureConnected(getApplicationContext());

        // Si el lector sigue vivo, repasa el panel por si se le pasó algo
        BankNotificationService service = BankNotificationService.getInstance();
        if (service != null) service.sweep(true);

        UploadWorker.uploadNow(getApplicationContext());
        return Result.success();
    }
}
