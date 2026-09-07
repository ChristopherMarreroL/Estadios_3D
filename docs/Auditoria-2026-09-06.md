# Quisqueya: auditoría inicial de referencias

Fecha: 6 de septiembre de 2026. Estado: auditoría inicial conectada y documentada; pendiente de validar la primera fase arquitectónica.

## Actualización tras conectar Blender MCP

Conexión verificada con el archivo correcto, guardado y sin cambios antes de inspeccionar. Escena con 171 objetos, unidades métricas y escala de unidad 1. Se generaron y revisaron cuatro renders actuales en `artifacts/blender/audit-20260906/`: cenital, center field, gradas y exterior aérea. Los ajustes temporales de cámara/render fueron restaurados; no se guardó ni modificó geometría ni se reexportó el GLB.

### Errores comprobados y límites

- **Bullpens con traslación duplicada:** `bullpen_licey` tiene ubicación de objeto (-66, 10, 0.55), pero su malla local ya está centrada en (-66, 10, 0.07). El centro mundial resulta (-132, 20, 0.62), mientras césped y montículo están cerca de (-66, 10). El derecho presenta el mismo defecto simétrico. Los rectángulos de tierra fuera del estadio son estas plataformas. Hay que corregir la transformación y ajustar su cota para no tapar césped/montículo.
- **Pasillos heredados:** las barras visibles son `aisle_01`–`aisle_09`, mallas de 16 vértices con cotas Z entre 0.432 y 12.368. Los renders muestran segmentos cruzando vacíos y obstruyendo visuales. Deben reconstruirse contra el perfil final de las terrazas, no conservarse como cilindros diagonales.
- **Huella y espacios:** las alas rojas/azules siguen demasiado arqueadas y dejan grandes cuñas grises hacia las líneas de foul. El amarillo termina con remates abruptos. Esta es la primera corrección arquitectónica de mayor impacto.
- **Cubierta:** fascia frontal prácticamente recta, X de -59 a 59 y Y de -72.325 a -71.075. Los paneles cubren un rectángulo aproximado de X ±58 y Y -120 a -72; tienen curvatura de perfil, pero no reproducen la planta envolvente observada en el video.
- **Escala de elementos:** home y bases son todavía cajas con límites de aproximadamente 2.12 × 2.12 m en planta mundial (cajas giradas). Requieren revisión de dimensiones y forma; no representan detalle final.
- **Zonas semánticas:** `section_preferencia`, `section_licey_side` y `section_escogido_side` están ocultas tanto para render como para viewport. No son tres gradas físicas adicionales visibles.
- **Asientos:** 32 prototipos confirmados, todos comparten `seat_shared_mesh` y están ocultos para render. Conservar esa estrategia.
- **Contactos entre terrazas:** prueba BVH encontró pares de triángulos en contacto/intersección en verde–amarillo, amarillo–rojo, rojo–azules y unión de ambos azules, además de verde–fascia corporativa. No equivale a certificar penetración defectuosa: incluye bordes compartidos y no es prueba completa de sólidos. Resultado en `geometry-checks.json`. No se debe anunciar que la escena esté libre de solapes.

### Primera fase propuesta para validación

Guardar copia de seguridad; sustituir la directriz actual de gradas por un tramo curvo tras home y alas rectas alineadas con foul; preservar nombres/materiales y la zona corporativa pequeña; reconstruir pasillos y encajes de dugouts; corregir transformaciones de bullpens. Comparar las cuatro vistas antes de avanzar a cubierta, asientos o integración web. La ubicación final de cada elemento seguirá necesitando contraste con referencias: corregir una transformación no certifica su ubicación arquitectónica.

Los apartados siguientes conservan el registro de la investigación previa a la conexión; las limitaciones de conexión descritas allí ya fueron resueltas.

## Alcance y evidencia

Se leyó el contexto suministrado, la documentación existente, el GLB actual y dos renders anteriores. Se abrió `public/models/estadio-quisqueya-v1.blend` en Blender 5.2 y se verificó visualmente su ventana. No se modificó ni guardó geometría, ni se exportó el GLB.

MCP estaba desactivado. Se activó el complemento instalado, pero iniciar el servidor devuelve: `Online access must be enabled in the system preferences`. Se solicitó al usuario habilitar ese permiso. No se ha completado la auditoría de objetos, colisiones o cotas de la escena viva.

Fuentes consultadas:

