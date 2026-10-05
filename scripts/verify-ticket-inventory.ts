import assert from "node:assert/strict";
import catalog from "../src/data/seat-catalog.json";
import {
  ticketSectors,
  ticketSeats,
  toggleTicket,
  availableCount,
  MAX_TICKETS,
  purchasedSpectators,
  ticketKey,
  TICKET_CATEGORIES,
} from "../src/lib/ticket-inventory";

assert.equal(ticketSeats.size, catalog.totalSeats);
const all = ticketSectors.flatMap((s) => s.seats);
assert.equal(new Set(all.map((s) => s.key)).size, all.length);
// Compare exact catalogue identities rather than accepting an equal-sized subset.
for (const group of catalog.groups)
  for (const source of group.sectors) {
    const sector = ticketSectors.find((s) => s.id === source.id);
    if (!source.seatCount) {
      assert(!sector, `Empty sector offered: ${source.name}`);
      continue;
    }
    assert(sector, `Catalogue sector missing: ${source.name}`);
    assert.equal(sector.category.id, group.id);
    const expected = source.rows.flatMap((row) =>
      row.seats.map((seat) => `${row.label}:${seat.label}:${seat.id}`),
    );
    assert.deepEqual(
      sector.seats.map((s) => `${s.row}:${s.label}:${s.id}`).sort(),
      expected.sort(),
      `Inventory identities changed: ${source.name}`,
    );
  }
for (const category of TICKET_CATEGORIES) {
  const choice = ticketSectors
    .filter((s) => s.category.id === category.id)
    .flatMap((s) => s.seats)
    .find((s) => s.available);
  assert(choice, `No selectable demo seat in ${category.name}`);
  assert.deepEqual(toggleTicket([], choice.key), [choice.key]);
  assert.deepEqual(toggleTicket([choice.key], choice.key), []);
}
for (const sector of ticketSectors) {
  assert.equal(availableCount(sector, []), sector.available);
  for (const seat of sector.seats) {
    assert.equal(seat.simulation.id, seat.id);
    assert.equal(seat.simulation.sectorId, seat.sectorId);
    assert(seat.price > 0 && Number.isFinite(seat.price));
  }
}
const sold = ticketSectors.find((s) => s.available === 0)!;
assert(sold);
assert.deepEqual(toggleTicket([], sold.seats[0].key), []);
assert.deepEqual(toggleTicket([], "unknown"), []);
const choices = all.filter((s) => s.available);
let selected: string[] = [];
for (const seat of choices.slice(0, MAX_TICKETS + 2))
  selected = toggleTicket(selected, seat.key);
assert.equal(selected.length, MAX_TICKETS);
const first = choices[0];
const sector = ticketSectors.find((s) => s.id === first.sectorId)!;
assert.equal(availableCount(sector, [first.key]), sector.available - 1);
selected = toggleTicket(selected, first.key);
assert.equal(selected.length, MAX_TICKETS - 1);
assert(!selected.includes(first.key));
selected = toggleTicket(selected, first.key);
assert.equal(new Set(selected).size, MAX_TICKETS);
assert.equal(
  selected.reduce((n, k) => n + ticketSeats.get(k)!.price, 0),
  choices.slice(0, MAX_TICKETS).reduce((n, s) => n + s.price, 0),
);
const a5 = ticketSectors.find((s) => s.id === 11607)!,
  a6 = ticketSectors.find((s) => s.id === 11608)!;
assert(a5.available / a5.seats.length > a6.available / a6.seats.length);
console.log(
  `Verified ${ticketSeats.size} seat/3D mappings, sold-out blocking, selection limit, removal, totals and sector counts.`,
);

// Regression: AA31's first row must see purchased seats in lower tiers too.
const viewpoint = all.find(
  (s) => s.sector === "AA31" && s.row === "A" && s.label === "4",
)!;
assert(viewpoint);
const audience = purchasedSpectators(viewpoint.key);
const audienceKeys = new Set(audience.map((s) => ticketKey(s.sectorId, s.id)));
assert.equal(
  audienceKeys.size,
  all.filter((s) => s.status === "sold" && s.key !== viewpoint.key).length,
);
for (const seat of all) {
  assert.equal(
    audienceKeys.has(seat.key),
    seat.status === "sold" && seat.key !== viewpoint.key,
  );
  assert.equal(seat.available, seat.status === "available");
}
assert(
  audience.some(
    (s) =>
      s.sectorId !== viewpoint.sectorId &&
      s.position[2] < viewpoint.simulation.position[2],
  ),
);
assert(
  !purchasedSpectators(sold.seats[0].key).some(
    (s) => ticketKey(s.sectorId, s.id) === sold.seats[0].key,
  ),
);
assert.deepEqual(
  purchasedSpectators("viewer", [
    { ...first, key: "available", status: "available" },
    { ...first, key: "held", status: "held" },
    { ...first, key: "blocked", status: "unavailable" },
    { ...first, key: "viewer", status: "sold" },
    { ...first, key: "sold", status: "sold" },
  ]),
  [first.simulation],
);
console.log(
  `Verified ${audience.length} purchased spectators across sectors, including seats below AA31/A/4; available, held, blocked and viewing seats excluded.`,
);
