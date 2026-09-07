import catalog from "@/data/seat-catalog.json";

export type CatalogSector = (typeof catalog.groups)[number]["sectors"][number];
export type SimulatedSeat = {
  id: number;
  row: string;
  label: string;
  sectorId: number;
  position: [number, number, number];
  eye: [number, number, number];
};
type Tier = {
  depth: [number, number];
  height: [number, number];
  steps: number;
};
const inner: Tier = { depth: [3, 17], height: [1.1, 4.2], steps: 20 };
const middle: Tier = { depth: [17, 28], height: [4.2, 6.7], steps: 14 };
const outer: Tier = { depth: [28, 44], height: [6.7, 10.8], steps: 20 };
export const SIMULATION_GROUP_IDS = [2287, 2288, 2289, 2275, 2276, 2278];
const aisles = [-82, -62, -42, -21, 0, 21, 42, 62, 82];

// Same rounded V directrix as correct_architecture_phase1.py, in Blender metres.
// Sector ranges and seat direction are hypotheses, not surveyed measurements.
export function terracePoint(
  s: number,
  depth: number,
  z: number,
): [number, number, number] {
  let d = depth;
  if (d >= 17) d -= 14 * Math.max(0, Math.min(1, (Math.abs(s) - 60) / 65));
  const sign = s < 0 ? -1 : 1;
  const a = Math.abs(s);
  const theta = -Math.PI / 2 + Math.min(a / 24, Math.PI / 4);
  const wing = Math.max(0, a - (24 * Math.PI) / 4) / Math.sqrt(2);
  return [
    sign * ((24 + d) * Math.cos(theta) + wing),
    -32 + (24 + d) * Math.sin(theta) + wing,
    z,
  ];
}

// Parameterize usable length so no two seats collapse when excluding an aisle.
function alongUsableSpan(
  start: number,
  end: number,
  t: number,
  avoidAisles: boolean,
) {
  let spans: [number, number][] = [[start, end]];
  if (avoidAisles)
    for (const aisle of aisles) {
      spans = spans.flatMap(([a, b]) => {
        const lo = aisle - 1.15,
          hi = aisle + 1.15;
        if (hi <= a || lo >= b) return [[a, b]];
        return [
          ...(a < lo ? [[a, lo] as [number, number]] : []),
          ...(hi < b ? [[hi, b] as [number, number]] : []),
        ];
      });
    }
  let length = t * spans.reduce((n, [a, b]) => n + b - a, 0);
  for (const [a, b] of spans) {
    if (length <= b - a) return a + length;
    length -= b - a;
  }
  return end;
}

export function simulateSector(
  groupId: number,
  sector: CatalogSector,
): SimulatedSeat[] {
  if (!SIMULATION_GROUP_IDS.includes(groupId)) return [];
  const group = catalog.groups.find((g) => g.id === groupId)!;
  const sectors = [...group.sectors].sort((a, b) =>
    a.name.localeCompare(b.name, "es", { numeric: true }),
  );
  let index = sectors.findIndex((s) => s.id === sector.id),
    total = sectors.length;
  if (index < 0) return [];
  let start = -60,
    end = 60,
    tier = inner;
  if (groupId === 2288) {
    start = -85;
    end = 85;
    tier = middle;
  }
  if (groupId === 2289 || groupId === 2278) {
    const split = Math.ceil(total / 2);
    if (index < split) {
      total = split;
      start = -124;
      end = groupId === 2289 ? -85 : -60;
    } else {
      index -= split;
      total -= split;
      start = groupId === 2289 ? 85 : 60;
      end = 124;
    }
    tier = groupId === 2289 ? middle : outer;
  }
  if (groupId === 2276) tier = outer;
  if (groupId === 2275) {
    start = -17.5;
    end = 17.5;
    tier = { depth: [0.4, 2.6], height: [0.32, 0.32], steps: 1 };
  }
  return sector.rows.flatMap((row, rowIndex) => {
    const fraction = (rowIndex + 0.5) / sector.rows.length;
    const d = tier.depth[0] + fraction * (tier.depth[1] - tier.depth[0]);
    const z =
      tier.height[0] +
      (Math.floor(fraction * tier.steps) / tier.steps) *
        (tier.height[1] - tier.height[0]);
    return row.seats.map((seat, seatIndex) => {
      // Preserve catalog order including descending numbers; direction remains provisional.
      const t =
        (index + 0.1 + (0.8 * (seatIndex + 0.5)) / row.seats.length) / total;
      const s = alongUsableSpan(start, end, t, groupId !== 2275);
      const position = terracePoint(s, d, z);
      return {
        ...seat,
        row: row.label,
        sectorId: sector.id,
        position,
        eye: [position[0], position[1], position[2] + 1.15] as [
          number,
          number,
          number,
        ],
      };
    });
  });
}
