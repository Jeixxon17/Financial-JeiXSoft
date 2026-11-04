# CLAUDE.md

Contexto del proyecto para trabajar en él. Todo en español: la app, los textos, los commits y las respuestas al dueño (Jeison).

## Qué es

**Financial JeiXSoft** (v1.x, rama `main`) es una app personal de finanzas en pesos colombianos: cuentas, tarjetas de crédito, movimientos, quincenas, metas de ahorro y un asesor. Lee las notificaciones y SMS del banco (Bancolombia, NU) desde una app Android y las deja en "Por confirmar".

**TuPlataAlDia** (v2, rama `version_two`) es la nueva versión, pensada para **comercializarse al público**: varios usuarios, registro e inicio de sesión, onboarding y un diseño nuevo. El diseño ya está hecho; la construcción de la v2 aún no empieza.

## Stack

- Vue 3 (`<script setup>`, TypeScript con `erasableSyntaxOnly`: nada de parameter properties en constructores), Pinia (un store: `src/stores/finance.ts`), Vite 8, Tailwind 4 (más CSS propio con variables).
- Firebase **plan Spark (gratis)**. Nunca proponer nada que requiera Blaze (Cloud Functions, etc.).
  - Firestore: `accounts`, `transactions`, `categories`, `paychecks`, `recurringExpenses`, `pendingTransactions`, `budgets`, `savingsGoals`, `meta/security`.
  - Auth: un solo dueño (`owner@financial-jeixsoft.app`) y la contraseña se deriva del PIN de 6 dígitos (`jx-pin-<pin>`). Sesión en `browserSessionPersistence`; se bloquea tras 5 min en segundo plano.
  - `firestore.rules`: solo el dueño lee y escribe (copia de las reglas publicadas en la consola).
- PWA con `vite-plugin-pwa` (`injectRegister: null`). El service worker se registra solo en el navegador; dentro de Capacitor se desregistra.
- Android con Capacitor 8 (`com.jeixsoft.finance`). Plugin nativo propio `BankNotifications` (ver Android).
- pdf.js (`pdfjs-dist` 4.10.38) para leer extractos en el dispositivo; el PDF y su contraseña nunca salen del celular.

## Entorno de desarrollo (Windows)

- Usar Node 26: `export PATH="/c/Program Files/nodejs:$PATH"`. nvm apunta a Node 16 y Vite/Capacitor fallan con él.
- Servidor de desarrollo: `.claude/launch.json` → `dev` con Node 26 en el puerto **5174** (el 5173 lo ocupa otro proyecto). Si 5174 está ocupado, la herramienta asigna otro (5175).
- Revisar tipos: `npx vue-tsc -b --noEmit`. Compilar: `npm run build`.
- APK:
  1. `npm run build`
  2. `npx cap sync android`
  3. En `android/`: `JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" JAVA_TOOL_OPTIONS="-Djdk.net.unixdomain.tmpdir=$(pwd)/.tmp" ./gradlew assembleDebug -q`. Gradle debe correr **fuera del sandbox** o falla con "Unable to establish loopback connection".
  4. `"$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe" install -r app/build/outputs/apk/debug/app-debug.apk`. El celular de pruebas es un TECNO KL7 con Android 14.
- Los permisos de seguridad del celular (acceso a notificaciones, batería sin límite, SMS) los da el usuario; no se tocan por él.

## Reglas de trabajo

- **Versión por pedido**: cada pedido de cambios sube la versión menor con `npm run version:bump` y agrega su entrada en `CHANGELOG.md`. La versión sale de `package.json` hacia la web (`__APP_VERSION__`), la PWA y el APK (`versionName`/`versionCode` en `android/app/build.gradle`). Tras cada versión se compila e instala el APK si el celular está conectado.
- **Commit y push solo cuando Jeison lo pide** ("commit y push"). Nunca incluir `node_modules` (aunque está trackeado en git), `dist` ni compilados: agregar los archivos con `git add` uno por uno.
- Nunca poner en el código ni en commits datos personales: contraseñas de PDF, número de documento, montos reales en comentarios. Los comentarios de los parsers usan montos de ejemplo.
- Los extractos los sube el usuario en la app; no copiar sus PDFs a carpetas servidas ni escribir su contraseña en formularios.
- Montos en pesos sin decimales y con punto de miles (`$ 1.578.005`).

## Estructura

