import catalog from "@/data/seat-catalog.json";
import {
  simulateSector,
  SIMULATION_GROUP_IDS,
  type SimulatedSeat,
} from "./seat-simulation";

// Shared by seat selection and preview spectators. Replace this fixture at the inventory
// boundary when an authorized live ticketing source is available.
export const TICKET_CATEGORIES = [
  { id: 2287, name: "Palco A", color: "#e1b735", price: 2500 },
  { id: 2288, name: "Palco AA", color: "#ed7869", price: 1800 },
  { id: 2289, name: "Palco AAA", color: "#c9588a", price: 1200 },
  { id: 2275, name: "Corporativo", color: "#7baf72", price: 3500 },
  { id: 2276, name: "Preferencias", color: "#8f8bdd", price: 900 },
  { id: 2278, name: "Gradas", color: "#56b4cf", price: 500 },
  { id: 2279, name: "VIP Escogido", color: "#df716e", price: 2500 },
  { id: 2281, name: "VIP Licey", color: "#6188dc", price: 2500 },
  { id: 2282, name: "Balcón Escogido", color: "#e29686", price: 1800 },
  { id: 2283, name: "Balcón Licey", color: "#839cde", price: 1800 },
  { id: 2812, name: "Bullpen Licey", color: "#568dd8", price: 2000 },
];
function hash(text: string) {
  let value = 2166136261;
  for (const c of text) value = Math.imul(value ^ c.charCodeAt(0), 16777619);
  return value >>> 0;
}
export const ticketKey = (sectorId: number, seatId: number) =>
  `${sectorId}:${seatId}`;
export type TicketSeatStatus = "available" | "sold" | "held" | "unavailable";
export const ticketSectors = catalog.groups
  .filter((g) => SIMULATION_GROUP_IDS.includes(g.id))
  .flatMap((group) =>
    group.sectors
      .filter((sector) => sector.seatCount > 0)
      .map((sector) => {
        const category = TICKET_CATEGORIES.find((c) => c.id === group.id)!;
        const label = sector.name.replace(
          /PALCO\s*-?\s*|PREFERENCIA\s*-\s*|GRADAS\s*-\s*/g,
          "",
        );
        // A5 and A6 demonstrate abundant vs scarce stock, not real availability.
        const threshold =
          sector.id === 11607
            ? 85
            : sector.id === 11608
              ? 20
              : [0, 18, 42, 72, 92][hash(String(sector.id)) % 5];
        const seats = simulateSector(group.id, sector).map((simulation) => ({
          key: ticketKey(sector.id, simulation.id),
          sectorId: sector.id,
          sector: label,
          id: simulation.id,
          row: simulation.row,
          label: simulation.label,
          simulation,
          category: category.name,
          price: category.price,
          available:
            hash(ticketKey(sector.id, simulation.id)) % 100 < threshold,
          status: (hash(ticketKey(sector.id, simulation.id)) % 100 < threshold
            ? "available"
            : "sold") as TicketSeatStatus,
        }));
        return {
          id: sector.id,
          label,
          name: sector.name,
          category,
          seats,
          available: seats.filter((s) => s.available).length,
        };
      }),
  );
export type TicketSector = (typeof ticketSectors)[number];
export type TicketSeat = TicketSector["seats"][number];
export const ticketSeats = new Map(
  ticketSectors.flatMap((s) =>
    s.seats.map((seat) => [seat.key, seat] as const),
  ),
);
export const MAX_TICKETS = 8;
// Only confirmed sales produce spectators. Held/blocked/unknown seats must not
// become people when a future provider supplies more than two inventory states.
export function purchasedSpectators(
  viewingKey: string,
  inventory: Iterable<{
    key: string;
    status: TicketSeatStatus;
    simulation: SimulatedSeat;
  }> = ticketSeats.values(),
): SimulatedSeat[] {
  return Array.from(inventory)
    .filter((seat) => seat.status === "sold" && seat.key !== viewingKey)
    .map((seat) => seat.simulation);
}
export function toggleTicket(selected: string[], key: string): string[] {
  if (selected.includes(key)) return selected.filter((k) => k !== key);
  if (!ticketSeats.get(key)?.available || selected.length >= MAX_TICKETS)
    return selected;
  return [...selected, key];
}
export function availableCount(
  sector: TicketSector,
  selected: readonly string[],
) {
  return sector.seats.filter((s) => s.available && !selected.includes(s.key))
    .length;
}
