# Servicio de pagos (plan Completo)

Cobra el plan Completo de TuPlataAlDia ($ 50.000, **un solo pago**) con Wompi y lo desbloquea en Firebase.
Corre en **Cloudflare Workers (plan gratis: 100.000 peticiones al día)**, así Firebase sigue en Spark.

```
App ── POST /checkout (token de Firebase) ──▶ Worker ── enlace firmado ──▶ App ──▶ página de pago de Wompi
Wompi ── POST /wompi/events (firmado) ──▶ Worker ── users/{uid}.plan = 'completo' ──▶ Firestore ──▶ App se desbloquea
```

- La app nunca marca el plan: lo escribe el Worker con una cuenta de servicio. Las reglas (`firestore.rules`) no dejan que el usuario toque `plan` ni `planInfo`.
- Los datos de tarjeta o cuenta del cliente solo los ve Wompi.
- Cada pago queda en `payments/{idTransacción}` (solo se ve desde Firebase Console).

## Configurarlo (una sola vez)

1. **Wompi**: crear la cuenta de comercio en <https://comercios.wompi.co>. En *Desarrolladores* están las llaves de **Sandbox** (pruebas) y de **Producción**:
   - Llave pública (`pub_test_…` / `pub_prod_…`)
   - Secreto de integridad (`test_integrity_…` / `prod_integrity_…`)
   - Secreto de eventos (`test_events_…` / `prod_events_…`)
2. **Firebase**: Configuración del proyecto > Cuentas de servicio > *Generar nueva clave privada*. Descarga un JSON: **no se sube a GitHub ni se deja en el proyecto**.
3. **Cloudflare**: crear la cuenta gratis en <https://dash.cloudflare.com>. En esta carpeta:
   ```
   npx wrangler login
   ```
4. Editar `wrangler.toml`: `FIREBASE_PROJECT_ID`, `APP_URL` y `ALLOWED_ORIGINS`.
5. Guardar los secretos (cada comando pide el valor):
   ```
   npx wrangler secret put WOMPI_PUBLIC_KEY
   npx wrangler secret put WOMPI_INTEGRITY_SECRET
   npx wrangler secret put WOMPI_EVENTS_SECRET
   npx wrangler secret put FIREBASE_API_KEY            # el mismo VITE_FIREBASE_API_KEY de la app
   npx wrangler secret put FIREBASE_SERVICE_ACCOUNT    # pegar el JSON completo de la cuenta de servicio
   ```
6. Publicar:
   ```
   npx wrangler deploy
   ```
   Queda en `https://tuplata-pagos.<tu-subdominio>.workers.dev`.
7. En Wompi > Desarrolladores > **URL de eventos**: `https://tuplata-pagos.<tu-subdominio>.workers.dev/wompi/events`.
8. En el `.env` de la app:
   ```
   VITE_PAYMENTS_URL=https://tuplata-pagos.<tu-subdominio>.workers.dev
   VITE_WOMPI_ENV=sandbox      # o production
   ```
9. Publicar las reglas nuevas de `firestore.rules` en Firebase Console > Firestore > Reglas.

## Probar

Con las llaves de Sandbox, Wompi tiene datos de prueba: tarjeta `4242 4242 4242 4242` (aprobada) y `4111 1111 1111 1111` (rechazada), y Nequi con el número `3991111111` (aprobado). Ver <https://docs.wompi.co/docs/colombia/datos-de-prueba-en-sandbox/>.

Para ver los registros del Worker: `npx wrangler tail`.

En el servidor local, Wompi bloquea (403 de CloudFront) cualquier `redirect-url` a `localhost`. Por eso el Worker
solo manda direcciones `https` públicas. En local, el pago se abre en otra pestaña sin regreso y la app espera en
`/plan` hasta que el evento de Wompi marque el plan.

## Pasar a producción

Cambiar los tres secretos de Wompi por los de Producción (`wrangler secret put …`), la URL de eventos de Producción en Wompi, y `VITE_WOMPI_ENV=production` en la app.
