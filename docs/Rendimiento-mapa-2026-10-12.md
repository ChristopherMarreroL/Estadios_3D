# Rendimiento del mapa

El mapa descargaba el GLB completo de 26,7 MB, incluidas las sillas detalladas que después ocultaba. El visor dibujaba continuamente aun estando quieto y cada movimiento del puntero podía comprobar dos lotes de 11.975 piezas de silla.

## Comportamiento final

- El mapa utiliza un modelo web de 2.144.672 bytes. La vista desde una butaca carga bajo demanda otro de 7.721.072 bytes, que conserva los 1.160.234 triángulos del original. Los archivos GLB y Blender originales siguen siendo las fuentes editables.
- Los modelos web se limpian, agrupan por materiales compatibles y comprimen con Meshopt. Conservan los límites originales para que cámaras y sillas compartan la misma normalización. La cubierta se mantiene separada para poder ocultarla.
- La página anticipa la descarga del modelo ligero. Sus nombres incluyen el hash del contenido y se sirven con caché inmutable de un año; cambiar el modelo genera otra URL. Durante la carga se muestra un fondo gris y «Preparando el estadio 3D…» centrado, sin imagen de vista previa.
- La resolución se mantiene estable durante giro, zoom y desplazamiento, con la escala del dispositivo limitada a 2. Se retiraron `AdaptiveDpr` y `OrbitControls.regress`, responsables de reducirla mientras se movía la cámara.
- Las sillas se dibujan en dos lotes y sus matrices se calculan una vez. Al abrir un sector, se pueden pulsar también las butacas de otros sectores visibles. La detección rechaza grupos alejados antes de comprobar cada silla y se omite durante el arrastre. Pulsar una butaca vecina mueve la cámara y después pide confirmación; moverla manualmente cancela esa selección pendiente. Confirmar una entrada no reinicia el encuadre.
- La vista general muestra unas quince guías de localidades, en lugar de todos los nombres de sector. Parten de sectores representativos y se espacian con pequeños desplazamientos acotados para evitar solapamientos, sin conectores; en móvil utilizan texto y márgenes menores. Al acercarse aparecen los nombres de los sectores cuya huella permite leer texto de 8–10 px. Estos nombres permanecen en su centro real, sin desplazamientos ni conectores y sin fondos de insignia. El sector activo se identifica en la cabecera y con un contorno azul en el mapa; sus vecinos conservan la interacción, con sus colores atenuados para distinguir el foco. Cada nombre completo permanece disponible para accesibilidad y descripción al pasar el puntero.
- Pulsar una guía abre primero su zona, con nombre, lado cuando corresponde, disponibilidad y lista accesible de sus sectores. La cámara encuadra el grupo y un marco rectangular en pantalla delimita el grupo completo, con cuatro lados rectos y ancho constante, sin curvas ni entrantes alrededor de sectores pequeños. Después se elige un sector y una butaca; entrar en la zona no añade entradas ni abre confirmaciones. Desde un sector se puede volver a su zona o a todo el estadio. Pulsar directamente un sector en el mapa o catálogo conserva el acceso directo anterior. El cursor distingue superficies interactivas, reposo y arrastre, y se restablece al cambiar de vista.
- Al entrar en un sector, la cámara se orienta perpendicularmente a sus filas y utiliza un margen menor para encuadrar las butacas. La disponibilidad continúa siendo de demostración: AAA3 conserva las 30 butacas del catálogo, distribuidas en G, H, J, K y L, con seis disponibles en la simulación; no se inventan filas ni asientos para aumentar el área coloreada.
- Las etiquetas se reúnen en una sola capa HTML, con tipografía fija escalada y composición independiente. El visor usa propiedades y callbacks estables para que cambiar el texto de hover no reconstruya todas sus etiquetas. El perfil CDP identificó la rasterización repetida como una causa de los bloqueos al orientar y escalar los textos; promoverlos con `will-change` y `translateZ(0)` eliminó ese coste dominante en el ensayo.
- Los polígonos de color se dibujan agrupados, conservando detección espacial por sector. Reducir solo las llamadas de dibujo no había mejorado la fluidez: también fue necesario conservar esa detección y omitirla durante el arrastre.
- El mapa dibuja bajo demanda, pausa durante la vista detallada y conserva su canvas y cámara al regresar. La vista detallada sin público animado también dibuja bajo demanda.

