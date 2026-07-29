# Decisiones técnicas

## Next.js y App Router

Ofrecen una base mantenible, rutas futuras y separación clara entre render de servidor e islas cliente. El Canvas se importa dinámicamente con SSR desactivado.

## React Three Fiber y Drei

Permiten expresar la escena como componentes React y compartir estado con la interfaz. Drei se utiliza solo para controles, HTML espacial y carga GLB; la experiencia no descarga presets externos.

## Blender y GLB

Blender será la fuente del modelo detallado. GLB empaqueta geometría y materiales en un formato web interoperable y optimizable.

## GSAP y Framer Motion

GSAP gobierna cámara y target en el mundo 3D. Framer Motion gobierna paneles HTML. Esta división evita mezclar dos sistemas de animación en el mismo dominio.

## Zustand

Centraliza paso, sección, asientos y totales sin imponer un proveedor React alrededor del Canvas.

## Sin backend

La meta actual es validar claridad visual e interacción. Añadir transacciones ahora aumentaría riesgo sin validar primero el valor del producto.

## Adaptador de boletería

Evita que la experiencia dependa de detalles no confirmados de UEPA Tickets y habilita otros proveedores en el futuro.

## Sin logos oficiales

Se usan color, texto y placeholders para comunicar orientación sin presentar recursos no autorizados como identidad oficial.

## Geometrías básicas primero

Permiten ajustar cámara, hitboxes, rendimiento y flujo antes de invertir en un modelo detallado.

## Dirección visual

La interfaz adopta una transmisión nocturna premium con estructura inspirada en una boleta. La marca 411 funciona como firma visual y ancla espacial del center field.
