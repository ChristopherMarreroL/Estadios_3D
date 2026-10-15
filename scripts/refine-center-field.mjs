/** Rebuild only the center-field board in the web source GLB.
 * Run after a Blender export: node scripts/refine-center-field.mjs
 * Artwork stays editable as SVG; one shared atlas keeps both model sizes small.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { NodeIO, Accessor } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { prune } from "@gltf-transform/functions";
import { BoxGeometry } from "three";
import { execFileSync } from "node:child_process";

const source = "public/models/estadio-quisqueya.glb";
const output = "artifacts/center-field";
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const original = await readFile(source);
const doc = await io.readBinary(new Uint8Array(original));
const scene = doc.getRoot().listScenes()[0];
const buffer = doc.getRoot().listBuffers()[0];
assert(scene && buffer, "The stadium must have a scene and geometry buffer");
await mkdir(output, { recursive: true });
// Preserve a recoverable local source before the first run, including on reruns.
await writeFile(`${output}/stadium-before.glb`, original, { flag: "wx" }).catch(
  (error) => {
    if (error.code !== "EEXIST") throw error;
  },
);
const fingerprint = (node) =>
  createHash("sha256")
    .update(
      JSON.stringify({
        name: node.getName(),
        matrix: node.getWorldMatrix(),
        primitives: node
          .getMesh()
          ?.listPrimitives()
          .map((p) => ({
            attributes: p
              .listSemantics()
              .map((s) => [s, Array.from(p.getAttribute(s).getArray())]),
            indices: p.getIndices()
              ? Array.from(p.getIndices().getArray())
              : null,
          })),
      }),
    )
    .digest("hex");
const unrelated = doc
  .getRoot()
  .listNodes()
  .filter(
    (n) => n.getMesh() && !/^scoreboard_|^center_field_411/.test(n.getName()),
  );
const before = unrelated.map(fingerprint);
for (const node of [...doc.getRoot().listNodes()]) {
  if (/^scoreboard_|^center_field_411/.test(node.getName())) {
    // Extend existing columns to meet the board above the batter's-eye wall.
    if (/^scoreboard_support_/.test(node.getName())) {
      const [x, , z] = node.getTranslation();
      node.setTranslation([x, 5.35, z]).setScale([1, 10.7 / 6.4, 1]);
      continue;
    }
    if (node.getName() === "scoreboard_root") continue;
    node.dispose();
  }
}
// Isolate sharp from the image libraries used by glTF transforms on Windows.
execFileSync(process.execPath, ["scripts/render-center-field.mjs"], {
  stdio: "inherit",
});
const png = await readFile(`${output}/facade.png`);
const atlas = doc
  .createTexture("center_field_facade_atlas")
  .setMimeType("image/png")
  .setImage(png);
const blue = doc
  .createMaterial("center_field_blue_structure")
  .setBaseColorFactor([0.025, 0.065, 0.16, 1])
  .setMetallicFactor(0.1)
  .setRoughnessFactor(0.8);
const facade = doc
  .createMaterial("center_field_printed_facade")
  .setBaseColorTexture(atlas)
  .setMetallicFactor(0)
  .setRoughnessFactor(0.9);
const screen = doc
  .createMaterial("center_field_static_abs_display")
  .setBaseColorTexture(atlas)
  .setEmissiveTexture(atlas)
  .setEmissiveFactor([0.65, 0.65, 0.65])
  .setMetallicFactor(0)
  .setRoughnessFactor(0.65);
function accessor(name, type, array) {
  return doc.createAccessor(name, buffer).setType(type).setArray(array);
}
function add(name, position, primitive) {
  const node = doc
    .createNode(name)
    .setTranslation(position)
    .setMesh(doc.createMesh(name).addPrimitive(primitive));
  scene.addChild(node);
  return node;
}
const box = new BoxGeometry(27, 22.5, 1.6);
add(
  "scoreboard_center",
  [0, 21.95, -88],
  doc
    .createPrimitive()
    .setAttribute(
      "POSITION",
      accessor(
        "board_positions",
        Accessor.Type.VEC3,
        box.attributes.position.array,
      ),
    )
    .setAttribute(
      "NORMAL",
      accessor(
        "board_normals",
        Accessor.Type.VEC3,
        box.attributes.normal.array,
      ),
    )
    .setIndices(
      accessor("board_indices", Accessor.Type.SCALAR, box.index.array),
    )
    .setMaterial(blue),
);
box.dispose();
function plane(name, width, height, position, material, uv = [0, 0, 1, 1]) {
  const [u0, v0, u1, v1] = uv;
  return add(
    name,
    position,
    doc
      .createPrimitive()
      .setAttribute(
        "POSITION",
        accessor(
          name,
          Accessor.Type.VEC3,
          new Float32Array([
            -width / 2,
            -height / 2,
            0,
            width / 2,
            -height / 2,
            0,
            width / 2,
            height / 2,
            0,
            -width / 2,
            height / 2,
            0,
          ]),
        ),
      )
      .setAttribute(
        "NORMAL",
        accessor(
          `${name}_normals`,
          Accessor.Type.VEC3,
          new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]),
        ),
      )
      .setAttribute(
        "TEXCOORD_0",
        accessor(
          `${name}_uv`,
          Accessor.Type.VEC2,
          new Float32Array([u0, v1, u1, v1, u1, v0, u0, v0]),
        ),
      )
      .setIndices(
        accessor(
          `${name}_indices`,
          Accessor.Type.SCALAR,
          new Uint16Array([0, 1, 2, 0, 2, 3]),
        ),
      )
      .setMaterial(material),
  );
}
plane("scoreboard_reference_facade", 27, 22.5, [0, 21.95, -87.19], facade);
// The display lies just ahead of its frame. Both planes share the same atlas.
plane("scoreboard_screen", 18, 11.4, [0, 21.95, -87.17], screen, [
  300 / 1800,
  370 / 1500,
  1500 / 1800,
  1130 / 1500,
]);
const distancePng = await readFile(`${output}/distance.png`);
const distanceTexture = doc
  .createTexture("center_field_411")
  .setMimeType("image/png")
  .setImage(distancePng);
const distanceMaterial = doc
  .createMaterial("center_field_yellow_distance")
  .setBaseColorTexture(distanceTexture)
  .setAlphaMode("BLEND")
  .setMetallicFactor(0)
  .setRoughnessFactor(1);
plane("center_field_411_ft", 2.8, 1.4, [0, 3.1, -83.12], distanceMaterial);
assert.deepEqual(
  unrelated.map(fingerprint),
  before,
  "Geometry outside the board changed",
);
await doc.transform(prune());
await io.write(source, doc);
const report = {
  reference: "User-supplied center-field photo, 2026-10-15",
  facadeTextureBytes: png.length,
  unchangedMeshNodes: unrelated.length,
  artwork:
    "Original vector approximation; ABS display is static demonstration content",
  sourceBytesBefore: original.length,
  sourceBytesAfter: (await readFile(source)).length,
};
await writeFile(
  `${output}/checks.json`,
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
