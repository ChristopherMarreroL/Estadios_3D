import assert from "node:assert/strict";
import catalog from "../src/data/seat-catalog.json";
import { simulateSector } from "../src/lib/seat-simulation";
import {
  isDemoOccupied,
  occupancyKey,
  seatNeighbors,
} from "../src/lib/seat-occupancy";
const sector = catalog.groups
  .find((g) => g.id === 2287)!
  .sectors.find((s) => s.id === 11626)!;
const seats = simulateSector(2287, sector);
assert(seats.every((s) => !isDemoOccupied(s, 0, {})));
assert(seats.every((s) => isDemoOccupied(s, 100, {})));
const selected = seats.find((s) => s.row === "B" && s.label === "2")!;
const neighbors = seatNeighbors(seats, selected);
assert.equal(neighbors.length, 3);
assert.equal(neighbors.find((n) => n.label === "Delante")!.seat.row, "A");
assert(neighbors.every((n) => n.seat.id !== selected.id));
assert.equal(seatNeighbors(seats, seats[0]).length, 1);
assert.equal(seatNeighbors(seats, null).length, 0);
const front = neighbors[0].seat;
assert(!isDemoOccupied(front, 100, { [occupancyKey(front)]: false }));
assert(isDemoOccupied(front, 0, { [occupancyKey(front)]: true }));
for (const s of seats)
  assert(!isDemoOccupied(s, 35, {}) || isDemoOccupied(s, 65, {}));
let checked = 0;
for (const group of catalog.groups)
  for (const source of group.sectors) {
    const block = simulateSector(group.id, source);
    for (const seat of block) {
      checked++;
      assert(!isDemoOccupied(seat, -10, {}));
      assert(isDemoOccupied(seat, 110, {}));
      assert(!isDemoOccupied(seat, 100, { [occupancyKey(seat)]: false }));
      const nearby = seatNeighbors(block, seat);
      const keys = nearby.map((n) => occupancyKey(n.seat));
      assert.equal(new Set(keys).size, keys.length, "Repeated neighbor");
      assert(!keys.includes(occupancyKey(seat)), "Seat is its own neighbor");
      for (const neighbor of nearby) {
        assert.equal(neighbor.seat.sectorId, seat.sectorId);
        if (neighbor.label === "Delante") {
          assert.notEqual(neighbor.seat.row, seat.row);
          assert(neighbor.seat.position[2] <= seat.position[2]);
          assert(neighbor.seat.kind !== "table");
        } else assert.equal(neighbor.seat.row, seat.row);
      }
      if (seat.kind === "table") assert.equal(nearby.length, 2);
    }
  }
assert.equal(checked, catalog.totalSeats);
console.log(
  `Verified occupancy bounds, overrides and valid neighbors for all ${checked} seats, including sparse rows and tables.`,
);
