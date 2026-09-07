# Revisión del estadio — 7 de septiembre de 2026

Basada en las tres fotografías facilitadas por el usuario: aérea diurna, aérea nocturna y panorámica desde la tribuna. Se usan como referencias de forma y distribución, sin deducir cotas ni una fecha de configuración exacta.

## Cambios en Blender y en la web

- Cubierta en tres tramos curvos que siguen la huella de las gradas, con juntas, nervios y apoyos. Sustituye los paneles rectangulares que conservaban la geometría anterior.
- Palco de prensa, marquesina, corredor posterior y fachada adaptados a la misma curva. Se añadió baranda al corredor y se reemplazó el volumen de servicio separado por un anexo junto a la fachada.
- Terrazas con material de hormigón y **11,367 asientos individuales** de las seis divisiones principales, agrupados en seis mallas. Tienen asiento, respaldo curvo y soporte. Colores amarillo, rojo, azul y verde según el grupo provisional de la maqueta.
- Posiciones de asientos obtenidas del mismo cálculo utilizado por la cámara web, mediante `scripts/export-seat-placements.ts`. Corregida la altura de la plataforma corporativa en ese cálculo: 0.32 m, coincidente con Blender.
- Eliminadas las sillas duplicadas que el visor añadía únicamente al sector seleccionado: ahora el modelo contiene las butacas de todo el conjunto simulado. El público animado sigue limitado al sector consultado.
- Infield con diamante de césped y área de arcilla en abanico; césped detrás de home; pista de tierra junto al muro del outfield; remates de terreno lateral ajustados a los extremos de foul.
- Franjas del césped mediante materiales exportables a glTF, visibles también en la web. Reducido el tamaño de las bases del blockout.
- Vista general web más próxima y URL versionada para cargar el GLB nuevo.

## Archivos y reproducción

- Escena: `public/models/estadio-quisqueya-v1.blend`.
- Exportación: `public/models/estadio-quisqueya.glb`.
- Respaldos: `estadio-quisqueya-v1-pre-phase2-20260907.blend` y `estadio-quisqueya-pre-phase2-20260907.glb`.
- Construcción: `scripts/blender/improve_phase2.py`; ejecutar después de `bun scripts/export-seat-placements.ts`.
- Renderizado: `scripts/blender/render_phase2.py`.
- Comprobaciones y cuatro renders: `artifacts/blender/phase2-20260907/`.

Se trabajó con Blender en segundo plano porque la aplicación estaba cerrada. El archivo actualizado está guardado en disco. No se realizaron publicaciones ni cambios remotos.

## Validación y límites

Se comprobaron coordenadas finitas de las mallas modificadas y el conteo de butacas de los seis objetos exportados. La prueba de simulación compara todas las posiciones exportadas para Blender con las posiciones de cámara web, además de verificar unicidad, altura de ojos y filas. Pruebas de ocupación, TypeScript, lint y compilación de producción completadas.

La exportación pesa más al incluir toda la geometría de las butacas; se verificó su carga en el navegador local. Queda pendiente medir y optimizar el rendimiento en móviles de gama baja. No se debe interpretar esta comprobación como certificación de ausencia de toda intersección entre objetos.

La distribución comercial izquierda/derecha, las distancias y las alturas siguen siendo aproximaciones. La cubierta y la fachada son una reconstrucción visual simplificada. Continúan pendientes vomitorios detallados, barandas interiores, dugouts abiertos, fidelidad de pizarra y torres, textura del entorno, y asignación 3D de VIP/balcones. No se atribuye disponibilidad real a las butacas ni se garantiza visibilidad real desde ellas.
