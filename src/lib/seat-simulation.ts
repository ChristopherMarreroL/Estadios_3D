import catalog from "@/data/seat-catalog.json";
import layoutData from "@/data/seat-layout.json";
import specialLayout from "@/data/special-seat-layout.json";
import {
  measure,
  rowPosition,
  terracePoint,
  terraceFacing,
  type Tier,
} from "./seat-layout-math";
export { terracePoint } from "./seat-layout-math";
export type CatalogSector = (typeof catalog.groups)[number]["sectors"][number];
export type SimulatedSeat = {
  id: number;
  row: string;
  label: string;
  sectorId: number;
  position: [number, number, number];
  eye: [number, number, number];
  facing?: number;
  kind?: "chair" | "table";
};
export const TERRACE_GROUP_IDS = [2287, 2288, 2289, 2275, 2276, 2278];
export const SPECIAL_GROUP_IDS = [2279, 2281, 2282, 2283, 2812];
export const SIMULATION_GROUP_IDS = [
  ...TERRACE_GROUP_IDS,
  ...SPECIAL_GROUP_IDS,
];
const specialSeats = new Map(
  specialLayout.groups.flatMap((group) =>
    group.seats.map(
      (seat) =>
        [
          `${group.id}:${seat.sectorId}:${seat.id}`,
          seat as SimulatedSeat,
        ] as const,
    ),
  ),
);
export const SIMULATION_AISLES = [-82, -62, -42, -21, 0, 21, 42, 62, 82];
export function orderedRows(sector: CatalogSector) {
  return [...sector.rows].sort((a, b) =>
    a.label.localeCompare(b.label, "es", { numeric: true }),
  );
}
export function seatRowLabel(row: string) {
  return row.startsWith("Mesa ") ? row : `Fila ${row}`;
}
type Slot = {
  sectorId: number;
  lo: number;
  hi: number;
  span: [number, number];
  pitch: number;
};
type Layout = { tier: Tier; rows: string[]; slots: Map<number, Slot> };
const layouts = new Map<number, Layout>(
  layoutData.groups.map((group) => [
    group.id,
    {
      tier: group.tier as Tier,
      rows: group.rows,
      slots: new Map(group.slots.map((slot) => [slot.sectorId, slot as Slot])),
    },
  ]),
);
// Packing is generated offline; browsing and seat selection do not run the solver.
export function simulationLayout(groupId: number) {
  return layouts.get(groupId) ?? null;
}
export function simulateSector(
  groupId: number,
  sector: CatalogSector,
): SimulatedSeat[] {
  if (SPECIAL_GROUP_IDS.includes(groupId))
    return orderedRows(sector).flatMap((row) =>
      row.seats.map((seat) =>
        specialSeats.get(`${groupId}:${sector.id}:${seat.id}`)!,
      ),
    );
  const layout = simulationLayout(groupId),
    slot = layout?.slots.get(sector.id);
  if (!layout || !slot) return [];
  const { tier, rows } = layout;
  return orderedRows(sector).flatMap((row) => {
    // A missing A–C/F block stays empty instead of stretching later rows forward.
    const { depth: d, height: z } = rowPosition(tier, rows, row.label);
    const track = measure(slot.lo, slot.hi, d);
    const padding = (track.length - row.seats.length * slot.pitch) / 2;
    return row.seats.map((seat, index) => {
      // Preserve UEPA seat order, including rows numbered in descending order.
      const s = track.at(padding + slot.pitch * (index + 0.5));
      const position = terracePoint(s, d, z);
      return {
        ...seat,
        row: row.label,
        sectorId: sector.id,
        position,
        facing: terraceFacing(s, d),
        eye: [position[0], position[1], position[2] + 1.15] as [
          number,
          number,
          number,
        ],
      };
    });
  });
}

export function seatFacingAngle(
  seat: Pick<SimulatedSeat, "position" | "facing">,
) {
  return seat.facing ?? -Math.atan2(-seat.position[0], -24 - seat.position[1]);
}
