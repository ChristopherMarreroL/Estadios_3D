export type TeamIdentity = "licey" | "escogido" | "neutral";
export type FlowStep =
  "hero" | "stadium" | "seats" | "seatView" | "checkout" | "confirmation";
export interface BaseballEvent {
  id: string;
  homeTeam: string;
  awayTeam: string;
  venue: string;
  date: string;
  time: string;
  status: "upcoming" | "available" | "sold-out";
}
export interface StadiumSection {
  id: string;
  name: string;
  category: "premium" | "palco" | "preferencias" | "bleachers";
  description: string;
  price: number;
  availableSeats: number;
  side: "left" | "center" | "right";
  teamIdentity?: TeamIdentity;
  modelObjectName: string;
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  scenePosition: [number, number, number];
  sceneRotation: [number, number, number];
}
export interface StadiumSeat {
  id: string;
  sectionId: string;
  row: string;
  number: number;
  status: "available" | "selected" | "occupied" | "reserved" | "accessible";
  price: number;
  position: [number, number, number];
}
export interface SeatHold {
  id: string;
  seatIds: string[];
  expiresAt: string;
}
export interface CheckoutResult {
  success: boolean;
  orderId: string;
  redirectUrl?: string;
}