- [Video suministrado, One Man Wolf Pack](https://www.youtube.com/watch?v=Adm2xDuX1FY). Se observaron tomas aproximadamente en 00:49 y 01:23, además de la introducción y el entorno en 01:56. No se afirma haber revisado todos los fotogramas. El título indica 2024; la descripción menciona trabajo terminado el 27 de diciembre de 2023. No representa necesariamente el estado físico de septiembre de 2026.
- [Mapa interactivo oficial del evento 2248](https://licey.uepatickets.com/beisbol/en/comprarEvento?idEvento=2248), accesible y consultado en navegador.
- [Ficha oficial de abonos Licey 2026–2027](https://licey.uepatickets.com/beisbol/en/entradas-deporte-abono-licey-2026---2027).
- Renders previos: `artifacts/blender/quisqueya-tier-extents-topdown.png` y `quisqueya-tier-extents-centerfield.png`. Son antecedentes, no renders nuevos de esta auditoría.

## Hallazgos arquitectónicos preliminares

| Elemento | Evidencia y diagnóstico | Tratamiento propuesto |
| --- | --- | --- |
| Huella de gradas | El video y el mapa muestran un tramo curvo tras home unido a alas predominantemente rectas junto a las líneas de foul. La escena visible y renders previos tienen alas excesivamente arqueadas y vacíos grises amplios. | Primera corrección: reconstruir la directriz por tramos y revisar distancias al campo. No resolver cambiando sólo los grados de un arco circular. |
| Nivel inferior | La referencia muestra límites, pasillos y remates en torno a dugouts y áreas de calentamiento. En los renders previos el nivel amarillo acaba dejando grandes cuñas vacías. | Ajustar extremos contra referencias y prever encajes; no extender automáticamente un anillo completo. |
| Corporativos | La zona frontal verde pequeña es coherente con la intención del proyecto; doce módulos sigue siendo una estimación del contexto. | Conservar intención de palcos bajos y regla informativa. Verificar cantidad y ancho antes de darla por definitiva. |
| Cubierta | La toma aproximadamente en 01:23 muestra cubierta envolvente curva y volumen central de prensa con ventanas. El render previo tiene una fascia frontal casi recta y tres paños simplificados. | Rehacer planta, arco frontal y relación con tribuna después de cerrar la huella. |
| Dugouts y bullpens | Existen en el modelo. En las referencias aparecen integrados al borde de gradas; en el modelo se leen aislados en grandes áreas vacías. | Reubicar/orientar con la nueva directriz y comprobar conexiones y desniveles. |
| Barras claras sobre gradas | En renders previos atraviesan grandes espacios abiertos y parecen desconectadas de su soporte. | Identificar objetos y contactos por MCP; no se puede certificar que flotan sólo por la proyección. |
| Torres, marcador y campo | Se reconocen en la escena y pueden servir como base. | Conservar provisionalmente; comprobar apoyos, posiciones y distancias. Su presencia no verifica fidelidad métrica. |

No se certifican todavía superposiciones de mallas, geometría flotante, espesores, alturas ni escala general. Tampoco se ha validado que todos los cambios de los renders históricos coincidan exactamente con la escena abierta.

## Mapa oficial: nomenclatura comprobada

La tabla de abonos del evento distingue **Palcos Corporativo, Palcos A, Palcos AA, Preferencia y Palcos AAA**. AA tiene dos grupos comerciales: 16–43 y 11–15 / 44–48. Palcos AAA falta como categoría explícita en el contexto recibido.

En el detalle ampliado se pudieron leer sectores **A20, A21, A22, A23, A24, A25 y A26**, además de **AA24, AA25 y AA26** en una segunda ampliación. En los sectores centrales visibles aparecen filas **A, B, C, D, E, F, G, H, J, K, L, M**; AA25 muestra un conjunto de filas más corto, comenzando en G en la vista consultada. No generar automáticamente la fila I ni imponer las mismas filas a todos los sectores. Esto es una muestra, no un inventario completo de todas las filas y asientos del estadio. No se seleccionaron butacas ni se creó una compra.

Los colores del mapa pueden reflejar categorías y estado de venta; no deben determinar pintura ni material físico. La venta oficial de corporativos tampoco cambia la decisión del producto: aquí `section_corporate` sigue siendo informativa y no reservable.

Para el futuro modelo de datos, separar categoría comercial, sector oficial, fila, número de asiento y superficie física. No asumir equivalencia entre `section_bleachers_left/right` y una categoría completa del mapa ni confundir lado de equipo con sector vendible.

## Inspección de GLB en disco

`public/models/estadio-quisqueya.glb`: 1.909.976 bytes, 164 nodos, 104 mallas y 23 materiales. Son conteos del archivo exportado, no del Blender abierto.

- Conserva los ocho nombres `section_*` descritos en el contexto.
- `section_corporate` conserva `reservable=false`, `reservation_status=non_reservable` e `interaction_mode=informational_only`; también tiene `selectable=true`. El selector futuro debe distinguir selección informativa de reserva.
- Los metadatos contienen restos contradictorios de fases anteriores: corporativos conserva `physical_seat_color=MAT_Seat_Yellow` y una nota de subconjunto de terraza amarilla, junto a `physical_tier=front_green_strip`.
- Los campos `tier_radial_range` / `tier_height_range` coexisten con `offset_range` / `height_range`. No usar los primeros como dimensiones vigentes sin medir geometría.
- `section_preferencia` se describe como zona semántica del nivel superior; no se ha confirmado todavía su superficie seleccionable efectiva.

## Orden de trabajo

1. Completar MCP: verificar archivo, colecciones, unidades, transformaciones, visibilidad, mallas compartidas y límites mundiales.
2. Obtener cuatro vistas actuales: cenital, desde center field, desde gradas y exterior aérea. Identificar objetos que parecen desconectados y medir contactos reales.
3. Presentar auditoría completa. Antes de modificación importante, guardar copia de seguridad con nombre nuevo.
4. Primera fase arquitectónica: directriz curva tras home con alas rectas, remates por nivel y encajes de dugouts/bullpens. Revisar visualmente con el usuario antes de pasar a otra fase.
5. Cubierta, prensa, fachada y apoyos.
6. Limpiar metadatos obsoletos y exportar preservando materiales compatibles con GLB.
7. Mapear sectores oficiales e interacción; poblar asientos con instancias sólo después de validar arquitectura.

No se realizaron push, deploy, merge ni publicaciones.
