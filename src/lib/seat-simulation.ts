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
const SECTOR_GAP = 0.8;

// Same rounded V directrix as correct_architecture_phase1.py, in Blender metres.
// Sector ranges and seat direction are hypotheses, not surveyed measurements.
export function terracePoint(
  s: number,
  depth: number,
  z: number,
): [number, number, number] {
  let d = depth;
  if (d >= 3) d -= 14 * Math.max(0, Math.min(1, (Math.abs(s) - 60) / 65));
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

function usableSpans(start: number, end: number, avoidAisles: boolean) {
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
  return spans;
}

// Parameterize usable length so no two seats collapse when excluding an aisle.
function alongUsableSpan(
  start: number,
  end: number,
  t: number,
  avoidAisles: boolean,
) {
  const spans = usableSpans(start, end, avoidAisles);
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
  let start = groupId === 2287 ? -80 : -60,
    end = groupId === 2287 ? 80 : 60,
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
      start = groupId === 2289 ? -126 : -136;
      end = groupId === 2289 ? -85 : -60;
    } else {
      index -= split;
      total -= split;
      start = groupId === 2289 ? 85 : 60;
      end = groupId === 2289 ? 126 : 136;
    }
    tier = groupId === 2289 ? middle : outer;
  }
  if (groupId === 2276) tier = outer;
  if (groupId === 2275) {
    start = -17.7;
    end = 17.7;
    tier = { depth: [0.4, 2.6], height: [0.32, 0.32], steps: 1 };
  }
  // Preferencias/Gradas: size each sector's slot by its widest row so every
  // sector in the stand shares one seat pitch instead of one slot width.
  // Behind home the terrace is an arc whose metres per unit of `s` grow with
  // depth, so arc sectors get proportionally less `s`.
  // Each sector also keeps a fixed walkway (SECTOR_GAP metres) to its
  // neighbours so adjacent stands read as separate blocks.
  const widthWeighted = groupId === 2276 || groupId === 2278;
  let slotStart = 0,
    pitchT = 0,
    gapT = 0;
  const widest = Math.max(1, ...sector.rows.map((r) => r.seats.length));
  if (groupId !== 2276) {
    const first = sectors.findIndex((s) => s.id === sector.id) - index;
    const peers = sectors.slice(first, first + total);
    const widths = peers.map((s) =>
      Math.max(1, ...s.rows.map((r) => r.seats.length)),
    );
    const gap =
      groupId === 2278 ? 0.8 : groupId === 2287 || groupId === 2275 ? 0.3 : 0.5;
    // Measure usable curved terrace length at its narrowest row. Equal `s`
    // increments are not equal metres on the central arc or tapered wings.
    const depth =
      tier.depth[0] +
      (tier.depth[1] - tier.depth[0]) /
        (2 * Math.max(...peers.map((s) => s.rows.length)));
    const segments: { a: number; b: number; length: number }[] = [];
    for (const [a, b] of usableSpans(start, end, groupId !== 2275)) {
      const count = Math.ceil((b - a) / 0.05);
      for (let i = 0; i < count; i++) {
        const lo = a + ((b - a) * i) / count,
          hi = a + ((b - a) * (i + 1)) / count;
        const p = terracePoint(lo, depth, 0),
          q = terracePoint(hi, depth, 0);
        segments.push({
          a: lo,
          b: hi,
          length: Math.hypot(p[0] - q[0], p[1] - q[1]),
        });
      }
    }
    const length = segments.reduce((n, s) => n + s.length, 0);
    const pitch = (length - gap * total) / widths.reduce((a, b) => a + b, 0);
    if (pitch < 0.52)
      throw new Error(
        `Insufficient terrace length for group ${groupId}: ${pitch}`,
      );
    const offset = widths
      .slice(0, index)
      .reduce((n, w) => n + w * pitch + gap, 0);
    const at = (distance: number) => {
      for (const segment of segments) {
        if (distance <= segment.length)
          return (
            segment.a + ((segment.b - segment.a) * distance) / segment.length
          );
        distance -= segment.length;
      }
      return end;
    };
    return sector.rows.flatMap((row, rowIndex) => {
      const fraction = (rowIndex + 0.5) / sector.rows.length;
      const treadFraction =
        tier.steps > 1
          ? (Math.floor(fraction * tier.steps) + 0.5) / tier.steps
          : fraction;
      const d = tier.depth[0] + treadFraction * (tier.depth[1] - tier.depth[0]);
      const z =
        tier.height[0] +
        (Math.floor(fraction * tier.steps) / tier.steps) *
          (tier.height[1] - tier.height[0]);
      return row.seats.map((seat, seatIndex) => {
        const s = at(
          offset +
            gap / 2 +
            pitch * (seatIndex + 0.5 + (widest - row.seats.length) / 2),
        );
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
  if (widthWeighted) {
    const first = sectors.findIndex((s) => s.id === sector.id) - index;
    const peers = sectors.slice(first, first + total);
    const widths = peers.map((s) =>
      Math.max(1, ...s.rows.map((r) => r.seats.length)),
    );
    const arcDepth = (tier.depth[0] + tier.depth[1]) / 2;
    const stretch = (t: number) =>
      Math.abs(alongUsableSpan(start, end, t, true)) < (24 * Math.PI) / 4
        ? (24 + arcDepth) / 24
        : 1;
    const length = usableSpans(start, end, true).reduce(
      (n, [a, b]) => n + b - a,
      0,
    );
    // Solve one pitch p (metres) so Σ (widest·p + gap) / stretch = length.
    let factors = widths.map(() => 1),
      pitch = 0,
      lengths: number[] = [];
    const solve = () => {
      pitch =
        (length - SECTOR_GAP * factors.reduce((n, f) => n + 1 / f, 0)) /
        widths.reduce((n, w, k) => n + w / factors[k], 0);
      lengths = widths.map((w, k) => (w * pitch + SECTOR_GAP) / factors[k]);
    };
    for (let pass = 0; pass < 5; pass++) {
      solve();
      let cursor = 0;
      factors = lengths.map((l) => {
        const center = (cursor + l / 2) / length;
        cursor += l;
        return stretch(center);
      });
    }
    solve();
    slotStart = lengths.slice(0, index).reduce((n, l) => n + l, 0) / length;
    pitchT = pitch / factors[index] / length;
    gapT = SECTOR_GAP / 2 / factors[index] / length;
  }
  return sector.rows.flatMap((row, rowIndex) => {
    const fraction = (rowIndex + 0.5) / sector.rows.length;
    const treadFraction =
      tier.steps > 1
        ? (Math.floor(fraction * tier.steps) + 0.5) / tier.steps
        : fraction;
    const d = tier.depth[0] + treadFraction * (tier.depth[1] - tier.depth[0]);
    const z =
      tier.height[0] +
      (Math.floor(fraction * tier.steps) / tier.steps) *
        (tier.height[1] - tier.height[0]);
    return row.seats.map((seat, seatIndex) => {
      // Preserve catalog order including descending numbers; direction remains provisional.
      const t = widthWeighted
        ? slotStart +
          gapT +
          pitchT * (seatIndex + 0.5 + (widest - row.seats.length) / 2)
        : (index + 0.1 + (0.8 * (seatIndex + 0.5)) / row.seats.length) / total;
      const s = alongUsableSpan(start, end, t, true);
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
