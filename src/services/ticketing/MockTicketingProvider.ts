import { featuredEvent } from "@/data/events";
import { getSeatsForSection } from "@/data/seats";
import { sections } from "@/data/sections";
import type { TicketingProvider } from "./TicketingProvider";
const delay = (milliseconds = 350) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));
export class MockTicketingProvider implements TicketingProvider {
  async getEvents() {
    await delay();
    return [featuredEvent];
  }
  async getSections(eventId: string) {
    await delay();
    return eventId === featuredEvent.id ? sections : [];
  }
  async getSeats(eventId: string, sectionId: string) {
    await delay();
    const section = sections.find((item) => item.id === sectionId);
    return eventId === featuredEvent.id
      ? getSeatsForSection(sectionId, section?.price)
      : [];
  }
  async holdSeats(eventId: string, seatIds: string[]) {
    await delay(500);
    return {
      id: `demo-hold-${eventId}-${Date.now()}`,
      seatIds,
      expiresAt: new Date(Date.now() + 600000).toISOString(),
    };
  }
  async releaseSeats() {
    await delay(120);
  }
  async createCheckout(eventId: string, holdId: string) {
    await delay(750);
    return {
      success: true,
      orderId: `Q3D-${eventId.slice(0, 4).toUpperCase()}-${holdId.slice(-6)}`,
    };
  }
}
