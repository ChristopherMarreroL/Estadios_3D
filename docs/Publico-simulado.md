# Público simulado por butaca

La vista en primera persona conserva la altura de ojos sentada (1.15 m sobre el escalón). No se dibuja otro espectador en la butaca del usuario. Los avatares vecinos permanecen sentados, balancean ligeramente el torso y levantan/bajan brazos y manos con fases diferentes. Son figuras ilustrativas, no personas reales ni una predicción exacta de obstrucciones.

## Ocupación

La fuente actual es **demostración**, no disponibilidad de Uepa. El porcentaje ajusta una distribución determinista por identificador compuesto sector/butaca. Cambiar de cámara no sortea de nuevo al público. El porcentaje es un umbral de distribución y puede diferir del porcentaje exacto en un sector pequeño; se muestra también el conteo de espectadores.

Cada vecino de delante o lateral puede marcarse ocupado/libre mediante un ajuste explícito. La butaca delantera se elige por proximidad geométrica dentro de la fila anterior. La primera fila no tiene vecino delante. Los ajustes se conservan al cambiar de butaca, y se reinician al mover el deslizador de ocupación.

La integración futura deberá sustituir esta fuente por estados reales del proveedor. Una venta no garantiza asistencia ni permite predecir estatura o comportamiento: incluso con disponibilidad real, el público seguirá siendo una simulación visual.

## Rendimiento y accesibilidad

Solo se dibuja público del sector consultado. Cuerpo/extremidades y cabeza/manos utilizan dos mallas instanciadas para todo el grupo. Se puede pausar sin cambiar la pose; se respeta la preferencia de movimiento reducido del sistema. Las zonas sin asignación 3D no muestran estos controles.

## Validación

`bun scripts/verify-seat-occupancy.ts` comprueba sectores vacíos/llenos, crecimiento estable de densidad, ajustes por butaca y vecinos en los bordes. TypeScript, lint y compilación verificados. Prueba en navegador: A24/B/3, vecino A/3 ocupado/libre y conteo 30 → 29.
