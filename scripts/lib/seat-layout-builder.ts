import catalog from "../../src/data/seat-catalog.json";
import {
  measure,
  rowPosition,
  type Tier,
} from "../../src/lib/seat-layout-math";
import type { CatalogSector } from "../../src/lib/seat-simulation";
const inner: Tier = { depth: [3, 17], height: [1.1, 4.2], steps: 20 };
const middle: Tier = { depth: [17, 28], height: [4.2, 6.7], steps: 14 };
const outer: Tier = { depth: [28, 44], height: [6.7, 10.8], steps: 20 };
export const SIMULATION_GROUP_IDS = [2287, 2288, 2289, 2275, 2276, 2278];
export const SIMULATION_AISLES = [-82, -62, -42, -21, 0, 21, 42, 62, 82];
const aisleMargin = 1.3;

function usableSpans(start: number, end: number, avoidAisles: boolean) {
  let spans: [number, number][] = [[start, end]];
  if (avoidAisles)
    for (const aisle of SIMULATION_AISLES) {
      spans = spans.flatMap(([a, b]) => {
        const lo = aisle - aisleMargin,
          hi = aisle + aisleMargin;
        if (hi <= a || lo >= b) return [[a, b]];
        return [
          ...(a < lo ? [[a, lo] as [number, number]] : []),
          ...(hi < b ? [[hi, b] as [number, number]] : []),
        ];
      });
    }
  return spans;
}
type Slot = {
  sectorId: number;
  lo: number;
  hi: number;
  span: [number, number];
  pitch: number;
};
type Layout = { tier: Tier; rows: string[]; slots: Map<number, Slot> };
const layouts = new Map<number, Layout>();

// Allocate whole sectors to consecutive terrace spans; no seat row jumps a stair.
function pack(
  sectors: CatalogSector[],
  spans: [number, number][],
  tier: Tier,
  rows: string[],
  gap: number,
): Slot[] {
  const depth = rowPosition(tier, rows, rows[0]).depth;
  const tracks = spans.map(([a, b]) => measure(a, b, depth));
  const rowTracks = spans.map(
    ([a, b]) =>
      new Map(
        rows.map((row) => [
          row,
          measure(a, b, rowPosition(tier, rows, row).depth),
        ]),
      ),
  );
  function place(
    start: number,
    end: number,
    trackIndex: number,
    pitch: number,
    initialOffset = 0,
  ) {
    const track = tracks[trackIndex];
    let cursor = track.at(initialOffset);
    const slots: Slot[] = [];
    for (const sector of sectors.slice(start, end)) {
      const lo = track.at(track.distance(cursor) + gap / 2);
      const hi = Math.max(
        ...sector.rows.map((row) => {
          const rowTrack = rowTracks[trackIndex].get(row.label)!;
          return rowTrack.at(rowTrack.distance(lo) + row.seats.length * pitch);
        }),
      );
      slots.push({
        sectorId: sector.id,
        lo,
        hi,
        span: [track.lo, track.hi],
        pitch,
      });
      cursor = track.at(track.distance(hi) + gap / 2);
    }
    return { slots, cursor };
  }
  function partition(pitch: number) {
    const costs = Array.from(
      { length: tracks.length + 1 },
      () => Array(sectors.length + 1).fill(Infinity) as number[],
    );
    const previous = Array.from(
      { length: tracks.length + 1 },
      () => Array(sectors.length + 1).fill(-1) as number[],
    );
    costs[0][0] = 0;
    for (let t = 1; t <= tracks.length; t++)
      for (let end = 0; end <= sectors.length; end++)
        for (let start = 0; start <= end; start++) {
          if (!Number.isFinite(costs[t - 1][start])) continue;
          const { cursor } = place(start, end, t - 1, pitch),
            track = tracks[t - 1];
          if (cursor > track.hi + 1e-8) continue;
          const unused = track.length - track.distance(cursor);
          const cost = costs[t - 1][start] + unused ** 2;
          if (cost < costs[t][end]) {
            costs[t][end] = cost;
            previous[t][end] = start;
          }
        }
    if (!Number.isFinite(costs[tracks.length][sectors.length])) return null;
    const result: [number, number][] = [];
    let end = sectors.length;
    for (let t = tracks.length; t > 0; t--) {
      const start = previous[t][end];
      result.unshift([start, end]);
      end = start;
    }
    return result;
  }
  let low = 0,
    high = 2;
  for (let i = 0; i < 28; i++) {
    const mid = (low + high) / 2;
    if (partition(mid)) low = mid;
    else high = mid;
  }
  if (low < 0.52)
    throw new Error(
      `Insufficient space for whole sectors: ${low.toFixed(3)} m`,
    );
  return partition(low - 1e-7)!.flatMap(([start, end], index) => {
    const pitch = low - 1e-7;
    const { cursor } = place(start, end, index, pitch),
      track = tracks[index];
    let minOffset = 0,
      maxOffset = Math.max(0, track.length - track.distance(cursor));
    // Repack after centering: translating arc parameters can shrink a rear row.
    for (let pass = 0; pass < 24; pass++) {
      const offset = (minOffset + maxOffset) / 2;
      if (place(start, end, index, pitch, offset).cursor <= track.hi)
        minOffset = offset;
      else maxOffset = offset;
    }
    return place(start, end, index, pitch, minOffset / 2).slots;
  });
}
export function simulationLayout(groupId: number): Layout | null {
  if (!SIMULATION_GROUP_IDS.includes(groupId)) return null;
  const cached = layouts.get(groupId);
  if (cached) return cached;
  const group = catalog.groups.find((g) => g.id === groupId)!;
  // UEPA numbers every main stand from right to left in the UEPA plan orientation (field above the stand).
  const sectors = [...group.sectors].sort((a, b) =>
    b.name.localeCompare(a.name, "es", { numeric: true }),
  );
  const rows = [
    ...new Set(sectors.flatMap((s) => s.rows.map((r) => r.label))),
  ].sort((a, b) => a.localeCompare(b, "es", { numeric: true }));
  const tier =
    groupId === 2275
      ? ({ depth: [0.4, 2.6], height: [0.32, 0.32], steps: 1 } as Tier)
      : groupId === 2276 || groupId === 2278
        ? outer
        : groupId === 2288 || groupId === 2289
          ? middle
          : inner;

  const gap =
    groupId === 2278
      ? 0.8
      : groupId === 2276
        ? 0.6
        : groupId === 2287 || groupId === 2275
          ? 0.3
          : 0.5;
  let slots: Slot[];
  if (groupId === 2289 || groupId === 2278) {
    // D1–D12 belong to the right wing, D13–D23 to the left; AAA has 10 per wing.
    const split = Math.floor(sectors.length / 2),
      extent = groupId === 2278 ? 144 : 126,
      inside = groupId === 2278 ? 60 : 85;
    slots = [
      ...pack(
        sectors.slice(0, split),
        usableSpans(-extent, -inside, true),
        tier,
        rows,
        gap,
      ),
      ...pack(
        sectors.slice(split),
        usableSpans(inside, extent, true),
        tier,
        rows,
        gap,
      ),
    ];
  } else {
    const extent =
      groupId === 2275
        ? 17.7
        : groupId === 2287
          ? 88
          : groupId === 2288
            ? 85
            : 60.7;
    slots = pack(
      sectors,
      usableSpans(-extent, extent, groupId !== 2275),
      tier,
      rows,
      gap,
    );
  }
  const layout = {
    tier,
    rows,
    slots: new Map(slots.map((s) => [s.sectorId, s])),
  };
  layouts.set(groupId, layout);
  return layout;
}
