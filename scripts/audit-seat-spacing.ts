import { mkdirSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import catalog from "../src/data/seat-catalog.json";
import {
  simulateSector,
  SIMULATION_GROUP_IDS,
} from "../src/lib/seat-simulation";

// Model-space metres, not a survey or a building-code certification.
const targetPitch = 0.52;
const groups = catalog.groups.filter((g) =>
  SIMULATION_GROUP_IDS.includes(g.id),
);
const seats = groups.flatMap((g) =>
  g.sectors.flatMap((s) =>
    simulateSector(g.id, s).map((p) => ({ ...p, group: g.id, sector: s.name })),
  ),
);
const distance = (a: (typeof seats)[number], b: (typeof seats)[number]) =>
  Math.hypot(...a.position.map((p, i) => p - b.position[i]));
const sectors = groups.flatMap((g) =>
  g.sectors.map((s) => {
    const items = seats.filter((p) => p.sectorId === s.id);
    const gaps = s.rows.flatMap((row) => {
      const r = items.filter((p) => p.row === row.label);
      return r.slice(1).map((p, i) => ({
        row: row.label,
        from: r[i].label,
        to: p.label,
        metres: distance(p, r[i]),
      }));
    });
    return {
      group: g.id,
      sector: s.name,
      id: s.id,
      count: items.length,
      minPitch: Math.min(...gaps.map((p) => p.metres)),
      tightPairs: gaps.filter((p) => p.metres < targetPitch - 1e-6).length,
      worst: gaps.sort((a, b) => a.metres - b.metres).slice(0, 3),
    };
  }),
);
const buckets = new Map<string, typeof seats>();
const collisions: { a: string; b: string; metres: number }[] = [];
for (const seat of seats) {
  const cell = seat.position.map((p) => Math.floor(p / targetPitch));
  for (let x = -1; x <= 1; x++)
    for (let y = -1; y <= 1; y++)
      for (let z = -1; z <= 1; z++) {
        for (const other of buckets.get(
          [cell[0] + x, cell[1] + y, cell[2] + z].join(":"),
        ) ?? []) {
          const d = distance(seat, other);
          if (d < targetPitch - 1e-6)
            collisions.push({
              a: `${other.sector}/${other.row}/${other.label}`,
              b: `${seat.sector}/${seat.row}/${seat.label}`,
              metres: d,
            });
        }
      }
  const key = cell.join(":");
  buckets.set(key, [...(buckets.get(key) ?? []), seat]);
}
const summary = groups.map((g) => ({
  group: g.name,
  id: g.id,
  count: seats.filter((s) => s.group === g.id).length,
  minPitch: Math.min(
    ...sectors.filter((s) => s.group === g.id).map((s) => s.minPitch),
  ),
  tightPairs: sectors
    .filter((s) => s.group === g.id)
    .reduce((n, s) => n + s.tightPairs, 0),
}));
const report = {
  targetPitch,
  count: seats.length,
  unmapped: catalog.groups
    .filter((g) => !SIMULATION_GROUP_IDS.includes(g.id))
    .map((g) => ({ id: g.id, name: g.name, sectors: g.sectors.length })),
  summary,
  sectors,
  nearPairs: collisions.sort((a, b) => a.metres - b.metres),
};
mkdirSync("artifacts/blender/seat-spacing-audit-20260925", { recursive: true });
const label = process.argv[2] ?? "current";
if (!/^[a-z-]+$/.test(label)) throw new Error("Invalid report label");
writeFileSync(
  `artifacts/blender/seat-spacing-audit-20260925/${label}.json`,
  JSON.stringify(report, null, 2),
);
console.table(summary);
console.log(
  "All-neighbour pairs below target:",
  collisions.length,
  collisions.slice(0, 8),
);
if (process.argv.includes("--verify")) {
  assert.equal(seats.length, 11367);
  assert.equal(collisions.length, 0, "Seats below the 52 cm minimum remain");
  assert.equal(
    new Set(seats.map((s) => `${s.sectorId}:${s.id}`)).size,
    seats.length,
  );
}
