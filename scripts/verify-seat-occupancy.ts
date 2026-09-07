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
console.log(
  "Verified empty/full occupancy, stable density, explicit neighbor overrides and front-row boundaries.",
);
