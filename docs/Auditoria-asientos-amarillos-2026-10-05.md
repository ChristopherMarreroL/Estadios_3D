# Auditoría de asientos amarillos (Palco A)

Fecha: 5 de octubre de 2026. Se analiza el estado local después de corregir los corporativos. No se modifica la distribución ni se exporta el modelo en esta auditoría.

## Referencia y alcance

[Mapa UEPA, evento 2248](https://licey.uepatickets.com/beisbol/en/comprarEvento?idEvento=2248), abierto y observado con zoom durante esta revisión. Se verificó la orientación general A1–A48 y el detalle de filas próximo al dugout derecho. La comparación exhaustiva de nombres, IDs, filas y números usa el archivo público archivado en septiembre (`artifacts/uepa-reference/plano-sala.js.txt`), no una descarga nueva de todo el catálogo. La página y el plano no proporcionan cotas físicas del estadio.

Los asientos amarillos del modelo corresponden al grupo 2287, Palco A. Los colores comerciales del plano no son una prueba del color físico de cada butaca. La disponibilidad y los asientos blancos que dibuja la web son simulados.

## Resultado

La información de butacas se conserva, pero no se puede afirmar que la distribución espacial reproduzca el mapa. El modelo usa una distribución generada por anchuras y posiciones estimadas; necesita ajustes de orientación, filas y límites de bloque.

| Comprobación | Resultado |
| --- | --- |
| Sectores y cantidad | 48 sectores, 2.711 butacas |
| IDs, filas y números contra catálogo archivado | Coinciden los 48 sectores, sin diferencias |
| Orientación vista en la orientación del plano UEPA | Invertida: UEPA sitúa A1 a la derecha y A48 a la izquierda; el modelo coloca A1 en X negativo y A48 en X positivo |
| Distancia mínima entre centros | 0,54545 m; cero pares por debajo de 0,52 m |
| Continuidad dentro de una fila | 69 saltos mayores de 2 m en A6, A11, A18, A25, A32, A39 y A44; máximo 4,70375 m |
| Inicio de filas | A9–A14 y A35–A40 comienzan en D en el catálogo; el simulador coloca su primera fila cerca del frente |
| Alturas de letras iguales entre bloques | Dependen del número de filas del sector: D queda entre 1,255 y 1,875 m; M entre 3,580 y 4,045 m |

Los saltos son distancias entre centros consecutivos de una misma fila generada. No prueban una colisión: muestran que un pasillo interrumpe el bloque, cuya correspondencia con el plano no está definida. La separación mínima tampoco certifica ausencia de choques entre todas las piezas de la butaca ni cumplimiento arquitectónico.

## Causas en el simulador

1. `simulateSector` ordena Palco A por nombre ascendente y lo coloca desde `s=-80` hasta `s=80`. Solo los corporativos tienen orientación invertida.
2. Cada sector ocupa la profundidad completa según `rowIndex / sector.rows.length`. El inicio en D no desplaza la fila hacia atrás; no se guarda el hueco de A–C junto al dugout. Sectores con 9, 12, 13 o 14 filas reciben distintas posiciones para una misma letra. Que las alturas difieran no prueba por sí solo un error físico, pero el algoritmo no tiene una justificación por sector basada en UEPA.
3. Se asignan anchos a lo largo de toda la longitud disponible, excluyendo los pasillos. Un sector puede atravesar un corte en lugar de quedar contenido entre pasillos. Por ejemplo, A6 presenta un salto de unos 2,90 m entre butacas consecutivas de la primera fila.
4. Las filas de anchura variable se centran automáticamente. Conservan su cantidad real, pero su alineación lateral y forma en abanico no están contrastadas con todos los sectores del mapa.

## Ajustes necesarios, por prioridad

- Invertir la distribución de sectores de Palco A y actualizar conjuntamente etiquetas, butacas, cámaras y Blender, prestando atención a la muestra detallada A6.
- Definir la posición de cada fila por su letra y por el bloque del plano; conservar las ausencias de A–C alrededor de los dugouts. Las cotas y huellas deben seguir apoyadas en las terrazas existentes.
- Vincular explícitamente bloques y pasillos para evitar que los cortes partan arbitrariamente sectores.
- Contrastar por sector el orden lateral de números, la alineación de filas cortas y los cambios de anchura. No invertir automáticamente el orden de butacas al invertir los sectores.

No se proponen nuevas butacas ni cambios de inventario. Se conservarían las 2.711 butacas, IDs y numeraciones originales.

## Reproducción

`bun scripts/analyze-yellow-seats.ts` genera `artifacts/blender/yellow-seats-audit-20261005/checks.json`: centros de los 48 sectores, rangos de altura, comparación del catálogo y todas las filas partidas. Los resultados describen coordenadas de simulación en metros del modelo, no un levantamiento del estadio.
