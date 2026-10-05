# Revisión y redistribución de asientos — 5 de octubre de 2026

Este documento registra la primera redistribución. Las 608 localidades que entonces no tenían posición se integraron después; véase [Integración de asientos pendientes](Asientos-pendientes-2026-10-05.md).

Se revisaron todas las 11.975 butacas numeradas del catálogo y se corrigió la distribución de las 11.367 representadas actualmente en 3D. Fuente visual: [UEPA, evento 2248](https://licey.uepatickets.com/beisbol/en/comprarEvento?idEvento=2248), consultado durante la revisión. La comparación exhaustiva de IDs, filas y números usa los archivos públicos archivados el 6 de septiembre; no se presenta como una comprobación de disponibilidad actual.

## Correcciones

- Orientación de los seis grupos conforme al plano: números menores a la derecha con el terreno arriba y las gradas abajo. Esto es una orientación del plano; al girar la cámara los lados en pantalla cambian.
- Filas colocadas por letra dentro de cada nivel, conservando los huecos delanteros de bloques que comienzan en D, F o G. La misma letra comparte altura en los sectores del grupo.
- Gradas D12/D13 tenían F enumerada después de P en el archivo original. El simulador y el selector ahora usan orden físico F–G–H–J–K–L–M–N–P, manteniendo IDs y numeración de butacas.
- Cada sector ocupa un único tramo entre escaleras. Se eliminaron 147 saltos mayores de 2 m entre asientos consecutivos de una fila.
- La distribución usa longitud física de arco y alas, con separación uniforme dentro de cada grupo. Las filas cortas se centran y conservan su cantidad y sentido de numeración original.
- Las sillas siguen la orientación perpendicular de su fila, incluido el estrechamiento de las alas. Apuntarlas todas a home provocaba cruces entre carcasas aunque sus centros estuvieran suficientemente separados. El modelo, el selector y los espectadores comparten ahora la orientación corregida.
- Se prolongaron las terrazas auxiliares en los extremos para sostener los bloques completos: Palco A llega a s=±88 (su soporte a ±89), Gradas a ±144 (soporte y paseo a ±145). Preferencias alcanza ±60,7; permanece antes del siguiente corredor. Son parámetros del modelo, no metros de aforo oficial ni medidas del estadio.
- Las 84 butacas detalladas de A6 se trasladaron junto con carcasa, soportes, tornillos y números. Su archivo auxiliar de posiciones también se actualiza desde el exportador compartido.

## Resultado por grupo

| Zona | Butacas | Saltos >2 m antes | Después | Mínimo entre centros consecutivos |
| --- | ---: | ---: | ---: | ---: |
| Corporativos | 116 | 0 | 0 | 54,66 cm |
| Preferencias | 1.594 | 12 | 0 | 52,07 cm |
| Gradas | 3.015 | 18 | 0 | 53,92 cm |
| Palco A | 2.711 | 69 | 0 | 56,43 cm |
| Palco AA | 2.571 | 48 | 0 | 60,76 cm |
| Palco AAA | 1.360 | 0 | 0 | 55,77 cm |

La búsqueda de vecinos comprueba también pares entre filas, sectores y grupos: cero pares por debajo de 52 cm. No equivale a certificar dimensiones o normas arquitectónicas reales.

## Todas las demás butacas

Se verificaron asimismo VIP Escogido (117), VIP Licey (134), Balcón Escogido (143), Balcón Licey (133) y Bullpen Licey (81): 608 butacas. Sus IDs, letras/números de fila y números de butaca coinciden con el catálogo archivado y no presentan identificadores compuestos duplicados. Estas zonas no tienen posiciones 3D vinculadas en el proyecto: se conservan sus datos, sin asignarles posiciones inventadas. La UI ya informa que VIP y balcones no están incluidos en el visor. Parqueos, Fan Club y Gran Stand de Pie no contienen butacas numeradas.

El catálogo original queda intacto: las 11.975 butacas y los 201 sectores/zonas conservan sus datos. El análisis no confirma coordenadas físicas ni orientación individual de todos los números en el estadio real; respeta el orden de numeración publicado y adapta la geometría provisional.

## Verificación y artefactos

- `artifacts/blender/all-seats-20261005/audit.json`: revisión de todos los grupos, comparación con catálogo y métricas antes/después.
- `artifacts/blender/all-seats-20261005/model-checks.json`: 11.367 apoyos comprobados sobre terrazas; cero apoyos ausentes; cero intersecciones de superficies de carcasa con escaleras o muretes corporativos mediante BVH.
- `artifacts/blender/all-seats-20261005/seat-shell-collisions.json`: cero cruces entre carcasas de sillas vecinas. Se comprueban las mallas reales en coordenadas mundiales, incluidas las 84 sillas detalladas de A6, y su correspondencia con las posiciones y orientaciones exportadas.
- `artifacts/blender/seat-spacing-audit-20260925/all-seats.json`: búsqueda espacial de vecinos, cero pares por debajo de 52 cm.
- Renderizaciones comparables `before.png` y `after.png`, más A6, AA11, C4 y D12. La cubierta se oculta únicamente para estas imágenes; no se guarda esa configuración.
- Se preservaron atributos e índices de 163 mallas ajenas a la redistribución en el GLB, incluidos UV originales que Blender reescribe al exportar.
- Las pruebas de simulación verifican orientación de los seis grupos, alturas de filas, ausencia de sectores que crucen los corredores, orden de butacas por fila, 11.367 cámaras únicas y correspondencia con las posiciones compartidas/A6. Las pruebas de ocupación también pasan.
- Verificación visual en navegador local de A6, selección de fila A/butaca 4 y cámara desde la butaca, con y sin público. Selección de demostración retirada al terminar.
- TypeScript, ESLint y compilación de producción comprobados. Los artefactos generados se excluyen de ESLint; las fuentes y scripts se siguen verificando.

## Reproducir

Este informe conserva la fase inicial de 11.367 butacas. La fase posterior añade las 608 restantes y se reproduce con [Asientos pendientes](Asientos-pendientes-2026-10-05.md). El exportador compartido ahora contiene 11.975 posiciones; `redistribute_all_seats.py` filtra expresamente los seis grupos que controla y conserva las plataformas y sillas especiales existentes. La comprobación de mallas ajenas compara contra el GLB presente al iniciar esa ejecución, para respetar los ajustes posteriores de la cabina y barandilla.

1. `bun scripts/generate-seat-layout.ts`: resuelve la distribución de sectores y escribe `src/data/seat-layout.json`. `--verify` compara con el resultado guardado y su hash de catálogo. El solver se ejecuta fuera del navegador; la UI carga las posiciones preparadas.
2. `bun scripts/export-seat-placements.ts`: exporta las 11.367 posiciones y el archivo auxiliar A6.
3. Blender en segundo plano sobre el archivo principal con `--python scripts/blender/redistribute_all_seats.py`. Verifica apoyos y escaleras antes de guardar; exporta un candidato, valida las mallas preservadas y lo sustituye por el GLB final. Respaldos `pre-redistribution-20261005`.
4. `bun scripts/verify-seat-simulation.ts`, `bun scripts/verify-seat-occupancy.ts`, `bun scripts/audit-seat-spacing.ts all-seats --verify`, `bun scripts/analyze-all-seats.ts`, `npm run lint`, `npm run build`.
5. Blender en segundo plano sobre el archivo principal con `--python scripts/blender/check_seat_shell_collisions.py`; opcionalmente `--python scripts/blender/render_all_seats.py` para regenerar las vistas comparables.

La URL del GLB usa `20261005-all-seats` para invalidar caché. Cambios y pruebas locales; sin push, deploy ni publicación.
