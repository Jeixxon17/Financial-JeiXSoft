# CLAUDE.md

Contexto del proyecto para trabajar en él. Todo en español: la app, los textos, los commits y las respuestas al dueño (Jeison).

## Qué es

**Financial JeiXSoft** (v1.x, rama `main`) es una app personal de finanzas en pesos colombianos: cuentas, tarjetas de crédito, movimientos, quincenas, metas de ahorro y un asesor. Lee las notificaciones y SMS del banco (Bancolombia, NU) desde una app Android y las deja en "Por confirmar".

**TuPlataAlDia** (v2, rama `version_two`) es la nueva versión, pensada para **comercializarse al público**: varios usuarios, registro e inicio de sesión, onboarding y un diseño nuevo. El diseño ya está hecho; la construcción de la v2 aún no empieza.

## Stack

- Vue 3 (`<script setup>`, TypeScript con `erasableSyntaxOnly`: nada de parameter properties en constructores), Pinia (un store: `src/stores/finance.ts`), Vite 8, Tailwind 4 (más CSS propio con variables).
- Firebase **plan Spark (gratis)**. Nunca proponer nada que requiera Blaze (Cloud Functions, etc.).
  - Firestore, por usuario: `users/{uid}` (perfil: nombre, PIN cifrado, `migrated`) y `users/{uid}/accounts|transactions|categories|paychecks|recurringExpenses|pendingTransactions|budgets|savingsGoals`. Los servicios usan `userCollection()`/`userDoc()` de `firebase/dataRoot.ts`, nunca `collection(db, …)` directo.
  - Las colecciones generales (`accounts`, `transactions`… y `meta/security`) son los datos de la v1 del dueño: los sigue usando su cuenta anterior hasta que actualice su acceso, y después quedan de respaldo (no se borran).
  - Auth (`services/auth.service.ts`): correo y contraseña o Google (Google solo en el navegador; en Android falta el plugin nativo). Sesión persistente (`browserLocalPersistence`). El PIN de 6 dígitos es el **bloqueo** de la app, no la contraseña: se guarda cifrado con PBKDF2 en `users/{uid}.pin`, se pide al abrir y tras 5 min en segundo plano. "Olvidé mi PIN" cierra sesión y al volver a entrar se crea otro.
  - Cuenta anterior del dueño (v1): `owner@financial-jeixsoft.app` con contraseña `jx-pin-<pin>`; entra desde "Entrar con mi PIN (cuenta anterior)" y usa las colecciones generales. En Perfil > "Actualiza tu acceso" (`UpgradeAccessSheet` + `services/migration.service.ts`) copia sus datos a `users/{uid}` con los mismos ids, guarda el PIN como bloqueo y vincula Google y/o correo con contraseña (el mismo uid: no cambia de dueño). Desde ese momento la v1.14 del celular deja de servir.
  - `firestore.rules`: cada usuario solo lo suyo; las colecciones generales solo el dueño (por su correo anterior o por el uid de `meta/security`). Compatibles con la v1.14. Se publican a mano en Firebase Console > Firestore > Reglas.
  - Usuarios nuevos arrancan con categorías por defecto (`services/onboarding.service.ts`).
  - **Plan**: Gratis (Inicio, Movimientos, Cuentas, registrar, Quincenas, Categorías, Perfil) o Completo, pago único de $ 50.000 (no mensualidad) que desbloquea Por confirmar, Presupuesto, asesor, Gastos automáticos, extractos/cuadrar y Estadísticas. Todo en `services/plan.service.ts` (`hasFullPlan`, `requirePlan`, `openUpgrade`); rutas con `meta.pro` se ven con `PlanLockedPage`; enlaces con `pro: true` llevan candado. El dueño siempre tiene Completo.
  - El pago es con Wompi a través de `payments-worker/` (Cloudflare Workers gratis, no Firebase): firma el enlace y, con el evento aprobado, escribe `users/{uid}.plan = 'completo'` y `planInfo` con una cuenta de servicio. Las reglas no dejan que el usuario escriba esos campos. La app los escucha con `onSnapshot`. Variables: `VITE_PAYMENTS_URL`, `VITE_WOMPI_ENV`. Los secretos solo en Cloudflare (`wrangler secret put`), nunca en el repo.
  - El lector de Android sube a `users/{uid}/pendingTransactions` (la ruta llega en `setSession` como `collectionPath`; sin ella usa la general de la v1). Requiere APK nuevo.
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

