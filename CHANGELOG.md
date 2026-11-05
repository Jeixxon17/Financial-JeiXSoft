# Cambios

La versión menor (1.1 → 1.2 → 1.3…) sube con `npm run version:bump` solo
cuando lo hecho se sube a GitHub; mientras no se suba, los cambios se anotan
en la versión en curso. La versión vive en `package.json` y de ahí la toman
la app web, la PWA y el APK de Android (se ve en el menú y en la pantalla del PIN).

## 2.1 — 2026-11-05 · TuPlataAlDia

### Legal y privacidad
- Términos y condiciones y Política de tratamiento de datos (Ley 1581 de 2012,
  Decreto 1074 de 2015, Ley 1480 de 2011) en `src/legal/documents.ts`. Son
  páginas públicas (`#/terminos`, `#/privacidad`) y se abren en hojas dentro
  de la app. Los datos del responsable salen del `.env` (`VITE_LEGAL_*`).
- Página pública `#/eliminar-cuenta` (enlace web que pide Google Play).
- Autorizaciones guardadas en `users/{uid}.consents` con versión, fecha y
  plataforma (prueba de la autorización). Al crear la cuenta se guardan
  términos y privacidad; quien no los tenga (cuentas con Google, usuarios de
  antes o texto nuevo) ve una pantalla para aceptarlos antes de usar la app.
- Antes de leer extractos, activar el lector de notificaciones o buscar SMS
  se pide una autorización aparte (`ConsentSheet`), como pide Google Play.
- Perfil > Privacidad y datos: ver los documentos, ver y retirar
  autorizaciones y **eliminar la cuenta** (borra `users/{uid}` completo y el
  usuario; confirma con contraseña o Google). Reglas: el usuario puede borrar
  su perfil (hay que publicar `firestore.rules`).
- Lector de Android: sin sesión o sin autorización ya no guarda ni sube
  notificaciones. Al cerrar sesión, retirar la autorización o eliminar la
  cuenta se borra la sesión del lector y su cola (`clearSession`). Antes, al
  cerrar sesión, el lector seguía subiendo a la cuenta anterior.
- La hoja de pago avisa que el plan se activa al pagar (no aplica retracto,
  art. 47 Ley 1480) y enlaza los términos.

### Acceso
- Se quitó "Entrar con mi PIN (cuenta anterior)": la cuenta del dueño ya se
  migró y entra con su correo o Google.

### Limpieza de la v1
- Se borró todo el código de la v1 que quedaba: la cuenta anterior (correo fijo
  y PIN como contraseña), "Actualiza tu acceso" y el servicio de migración.
  Los datos siempre van en `users/{uid}`: sin sesión no se lee ni escribe nada
  (antes se usaban las colecciones generales).
- Reglas de Firestore solo para `users/{uid}`. Las colecciones generales de la
  v1 quedan en la base como respaldo (no se borran) y se ven en Firebase Console.
- El lector de Android ya no sube a la colección general si no tiene la ruta
  del usuario.
- Corregido: cambiar el PIN en el perfil migrado del dueño podía sembrarle las
  categorías por defecto (el perfil migrado no tiene fecha de creación).

### Dominio
- www.tuplataaldia.com en los textos legales y en el servicio de pagos
  (dirección de regreso de Wompi y orígenes permitidos).
- Datos de contacto del responsable en el `.env` (sin cédula).

### Landing para descargar la app
- La app es para Android (Google Play). En el navegador, sin sesión, se abre
  una landing (`pages/LandingPage.vue`) con el design system: portada con
  celulares de muestra, por qué usarla, funciones, cómo se ve la app, planes
  (Gratis y Completo de pago único) y la sección para descargar.
- Los celulares de muestra (`components/landing/LandingPhone.vue`) dibujan
  pantallas de la app con datos de ejemplo: Inicio, Movimientos, Por
  confirmar, Presupuesto y Quincenas.
- Botón de Google Play (`StoreButton`) con el enlace de `VITE_PLAY_STORE_URL`;
  sin enlace dice "Muy pronto en Google Play". No usa el logo de Google Play.
- "Iniciar sesión" y "Entrar en la web" abren el acceso (versión web); desde
  ahí el logo (escritorio) o la flecha (celular) vuelven a la landing. Al
  cerrar sesión en la web se vuelve a la landing. En la app Android no cambia
  nada.
