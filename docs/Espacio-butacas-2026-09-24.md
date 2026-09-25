# Espacio entre butacas en Preferencias y Gradas — 24 de septiembre de 2026

Cada sector recibía el mismo ancho de grada, tuviera 6 o 13 butacas por fila. D11 quedaba a 0,31 m entre centros (sillas de 0,46 m, encimadas) y su vecino D12 a 0,68 m. En la curva detrás del home, C12 llegaba a 0,74–0,87 m porque allí cada unidad del trazado equivale a más metros.

## Cambio

`simulateSector` reparte el ancho de Preferencias (C) y Gradas (D) con un único paso por tribuna, según la fila más larga de cada sector y compensando el estiramiento de la curva. Cada sector reserva además un pasillo fijo de 0,8 m (`SECTOR_GAP`) con sus vecinos, para que D1, D2, D3… se lean como bloques separados y no como una banda continua. Los pasillos de escalera siguen excluidos. Las filas más cortas se centran con el mismo paso.

| Tribuna | Antes | Entre butacas | Entre sectores (butaca más cercana) |
|---|---|---|---|
| Preferencias (C) | 0,27–2,14 m | 0,53–0,60 m | ≥ 1,4 m |
| Gradas (D) | 0,31–0,81 m | 0,43–0,44 m | ≥ 1,2 m |

Las alas de Gradas tienen un largo fijo: con pasillos entre sectores el paso queda algo por debajo de AA16 (0,52 m). Para que las sillas no se solapen, en el modelo las de Gradas miden 0,40 m de ancho en lugar de 0,46 m. Palco A (con el piloto A6), AA, AAA y corporativos no cambian. El espacio entre filas no se tocó: 1,14 m en los sectores de 14 filas y 1,78 m en los de 9 (AA16: 1,0 m).

## Modelo y validación

`bun scripts/export-seat-placements.ts` y después `scripts/blender/rebuild_seat_spacing.py`, que reconstruye solo `catalog_seats_2276` y `catalog_seats_2278` y comprueba que el resto de sillas no se mueve. Comparativas en `artifacts/blender/seat-spacing-walkways-20260924/`. `bun scripts/verify-seat-simulation.ts` exige más de 0,50 m (C) y 0,42 m (D) entre butacas contiguas y más de 1,1 m entre sectores vecinos.

URL del modelo: `20260924-seat-walkways`.
