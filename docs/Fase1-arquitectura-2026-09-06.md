# Primera fase arquitectónica — 6 de septiembre de 2026

Aplicada y guardada en `public/models/estadio-quisqueya-v1.blend` tras autorización del usuario. Pendiente de validación visual del usuario antes de la fase de cubierta.

## Cambios

- Sustituidas las superficies de gradas por una directriz central curva con alas rectas y remate lateral progresivamente más estrecho. Se conservaron nombres y materiales de las secciones.
- Amarillo corto; rojo y azul prolongados hacia jardines. Terrazas escalonadas con huecos para nueve pasillos. Los dos objetos azules siguen representando el mismo nivel superior.
- Los nueve cilindros de pasillos se sustituyeron por escaleras apoyadas dentro de las terrazas.
- Zona corporativa baja, doce módulos provisionales y trece separadores compartiendo una malla. Se conserva `reservable=false` e interacción informativa.
- Dugouts colocados tangentes al frente de la terraza inferior; siguen siendo volúmenes simplificados.
- Eliminada la traslación duplicada de las plataformas de bullpen. Tierra, césped y montículo se agruparon espacialmente en cada lado, con orientación paralela al lateral.
- Superficie de transición a nivel de terreno entre foul y gradas, usando arcilla junto a home y el material de césped existente en los laterales.
- Eliminados metadatos radiales/angulares obsoletos en las terrazas reconstruidas. Parámetros de esta fase en `scripts/blender/correct_architecture_phase1.py`.

## Respaldo y validación

Respaldo anterior intacto: `public/models/estadio-quisqueya-v1-pre-architecture-20260906.blend`. Se evitó rotar el `.blend1` existente durante el guardado final.

171 objetos antes y después. Comprobadas 22 mallas modificadas: coordenadas finitas y terrazas/pasillos cerrados sin aristas no-manifold. Verificado que los trece separadores corporativos comparten una malla. Los 32 prototipos de asiento siguen ocultos. El chequeo de mallas cerradas no certifica ausencia de toda intersección entre objetos.

Cuatro renders generados y revisados en `artifacts/blender/phase1-20260906/`:

- `camera_topdown_validation.png`
- `camera_centerfield_aerial.png`
- `camera_grandstand.png`
- `camera_drone_exterior.png`

Se revisaron iteraciones de longitud y remate de las alas. Los parámetros aún son aproximaciones visuales, no cotas topográficas ni filas comerciales verificadas. La cantidad de peldaños no debe usarse como inventario oficial de filas/asientos.

## Límites de esta fase

La cubierta, fachada, vomitorios y torres conservan la geometría anterior y deberán adaptarse a la nueva huella; sus apoyos y uniones aún no están validados. Falta ajustar los remates con el muro de outfield y detallar accesos/barandas. Las bases conservan el tamaño de blockout detectado en la auditoría.

No se exportó GLB: el visor web todavía carga la versión previa, hasta validar esta geometría. La exportación futura debe resolver el césped procedural. No hubo push, deploy, merge ni publicación.
