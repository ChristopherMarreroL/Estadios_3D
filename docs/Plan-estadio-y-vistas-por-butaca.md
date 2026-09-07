# Estadio y vistas por butaca

Actualización del 7 de septiembre: ver `Fase2-estadio-2026-09-07.md`. La cubierta y la fachada ya siguen la curva, el modelo contiene las 11,367 butacas y el césped tiene franjas exportables. Los puntos siguientes conservan el contexto del plan inicial.

## Implementado el 6 de septiembre de 2026

La portada abre `/localidades`, donde cada selección de Palco A, AA, AAA, Corporativo, Preferencias C y Gradas D tiene una cámara propia. Son 11,367 posiciones calculadas. La cámara se mantiene fija al mirar alrededor con arrastre o teclado. Se puede pasar a una butaca vecina, cambiar de fila, volver a mirar al terreno y ubicar el asiento desde una vista general.

Se exportó la escena actual de Blender a `public/models/estadio-quisqueya.glb`, con respaldo en `estadio-quisqueya-pre-web-phase1.glb`. La URL del modelo se versionó para evitar mostrar la exportación anterior. El césped procedural se representa mediante su color base en glTF: sus franjas todavía requieren texturización. La exportación no altera la geometría ni guarda cambios adicionales en Blender.

## Criterio de simulación

El catálogo identifica las butacas; las posiciones son hipótesis explícitas aprobadas por el usuario para simular perspectivas diferentes sin planos métricos.

- La función de posición reproduce la directriz de V redondeada y el desplazamiento de las alas del script de arquitectura de Blender.
- Palco A se distribuye en la grada interior; AA en el tramo central de la grada intermedia; AAA en sus extremos. Preferencias ocupa el tramo central de la grada exterior y Gradas D sus extremos. Corporativo se ubica en la franja baja central.
- Los sectores se ordenan de forma natural por nombre. El sentido global de los sectores y la numeración dentro de cada fila son provisionales. Se conserva el orden de butacas del catálogo, incluso cuando es descendente.
- La profundidad depende del índice real de fila, no del código de su letra. Las alturas se ajustan a los escalones de la maqueta. Se añade una altura de ojos sentada de 1.15 m como parámetro conceptual.
- Se excluyen las bandas de pasillos de la distribución de asientos. Cada butaca conserva coordenadas distintas; no se agrupan cámaras por sección.
- Cámara y modelo comparten conversión Blender Z-up → glTF Y-up y normalización. Campo de visión fijo de 60° durante las comparaciones. La cámara no cambia de posición cuando el usuario mira alrededor.
- Las sillas añadidas en el visor representan el sector consultado y son ilustrativas. No se añadieron 11,367 objetos al archivo Blender.
- VIP, balcones, bullpen y zonas sin numeración siguen consultables, pero aún no tienen una asignación 3D. No se inventa una vista para ellas.

No se garantiza visibilidad real ni ausencia de obstáculos: cubiertas, divisiones y otros elementos siguen siendo una maqueta. El antiguo flujo de compra con datos simulados permanece en el repositorio, pero la portada ahora dirige al catálogo con simulación por butaca.

## Siguientes fases

1. **Cubiertas y fachadas.** Adaptar los volúmenes que aún conservan la forma anterior a las gradas corregidas. Revisar vistas aérea, home y laterales antes de una nueva exportación.
2. **Distribución de sectores.** Contrastar extremos A1/A48, AA11/AA48, AAA, C y D con el plano y referencias visuales. Identificar Palco A Ampliación y validar el sentido de numeración. Ajustar parámetros sin cambiar identificadores de butaca.
3. **Circulación y obstáculos.** Refinar pasillos, escalones, accesos, barandas y separación de corporativos. Revisar su efecto desde filas delanteras y posteriores.
4. **Terreno y entorno.** Franjas del césped, bullpen, dugouts, pizarra, torres y materiales. Mantener una exportación web eficiente.
5. **Comparación y navegación.** Añadir un plano seleccionable por sectores y comparación entre dos butacas una vez validada su orientación. Incorporar VIP y balcones cuando tengan una ubicación razonable.

Cada fase conservará respaldo, vistas de revisión y exportación local. No se publican cambios automáticamente.

## Validación

`bun scripts/verify-seat-simulation.ts` verifica unicidad y finitud de las 11,367 cámaras, incremento no negativo de alturas por fila, desplazamiento lateral entre extremos, altura de ojos y revisión del GLB. TypeScript, lint y compilación de producción correctos. Prueba de navegador: A24/A/3 → A24/B/3 → A24/B/2, con cambios visibles de perspectiva y selección.
