# Button

Botón en píldora para la acción de una pantalla: `primary` para la principal (solo una por pantalla), `secondary` para la alterna y `ghost` para salir sin decidir (Más tarde).

- El consumidor da el texto (verbo concreto: "Activar", "Agregar tarjeta", "Confirmar pago") y, si quiere, un icono a la izquierda.
- Clases: `jx-btn` + `jx-btn--primary | --secondary | --ghost`; `jx-btn--block` lo estira al ancho (botones al pie de pantallas completas).
- Alto 48px, texto `label`. No uses dos `primary` juntos: la segunda acción va en `secondary`.