La compresión se basa en la [documentación de Meshopt de glTF Transform](https://gltf-transform.dev/modules/extensions/classes/EXTMeshoptCompression). Reducir la transferencia no equivale a mejorar los FPS; la interacción depende además del puntero, el DOM y el dibujo.

## Medición final

Medición del 13 de octubre de 2026 con los marcos rectangulares: `artifacts/performance/map-zone-rectangles.json` y captura del mismo nombre. El benchmark prueba el giro y reposo de Gradas del lado izquierdo y entra en A39 por el catálogo accesible. Las condiciones son Edge sin interfaz, a 1440 × 1000, con 10 Mbps y 40 ms de latencia simulados. Se ejecutaron una visita fría y otra con caché, secuencialmente después de las nueve pruebas; son muestras orientativas, no garantías para todos los equipos.

| Medida                                             | Primera visita |  Con caché |
| -------------------------------------------------- | -------------: | ---------: |
| Mapa listo                                         |         1,65 s |     0,78 s |
| Transferencia HTTP del GLB                         |   476906 bytes |    0 bytes |
| Intervalo mediano, giro general                    |        16,6 ms |    16,7 ms |
| Percentil 95, giro general                         |        18,1 ms |    18,1 ms |
| Intervalo mediano, giro en zona Gradas izquierda   |        16,7 ms |    16,7 ms |
| Percentil 95, giro en zona Gradas izquierda        |        18,0 ms |    17,7 ms |
| Intervalo mediano, desplazamiento derecho en A39   |        16,6 ms |    16,6 ms |
| Percentil 95, desplazamiento derecho en A39        |        18,0 ms |    17,8 ms |
| Intervalo mediano, giro cercano en A39             |        16,6 ms |    16,7 ms |
| Percentil 95, giro cercano en A39                  |        17,8 ms |    17,8 ms |
| Percentil 95, evento de zoom hasta comenzar dibujo |         3,5 ms |     3,6 ms |
| Tareas largas durante los cinco gestos             |              0 |          0 |
| Dibujos en un segundo de reposo de la zona         |              0 |          0 |
| Resolución durante todos los gestos                |     1007 × 579 | 1007 × 579 |

No hubo errores JavaScript ni tareas largas durante los cinco gestos. La resolución permaneció estable; las pruebas también comprueban la escala de dispositivo 2. La carga inicial sí registró tareas largas de arranque de 182 ms en frío y 56 ms con caché; el GLB tardó unos 880 ms en descargarse inicialmente. No se promete un tiempo fijo de apertura ni 60 FPS universales.

Los intervalos son tiempos entre comienzos de dibujo WebGL, no tiempos exclusivos de GPU ni de presentación en pantalla. El visor dibuja bajo demanda y el benchmark separa deliberadamente los eventos de rueda; sus intervalos de 50–85 ms incluyen esa cadencia y no representan FPS continuos. Por eso se registra también la latencia del evento hasta comenzar dibujo. Las pruebas sin interfaz no sustituyen mediciones en dispositivos físicos.

## Automatización y verificación

`npm run dev` y `npm run build` preparan los modelos web automáticamente. Si cambian el GLB, el generador o las dependencias, se regeneran; en caso contrario se verifican sus hashes y se reutilizan. Los hashes de texto normalizan los saltos de línea para funcionar en Windows y Linux.

- `npm run assets:optimize`: genera los dos modelos y `src/data/stadium-assets.json`.
- `npm run assets:verify`: detecta archivos obsoletos, valida hashes y presupuestos de 3 MB para mapa y 8 MB para detalle, comprueba geometría, límites y compatibilidad del decodificador.
- `npm run test:map`: comprueba carga exclusiva del modelo ligero, caché, reposo, resolución estable, etiquetas, selección mediante puntero entre sectores, carrito, vista detallada, conservación del canvas, cubierta y móvil. La suite de nueve pruebas pasa sobre esta compilación: también verifica tarjetas por lado, teclado, encuadre de todos los miembros, catálogo filtrado, regreso a la zona y cursores disponibles/agotados/arrastre. Utiliza Edge local y Chromium en CI. El recorrido de prueba de butacas agotadas se hizo más denso porque la cuadrícula anterior caía repetidamente en los espacios entre filas; se mantienen las comprobaciones del cursor.
- `npm run benchmark:map`: guarda tiempos, transferencias, intervalos de dibujo, latencia del evento, resolución y captura. Incluye giro general, giro y reposo en la zona Gradas del lado izquierdo y zoom, desplazamiento derecho y giro en A39. `BENCHMARK_URL`, `BENCHMARK_LABEL` y `BENCHMARK_MBPS` permiten cambiar destino, nombre del informe y red simulada.
- `node scripts/profile-map-labels.mjs`: diagnóstico CDP de etiquetas visibles, ocultas y promovidas. Sus tiempos inclusivos pueden solaparse entre hilos y no deben sumarse como tiempo exclusivo de CPU.

El workflow `.github/workflows/map-performance.yml` queda preparado para verificar assets, lint, compilación y navegador en los PR hacia `main`, conservando trazas si fallan. Se ejecutará en GitHub cuando se suban estos cambios; no publica ni integra cambios. También pasaron las verificaciones de TypeScript, simulación, inventario y ocupación de las 11.975 localidades.

## Marcos rectangulares de zona

Las zonas utilizan ahora un único rectángulo alineado con la pantalla. Sus límites se calculan proyectando la geometría de todos los sectores del grupo; el borde tiene cuatro lados rectos, esquinas de 90 grados y un margen de 8 px. No se adapta al tamaño de cada sector ni a la curvatura de las gradas. Se actualiza al mover o acercar la cámara y deja pasar los clics a los sectores y asientos.

El cálculo comparte la proyección existente de las etiquetas y actualiza un solo elemento HTML por dibujo. No reconstruye polígonos de contorno para las zonas.

`node scripts/capture-zone-outlines.mjs` recorre las quince tarjetas de zona y guarda una captura de cada grupo, su inventario y una galería en `artifacts/performance/zone-outlines/`. Las pruebas comprueban que el rectángulo contiene todos los sectores, incluye los ejemplos Balcón Escogido y Palco AA derecho, sigue la cámara y desaparece al entrar en un sector.
