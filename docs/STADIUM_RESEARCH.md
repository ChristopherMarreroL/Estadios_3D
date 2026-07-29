# Estadio Quisqueya Juan Marichal — Digital Twin Research

## Proyecto

Quisqueya 3D es una réplica digital del Estadio Quisqueya Juan Marichal de Santo Domingo, República Dominicana. El modelo se construye para navegación 3D, selección futura de secciones y asientos, vistas desde las gradas y exportación web mediante GLB.

No se modelará un estadio genérico. La geometría y la organización deben contrastarse con fotografías aéreas, vistas interiores y mapas de localidades del Quisqueya.

## Lectura de las referencias suministradas

- Planta en herradura: el bowl principal rodea home plate y las líneas de foul, pero queda abierto hacia los jardines.
- Jardín central profundo y ligeramente aplanado, con `411 FT`; esquinas aproximadas de 335 ft y callejones próximos a 383 ft.
- Pantalla principal independiente en center field, acompañada por paneles publicitarios.
- Bowl dividido en anillos escalonados y pasillos radiales.
- Cubierta curva de gran luz sobre la tribuna principal, con cerchas metálicas oscuras y fachada/press box central.
- Gradas y palcos con mezcla de rojo, azul, amarillo, verde y concreto; identidad azul del Licey a la izquierda y roja del Escogido a la derecha.
- Torres de iluminación de celosía alrededor del perímetro.
- Bullpens y áreas técnicas cerca de las líneas de foul.

Las referencias son orientativas: todavía no contamos con planos arquitectónicos ni levantamiento métrico completo. Las dimensiones no confirmadas deben conservarse como parámetros editables.

## Campo

- Home plate, caja de bateo, primera, segunda y tercera base.
- Montículo del pitcher.
- Césped y arcilla diferenciados.
- Líneas de foul.
- Left Field: aproximadamente 335 ft.
- Right Field: aproximadamente 335 ft.
- Center Field: 411 ft.
- Callejones: aproximadamente 383 ft.

## Zonas arquitectónicas

- `section_corporate`
- `section_palco_a`
- `section_palco_aa`
- `section_preferencias`
- `section_bleachers_left`
- `section_bleachers_right`
- `section_licey_side`
- `section_escogido_side`
- `dugout_licey`
- `dugout_escogido`
- `scoreboard_center`
- `advertising_left_field`
- `advertising_center_field`
- `advertising_right_field`

Cada zona seleccionable debe conservar un nombre estable y metadatos exportables para Three.js/React Three Fiber.

## Organización Blender

```text
ESTADIO_QUISQUEYA
├── FIELD
├── SEATING
│   ├── PALCOS
│   ├── PREFERENCIAS
│   ├── BLEACHERS
│   └── SEAT_SYSTEM
├── TEAM_AREAS
├── SCOREBOARD
├── LIGHTS
├── ADVERTISING
├── STRUCTURE
└── EXPORT
```

## Asientos

No se crearán miles de mallas independientes. Los asientos compartirán una malla base y se distribuirán mediante instancias o Geometry Nodes. Cada instancia debe poder asociarse con:

- `section`
- `row`
- `number`
- `seat_id`

Ejemplo: `seat_palco_aa_A01`.

## Materiales

- Césped, arcilla y tierra.
- Asiento plástico.
- Concreto pintado.
- Acero estructural.
- Cristal.
- Materiales publicitarios reemplazables.

La paleta de la V1 es descriptiva; no se descargarán logotipos oficiales.

## Niveles de detalle

- LOD 1: silueta completa y masas principales.
- LOD 2: secciones, filas, pasillos, barandas y asientos instanciados.
- LOD 3: silla, señalética y vista desde asiento.

## Optimización web

- Mallas low-poly y materiales reutilizados.
- Jerarquía y nombres estables.
- Propiedades personalizadas exportadas como extras.
- Texturas pequeñas y sustituibles.
- Formato GLB; compresión Draco o Meshopt en una fase posterior.

## Orden de construcción

1. Campo y proporciones generales.
2. Bowl en herradura.
3. Secciones y palcos.
4. Dugouts.
5. Pantalla.
6. Cubierta y press box.
7. Torres.
8. Publicidad modular.
9. Sistema de asientos.
10. Detalles y texturas.

La prioridad es que la silueta sea reconocible como el Estadio Quisqueya antes de aumentar el detalle.
