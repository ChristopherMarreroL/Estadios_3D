# Dugouts, accesos, barandas y torres — 7 de septiembre de 2026

Revisión visual sobre el archivo existente, con respaldo previo de `.blend` y `.glb` con sufijo `-pre-phase3-20260907`.

- **Dugouts:** sustituidos los bloques por cubiertas con frente abierto, piso, paredes laterales y posterior, bancos con respaldo, soportes y baranda frontal interrumpida para entradas. Se conservaron los nombres y colores de los dos equipos.
- **Accesos:** seis portales abiertos alineados con los huecos de escaleras existentes, con laterales y cubierta inclinada. Señal genérica «ACCESO»; no representa la numeración oficial de puertas. No se desplazaron butacas para introducirlos.
- **Barandas:** pasamanos a ambos lados de los pasillos escalonados y protección al frente del nivel superior, interrumpida en los cruces con escaleras. Sus dimensiones son de simulación, no una validación normativa ni de evacuación.
- **Torres:** se conservaron los seis emplazamientos aproximados. Mástiles troncopiramidales con arriostramiento, zapatas, escalera, plataforma con protección y soportes de los paneles. Cada panel tiene 24 proyectores dirigidos hacia el terreno (144 en total como configuración de la maqueta, no un conteo certificado del estadio real).

## Validación

Las mallas modificadas tienen coordenadas finitas y cero aristas no-manifold. Esta prueba no garantiza ausencia de toda intersección entre objetos ni resistencia estructural. Se conservaron las mallas de las butacas y las pruebas siguen comprobando las 11,367 posiciones y su correspondencia con Blender. Ocupación simulada y compilación web verificadas.

Cuatro renders en `artifacts/blender/phase3-20260907`: conjunto, dugout, acceso y torre. La iluminación de los renders de detalle se ajustó para inspeccionar zonas cubiertas; no es una simulación fotométrica. En glTF los proyectores son geometría y material luminoso; no se ha añadido un modo nocturno calculado.

## Reproducción y límites

`scripts/blender/refine_phase3.py` usa únicamente las funciones geométricas de la fase anterior, sin volver a ejecutar sus modificaciones. Guarda y exporta la escena actual. `scripts/blender/render_phase3.py` genera las imágenes de revisión.

El archivo conserva cotas y distribución aproximadas. Las fotografías no permiten verificar anchuras exactas, alturas de pasamanos, configuración de luminarias ni detalles internos de los dugouts. Queda pendiente contrastar estas hipótesis con fotos cercanas o vídeos desde el estadio. No hubo push, deploy ni publicación.