- Animación `animate-float` en el tema para los celulares.

### Marca
- La app se llama TuPlataAlDia en Android (`strings.xml`, `capacitor.config.ts`)
  y en la PWA (manifest de `vite.config.ts`). El paquete sigue siendo
  `com.jeixsoft.finance` para que la app instalada se actualice sin desinstalar.
- Íconos nuevos con el logo de TuPlataAlDia: favicon, ícono de Apple, PWA
  (192, 512 y maskable) y Android (ícono adaptable con fondo y frente, redondo
  y normal en todas las densidades). Pantalla de arranque con fondo noche y el
  ícono. Colores de fondo y tema `#05070f`.

### Migración de la cuenta anterior
- "Actualiza tu acceso" ahora verifica la copia: vuelve a leer lo copiado y
  revisa que cada registro de la v1 esté en `users/{uid}`. Solo entonces marca
  el perfil como migrado; si falta algo, avisa, no cambia nada y se puede
  repetir sin duplicar. Muestra cuántos registros quedaron por colección.

## 2.0 — 2026-11-04 · TuPlataAlDia

Versión nueva (rama `version_two`). Primera subida de la v2; lo siguiente que se
suba será la 2.1.

### Diseño y base
- Design system como tema de Tailwind 4 (`src/styles/theme.css`): colores
  (`bg-surface-100`, `text-ink`, `bg-primary`…), radios (`rounded-card`,
  `rounded-tile`, `rounded-sheet`), sombras, animaciones y las utilidades
  `bg-screen`, `bg-desk`, `bg-bank-card`, `shine` y `skeleton`. La v2 usa
  solo clases de Tailwind, sin CSS propio.
- Fuente Manrope e iconos `lucide-vue-next`. Las fuentes se cargan desde
  `index.html`; la regla de títulos de la v1 (Syne) pasó a `@layer base`.
- Componentes: `TpButton`, `TpSkeleton`, `BankCardFace`, `BankCardSkeleton`,
  `HomeNotice`. Navegación: barra flotante en el celular y menú lateral en
  escritorio (`TpLayout`, `TpNav`, `TpSide`).

### Pantallas
- PIN: ícono de TuPlataAlDia, fondo noche con resplandor y teclado redondo.
  En escritorio, tarjeta centrada con seis casillas y teclado físico.
- Inicio, en celular y escritorio:
  - Celular: saldo disponible, tarjetas apiladas en carrusel (se tocan o se
    deslizan), acciones rápidas (Gasto, Ingreso, Pagar, Más), el aviso más
    importante del asesor, los pendientes y los últimos movimientos.
  - Escritorio: saludo con la fecha, buscador, "Registrar movimiento",
    tarjetas lado a lado con su detalle a la derecha y movimientos en tabla.

- Tarjetas de crédito: muestran el cupo disponible, cuánto se ha gastado
  del total con una barra (azul, amarilla desde 70 %, roja desde 90 %), y
  abajo el pago mínimo ("Al día" si ya se pagó) con su fecha límite. El
  detalle de escritorio agrega el mínimo al próximo corte, el cupo usado, la
  deuda total y el crédito aparte del cupo (Crédito Grande de ADDI).

- Registrar (Gasto, Ingreso, Transferir) con el diseño nuevo (`TxForm`), en
  toda la app: hoja en el celular y modal en escritorio. Monto grande con punto
  de miles, categorías como botones (las más usadas primero, y "Nueva"), cuenta
  por defecto la del último movimiento, cuotas con intereses y su tabla,
  comisión en dólares y aviso del asesor. "Pagar" abre la tarjeta con el mínimo
  pendiente que vence primero, con atajos de pago mínimo y pago total, y dice
  cuánto queda en la cuenta. Ingresos, transferencias y pagos terminan con una
  pantalla de éxito (pagos: deuda que queda y cupo disponible). Reemplaza al
  formulario de la v1 (`TransactionModal`, borrado).
- Movimientos:
  - Celular: buscador, ingresos y gastos del período, filtros rápidos (este
    mes, 7 y 30 días, mes pasado, rango; gastos, ingresos, transferencias),
    hoja de filtros (fechas, cuenta, categoría) y lista agrupada por día.
  - Escritorio: tabla con un encabezado por día, filtros en una fila y a la
    derecha ingresos, gastos y gastos por categoría (las 4 más grandes y el
    resto; al tocar una se filtra).
  - Una transferencia se ve una sola vez ("Bancolombia → ADDI"). Se muestran de
    a 60 con "Ver más".
