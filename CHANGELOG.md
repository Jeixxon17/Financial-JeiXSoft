# Cambios

Cada pedido de cambios sube la versión menor (1.1 → 1.2 → 1.3…) con
`npm run version:bump`. La versión vive en `package.json` y de ahí la toman
la app web, la PWA y el APK de Android (se ve en el menú y en la pantalla del PIN).

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
