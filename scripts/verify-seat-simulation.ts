import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import catalog from "../src/data/seat-catalog.json";
import {
  simulateSector,
  SIMULATION_GROUP_IDS,
} from "../src/lib/seat-simulation";

const unique = new Set<string>();
const positions = new Map<string, [number, number, number]>();
let count = 0;
for (const group of catalog.groups)
  for (const sector of group.sectors) {
    const simulated = simulateSector(group.id, sector);
    if (!SIMULATION_GROUP_IDS.includes(group.id)) {
      assert.equal(simulated.length, 0);
      continue;
    }
    assert.equal(simulated.length, sector.seatCount);
    for (const seat of simulated) {
      assert(seat.eye.every(Number.isFinite));
      assert(Math.abs(seat.eye[2] - seat.position[2] - 1.15) < 1e-10);
      const key = seat.eye.map((n) => n.toFixed(7)).join(":");
      assert(
        !unique.has(key),
        `Duplicate camera ${sector.name}/${seat.row}/${seat.label}`,
      );
      unique.add(key);
      positions.set(`${seat.sectorId}:${seat.id}`, seat.position);
      count++;
    }
    const rows = sector.rows;
    for (let i = 1; i < rows.length; i++) {
      const before = simulated.find((s) => s.row === rows[i - 1].label)!;
      const after = simulated.find((s) => s.row === rows[i].label)!;
      assert(after.eye[2] >= before.eye[2], `Reversed height ${sector.name}`);
      assert.notDeepEqual(before.eye, after.eye);
    }
  }
assert.equal(count, 11367);
// Preferencias and Gradas share one pitch per stand (D11 used to sit at
// 0.31 m) and keep a visible walkway between neighbouring sectors.
for (const [id, minPitch] of [
  [2276, 0.5],
  [2278, 0.42],
] as const) {
  const sectors = [...catalog.groups.find((g) => g.id === id)!.sectors].sort(
    (a, b) => a.name.localeCompare(b.name, "es", { numeric: true }),
  );
  const pitches: number[] = [];
  const blocks = sectors.map((sector) => simulateSector(id, sector));
  for (const seats of blocks)
    for (let i = 1; i < seats.length; i++)
      if (seats[i].row === seats[i - 1].row)
        pitches.push(
          Math.hypot(
            seats[i].position[0] - seats[i - 1].position[0],
            seats[i].position[1] - seats[i - 1].position[1],
          ),
        );
  assert(Math.min(...pitches) > minPitch, `Seats too tight in group ${id}`);
  for (let k = 1; k < blocks.length; k++) {
    let nearest = Infinity;
    for (const a of blocks[k - 1])
      for (const b of blocks[k])
        if (Math.abs(a.position[2] - b.position[2]) < 0.3)
          nearest = Math.min(
            nearest,
            Math.hypot(
              a.position[0] - b.position[0],
              a.position[1] - b.position[1],
            ),
          );
    assert(nearest > 1.1, `No walkway between ${sectors[k].name} and its neighbour`);
  }
}
const group = catalog.groups.find((g) => g.id === 2287)!;
const a24 = simulateSector(
  group.id,
  group.sectors.find((s) => s.id === 11626)!,
);
const firstRow = a24.filter((s) => s.row === "A");
assert(Math.abs(firstRow[0].eye[0] - firstRow.at(-1)!.eye[0]) > 0.5);
const bytes = readFileSync("public/models/estadio-quisqueya.glb");
assert.equal(bytes.toString("utf8", 0, 4), "glTF");
assert.equal(bytes.readUInt32LE(8), bytes.length);
const gltf = JSON.parse(
  bytes.toString("utf8", 20, 20 + bytes.readUInt32LE(12)),
);
assert(
  gltf.nodes.some(
    (n: { extras?: { architecture_revision?: string } }) =>
      n.extras?.architecture_revision === "20260907-phase2",
  ),
);
assert(
  gltf.materials.find((m: { name: string }) => m.name === "MAT_Grass")
    .pbrMetallicRoughness.baseColorFactor[1] > 0.2,
);
const placed = JSON.parse(
  readFileSync(
    "artifacts/blender/phase2-20260907/seat-placements.json",
    "utf8",
  ),
);
for (const group of placed.groups)
  for (const entry of group.seats) {
    assert.deepEqual(
      positions.get(`${entry.sectorId}:${entry.id}`),
      entry.position,
      "Blender and web seat positions differ",
    );
  }
const seatNodes = gltf.nodes.filter(
  (n: { extras?: { catalog_seat_count?: number } }) =>
    n.extras?.catalog_seat_count,
);
assert.equal(
  seatNodes.reduce(
    (sum: number, n: { extras: { catalog_seat_count: number } }) =>
      sum + n.extras.catalog_seat_count,
    0,
  ),
  11367,
);
console.log(
  `Verified ${count} distinct seat cameras, row heights, lateral displacement, and current GLB revision.`,
);
