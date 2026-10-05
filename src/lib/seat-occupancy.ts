import type { SimulatedSeat } from "./seat-simulation";

export type OccupancyOverrides = Record<string, boolean>;
export const occupancyKey = (seat: Pick<SimulatedSeat, "id" | "sectorId">) =>
  `${seat.sectorId}:${seat.id}`;
// Stable demonstration data. Replace with an availability provider when connected.
export function isDemoOccupied(
  seat: SimulatedSeat,
  percent: number,
  overrides: OccupancyOverrides,
): boolean {
  const key = occupancyKey(seat);
  if (Object.hasOwn(overrides, key)) return overrides[key];
  let hash = 2166136261;
  for (const char of key) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0) % 100 < Math.max(0, Math.min(100, percent));
}

export function seatNeighbors(
  seats: SimulatedSeat[],
  selected: SimulatedSeat | null,
) {
  if (!selected) return [];
  const row = seats.filter((s) => s.row === selected.row);
  const index = row.findIndex((s) => s.id === selected.id);
  if (selected.kind === "table")
    return [
      {
        label: "Lateral anterior",
        seat: row[(index + row.length - 1) % row.length],
      },
      { label: "Lateral siguiente", seat: row[(index + 1) % row.length] },
    ];
  const rows = [...new Set(seats.map((s) => s.row))];
  const frontRow = rows[rows.indexOf(selected.row) - 1];
  const front = seats
    .filter((s) => s.row === frontRow)
    .sort(
      (a, b) =>
        Math.hypot(
          a.position[0] - selected.position[0],
          a.position[1] - selected.position[1],
        ) -
        Math.hypot(
          b.position[0] - selected.position[0],
          b.position[1] - selected.position[1],
        ),
    )[0];
  return [
    { label: "Delante", seat: front },
    { label: "Lateral anterior", seat: row[index - 1] },
    { label: "Lateral siguiente", seat: row[index + 1] },
  ].filter((n): n is { label: string; seat: SimulatedSeat } => Boolean(n.seat));
}
