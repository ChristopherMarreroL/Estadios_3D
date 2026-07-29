import type {
  BaseballEvent,
  CheckoutResult,
  SeatHold,
  StadiumSeat,
  StadiumSection,
} from "@/types";
export interface TicketingProvider {
  getEvents(): Promise<BaseballEvent[]>;
  getSections(eventId: string): Promise<StadiumSection[]>;
  getSeats(eventId: string, sectionId: string): Promise<StadiumSeat[]>;
  holdSeats(eventId: string, seatIds: string[]): Promise<SeatHold>;
  releaseSeats(holdId: string): Promise<void>;
  createCheckout(eventId: string, holdId: string): Promise<CheckoutResult>;
}
