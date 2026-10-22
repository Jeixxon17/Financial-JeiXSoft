package com.jeixsoft.finance.notifications;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Al encender el celular o actualizar la app: reconecta el lector y el vigilante. */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        KeepAliveWorker.schedule(context);
        KeepAliveWorker.rebind(context);
        UploadWorker.uploadNow(context);
    }
}
