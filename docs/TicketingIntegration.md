# Integración futura de boletería

## Separación de responsabilidades

Quisqueya 3D presenta evento, estadio, secciones, filas, asientos y vista aproximada. El proveedor autorizado conserva la verdad sobre disponibilidad, precio, bloqueos, checkout, pago, confirmación, cancelaciones y emisión.

## Arquitectura

El recorrido principal de `/` y `/localidades` usa `TicketMapExperience` y `TicketSelectionScene`: vista aérea 3D, entrada a sectores, elección de butacas y vista sentado. Su inventario de demostración está aislado en `src/lib/ticket-inventory.ts` y conserva los identificadores del catálogo y las posiciones de `simulateSector`. No representa existencias ni precios reales.

El contrato `TicketingProvider` y `MockTicketingProvider` permanecen en el proyecto como base de integración, pero todavía no alimentan el nuevo selector. Un adaptador futuro deberá sustituir el inventario de demostración por datos autorizados y conectar validación, bloqueo y checkout. La selección actual solo vive en memoria: no reserva, no cobra y no se transfiere al enlace de venta oficial.

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
