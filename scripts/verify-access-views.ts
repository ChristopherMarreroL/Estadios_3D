import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import catalog from "../src/data/seat-catalog.json";

const bytes = readFileSync("public/models/estadio-quisqueya.glb");
assert.equal(bytes.toString("utf8", 0, 4), "glTF");
assert.equal(bytes.readUInt32LE(8), bytes.length);
const gltf = JSON.parse(
  bytes.toString("utf8", 20, 20 + bytes.readUInt32LE(12)),
);
type Node = { name: string; mesh?: number; extras?: Record<string, unknown> };
const nodes = new Map<string, Node>(gltf.nodes.map((n: Node) => [n.name, n]));

for (let index = 1; index <= 6; index++) {
  const suffix = String(index).padStart(2, "0");
  const access = nodes.get(`vomitory_${suffix}`)!;
  assert(access, `Missing access ${suffix}`);
  assert.equal(access.extras?.architecture_revision, "20260923-open-access");
  assert.equal(access.extras?.curb_height_m, 0.28);
  // These meshes export in world coordinates with Blender Z mapped to glTF Y.
  // A tall original wall/lintel must not survive in any of the six approaches.
  for (const primitive of gltf.meshes[access.mesh!].primitives) {
    const position = gltf.accessors[primitive.attributes.POSITION];
    assert(position.max[1] < 8.4, `Tall obstruction in access ${suffix}`);
    assert(position.min[1] > 6.69);
  }
  const sign = nodes.get(`phase3_access_sign_${suffix}`)!;
  assert(sign);
  for (const primitive of gltf.meshes[sign.mesh!].primitives) {
    const position = gltf.accessors[primitive.attributes.POSITION];
    assert(position.min[1] > 10.79 && position.max[1] < 10.82);
  }
  assert(nodes.has(`phase3_access_text_${suffix}`));
}
assert(nodes.has("phase3_aisle_handrails"));
assert(nodes.has("phase3_tier_front_guards"));
assert(nodes.has("circulation_step_nosings"));
const report = JSON.parse(
  readFileSync(
    "artifacts/blender/pending-seats-20261005/current-geometry-checks.json",
    "utf8",
  ),
);
for (const [path, expected] of Object.entries(report.sha256)) {
  assert.equal(
    createHash("sha256").update(readFileSync(path)).digest("hex"),
    expected,
    `Stale access report for ${path}`,
  );
}
const visibility = report.accessVisibility;
assert.equal(visibility.totalSeats, catalog.totalSeats);
assert.equal(
  visibility.raysTested,
  catalog.totalSeats * visibility.targetsPerSeat,
);
assert.equal(visibility.blocked.length, 0);
assert(visibility.minimumEyeClearance > 0.15);
console.log(
  `Verified six open approaches, rear floor signs, preserved circulation and ${visibility.raysTested} current access visibility rays. Scope: access meshes and signage only.`,
);
