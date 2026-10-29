# Cambios

Cada pedido de cambios sube la versión menor (1.1 → 1.2 → 1.3…) con
`npm run version:bump`. La versión vive en `package.json` y de ahí la toman
la app web, la PWA y el APK de Android (se ve en el menú y en la pantalla del PIN).

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