```
src/
  App.vue                 PIN → app; avisos del asesor (AdvisorToast); sube notificaciones al volver
  pages/                  Dashboard, Accounts, Transactions, Inbox (Por confirmar), Paychecks (quincenas),
                          Budgets (Presupuesto y ahorro), Recurring, Categories, Analytics
  components/
    modals/               TransactionModal, StatementImportModal (extractos), SmsImportModal,
                          BankReconcileModal (⚖️ cuadrar con el banco), SavingsGoalModal
    cards/                AccountCard (tarjetas: mínimo, cupo, Crédito Grande)
    security/             PinScreen, PinPad, ChangePinModal
  services/               Firestore por colección (*.service.ts), auth, notificationListener (puente nativo),
                          advisorToast
  stores/finance.ts       Todo el estado y los cálculos derivados (saldos, cupo, plan, asesor)
  utils/
    creditStatement.ts    Modelo de tarjetas: cortes, cuotas, mínimos, intereses, cupo (creditLimitState)
    installments.ts       Cuotas estilo Bancolombia: capital fijo + interés mensual sobre el saldo
    plan.ts               Metas de ahorro, plan del mes, fondo de emergencia, asesor y avisos al gastar
    bankNotifications.ts  Interpreta notificaciones/SMS de Bancolombia y NU
    exchange.ts           TRM (datos.gov.co) y comisión por moneda extranjera
    statements/           Lectores de extractos: NU (nuStatement), ADDI (addiStatement), cruce (matching)
android/app/src/main/java/com/jeixsoft/finance/notifications/
                          BankNotificationService (lector), PendingStore (cola), UploadWorker (sube por REST),
                          KeepAliveWorker (vigilante cada 15 min), BootReceiver, BankNotificationsPlugin
design/                   Diseño de la v2 (sin commit todavía)
  design-system/project/  Design system TuPlataAlDia: tokens.json, README.md (manual de marca),
                          components/bundle.css (clases jx-*), components/<Comp>/ (guía + vista previa)
  logos/                  SVG: ícono de la app, símbolo (oscuro/claro), logo con nombre (oscuro/claro)
  mockups/project/        30 pantallas .dc.html del lienzo de maquetas + app.css + canvas.json
CHANGELOG.md, firestore.rules, capacitor.config.ts, vite.config.ts
```

## Reglas del dominio (v1, se mantienen en la v2)

- **Tarjetas de crédito**:
  - Las compras se facturan por cortes; lo comprado el mismo día del corte entra al siguiente.
  - `statementMinimums[corteISO]` fija el mínimo real del extracto y solo ajusta lo facturado, nunca crea deuda.
  - La deuda que no tiene detalle va como deuda diferida "Ajuste deuda total".
  - Los intereses y comisiones del banco son movimientos con la etiqueta `comisión`.
- **ADDI**:
  - El corte es el día 20 y el pago el 4. Los créditos a 3 cuotas no cobran interés (`interestFreeInstallments`).
  - El "Crédito Grande" va **aparte del cupo** (deuda diferida con `outsideLimit`): suma a la deuda y al mínimo, pero no gasta cupo.
  - El cupo usado se calcula desde lo que mostró el banco al cuadrar (`limitUsedAnchor`). Cada pago posterior se aplica por corte, primero intereses y comisiones y luego capital, y libera cupo en el momento.
- **Extractos**: se cruzan con los movimientos de la app (mismo monto ±1, fecha cercana); se agrega lo nuevo y la deuda queda cuadrada con la del banco.
- **USD**: se convierte con la TRM del día anterior al cobro, más la comisión de la tarjeta (0,45 % en NU y Mastercard) como gasto aparte.
- **Plan y asesor**:
  - Plan del mes = ingreso neto − obligaciones de las quincenas − ahorro de las metas.
  - Fondo de emergencia: 3, 4 o 6 meses de sueldo neto, ahorrando el 10 % del sueldo. Queda bloqueado mientras la deuda supere un sueldo o las quincenas no alcancen.
  - Los avisos del asesor son reglas locales, sin IA ni servidor.

## Diseño de la v2 (decidido)

