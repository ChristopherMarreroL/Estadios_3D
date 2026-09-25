import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import catalog from "../src/data/seat-catalog.json";
import { simulateSector } from "../src/lib/seat-simulation";
const group = catalog.groups.find((g) => g.id === 2287)!;
const a6 = simulateSector(
  group.id,
  group.sectors.find((s) => s.id === 11608)!,
);
const buffer = readFileSync("public/models/estadio-quisqueya.glb");
const gltf = JSON.parse(
  buffer.subarray(20, 20 + buffer.readUInt32LE(12)).toString(),
);
const shells = gltf.nodes.filter(
  (n: { extras?: { seat_id?: number } }) => n.extras?.seat_id,
);
assert.equal(shells.length, 84);
assert.equal(
  new Set(shells.map((n: { extras: { seat_id: number } }) => n.extras.seat_id))
    .size,
  84,
);
for (const s of a6) {
  const node = shells.find(
    (n: { extras: { seat_id: number } }) => n.extras.seat_id === s.id,
  );
  assert.equal(node.extras.row, s.row);
  assert.equal(node.extras.seat_number, s.label);
  s.position.forEach((v, i) =>
    assert(Math.abs(v - node.extras.seat_origin[i]) < 1e-5),
  );
  assert(Math.abs(s.eye[2] - s.position[2] - 1.15) < 1e-9);
}
for (const row of new Set(a6.map((s) => s.row))) {
  const seats = a6.filter((s) => s.row === row);
  for (let i = 1; i < seats.length; i++)
    assert(
      Math.hypot(
        ...seats[i].position.map((v, k) => v - seats[i - 1].position[k]),
      ) >= 0.52,
    );
}
const neighbours = group.sectors
  .filter((s) => ["PALCO - A5", "PALCO - A7"].includes(s.name))
  .flatMap((s) => simulateSector(group.id, s));
let min = Infinity;
for (const s of a6)
  for (const n of neighbours)
    if (s.row === n.row)
      min = Math.min(
        min,
        Math.hypot(...s.position.map((v, i) => v - n.position[i])),
      );
assert(min > 0.52, "A6 encroaches on A5/A7 chair widths");
assert(gltf.nodes.some((n: { name: string }) => n.name === "A6_safety_net"));
console.log(
  `Verified 84 A6 IDs, shared camera origins, at least 52 cm pitch, and neighbour centre clearance ${min.toFixed(3)} m.`,
);
