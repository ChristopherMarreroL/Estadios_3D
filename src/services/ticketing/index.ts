import { MockTicketingProvider } from "./MockTicketingProvider";
export type { TicketingProvider } from "./TicketingProvider";
export { MockTicketingProvider } from "./MockTicketingProvider";
export { UepaTicketingProvider } from "./UepaTicketingProvider";
export const ticketingProvider = new MockTicketingProvider();
