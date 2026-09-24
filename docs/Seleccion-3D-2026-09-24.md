# Selección de entradas en el estadio 3D

El estadio pasa a ser la interfaz principal para elegir entradas, tanto en `/` como en `/localidades`.

- Vista aérea con sectores coloreados por categoría. La intensidad refleja la proporción disponible y el gris identifica sectores agotados.
- Clic en sector para acercar la cámara. Butacas disponibles con color, agotadas en gris y elegidas en azul oscuro con una marca.
- Filas identificadas por letra, giro y acercamiento libre para explorar sectores vecinos. Los rótulos evitan superponerse y reaparecen conforme cambia el encuadre.
- Resumen de hasta ocho entradas con sector, fila, butaca, precio y total. Se pueden quitar individualmente.
- “Ver mi vista” abre una perspectiva desde la butaca y conserva la selección al cerrar. El público es opcional y ocupa exclusivamente los asientos comprados del inventario de demostración, en todos los sectores.
- Alternativa accesible mediante búsqueda de sectores y botones por fila, controles con nombres accesibles y diálogo con recuperación del foco.

## Datos y límites

Se usan las 11.367 posiciones existentes, sin modificar su geometría ni el GLB. La escena de selección dibuja butacas simplificadas para permitir colores por estado; la vista sentado mantiene el modelo detallado.

Disponibilidad y precios son ejemplos deterministas, expresamente identificados en pantalla. A5 tiene mayor proporción disponible que A6 para demostrar el comportamiento. No hay integración de venta, bloqueo, pago ni transferencia de selección a UepaTickets. Los sectores sin posición 3D asignada siguen fuera de este recorrido.

## Validación

`bun scripts/verify-ticket-inventory.ts` verifica correspondencia con el catálogo, identificadores únicos, conteos, rechazo de agotados y claves desconocidas, máximo de ocho, retirada y suma de precios. Compilación de producción y lint de los archivos nuevos comprobados. Prueba manual en navegador: entrar en A8, elegir una butaca del vecino A7 desde la escena, comprobar RD$2.500 y abrir su vista sentado.

## Ajustes de profundidad y público

`purchasedSpectators` usa el estado `sold` del mismo inventario que alimenta la selección. No limita el público al sector elegido ni aplica un porcentaje aleatorio. Excluye la butaca de observación, los disponibles, las reservas temporales (`held`) y los bloqueados (`unavailable`). El futuro adaptador debe distinguir esos estados: no toda localidad no disponible equivale a una venta.

Regresión verificada en AA31/A/4: 5.930 espectadores comprados distribuidos por todo el modelo, incluidos los niveles inferiores visibles delante. Se comprobó en navegador la presencia del público frontal. Para mantener el rendimiento se reutilizan las posiciones y colores; los gestos se actualizan a 30 Hz a menos de 40 metros del observador y las personas lejanas conservan una postura estática. Las entradas del carrito no cuentan como compradas.

El selector y la vista sentado usan profundidad logarítmica para evitar la interferencia visual entre el césped y la tierra al alejar la cámara. El selector permite una densidad de píxeles de hasta 2. Se comprobó visualmente el diamante en la vista inicial y al alejar el zoom.

Mostrar público activa también su animación, salvo cuando el sistema solicita movimiento reducido. Verificado en A1/F/2 con dos fotogramas que muestran cambios de brazos y postura. TypeScript y lint de los tres componentes modificados pasan.

La cubierta no se modificó: [LIDOM describe un saliente de 84 pies](https://lidom.com/efemerides/con-70-anos-de-historia-y-gloria-deportiva-74684.html), pero esa descripción histórica no identifica la última fila cubierta del catálogo actual. Sigue pendiente confirmar su alcance sobre Palco AA/asientos rojos mediante referencias o mediciones fiables.
