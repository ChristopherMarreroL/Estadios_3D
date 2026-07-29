import type { TicketingProvider } from "./TicketingProvider";
const unavailable = () =>
  Promise.reject(
    new Error(
      "La integración con UEPA Tickets requiere autorización y un contrato técnico oficial.",
    ),
  );
export class UepaTicketingProvider implements TicketingProvider {
  getEvents = unavailable;
  getSections = unavailable;
  getSeats = unavailable;
  holdSeats = unavailable;
  releaseSeats = unavailable;
  createCheckout = unavailable;
}
