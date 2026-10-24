package com.jeixsoft.finance.notifications;

import android.content.Context;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.work.BackoffPolicy;
import androidx.work.Constraints;
import androidx.work.ExistingWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.OneTimeWorkRequest;
import androidx.work.WorkManager;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;
import java.util.concurrent.TimeUnit;

/**
 * Sube la cola de notificaciones a Firestore (colección pendingTransactions)
 * usando la API REST, con la sesión que la app guardó al desbloquear con el PIN.
 * Corre aunque la app esté cerrada; sin internet, Android lo reintenta después.
 */
public class UploadWorker extends Worker {

    private static final String TAG = "JxBankNotifications";
    private static final String WORK_NAME = "jx-upload-bank-notifications";

    public UploadWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    /** Programa la subida de respaldo (Android la corre cuando haya internet). */
    public static void enqueue(Context context) {
        OneTimeWorkRequest request = new OneTimeWorkRequest.Builder(UploadWorker.class)
            .setConstraints(new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            // Reintento fijo cada minuto (exponencial llegaba a esperar horas)
            .setBackoffCriteria(BackoffPolicy.LINEAR, 60, TimeUnit.SECONDS)
            .build();

        WorkManager.getInstance(context.getApplicationContext())
            .enqueueUniqueWork(WORK_NAME, ExistingWorkPolicy.REPLACE, request);
    }

    /**
     * Sube ya mismo en un hilo aparte (el proceso está vivo en ese momento);
     * si algo falla, queda la subida de respaldo de WorkManager.
     */
    public static void uploadNow(Context context) {
        Context app = context.getApplicationContext();
        new Thread(() -> {
            if (!uploadQueue(app)) enqueue(app);
        }, "jx-upload").start();
    }

    @NonNull
    @Override
    public Result doWork() {
        return uploadQueue(getApplicationContext()) ? Result.success() : Result.retry();
    }

    /** Sube toda la cola. true si no quedó nada pendiente por error. */
    private static synchronized boolean uploadQueue(Context context) {
        PendingStore store = PendingStore.get(context);
        JSONArray queue = store.getQueue();
        if (queue.length() == 0) return true;

        if (!store.hasSession()) {
            // Aún no se ha ingresado el PIN en esta instalación: se sube al ingresar
            Log.w(TAG, "Sin sesión: " + queue.length() + " notificaciones esperan el PIN");
            return true;
        }

        try {
            String idToken = refreshIdToken(store);

            // Se repite hasta vaciar la cola: pueden llegar notificaciones
            // nuevas mientras se sube
            while (queue.length() > 0) {
                for (int i = 0; i < queue.length(); i++) {
                    JSONObject item = queue.getJSONObject(i);
                    int status = upload(store.getProjectId(), idToken, item);

                    // 409: ya existía en Firestore (subida antes)
                    if (status == 200 || status == 409) {
                        store.markUploaded(item.getString("id"));
                        Log.i(TAG, "Subida " + item.getString("id") + " (" + status + ")");
                    } else {
                        Log.w(TAG, "Firestore respondió " + status);
                        return false;
                    }
                }
                queue = store.getQueue();
            }

            return true;
        } catch (Exception e) {
            Log.e(TAG, "Error subiendo notificaciones: " + e.getMessage());
            return false;
        }
    }

    // Cambia el refresh token por un id token (Firebase Auth REST)
    private static String refreshIdToken(PendingStore store) throws Exception {
        URL url = new URL("https://securetoken.googleapis.com/v1/token?key=" + store.getApiKey());
        String body = "grant_type=refresh_token&refresh_token="
            + URLEncoder.encode(store.getRefreshToken(), "UTF-8");

        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("POST");
        conn.setDoOutput(true);
        conn.setConnectTimeout(15000);
        conn.setReadTimeout(15000);
        conn.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");
        write(conn, body);

        int status = conn.getResponseCode();
        String response = read(conn, status);
        if (status != 200) throw new Exception("Token " + status + ": " + response);

        JSONObject json = new JSONObject(response);
        String newRefresh = json.optString("refresh_token", null);
        if (newRefresh != null && !newRefresh.isEmpty()) store.updateRefreshToken(newRefresh);
        return json.getString("id_token");
    }

    // Crea el documento con id fijo; si ya existe Firestore responde 409
    private static int upload(String projectId, String idToken, JSONObject item) throws Exception {
        String id = item.getString("id");
        URL url = new URL("https://firestore.googleapis.com/v1/projects/" + projectId
            + "/databases/(default)/documents/pendingTransactions?documentId=" + URLEncoder.encode(id, "UTF-8"));

        JSONObject fields = new JSONObject();
        Iterator<String> keys = item.keys();
        while (keys.hasNext()) {
            String key = keys.next();
            if (key.equals("id")) continue;
            fields.put(key, new JSONObject().put("stringValue", item.optString(key)));
        }

        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("POST");
        conn.setDoOutput(true);
        conn.setConnectTimeout(15000);
        conn.setReadTimeout(15000);
        conn.setRequestProperty("Content-Type", "application/json; charset=utf-8");
        conn.setRequestProperty("Authorization", "Bearer " + idToken);
        write(conn, new JSONObject().put("fields", fields).toString());

        int status = conn.getResponseCode();
        if (status != 200 && status != 409) Log.w(TAG, read(conn, status));
        return status;
    }

    private static void write(HttpURLConnection conn, String body) throws Exception {
        try (OutputStream out = conn.getOutputStream()) {
            out.write(body.getBytes(StandardCharsets.UTF_8));
        }
    }

    private static String read(HttpURLConnection conn, int status) throws Exception {
        InputStream in = status >= 400 ? conn.getErrorStream() : conn.getInputStream();
        if (in == null) return "";
        try (InputStream stream = in; ByteArrayOutputStream buffer = new ByteArrayOutputStream()) {
            byte[] chunk = new byte[4096];
            int n;
            while ((n = stream.read(chunk)) != -1) buffer.write(chunk, 0, n);
            return buffer.toString("UTF-8");
        }
    }
}
