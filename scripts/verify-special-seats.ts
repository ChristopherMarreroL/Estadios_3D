import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import catalog from "../src/data/seat-catalog.json";
import { simulateSector, SPECIAL_GROUP_IDS } from "../src/lib/seat-simulation";
import {
  ticketSectors,
  ticketSeats,
  TICKET_CATEGORIES,
} from "../src/lib/ticket-inventory";
let count = 0;
for (const id of SPECIAL_GROUP_IDS) {
  const group = catalog.groups.find((g) => g.id === id)!;
  assert(TICKET_CATEGORIES.some((c) => c.id === id));
  for (const sector of group.sectors) {
    const actual = simulateSector(id, sector);
    count += actual.length;
    assert.equal(actual.length, sector.seatCount);
    for (const row of sector.rows) {
      const placed = actual.filter((s) => s.row === row.label);
      assert.deepEqual(
        placed.map((s) => ({ id: s.id, label: s.label })),
        row.seats,
      );
    }
    if (!sector.seatCount) {
      assert(
        !ticketSectors.some((s) => s.id === sector.id),
        "Empty BAR/MESAS sector offered as seat",
      );
      continue;
    }
    assert(ticketSectors.some((s) => s.id === sector.id));
    for (const seat of actual) {
      assert(ticketSeats.has(`${seat.sectorId}:${seat.id}`));
      if (id === 2281 || id === 2283)
        assert(seat.position[0] < 0, "Licey must be left in plan");
      if (id === 2279 || id === 2282)
        assert(seat.position[0] > 0, "Escogido must be right in plan");
      assert(seat.position.every(Number.isFinite));
      assert(Number.isFinite(seat.facing));
    }
  }
}
const unbuilt = catalog.groups.find((g) => g.id === 2812)!;
const unbuiltSeats = unbuilt.sectors.reduce((n, s) => n + s.seatCount, 0);
assert.equal(count, 608 - unbuiltSeats);
assert.equal(ticketSeats.size, catalog.totalSeats - unbuiltSeats);
assert(!TICKET_CATEGORIES.some((c) => c.id === 2812));
assert(!ticketSectors.some((s) => unbuilt.sectors.some((u) => u.id === s.id)));
const checks = JSON.parse(
  readFileSync(
    "artifacts/blender/pending-seats-20261005/model-checks.json",
    "utf8",
  ),
);
assert.equal(checks.added, 608);
assert.equal(checks.modelSeats, 11975);
for (const field of ["unsupported", "obstacle_intersections", "low_headroom"])
  assert.equal(checks[field].length, 0);
assert(checks.preservedMeshes >= 508);
assert.equal(checks.preservedSeats, 11367);
const collisions = JSON.parse(
  readFileSync(
    "artifacts/blender/pending-seats-20261005/seat-shell-collisions.json",
    "utf8",
  ),
);
assert.equal(collisions.count, 11975);
assert.equal(collisions.collisions.length, 0);
const current = JSON.parse(
  readFileSync(
    "artifacts/blender/pending-seats-20261005/current-geometry-checks.json",
    "utf8",
  ),
);
for (const report of [current, collisions]) {
  for (const [path, expected] of Object.entries(report.sha256)) {
    assert.equal(
      createHash("sha256").update(readFileSync(path)).digest("hex"),
      expected,
      `Stale geometry report for ${path}`,
    );
  }
}
assert.equal(current.count, catalog.totalSeats);
assert.equal(current.glbCount, catalog.totalSeats);
assert.equal(current.unsupportedFootprints.length, 0);
assert.equal(current.obstacleIntersections.length, 0);
console.log(
  "Verified all 608 new catalogue identities, side placement, table seating, selection inventory and current geometry checks.",
);
