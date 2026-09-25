import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const checks = JSON.parse(
  readFileSync("artifacts/blender/light-towers-near-20260924/checks.json", "utf8"),
);
assert.equal(checks.revision, "20260924-light-towers-near");
assert(checks.seat_meshes_unchanged);
assert.equal(checks.relocated.third_base.to[0], -92);
assert.equal(checks.relocated.first_base.to[0], 92);
assert(checks.relocated.third_base.to[1] > -55);
assert(checks.relocated.third_base.to[1] < -45);
for (const item of checks.clearance) {
  assert(item.clearance_m > 8, item);
  assert(item.clearance_m < 20, item);
}
assert(
  checks.a11_k_distance.after.third_base < checks.a11_k_distance.before.third_base,
);
assert(checks.meshes.every((m: { non_manifold_edges: number }) => m.non_manifold_edges === 0));

const bytes = readFileSync("public/models/estadio-quisqueya.glb");
assert.equal(bytes.readUInt32LE(8), bytes.length);
const gltf = JSON.parse(bytes.toString("utf8", 20, 20 + bytes.readUInt32LE(12)));
const names = new Set(gltf.nodes.map((n: { name?: string }) => n.name));
for (const side of ["first_base", "third_base"]) {
  assert(names.has(`light_tower_${side}_mesh`));
  assert(names.has(`phase3_tower_${side}_projectors`));
}
const lamps = gltf.nodes.filter(
  (n: { extras?: { projector_count?: number } }) => n.extras?.projector_count,
);
assert.equal(lamps.length, 6);
assert.equal(
  lamps.reduce(
    (n: number, o: { extras: { projector_count: number } }) =>
      n + o.extras.projector_count,
    0,
  ),
  144,
);
console.log(
  `Verified towers closer to the bowl; nearest seat ${Math.min(
    ...checks.clearance.map((c: { clearance_m: number }) => c.clearance_m),
  )} m away; A11/K now ${checks.a11_k_distance.after.third_base} m from the 3B tower.`,
);
