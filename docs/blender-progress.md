# Progreso de Blender — Quisqueya 3D

## 2026-07-28 — V1 basada en referencias

### Construido

- Campo con proporciones aproximadas 335/383/411 ft.
- Forma del outfield y muro modular.
- Bowl abierto en herradura, dividido en palcos, preferencias y bleachers.
- Lados Licey y Escogido diferenciados.
- Dugouts independientes.
- Pantalla de center field.
- Publicidad izquierda, central y derecha reemplazable.
- Cubierta curva, press box y cerchas estructurales.
- Torres de iluminación.
- Muestra de asientos con malla compartida y metadatos de sección/fila/número.
- Cámaras aérea y desde la tribuna.

### Decisiones

- Se usa escala métrica aproximada.
- La forma se derivó visualmente de las fotografías y mapas suministrados, no de un plano topográfico.
- Los colores y banners son placeholders; no se descargaron marcas oficiales.
- Los objetos interactivos reciben nombres estables y propiedades personalizadas para exportarse como extras de glTF.

### Limitaciones conocidas

- Faltan medidas arquitectónicas verificadas.
- La cubierta, el press box y las gradas todavía son masas de V1.
- Los asientos mostrados son una prueba del sistema, no el aforo completo.
- La publicidad es ficticia.
- Las torres son una simplificación low-poly.

### Próximo paso

1. Comparar silueta y ángulos con más fotografías desde cada grada.
2. Ajustar anchuras de pasillos, número de filas y alturas.
3. Construir Geometry Nodes para poblar asientos por sección.
4. Añadir barandas, escaleras, bullpens y túneles.
5. Optimizar y validar el GLB dentro de React Three Fiber.
