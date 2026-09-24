# Pasillos, barandas y vistas — 23 de septiembre de 2026

Actualización posterior: los accesos que obstruían las vistas se corrigieron en [Accesos y visibilidad](Accesos-y-visibilidad-2026-09-23.md). Este documento conserva el resultado de la primera pasada.

Se refinó el modelo existente, conservando las 11.367 butacas y la muestra A6. Las dimensiones siguen siendo conceptuales, sin mediciones verificadas del estadio.

## Cambios

- 812 bandas de contraste sobre los bordes de los peldaños de los nueve pasillos. Siguen los escalones reales de los pasillos (doble subdivisión respecto a las terrazas), incluido su desnivel de 15 mm.
- 46 tramos de pasamanos reconstruidos con postes en ambos extremos, apoyos distribuidos, placas de anclaje y remates descendentes. Se conservan sus ejes laterales; las placas quedan dentro del pasillo.
- Baranda frontal superior con travesaño intermedio y elementos verticales finos. Conserva su posición y altura previas, así como las interrupciones de 2,10 m alrededor de los pasillos. Es detalle de maqueta, no una certificación de protección o accesibilidad.
- Exportación GLB y actualización de su URL de caché. Tamaño: 23.167.892 → 24.019.888 bytes, aproximadamente +3,68 %.

No se desplazaron butacas, cámaras, cubiertas, dugouts ni portales de acceso. No se modificó el comportamiento del selector o del público.

## Comparativas desde butacas

Imágenes antes/después en `artifacts/blender/circulation-20260923/`, con cámaras idénticas por pareja, altura de ojos de 1,15 m y campo vertical de 60°:

| Imagen | Localidad | Revisión |
| --- | --- | --- |
| `aisle` | A16 / G / 1 | Bordes de escalones, apoyos y vista lateral del pasamanos |
| `upper-front` | C13 / A / 12 | Baranda frontal y pared lateral del acceso existente |
| `upper-back` | C13 / H / 15 | Pasillo descendente, cubierta y portal de acceso existente |

La pared del acceso limita parte del encuadre de C13/A/12. Desde C13/H/15, el portal ocupa parte de la vista del terreno. Estos obstáculos ya estaban en el modelo y se conservan: deben revisarse contra referencias antes de cambiar sus dimensiones o prometer visibilidad.

## Validación

- Huella SHA-256 de vértices, polígonos y transformaciones de las mallas de asientos y de todos los objetos A6 idéntica antes/después de esta operación.
- 11.367 butacas; las cuatro mallas intervenidas tienen coordenadas finitas y aristas manifold.
- Distancia mínima entre los ojos de cualquier butaca y las cuatro mallas de circulación: 0,3984 m.
- Nueve rayos de muestra (home, montículo y jardín central desde tres butacas) sin intersección con las cuatro mallas intervenidas. Esta comprobación no incluye el resto del estadio ni el público y no certifica visibilidad completa.
- `bun scripts/verify-seat-simulation.ts`, `bun scripts/verify-a6-detail.ts` y `bun scripts/verify-phase3.ts`: correctos.
- `npx tsc --noEmit` y `npm run lint`: correctos.
- Revisión visual de las tres imágenes finales y prueba del visor web en C13/A/12 con público al 65 %: modelo cargado, nueva baranda y bandas de escalón visibles.

## Reproducción

Ejecutar Blender en segundo plano sobre `public/models/estadio-quisqueya-v1.blend` con `--python scripts/blender/refine_circulation.py`. Reemplaza sus mallas por nombre; no duplica la geometría. Conserva los respaldos e imágenes anteriores si ya existen. `CIRCULATION_SKIP_RENDER=1` omite las imágenes para repetir únicamente construcción y verificaciones.

Respaldos Blender y GLB con sufijo `-pre-circulation-20260923`. Informe automático: `artifacts/blender/circulation-20260923/checks.json`. La exportación requiere acceso a los archivos temporales de Blender.

Trabajo local, sin push, merge ni publicación.