- Detalle del movimiento (`TxDetail`): monto, tipo, cuenta, categoría, fecha,
  cuotas; editar, duplicar (con fecha de hoy) y eliminar con confirmación. Al
  eliminar una transferencia se quitan sus dos movimientos. También se abre
  desde los movimientos recientes del Inicio.
- Por confirmar: cada pendiente con tipo, fecha y hora, descripción, cuenta
  reconocida, categoría sugerida, monto y el mensaje del banco plegable;
  Confirmar abre el formulario nuevo y Descartar pide confirmación. Estado del
  lector del celular (permisos con su botón) y "Buscar SMS del banco".
- Piezas nuevas: `TpSheet` (hoja/modal), `TpConfirm`, `ReaderStatus`,
  `TpButton` con tamaño `sm` y variante `danger`, y formatos en
  `components/tp/format.ts`.

- Toda la app con el diseño nuevo (ya no queda nada de la v1 en pantalla):
  - Cuentas y tarjetas: resumen (saldo, deuda, cupo disponible, mínimos por
    pagar), las tarjetas con su cupo y vencimiento (el chip avisa "Vence 5 nov",
    "Vencido" o "Al día") y el detalle de cada una con Pagar, Subir extracto,
    Cuadrar con el banco, Editar, Eliminar y los movimientos del período.
    Formulario de cuenta nuevo con la misma lógica (mínimo del extracto, deuda
    según el banco, deuda diferida, cupo gastado, crédito aparte del cupo).
  - Subir extracto y Cuadrar con el banco con la hoja nueva.
  - Presupuesto y ahorro: plan del mes con su barra, metas (abonar, retirar,
    desglose, abonos, fondo de emergencia), topes de gasto con sugerencias y el
    asesor al lado en escritorio. Selector de mes.
  - Quincenas: las dos quincenas con lo que sobra o falta, obligaciones (aviso si
    la quincena queda en rojo), deducciones y salario editable. El registro
    inicial ya no trae un salario escrito en el código: arranca en 0.
  - Gastos automáticos, Categorías (con colores del tema) y Estadísticas
    (indicadores, ingresos y gastos por mes con tooltip y tabla, gastos por
    categoría y proyección; sin chart.js).
  - Perfil y ajustes (nuevo): cambiar PIN, bloquear, salud financiera, accesos
    y "Desarrollado por JeiXSoft". Está en "Más".
  - Buscar SMS, Cambiar PIN y el aviso del asesor con el diseño nuevo.
- Se borraron `AppLayout`, `AccountCard`, `StatCard`, `BudgetProgress`, los
  gráficos, `CategorySelect`, `mockData.ts` y el CSS de la v1; se quitaron
  `chart.js` y `vue-chartjs`. `style.css` queda solo con Tailwind y la base. La
  pestaña se llama TuPlataAlDia.
- Corregido: las reglas viejas `.skeleton` y `.animate-fade-in` de la v1 le
  ganaban a las del tema (el skeleton se veía apagado).
- Acceso de varios usuarios:
  - Pantallas nuevas: Bienvenida (celular), Iniciar sesión (correo o Google),
    Crear cuenta (nombre, correo, contraseña de 8+ con número y letra, términos)
    y Recuperar contraseña. En escritorio, la marca a la izquierda y el formulario
    a la derecha.
  - El PIN pasa a ser el bloqueo de la app: después de crear la cuenta se crea el
    PIN; se guarda cifrado (PBKDF2) en el perfil del usuario. "Olvidé mi PIN" y
    "Cerrar sesión" en la pantalla del PIN. Cambiar PIN funciona para ambos tipos
    de cuenta.
  - Datos por usuario en `users/{uid}/…`; los usuarios nuevos arrancan con
    categorías por defecto.
  - La cuenta anterior (v1) sigue entrando igual con "Entrar con mi PIN (cuenta
    anterior)" y sus datos no se tocan. En Perfil aparece "Actualiza tu acceso":
    confirma el PIN, copia los datos a su espacio (los originales quedan de
    respaldo), deja el PIN como bloqueo y vincula Google y/o correo y contraseña.
  - Reglas de Firestore nuevas (`firestore.rules`), compatibles con la v1.14.
  - Si al crear la cuenta no se alcanza a guardar el perfil (ej. reglas sin publicar),
    se completa solo al crear el PIN. Los errores desconocidos muestran su código.
  - Lector de Android: sube a la colección del usuario (`collectionPath`).
  - Perfil: tu nombre y correo, Cerrar sesión. El menú lateral muestra tu nombre.
