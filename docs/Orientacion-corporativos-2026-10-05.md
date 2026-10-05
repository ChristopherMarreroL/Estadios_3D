# Orientación corporativa — 5 de octubre de 2026

Referencia: mapa UEPA del evento 2248 y captura suministrada por el usuario: https://licey.uepatickets.com/beisbol/en/comprarEvento?idEvento=2248

Con el terreno arriba y las gradas abajo, como en el plano UEPA, PC 1 se sitúa en el extremo derecho y PC 17 en el izquierdo. Se invierte exclusivamente el orden espacial de los sectores corporativos; se conservan los IDs, filas, números, disponibilidad y las cuatro butacas por fila de PC 1.

`simulateSector` usa los sectores corporativos en orden descendente. Las etiquetas y las cámaras derivan de esas mismas posiciones. Se regeneran las posiciones compartidas; el script de muretes reconstruye únicamente las 116 butacas corporativas y ajusta los 18 muretes a los nuevos anchos. Blender y GLB incluyen la corrección. La URL del modelo usa la revisión `20261005-corporate-orientation`.

Respaldos con sufijo `pre-corporate-orientation-20261005`. Verificación: PC 1 a la derecha, PC 17 a la izquierda y orden descendente estricto de sus centros; cuatro butacas por fila en PC 1; 11.367 cámaras únicas; correspondencia web/posiciones compartidas; ocupación, TypeScript y ESLint. BVH comprueba que los muretes no intersecten las butacas. El exportador conserva atributos e índices del resto de las mallas, incluidos UV originales.

Cambios locales, sin push ni deploy. Las dimensiones y posiciones del estadio continúan siendo una aproximación.