- **Versión**: la versión menor sube con `npm run version:bump` solo cuando lo hecho se sube a GitHub. Mientras no se suba, cada pedido agrega sus notas a la entrada de la versión en curso en `CHANGELOG.md` (la v2 está en 2.0 hasta su primer push). La versión sale de `package.json` hacia la web (`__APP_VERSION__`), la PWA y el APK (`versionName`/`versionCode` en `android/app/build.gradle`). Tras cada versión se compila e instala el APK si el celular está conectado.
- **Commit y push solo cuando Jeison lo pide** ("commit y push"). Nunca incluir `node_modules` (aunque está trackeado en git), `dist` ni compilados: agregar los archivos con `git add` uno por uno.
- Nunca poner en el código ni en commits datos personales: contraseñas de PDF, número de documento, montos reales en comentarios. Los comentarios de los parsers usan montos de ejemplo.
- Los extractos los sube el usuario en la app; no copiar sus PDFs a carpetas servidas ni escribir su contraseña en formularios.
- Montos en pesos sin decimales y con punto de miles (`$ 1.578.005`).

## Estructura

```
src/
  App.vue                 Arranque → PIN → app; aviso del asesor (AdvisorToast); sube notificaciones al volver
  style.css               Solo Tailwind + tema + base (@layer base). Sin CSS de pantallas
  styles/theme.css        Design system como tema de Tailwind (@theme y @utility)
  layouts/TpLayout.vue    Menú lateral (escritorio) + navegación flotante (celular)
  pages/                  Dashboard (Inicio), Transactions (Movimientos), Inbox (Por confirmar), Accounts,
                          Budgets (Presupuesto y ahorro), Paychecks (Quincenas), Recurring, Categories,
                          Analytics (Estadísticas), Profile (Perfil y ajustes)
  components/
    tp/                   Piezas v2: TpSheet, TpConfirm, TpButton, TpSkeleton, TpMonthPicker, TpCategorySelect,
                          TpNav, TpSide, navigation.ts, BankCardFace(+Skeleton), useAccountCards, cards.ts,
                          TxForm (registrar), TxDetail, AccountForm, AccountDetail, AdviceItem, HomeNotice,
                          ReaderStatus, goalIcons.ts, format.ts (montos y fechas)
    modals/               StatementImportModal (extractos), SmsImportModal, BankReconcileModal (cuadrar),
                          SavingsGoalModal (con TpSheet)
    security/             PinScreen, PinPad, ChangePinModal
  services/               Firestore por colección (*.service.ts), auth, notificationListener (puente nativo),
                          advisorToast
  stores/finance.ts       Todo el estado y los cálculos derivados (saldos, cupo, plan, asesor); loaded.<colección>
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
design/                   Diseño de la v2, solo local (en .gitignore, no se sube)
  design-system/project/  Design system TuPlataAlDia: tokens.json, README.md (manual de marca), bundle.css
  logos/                  SVG: ícono de la app, símbolo (oscuro/claro), logo con nombre (oscuro/claro)
  mockups/project/        Pantallas .dc.html del lienzo (celular y Esc* de escritorio) + canvas.json
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
  - Bancos: catálogo propio en `components/tp/banks.ts` (color, iniciales, cómo reconocerlo por el nombre). Se muestran con `BankBadge` (distintivo propio con iniciales), nunca con el logo oficial: son marcas registradas y la app es comercial. Si algún día se quieren logos oficiales, hace falta permiso del banco o un servicio con licencia (ej. Logo.dev, que pide un enlace visible en el plan gratis).
- Logo: moneda en degradado azul con un chulo grueso que termina en flecha hacia arriba ("al día y creciendo"). El SVG del logo con nombre usa Manrope 800; en la app el nombre se escribe en HTML.
- **Celular y escritorio**: la app debe verse bien en ambos.
  - Hasta 1023px: una columna y la navegación inferior flotante.
  - Desde 1024px: menú lateral fijo de 248px (`jx-desk`, `jx-side`, `jx-main`) con logo, las 5 secciones, "Más" (Quincenas, Gastos automáticos, Perfil) y el usuario al pie; barra superior (`jx-topbar`) con título, buscador y la acción principal.
  - El contenido no pasa de 1240px y usa rejillas fluidas (`jx-grid-cards`, `jx-grid-stats`, `jx-split`). Los movimientos van en tabla (`jx-table`). Las hojas del celular son en escritorio paneles o modales centrados.
- Maquetas: https://claude.ai/artifact/7ZyZ3Qz56iiLjrd7iUVgGg (copia local en `design/mockups/`). Son 46 pantallas de celular (390×844) y 44 de escritorio (`Esc*.dc.html`, 1440×900, fluidas), más los componentes `Nav` (navegación inferior), `Side` (menú lateral, props `active` y `empty`) y `EscFondo` (fondo de escritorio para los modales `jx-dmodal`). Cada pantalla de celular tiene su versión de escritorio y todos los enlaces llevan a pantallas que existen:
  - **Acceso**: Bienvenida, Login (correo o Google), Registro en 3 pasos (cuenta → PIN → huella), Crear PIN, PIN, Huella.
  - **Principal**: Inicio (carrusel de tarjetas animado), Movimientos, Detalle del movimiento, Cuentas, Detalle de tarjeta, Presupuesto.
  - **Registrar y pagar**: Registrar gasto (hoja con tipo, categoría y aviso del asesor), Registrar ingreso, Pagar tarjeta, Pago registrado, Ingreso registrado, Confirmar descarte.
  - **Bandeja y extractos**: Por confirmar, Buscar SMS, Subir extracto, Revisar extracto, Extracto aplicado, Cuadrar con el banco.
  - **Ahorro y ajustes**: Nueva meta, Detalle de meta, Quincenas, Gastos automáticos, Perfil, y el componente de navegación.
  - **Primera vez (sin datos)**: Inicio vacío con "Primeros pasos" (0 de 4), Agregar primera cuenta (los campos cambian según el tipo), Cuentas, Movimientos, Presupuesto y Por confirmar vacíos. Al terminar el registro (Huella) se llega al Inicio vacío.
  - **Más y formularios**: Recuperar contraseña, Estadísticas, Más, Editar cuenta, Categorías, Nueva categoría, Nuevo gasto automático (pesos o dólares), Obligación de quincena, Cambiar PIN, Abonar a meta, Tope de gasto.
  - **Escritorio** (filas desde y = 9030): las mismas pantallas. Las páginas usan `Side` + `jx-topbar`; las hojas y confirmaciones son modales `jx-dmodal` (o `--wide`) sobre `EscFondo`; el detalle del movimiento es un panel lateral. Inicio muestra las tarjetas lado a lado y al tocar una se ve su detalle a la derecha; Movimientos es una tabla con filtros y gastos por categoría.
- Animaciones (en `bundle.css` / `app.css`):
  - Tarjetas: flotación (`jx-anim-float`), brillo que cruza (`is-shiny`), entrada (`jx-anim-in`) y carrusel (`jx-carousel`).
  - Éxito: chulo que se dibuja con una onda alrededor (`jx-success`).
  - Hojas, modal, toast del asesor y anillo de avance de metas.
  - Todo respeta `prefers-reduced-motion`.

## Estado actual (rama `version_two`)

- Parte de `main` en la v1.14 (commit `aa488ad`). La app de producción sigue siendo la v1.14, instalada en el celular.
- `design/` es solo para revisar las maquetas: está en `.gitignore` y fuera del control de versiones (se sacó con `git rm -r --cached design`; queda en disco). No se sube a GitHub.
- Toda la app ya tiene el diseño de la v2 (2.0): no queda código de pantallas de la v1 (`AppLayout`, `TransactionModal`, `AccountCard`, gráficos con chart.js y el CSS viejo se borraron). Los datos y la lógica (store, utils, servicios, Android) son los mismos de la v1.
  - Hojas y modales: `TpSheet` (abajo en el celular, centrado en escritorio); confirmaciones con `TpConfirm`. Formatos de montos y fechas en `components/tp/format.ts`.
  - Las transferencias son dos movimientos con categoría `transfer` (gasto en el origen, ingreso en el destino). En listas se muestran una vez y al eliminar se quitan los dos.
  - Para ocultar un `TpButton` en un tamaño de pantalla, envolverlo (`<div class="hidden lg:block">`); para hacerlo pequeño, `size="sm"`.
  - **La v2 se escribe solo con Tailwind** (pedido de Jeison): nada de CSS propio ni `<style>` en las pantallas v2. El design system es el tema de Tailwind en `src/styles/theme.css` (`@theme`): colores `bg-bg-base`, `bg-surface-100/200/300`, `border-line`, `border-line-strong`, `text-ink`, `text-ink-muted`, `text-ink-faint`, `bg-primary`, `text-accent-light`, `text-success/danger/warning`; radios `rounded-chip/tile/card/sheet`; `shadow-card/float`; `animate-card-in/sheet-in/shake/breathe`. Los degradados largos son utilidades `@utility`: `bg-screen`, `bg-desk`, `bg-bank-card`, `shine`.
  - Toda rejilla de una columna en el celular lleva `grid-cols-[minmax(0,1fr)]`: sin eso la columna crece con el contenido (cifras largas) y se sale de la pantalla. Revisar a 320 y 360 px con cifras reales.
  - No juntar dos clases que tocan la misma propiedad (`relative` + `absolute`, `border-transparent` + `border-line`, `text-ink` + `text-ink-muted`): en Tailwind gana el orden del CSS, no el del atributo. Usar clases condicionales.
  - Las reglas globales de la v1 en `style.css` que pisen etiquetas (`h1`…) van en `@layer base`; si no, le ganan a las clases de Tailwind. Las fuentes se cargan con `<link>` en `index.html`.
  - **Skeleton loaders** en toda pantalla v2 que espere datos de Firebase: `TpSkeleton` (clase `skeleton` del tema; tamaño y forma los pone quien lo usa) con la misma forma del contenido real, y `BankCardSkeleton` para tarjetas. Se muestran según `store.loaded.<colección>` (primera carga; queda en true aunque falle). Cada bloque espera solo las colecciones que usa. No usar `store.loading` (es uno solo y se pisa entre cargas).
  - Patrones repetidos van como componentes (`TpButton`, `BankCardFace`, `HomeNotice`) o como constantes de clases (`bankCardClass` en `components/tp/cards.ts`).
  - Todas las pantallas van dentro de `TpLayout.vue` (`TpSide` en escritorio, `TpNav` en el celular; enlaces en `components/tp/navigation.ts`).
  - Iconos con `lucide-vue-next` (v1: la huella es `FingerprintPattern`). Ícono de la app en `src/assets/brand/`.
  - Se avanza pantalla por pantalla según lo que pida Jeison.

## Siguientes pasos

1. Hacer commit de la v2 en `version_two` cuando Jeison lo pida (`design/` no se sube).
2. Armar el plan de la v2 y construirla:
   - **Varios usuarios**: registro e inicio de sesión reales con Firebase Auth (correo/contraseña y Google), datos por usuario (`users/{uid}/...`), reglas de Firestore por `uid`, y el PIN y la huella como bloqueo local, ya no como contraseña. Debe seguir funcionando en Spark.
   - **Migración** de los datos actuales del dueño a su usuario nuevo.
   - **Onboarding**: cada cuánto le pagan, cuentas iniciales, permisos de notificaciones y SMS.
   - **Quitar lo propio de Jeison** del código: nombre de la empresa de nómina, cuentas y categorías fijas, `debt-*` creadas por quincenas. (Ya se quitaron `mockData.ts` y el salario fijo de Quincenas.)
   - **Marca**: ícono en la PWA (manifest), Capacitor (`appName`) y los íconos de Android con el logo nuevo. El título y el color de la pestaña ya dicen TuPlataAlDia.
   - **Pantallas del diseño que faltan**: Huella y el Inicio de primera vez con "Primeros pasos".
   - **Pagos**: crear la cuenta de Wompi y de Cloudflare, publicar `payments-worker/` y probar en Sandbox (`payments-worker/README.md`); publicar las reglas nuevas.
3. Pendientes de la v1 que pasan a la v2:
   - Lector del extracto de Bancolombia (MasterCard Gold y ahorros), cuando haya un PDF de ejemplo.
   - `fxFeeRate` de la MasterCard Gold (falta el dato).
   - Limpiar los "Ajuste de cuenta" de MasterCard y el movimiento sin detalle de 226.624 en NU.
   - Sacar `node_modules` del control de versiones (`git rm -r --cached node_modules`).
