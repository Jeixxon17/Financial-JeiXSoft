package com.jeixsoft.finance.notifications;

import android.content.ComponentName;
import android.content.Context;
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
        boolean granted = NotificationManagerCompat.getEnabledListenerPackages(context)
            .contains(context.getPackageName());
        if (!granted) return;

        NotificationListenerService.requestRebind(new ComponentName(context, BankNotificationService.class));
    }

    @NonNull
    @Override
    public Result doWork() {
        Log.i(TAG, "Vigilante: reconectando lector");
        rebind(getApplicationContext());
        UploadWorker.uploadNow(getApplicationContext());
        return Result.success();
    }
}
