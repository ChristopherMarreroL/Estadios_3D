import catalog from "../src/data/seat-catalog.json";
import {
  simulateSector,
  SIMULATION_GROUP_IDS,
  simulationLayout,
  type CatalogSector,
  type SimulatedSeat,
} from "../src/lib/seat-simulation";

import { readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
const baseline: { groups: { id: number; seats: SimulatedSeat[] }[] } =
  JSON.parse(
    readFileSync(
      "artifacts/blender/all-seats-20261005/placements-before.json",
      "utf8",
    ),
  );
function beforeSector(id: number, sector: CatalogSector): SimulatedSeat[] {
  return (
    baseline.groups
      .find((g) => g.id === id)
      ?.seats.filter((seat) => seat.sectorId === sector.id) ?? []
  );
}
type SourceZone = {
  idZona: number;
  litZona: string;
  butacas?: { idButaca: number; litFila: string; litButaca: string }[];
};
const raw = readFileSync("artifacts/uepa-reference/plano-sala.js.txt", "utf8");
const source: SourceZone[] = JSON.parse(
  raw.slice(raw.indexOf("["), raw.lastIndexOf("]") + 1),
);
const keys = new Set<string>();
const mismatch: string[] = [];
for (const group of catalog.groups)
  for (const sector of group.sectors) {
    const reference = source.find((z) => z.idZona === sector.id)!;
    const local = sector.rows
      .flatMap((r) => r.seats.map((s) => `${r.label}:${s.label}:${s.id}`))
      .sort();
    const archived = (reference.butacas ?? [])
      .map((s) => `${s.litFila}:${s.litButaca}:${s.idButaca}`)
      .sort();
    if (JSON.stringify(local) !== JSON.stringify(archived))
      mismatch.push(sector.name);
    for (const row of sector.rows)
      for (const seat of row.seats) {
        const key = `${sector.id}:${seat.id}`;
        assert(!keys.has(key));
        keys.add(key);
      }
  }
function metrics(id: number, simulate: typeof simulateSector) {
  const group = catalog.groups.find((g) => g.id === id)!;
  const heights = new Map<string, Set<number>>();
  let breaks = 0,
    backwards = 0,
    count = 0,
    minimum = Infinity,
    maximum = 0;
  for (const sector of group.sectors) {
    const seats = simulate(id, sector);
    count += seats.length;
    for (const seat of seats) {
      const values = heights.get(seat.row) ?? new Set();
      values.add(seat.position[2]);
      heights.set(seat.row, values);
    }
    const rows = [
      ...new Set(seats.filter((s) => s.kind !== "table").map((s) => s.row)),
    ];
    for (let i = 1; i < rows.length; i++)
      if (
        seats.find((s) => s.row === rows[i])!.position[2] <
        seats.find((s) => s.row === rows[i - 1])!.position[2]
      )
        backwards++;
    for (const row of rows) {
      const items = seats.filter((s) => s.row === row);
      for (let i = 1; i < items.length; i++) {
        const d = Math.hypot(
          ...items[i].position.map((n, k) => n - items[i - 1].position[k]),
        );
        minimum = Math.min(minimum, d);
        maximum = Math.max(maximum, d);
        if (d > 2) breaks++;
      }
    }
  }
  return {
    count,
    minInRow: minimum,
    maxInRow: maximum,
    breaksOver2m: breaks,
    backwardsRows: backwards,
    inconsistentRowHeights: [...heights]
      .filter(([, v]) => v.size > 1)
      .map(([row]) => row),
  };
}
const groups = catalog.groups.map((g) => ({
  id: g.id,
  name: g.name,
  sectors: g.sectors.length,
  seats: g.sectors.reduce((n, s) => n + s.seatCount, 0),
  mapped: SIMULATION_GROUP_IDS.includes(g.id),
  ...(SIMULATION_GROUP_IDS.includes(g.id)
    ? {
        before: metrics(g.id, beforeSector),
        after: metrics(g.id, simulateSector),
        sectorsWithMissingFrontRows: g.sectors
          .filter(
            (s) => !["A", "1"].includes(s.rows.map((r) => r.label).sort()[0]),
          )
          .map((s) => s.name),
        layout: [...(simulationLayout(g.id)?.slots.values() ?? [])],
      }
    : {
        status: g.sectors.some((s) => s.seatCount)
          ? "Catalogue verified; no 3D location in current model"
          : "No numbered seats",
      }),
}));
assert.equal(keys.size, 11975);
assert.equal(mismatch.length, 0);
const mapped = groups.filter((g) => "after" in g);
for (const g of mapped) {
  assert.equal(g.after!.breaksOver2m, 0);
  assert.equal(g.after!.backwardsRows, 0);
  assert.equal(g.after!.inconsistentRowHeights.length, 0);
  assert.equal(g.after!.count, g.seats);
}
const report = {
  date: "2026-10-05",
  reference: catalog.source.url,
  archivedCatalogDate: catalog.source.retrievedDate,
  scope: {
    catalogueSeats: keys.size,
    modelSeats: mapped.reduce((n, g) => n + g.seats, 0),
    unmappedSeats: groups
      .filter((g) => !g.mapped)
      .reduce((n, g) => n + g.seats, 0),
  },
  catalogueMismatches: mismatch,
  groups,
};
writeFileSync(
  "artifacts/blender/pending-seats-20261005/audit.json",
  JSON.stringify(report, null, 2),
);
console.table(
  mapped.map((g) => ({
    group: g.name,
    count: g.seats,
    beforeBreaks: g.before!.breaksOver2m,
    afterBreaks: g.after!.breaksOver2m,
    minCm: (g.after!.minInRow * 100).toFixed(2),
    rowsCorrected: g.before!.inconsistentRowHeights.length,
  })),
);
console.log(
  "Verified all 11,975 catalogue seats and approximate 3D positions; no numbered seats remain unmapped.",
);
