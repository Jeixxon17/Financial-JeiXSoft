package com.jeixsoft.finance.notifications;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Almacenamiento privado de la app (no se respalda: allowBackup=false):
 * - la cola de notificaciones que faltan por subir a Firestore,
 * - los ids ya subidos (para no subir dos veces la misma),
 * - la sesión que la app entrega al desbloquear con el PIN.
 */
public class PendingStore {

    private static final String PREFS = "jx_bank_notifications";
    private static final String KEY_QUEUE = "queue";
    private static final String KEY_UPLOADED = "uploaded";
    private static final String KEY_API_KEY = "apiKey";
    private static final String KEY_PROJECT_ID = "projectId";
    private static final String KEY_REFRESH_TOKEN = "refreshToken";
    private static final int MAX_UPLOADED_IDS = 500;

    private static PendingStore shared;
    private final SharedPreferences prefs;

    private PendingStore(Context context) {
        prefs = context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    /**
     * Una sola instancia por proceso: sus métodos synchronized comparten el
     * candado, así guardar y marcar como subida nunca se pisan entre hilos.
     */
    public static synchronized PendingStore get(Context context) {
        if (shared == null) shared = new PendingStore(context);
        return shared;
    }

    // --- Cola ---

    public synchronized JSONArray getQueue() {
        try {
            return new JSONArray(prefs.getString(KEY_QUEUE, "[]"));
        } catch (JSONException e) {
            return new JSONArray();
        }
    }

    /** Agrega a la cola si no está ya en ella ni se subió antes. */
    public synchronized boolean enqueue(JSONObject item) {
        String id = item.optString("id");
        if (wasUploaded(id)) return false;

        JSONArray queue = getQueue();
        for (int i = 0; i < queue.length(); i++) {
            if (id.equals(queue.optJSONObject(i).optString("id"))) return false;
        }
        queue.put(item);
        prefs.edit().putString(KEY_QUEUE, queue.toString()).apply();
        return true;
    }

    /** Quita de la cola y lo marca como subido. */
    public synchronized void markUploaded(String id) {
        JSONArray queue = getQueue();
        JSONArray remaining = new JSONArray();
        for (int i = 0; i < queue.length(); i++) {
            JSONObject item = queue.optJSONObject(i);
            if (item != null && !id.equals(item.optString("id"))) remaining.put(item);
        }

        JSONArray uploaded = getUploaded();
        uploaded.put(id);
        // Solo se recuerdan los últimos ids
        JSONArray trimmed = new JSONArray();
        for (int i = Math.max(0, uploaded.length() - MAX_UPLOADED_IDS); i < uploaded.length(); i++) {
            trimmed.put(uploaded.optString(i));
        }

        prefs.edit()
            .putString(KEY_QUEUE, remaining.toString())
            .putString(KEY_UPLOADED, trimmed.toString())
            .apply();
    }

    private JSONArray getUploaded() {
        try {
            return new JSONArray(prefs.getString(KEY_UPLOADED, "[]"));
        } catch (JSONException e) {
            return new JSONArray();
        }
    }

    private boolean wasUploaded(String id) {
        JSONArray uploaded = getUploaded();
        for (int i = 0; i < uploaded.length(); i++) {
            if (id.equals(uploaded.optString(i))) return true;
        }
        return false;
    }

    // --- Sesión ---

    public synchronized void saveSession(String apiKey, String projectId, String refreshToken) {
        prefs.edit()
            .putString(KEY_API_KEY, apiKey)
            .putString(KEY_PROJECT_ID, projectId)
            .putString(KEY_REFRESH_TOKEN, refreshToken)
            .apply();
    }

    public synchronized void updateRefreshToken(String refreshToken) {
        prefs.edit().putString(KEY_REFRESH_TOKEN, refreshToken).apply();
    }

    public String getApiKey() {
        return prefs.getString(KEY_API_KEY, null);
    }

    public String getProjectId() {
        return prefs.getString(KEY_PROJECT_ID, null);
    }

    public String getRefreshToken() {
        return prefs.getString(KEY_REFRESH_TOKEN, null);
    }

    public boolean hasSession() {
        return getApiKey() != null && getProjectId() != null && getRefreshToken() != null;
    }
}
