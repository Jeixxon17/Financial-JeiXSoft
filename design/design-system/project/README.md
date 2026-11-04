TuPlataAlDia es la app para llevar tus cuentas, tarjetas y ahorros al día, en pesos colombianos. Se ve oscura y tranquila, con un resplandor azul arriba y tarjetas que brillan como objetos físicos.

## Voz y textos

- Habla de tú, en español de Colombia, corto y directo: "Te quedan $ 420.000 libres", "Sube el extracto de NU".
- Los botones dicen exactamente qué pasa: "Agregar tarjeta", "Confirmar pago", "Cuadrar con el banco". Nada de "Aceptar" genérico.
- Montos en pesos sin decimales y con punto de miles: `$ 1.578.005`. Gastos con −, ingresos con +.
- Fechas cortas: "26 oct 2026", horas en 24 h: "08:10".
- Errores: qué pasó y cómo arreglarlo, sin disculpas ("La contraseña del PDF no es correcta").
- Sin emojis en títulos ni botones; en las filas, el icono de la categoría puede ser emoji mientras no haya iconos propios.

## Color

- La app es oscura por defecto (tema `dark`); el tema `light` existe para quien lo prefiera.
- Cada pantalla pinta `bg-base` con el resplandor `bg-glow` arriba (clase `jx-screen`).
- Contenido en `surface-100` (filas, paneles) y lo elevado en `surface-200` (acciones rápidas, campos, botón secundario); `surface-300` para pistas y la navegación.
- Texto en `ink`; secundario en `ink-muted`; fechas y notas en `ink-faint`.
- `primary` solo para la acción principal de la pantalla, la acción rápida activa y el banner. Su texto siempre en `on-primary`.
- `accent-glow` y `accent-light` son luz: tarjetas, barra de progreso y logo. Nunca texto.
- Semánticos: `success` para ingresos y "al día", `warning` para "casi al límite", `danger` para alertas. Los gastos normales NO van en rojo: van en `ink` con −. Cada estado se dice también con palabra o signo.

## Tipografía

- Una sola familia: Manrope (Google Fonts), con cifras tabulares para todo monto (`jx-num`).
- Montos: `amount-xl` (saldo protagonista), `amount-lg` (encabezado), `amount` (filas), `card-number`.
- Texto: `title-xl` (pantallas completas), `title` (secciones y barra superior), `body-strong` (nombres), `body`, `label` (botones), `caption` (fechas), `micro` (números enmascarados).

## Forma y espacio

- Márgenes laterales de `space-5`; entre secciones `space-6`; dentro de filas y paneles `space-4`.
- Radios: `radius-md` filas y campos, `radius-lg` tarjetas, paneles y modales, `radius-xl` hojas inferiores, `radius-pill` botones, chips, barras y círculos.
- Sombras solo en lo que flota o es objeto: `shadow-card` en tarjetas bancarias, `shadow-float` en navegación, banner y avisos.
- El foco de teclado es un anillo de 2px en `accent-light`.

## Pantallas

- Inicio: `BalanceHeader` → `BankCard` (carrusel de cuentas) → fila de `QuickAction` → `SectionHeader` + `TransactionRow` → `PromoBanner` → `BottomNav`.
- Tarjetas: barra superior con `IconButton` y título → `BalancePanel` → `CardStack` → botones `primary` y `secondary` al pie.
- Pantallas completas (PIN, huella, bienvenida): título `title-xl`, texto `body` en `ink-muted`, ilustración de trazo en `accent-light` y botones `jx-btn--block` abajo.
- Avisos del asesor con `Notice`; formularios con `Field`.

## Iconografía

- Iconos de trazo de 24px, grosor 1.75, puntas redondeadas, en `currentColor` (estilo Lucide; en la app usar `lucide-vue-next`).
- 18px en botones circulares, 22px en acciones rápidas y navegación.
- Sin iconos rellenos, salvo el círculo activo de la navegación.

## Adiciones intencionales

- `Field` y `Notice` no están en la imagen de referencia: la app necesita formularios y los avisos del asesor.
- Tema `light`, para quien no quiera el modo oscuro.