- Nombre: **TuPlataAlDia**. JeiXSoft queda como la empresa que la desarrolla (logo Fx solo en "Desarrollado por" y Acerca de).
- Design system: https://claude.ai/artifact/Ybm1hGWmpvEtMUhMg5qrzM (copia local en `design/design-system/`). Leer su `README.md` y `tokens.json` antes de construir pantallas.
  - Estilo sacado de una imagen de referencia: fondo casi negro con resplandor azul arriba, superficies azul noche, tarjetas bancarias oscuras con una mancha de luz azul.
  - Tema **Noche** por defecto y tema **Día** opcional. Una sola fuente: Manrope, con cifras tabulares.
  - `primary` solo para la acción principal de cada pantalla. Los gastos van en `ink` con −, no en rojo; el rojo (`danger`) es solo para alertas.
  - Iconos de trazo estilo Lucide (`lucide-vue-next`); sin emojis en títulos ni botones.
  - Navegación inferior flotante con 5 secciones: Inicio, Movimientos, Cuentas, Presupuesto, Por confirmar.
  - No dibujar logos de franquicias (Visa, Mastercard): solo el nombre del banco o de la cuenta.
- Logo: moneda en degradado azul con un chulo grueso que termina en flecha hacia arriba ("al día y creciendo"). El SVG del logo con nombre usa Manrope 800; en la app el nombre se escribe en HTML.
- Maquetas: https://claude.ai/artifact/7ZyZ3Qz56iiLjrd7iUVgGg (copia local en `design/mockups/`). Son 30 pantallas de 390×844 en 5 filas:
  - **Acceso**: Bienvenida, Login (correo o Google), Registro en 3 pasos (cuenta → PIN → huella), Crear PIN, PIN, Huella.
  - **Principal**: Inicio (carrusel de tarjetas animado), Movimientos, Detalle del movimiento, Cuentas, Detalle de tarjeta, Presupuesto.
  - **Registrar y pagar**: Registrar gasto (hoja con tipo, categoría y aviso del asesor), Registrar ingreso, Pagar tarjeta, Pago registrado, Ingreso registrado, Confirmar descarte.
  - **Bandeja y extractos**: Por confirmar, Buscar SMS, Subir extracto, Revisar extracto, Extracto aplicado, Cuadrar con el banco.
  - **Ahorro y ajustes**: Nueva meta, Detalle de meta, Quincenas, Gastos automáticos, Perfil, y el componente de navegación.
- Animaciones (en `bundle.css` / `app.css`):
  - Tarjetas: flotación (`jx-anim-float`), brillo que cruza (`is-shiny`), entrada (`jx-anim-in`) y carrusel (`jx-carousel`).
  - Éxito: chulo que se dibuja con una onda alrededor (`jx-success`).
  - Hojas, modal, toast del asesor y anillo de avance de metas.
  - Todo respeta `prefers-reduced-motion`.

## Estado actual (rama `version_two`)

- Parte de `main` en la v1.14 (commit `aa488ad`). La app de producción sigue siendo la v1.14, instalada en el celular.
- Sin commit todavía:
  - `design/` completo (design system, logos y maquetas).
  - `.claude/launch.json` (Node 26, puerto 5174).
- La v2 aún no tiene código: `src/` es la v1.

## Siguientes pasos

1. Hacer commit de `design/`, este `CLAUDE.md` y `.claude/launch.json` en `version_two` cuando Jeison lo pida.
2. Armar el plan de la v2 y construirla:
   - **Varios usuarios**: registro e inicio de sesión reales con Firebase Auth (correo/contraseña y Google), datos por usuario (`users/{uid}/...`), reglas de Firestore por `uid`, y el PIN y la huella como bloqueo local, ya no como contraseña. Debe seguir funcionando en Spark.
   - **Migración** de los datos actuales del dueño a su usuario nuevo.
   - **Onboarding**: cada cuánto le pagan, cuentas iniciales, permisos de notificaciones y SMS.
   - **Quitar lo propio de Jeison** del código: nombre de la empresa de nómina, cuentas y categorías fijas, `debt-*` creadas por quincenas, `mockData.ts`.
   - **Aplicar el design system** a todas las pantallas: tokens a CSS, Manrope, navegación inferior, hojas y modales, animaciones.
   - **Marca**: nombre e ícono en la PWA, Capacitor (`appName`) y los íconos de Android con el logo nuevo.
3. Pendientes de la v1 que pasan a la v2:
   - Lector del extracto de Bancolombia (MasterCard Gold y ahorros), cuando haya un PDF de ejemplo.
   - `fxFeeRate` de la MasterCard Gold (falta el dato).
   - Limpiar los "Ajuste de cuenta" de MasterCard y el movimiento sin detalle de 226.624 en NU.
   - Sacar `node_modules` del control de versiones (`git rm -r --cached node_modules`).
