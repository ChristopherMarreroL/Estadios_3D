# Catálogo de localidades — 6 de septiembre de 2026

Fuente: https://licey.uepatickets.com/beisbol/en/comprarEvento?idEvento=2248

La página corresponde a **Abono Licey 2026 - 2027**, no a un partido individual. Sus archivos públicos de plano y traducciones contienen 201 sectores/zonas y 11,975 registros de butacas. No son un inventario de asientos disponibles ni un aforo certificado del estadio.

| División | Sectores | Butacas registradas |
| --- | ---: | ---: |
| Palco A | 48 | 2711 |
| Palco AA | 38 | 2571 |
| Palco AAA | 20 | 1360 |
| Palco corporativo | 17 | 116 |
| Preferencias C | 18 | 1594 |
| Gradas D | 23 | 3015 |
| VIP Escogido | 11 | 117 |
| VIP Licey | 9 | 134 |
| Balcón Escogido | 5 | 143 |
| Balcón Licey | 5 | 133 |
| Bullpen Licey (bar, mesas, bullpen) | 3 | 81 |

Las otras cuatro zonas no tienen butacas numeradas: dos parqueos, Fan Club Presidente y Gran Stand de Pie. Se conservan sus capacidades declaradas por separado; no se suman a butacas.

## Implementación

- `/localidades`: explorador por división, sector, fila y butaca. Acceso desde la cabecera principal.
- `src/data/seat-catalog.json`: catálogo con nombres originales, identificadores, filas y números como cadenas; fuente y SHA-256 del archivo original.
- `scripts/import-seat-catalog.mjs`: importación reproducible desde los dos archivos públicos archivados como texto en `artifacts/uepa-reference`. Analiza JSON sin ejecutar JavaScript remoto. Comprueba plano, referencia de sector, identificadores compuestos únicos y conteos contra aforo en sectores numerados.
- El flujo previo de compra sigue siendo una demostración con datos simulados. Este catálogo no modifica precios, disponibilidad ni reservas.

## Pendiente para una vista fiel desde cada asiento

Los registros consultados no incluyen coordenadas físicas. Se necesita vincular cada sector y fila con la geometría validada, respetando sus orientaciones, pasillos y elevaciones. No se asignaron coordenadas inventadas ni se modificó Blender en esta fase.

Palco A Ampliación no aparece como grupo independiente; falta identificar su correspondencia con sectores del plano. Los 17 sectores corporativos tampoco prueban por sí solos el número de divisiones físicas que debe llevar el modelo.

Validación: compilación de producción y TypeScript correctos; prueba visual de selección AA11 / G / 6 → identificador 13096. El catálogo preserva filas omitidas y numeraciones particulares de cada sector.