- Catálogo propio de bancos (`components/tp/banks.ts`): 18 bancos y billeteras
  de Colombia más "Otro", cada uno con su color. Cada uno tiene un distintivo
  propio (`BankBadge`: sus iniciales sobre su color), no el logo oficial (marca
  registrada). La tarjeta lleva un tinte suave del color de su banco, que sale de
  la esquina y se desvanece (sin círculo marcado), y el distintivo
  junto al nombre. Al crear o editar una cuenta se elige el banco (campo nuevo
  `bank` en la cuenta); en las cuentas viejas se reconoce por el nombre.
  Colores confirmados: Bancolombia, Davivienda, BBVA y Davibank; los demás son
  aproximados.
- Categorías al registrar un gasto o ingreso (`CategoryPicker`): cuadrícula de
  botones con ícono y nombre (las 7 más usadas, la elegida siempre visible y
  marcada con un chulo) y "Más" abre un buscador con todas y "Crear categoría".
  Los íconos guardados como emoji se muestran como íconos de trazo
  (`categoryIcons.ts`; si el emoji no está, se adivina por el nombre).
- Corregido: en el celular las tarjetas de Cuentas se salían de la pantalla con
  nombres y cifras largos (ej. "Usado $ 7.448.500 de $ 13.000.000"). Las rejillas
  de una columna ahora nunca pasan del ancho de la pantalla, y el "$" ya no queda
  solo en una línea. Revisado a 320, 360 y 375 px en todas las pantallas.

### Plan Completo (pago único de $ 50.000)
- Plan Gratis: Inicio, Movimientos, Cuentas y tarjetas, registrar gastos e
  ingresos, Quincenas, Categorías y Perfil. Plan Completo: Por confirmar (lector
  de SMS y notificaciones), Presupuesto y metas, asesor, Gastos automáticos,
  extractos y cuadrar con el banco, y Estadísticas. No es mensualidad: se paga
  una vez y queda para siempre.
- Con el plan Gratis esas secciones se ven bloqueadas (vista previa borrosa, qué
  gana y "Desbloquear todo"), con candado en la navegación, el menú lateral y
  "Más". "Subir extracto" y "Cuadrar" abren la oferta; el asesor y el aviso de
  pendientes no aparecen; el lector del celular no recibe la sesión.
- Hoja "Mejora tu plan" → "Pagar" (`PlanUpgradeSheet`), pantalla de regreso del
  pago (`/plan`: confirmando, aprobado con recibo o rechazado) y tarjeta del plan
  en Perfil (Gratis contra Completo).
- Pago automático con Wompi (Nequi, PSE, tarjeta, Botón Bancolombia): el
  servicio `payments-worker/` (Cloudflare Workers, gratis) firma el enlace de
  pago y, cuando Wompi avisa que se aprobó, escribe `users/{uid}.plan` con una
  cuenta de servicio. La app escucha el perfil y se desbloquea sola. Firebase
  sigue en Spark. Configuración en `payments-worker/README.md`.
- Reglas: el usuario ya no puede escribir `plan` ni `planInfo` en su perfil ni
  borrarlo, y las subcolecciones van aparte (antes `users/{uid}/{document=**}`
  también abarcaba el perfil). Hay que volver a publicarlas.
- La cuenta del dueño tiene siempre el plan Completo.

### Carga
- Skeleton loaders mientras llega Firebase (Inicio, PIN y arranque), con la
  forma del contenido real. `store.loaded.<colección>` marca la primera
  carga de cada colección (queda en true aunque falle).
## 1.14 — 2026-11-02

- Cupo (ADDI): los pagos liberan cupo al momento, como el banco: cada pago
  se aplica por corte, primero intereses y comisiones y luego el capital de
  las cuotas; el capital libera cupo o baja el Crédito Grande. Antes solo se
  liberaba al pasar la fecha de pago, y si pagabas antes no cambiaba nada.
