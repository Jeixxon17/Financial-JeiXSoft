# Cambios

Cada pedido de cambios sube la versión menor (1.1 → 1.2 → 1.3…) con
`npm run version:bump`. La versión vive en `package.json` y de ahí la toman
la app web, la PWA y el APK de Android (se ve en el menú y en la pantalla del PIN).

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
