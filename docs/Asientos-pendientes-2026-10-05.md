# Integración de las 608 localidades pendientes

Se añadieron posiciones, sillas y cámaras para todas las localidades numeradas que faltaban. El modelo y el inventario de demostración ahora cubren las 11.975 butacas del catálogo; no quedan localidades numeradas sin posición.

| Grupo | Localidades añadidas |
| --- | ---: |
| VIP Escogido | 117 |
| VIP Licey, incluidos Directivo y OP.B | 134 |
| Balcón Escogido | 143 |
| Balcón Licey | 133 |
| Bullpen Licey | 81 |
| Total | 608 |

## Referencias y alcance

Se consultó el [plano interactivo de UEPA, evento 2248](https://licey.uepatickets.com/beisbol/en/comprarEvento?idEvento=2248). Con el terreno arriba, Licey ocupa el lado izquierdo del anillo posterior y Escogido el derecho. Los balcones 1 quedan junto al centro; los 6 hacia los extremos. No se añadió un balcón 3: no existe en el catálogo. En Licey, 1A y 1B preceden a VIP 2–6 hacia el extremo; Directivo y OP.B también mantienen su identidad. Se conservan todos los IDs, las etiquetas de fila y los números publicados, incluidas filas cortas o ausentes.

La geometría es aproximada y usa la escala provisional del modelo. El plano permite comprobar ubicación relativa y numeración, pero no proporciona dimensiones, cotas ni orientación individual de todas las sillas. La prueba de cámara detectó que el anillo inicial quedaba demasiado bajo: se elevó 2 m para mirar sobre la última fila de Preferencias. La cabina de prensa y su vidrio/cartel se elevaron 3 m para mantener espacio sobre los balcones centrales. Son ajustes del modelo, no medidas certificadas del edificio real.

[Licey anunció una remodelación del antiguo bullpen](https://www.licey.com/licey-anuncia-proyecto-vip-para-sus-fanaticos/) con 200 asientos y restaurante/bar. El catálogo archivado usado por el proyecto contiene 81 puestos en esa categoría: 65 butacas en A–G y 16 en Mesa 1–4. Esta integración representa esos 81 puestos; no inventa las otras 119 localidades ni reproduce como definitivo el proyecto de 200 asientos. Los cuatro grupos de mesa tienen cuatro sillas alrededor de una mesa real, orientadas hacia ella. BAR y MESAS, sectores vacíos del catálogo, se excluyen de la selección de butacas.

## Cambios

- `src/data/special-seat-layout.json`: posiciones reproducibles para los cinco grupos; plataformas y mesas compartidas con Blender. El generador compara el hash del catálogo.
- `src/lib/seat-simulation.ts`: las nuevas posiciones se integran en la misma simulación que las 11.367 existentes. Esas posiciones anteriores no se recalculan ni cambian.
- Inventario y selector: cinco categorías nuevas, disponibles tanto en 3D como en la lista accesible. Precios y disponibilidad siguen siendo demostración.
- Plataformas escalonadas, circulación frontal, pasillos laterales y escaleras de acceso a VIP/balcones. Se abren pasos en la barandilla del paseo anterior y se añaden protecciones al nuevo anillo.
- Bullpen: siete filas escalonadas, cuatro mesas, circulación frontal y barandilla. Las mesas no se tratan como filas situadas detrás de G; sus vecinos permanecen en la misma mesa. Los textos muestran “Mesa 1”, sin anteponer “Fila”.
- Archivo Blender y GLB actualizados, con respaldos `pre-pending-seats-20261005`. La URL del GLB usa la nueva revisión para invalidar caché.

## Verificación

El informe actual es `artifacts/blender/pending-seats-20261005/audit.json`; el informe anterior conserva el estado de la primera redistribución. Los checks de geometría y carcasas se guardan en la misma carpeta. Se comprueban las 608 identidades nuevas, lados del plano, selección, orientación de mesas, apoyos, espacio bajo la cabina y correspondencia entre posiciones web y mallas reales. Las 11.975 carcasas se comparan entre vecinos; la separación mínima entre centros de las nuevas filas es aproximadamente 65 cm.

La revisión independiente del modelo final se guarda en `current-geometry-checks.json`: comprueba cuatro puntos del pedestal de las 11.975 sillas, todas las carcasas contra las divisiones, escaleras, cubiertas, cabina, barandillas y mesas, y 1.389.100 rayos contra los seis accesos y sus letreros. No encontró apoyos ausentes, cruces ni rayos bloqueados por esos accesos. Esa prueba de rayos tiene alcance limitado a accesos y letreros; no certifica visibilidad completa del terreno frente a todos los elementos del estadio o al público. Los informes actuales incluyen SHA-256 del modelo, GLB y/o posiciones que verifican las pruebas para rechazar evidencia antigua.

Las mallas anteriores se comparan atributo por atributo e índice por índice contra el GLB de respaldo. Las excepciones intencionales son la cabina de prensa y la barandilla del paseo, adaptadas para altura y acceso. Se conservan las 11.367 sillas anteriores, el campo y las demás mallas. Las imágenes `before.png`, `after.png`, `vip-licey.png`, `balcon-escogido.png` y `bullpen-licey.png` permiten revisar el resultado. Para las imágenes de organización se oculta temporalmente la cubierta/cabina; esa visibilidad no se guarda en el modelo.

Resultado final: 509 mallas anteriores preservadas y cinco adaptadas; cero carcasas cruzadas entre las 11.975 sillas, cero apoyos ausentes para las 608 nuevas y cero cruces con los obstáculos comprobados. Pruebas de simulación, catálogo, mesas, ocupación y separación aprobadas; ESLint, TypeScript y compilación de producción aprobados. En navegador local se verificaron la selección y cámara de Bullpen/Mesa 1/Butaca 1, VIP Licey 2/A/1 y Balcón Escogido 1/A/2, incluidas las vistas con público y cubierta tras corregir la altura. No se observaron errores de consola. Las entradas de demostración se retiraron y se cerraron el servidor y las pestañas temporales.

## Reproducir

1. `bun scripts/generate-special-seat-layout.ts`; `--verify` comprueba el archivo guardado.
2. `bun scripts/export-seat-placements.ts`.
3. Blender en segundo plano sobre `public/models/estadio-quisqueya-v1.blend` con `--python scripts/blender/add_pending_seats.py`, seguido de `--python scripts/blender/check_seat_shell_collisions.py` y `--python scripts/blender/verify_current_seat_geometry.py`. El generador comprueba antes del guardado y de la sustitución del GLB candidato; los dos verificadores posteriores leen el modelo final sin guardarlo. Para revisar el modelo existente basta ejecutar esos dos verificadores, sin el generador.
4. `bun scripts/verify-seat-simulation.ts`, `bun scripts/verify-special-seats.ts`, `bun scripts/verify-access-views.ts`, `bun scripts/verify-seat-occupancy.ts`, `bun scripts/audit-seat-spacing.ts pending-seats --verify`, `bun scripts/analyze-all-seats.ts`.
5. `npm run lint`, `npm run build`. Para regenerar las vistas: Blender con `--python scripts/blender/render_pending_seats.py`.

Cambios y pruebas preparados para revisión mediante un PR a `main`. La integración y el despliegue quedan fuera de esta revisión.