- ⚖️ Cuadrar con el banco (en cada tarjeta): se escriben el pago total, el
  cupo usado y el crédito aparte que muestra el banco y la tarjeta queda
  igual (el saldo sin detalle se ajusta solo).

## 1.13 — 2026-11-02

- "Por confirmar" → 📩 Buscar SMS del banco: lee los SMS de Bancolombia que
  siguen en el celular entre dos fechas (con atajos de 3, 7, 15 y 30 días),
  marca cuáles ya están registrados o en espera y manda los que faltan a
  "Por confirmar". La primera vez Android pide el permiso de leer SMS.
  Las notificaciones de las apps no se pueden recuperar (Android no las
  guarda).

## 1.12 — 2026-10-29

- Fondo de emergencia: meta especial de 3, 4 o 6 meses de sueldo neto que
  ahorra el 10 % del sueldo. Queda en espera (🔒) mientras haya deudas
  pendientes (más de un sueldo) o las quincenas no alcancen, y explica qué
  falta para empezar; al desbloquearse entra solo en el plan y las quincenas.
- Asesor más activo:
  - Al registrar un gasto aparece un aviso: si te pasaste o vas al 80 % del
    tope de la categoría, si ya no queda dinero libre, si vas gastando muy
    rápido, si es deuda nueva con tarjeta o si la categoría va por encima de
    lo normal (o "vas bien" si todo está en orden).
  - Felicita cuando una categoría va por debajo de lo normal.
  - Sus alertas más importantes también salen en el Dashboard.
- Presupuesto por categoría ahora se llama "Topes de gasto" y explica cómo
  funciona.
- Los modales de Presupuesto y ahorro y de Quincenas ya no se salen de la
  pantalla en el celular: el contenido se desplaza y los botones quedan fijos.

## 1.11 — 2026-10-29

- "Presupuesto y ahorro" (antes Presupuestos):
  - Plan del mes: ingreso neto − obligaciones de las quincenas − ahorro de
    las metas = lo libre para gastar; cuánto llevas gastado con débito y
    efectivo y cuánto compraste con crédito (deuda nueva).
  - Metas de ahorro (ej: Mundial 2030, Punta Cana): total con desglose de
    costos, fecha de inicio y fecha meta; calcula cuánto ahorrar al mes y por
    quincena, avisa si vas atrasado y guarda abonos y retiros.
  - Asesor: alertas y consejos calculados con tus datos (obligaciones vs.
    sueldo, deuda e intereses, compras con crédito, metas, fondo de
    emergencia, presupuestos y categorías que se disparan).
  - Presupuestos por categoría: ahora se guardan (antes no), pueden ser de
    todos los meses o de uno solo, y se pueden sugerir con el promedio de los
    últimos 3 meses.
- Quincenas: el ahorro de las metas aparece como un pago más en cada quincena.

## 1.10 — 2026-10-29

- Cupo gastado según el banco (ej: "Cupo que has gastado" de ADDI): se
  escribe en la tarjeta y desde ahí las compras lo suben y el capital de cada
  cuota lo libera al pasar su fecha de pago. Intereses, comisiones y el
  Crédito Grande no gastan cupo, como en ADDI.
- El Crédito Grande y el saldo sin detalle de ADDI incluyen la cuota del
  extracto actual (se facturan desde ese corte).

## 1.9 — 2026-10-29

- Crédito aparte del cupo (ej: el Crédito Grande de ADDI): se configura en la
  tarjeta con su capital pendiente y cuotas. Suma a la deuda y al pago mínimo
  pero no le quita cupo disponible; la tarjeta lo muestra aparte.
- Extractos sin corte fijo (ADDI): el corte es el día configurado en la
  cuenta (ADDI: 20) y la deuda se cuadra a la fecha del extracto, incluyendo
  las compras que aún no se facturan.
- Al cambiar el día de corte, los pagos mínimos guardados pasan al corte nuevo.
- El cupo disponible negativo se muestra con signo y en rojo.

## 1.8 — 2026-10-29

- Extractos de ADDI: cada crédito sin interés (3 cuotas) se registra como
  compra con su valor (cuota × 3); los créditos con interés, de los que ADDI
  solo muestra la cuota del mes, quedan en el saldo sin detalle y se facturan
  en cuotas del capital que cobran cada mes. La fianza y los intereses del
  mes se registran como "Intereses y comisiones".
