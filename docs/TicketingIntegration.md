# Integración futura de boletería

## Separación de responsabilidades

Quisqueya 3D presenta evento, estadio, secciones, filas, asientos y vista aproximada. El proveedor autorizado conserva la verdad sobre disponibilidad, precio, bloqueos, checkout, pago, confirmación, cancelaciones y emisión.

## Arquitectura

Los componentes consumen el contrato `TicketingProvider`. La demostración usa `MockTicketingProvider`; un adaptador futuro transformará el contrato oficial de UEPA Tickets a eventos, secciones, asientos, bloqueos y resultados de checkout sin acoplar la escena 3D.

## Datos mínimos

- Identificadores estables de evento, sección, fila y asiento.
- Nomenclatura, accesibilidad, disponibilidad y precio vigentes.
- Duración y estado de un bloqueo temporal.
- URL o mecanismo oficial de checkout.
- Confirmación, expiración, concurrencia y códigos de error.

## Seguridad y errores

La futura integración debe realizarse con autorización, secretos en servidor, validación de respuestas, protección de datos y observabilidad. El precio y la disponibilidad deben confirmarse antes de bloquear. La interfaz debe manejar cambios de precio, asiento agotado, expiración y proveedor no disponible.

## Límites de esta etapa

No existe integración real. No se inventan endpoints, no se realiza scraping y no se consumen servicios privados. `UepaTicketingProvider` falla de forma explícita hasta contar con colaboración, documentación y autorización de UEPA Tickets. El proveedor simulado solo representa el contrato esperado.
