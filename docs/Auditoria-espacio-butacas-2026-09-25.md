# Auditoría de separación de butacas — 25 de septiembre de 2026

Base: `origin/main`, commit `3367220`. Rama: `mejora/espacio-entre-butacas`.

Se redistribuyeron las 11.367 butacas representadas en 3D conservando sus IDs, filas y cantidades. La distribución utiliza la longitud física de las tribunas curvas, reserva los pasillos y centra las sillas sobre sus peldaños. Las posiciones del modelo, del selector y de la cámara se exportan desde la misma fuente.

| Zona | Butacas | Mínimo anterior entre centros de una fila | Mínimo actualizado |
| --- | ---: | ---: | ---: |
| Corporativos | 116 | 34,2 cm | 54,7 cm |
| Preferencias | 1.594 | 53,1 cm | 53,3 cm |
| Gradas | 3.015 | 43,1 cm | 53,0 cm |
| Palco A | 2.711 | 25,8 cm | 54,5 cm |
| Palco AA | 2.571 | 39,3 cm | 61,7 cm |
| Palco AAA | 1.360 | 39,9 cm | 55,8 cm |

La búsqueda espacial de vecinos, incluyendo fronteras entre filas y sectores, pasa de 5.414 parejas por debajo de 52 cm a cero. Se verificó mediante rayos contra la geometría que las 11.367 posiciones tienen soporte sobre las tribunas. Se actualizaron también las 84 sillas detalladas de A6 y sus cámaras. Gradas vuelve a usar carcasas de 46 cm.

Para conservar la capacidad se ampliaron los extremos de las tribunas: Palco A pasa de un rango longitudinal de ±60 a ±80; Palco AAA llega a ±126 y Gradas a ±136. Se añadieron superficies de apoyo, prolongaciones del pasillo posterior y barandas. Estas coordenadas parametrizan la maqueta; no son medidas verificadas del estadio real. Los grupos sin posiciones 3D, enumerados en los informes JSON, quedan fuera de esta validación.

## Reproducción

- `bun scripts/export-seat-placements.ts`
- Ejecutar Blender sobre `public/models/estadio-quisqueya-v1.blend` con `scripts/blender/space_all_seats.py` para reconstruir y exportar.
- `bun scripts/audit-seat-spacing.ts after --verify`
- `bun scripts/verify-seat-simulation.ts`
- `bun scripts/verify-a6-detail.ts`
- `bun scripts/verify-ticket-inventory.ts`
- `bun scripts/verify-seat-occupancy.ts`
- `bunx tsc --noEmit`, `npm run lint`, `npm run build`

Los informes antes/después y la comprobación de soporte se encuentran en `artifacts/blender/seat-spacing-audit-20260925/`. El script `scripts/blender/render_seat_spacing.py` genera vistas de revisión sin guardar cambios en la escena.