- Tarjetas: nuevo campo "Cuotas sin interés (hasta)". En ADDI va en 3: una
  compra a 3 cuotas o menos no lleva interés.

## 1.7 — 2026-10-29

- Subir extracto (📄 en cada tarjeta de crédito): se lee el PDF del banco en
  el propio dispositivo (pdf.js, con contraseña si la tiene; nada se guarda
  ni se envía). Por ahora extractos de NU.
- Compara cada movimiento con los de la app (monto ±1 peso, fecha cercana):
  los ya registrados no se tocan, los nuevos se agregan con categoría
  sugerida, los pagos se registran como transferencia desde la cuenta que
  elijas y los que están en la app pero no en el extracto se pueden quitar.
- Fija el pago mínimo y la fecha límite del corte y cuadra la deuda al corte
  con la del extracto (las compras del día del corte van al siguiente).

## 1.6 — 2026-10-24

- Notificaciones: si HiOS reinicia el proceso de la app, Android cree que el
  lector sigue conectado (a la conexión vieja) y no entrega nada. Ahora el
  vigilante (cada 15 min), al abrir la app y al encender el celular se
  comprueba que el lector esté conectado a este proceso y, si no, se fuerza
  una conexión nueva; al reconectarse recoge lo que siga en el panel.

## 1.5 — 2026-10-24

- Comisión por cambio de moneda: cada tarjeta puede tener su porcentaje
  (NU/Mastercard 0,45 %). Al registrar un gasto con la casilla "Compra en
  moneda extranjera (USD)" se crea aparte la comisión, como la cobra el banco.
- Categoría "Intereses y comisiones" se crea sola si no existe.
- Gastos automáticos en dólares: se guarda el valor en USD y cada cobro se
  convierte con la TRM oficial del día anterior (datos.gov.co), como lo hace
  NU, más la comisión de la tarjeta como gasto aparte.

## 1.4 — 2026-10-24

- Notificaciones: la cola se sube apenas vuelve el internet (Wi-Fi o datos
  con saldo), sin esperar los reintentos. Antes, sin datos, los reintentos se
  espaciaban hasta horas.
- El lector repasa el panel cada vez que llega cualquier notificación (máx.
  cada 2 min) y en cada pasada del vigilante, para recoger los SMS del banco
  que se le pasaron mientras el celular lo tenía dormido.
- Reintentos de subida fijos cada minuto.
- SMS: Google Mensajes junta todos los mensajes del mismo número en una sola
  notificación; ahora se lee cada mensaje por separado (antes solo el último).
- "Por confirmar": al tocar Descartar se pide confirmación, para no borrar un
  movimiento por un toque accidental.

## 1.3 — 2026-10-22

- Tarjetas: el pago mínimo del extracto solo ajusta lo facturado, ya no crea
  deuda. Antes, pasar una compra a cuotas (ej. el PS5 a 12) podía sumar
  "cargos del banco" falsos a la deuda total.
- Los intereses y comisiones del banco se registran como movimientos
  (categoría "Intereses y comisiones").

## 1.2 — 2026-10-21

- Movimientos: filtro por rango de fechas (desde / hasta) con atajos
  (Hoy, Últimos 7 días, Últimos 30 días, Mes pasado). Sin fechas se usa el
  mes del menú. Al cambiar un filtro se vuelve a la primera página.

## 1.1 — 2026-10-21

- Lector de notificaciones nativo: guarda las de Bancolombia y NU aunque la app
  esté cerrada y las sube solo a "Por confirmar", con reintentos sin internet.
- Si el celular mata el lector (TECNO/HiOS), un vigilante cada 15 minutos lo
  reconecta y recupera las notificaciones que sigan en el panel; también al
  encender el celular.
- Notificaciones de NU (asociadas a la tarjeta Nu).
- "Por confirmar" muestra el estado del lector: acceso a notificaciones,
  batería sin límite y subida automática.
- Versionamiento de la app (este archivo y la versión visible en la app).

## 1.0

- Cuentas, tarjetas de crédito (extractos, deuda diferida, intereses a cuotas),
  movimientos, quincenas, presupuestos y estadísticas.
- Diseño responsive, PWA instalable y acceso con PIN.
- App Android con la bandeja "Por confirmar".
