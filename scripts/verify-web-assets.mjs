import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { getBounds } from "@gltf-transform/functions";
import { GLTFLoader, MeshoptDecoder } from "three-stdlib";
import { Box3, Texture } from "three";

const manifest = JSON.parse(
  await readFile("src/data/stadium-assets.json", "utf8"),
);
const source = await readFile("public/models/estadio-quisqueya.glb");
assert.equal(
  createHash("sha256").update(source).digest("hex"),
  manifest.sourceHash,
);
const original = await new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .readBinary(new Uint8Array(source));
const bounds = getBounds(original.getRoot().listScenes()[0]);
assert.deepEqual(manifest.bounds, bounds);
const triangles = (doc) =>
  doc
    .getRoot()
    .listNodes()
    .reduce(
      (sum, node) =>
        sum +
        (node.getMesh()?.listPrimitives() || []).reduce(
          (n, prim) =>
            n +
            (prim.getIndices()?.getCount() ||
              prim.getAttribute("POSITION").getCount()) /
              3,
          0,
        ),
      0,
    );
assert.equal(
  manifest.detail.triangles,
  triangles(original),
  "Detailed seats/architecture lost triangles",
);
assert(manifest.map.triangles < manifest.detail.triangles / 3);
for (const kind of ["map", "detail"]) {
  const asset = manifest[kind];
  const bytes = await readFile(`public${asset.url}`);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), asset.hash);
  assert.equal(bytes.length, asset.bytes);
  assert(bytes.length <= (kind === "map" ? 3_000_000 : 8_000_000));
  assert(asset.drawCalls <= 50);
  // Use the actual browser loader/decoder, not only the exporter library.
  const loader = new GLTFLoader();
  // Node has no image element. Browser tests cover real textures; this pass
  // validates geometry decoding with the same Meshopt decoder used by drei.
  loader.register(() => ({
    name: "NodeTextureStub",
    loadTexture: async () => new Texture(),
  }));
  loader.setMeshoptDecoder(
    typeof MeshoptDecoder === "function" ? MeshoptDecoder() : MeshoptDecoder,
  );
  const { scene } = await loader.parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    "",
  );
  assert.deepEqual(
    scene.userData.stadiumBounds,
    bounds,
    "Camera normalization differs between assets",
  );
  const actual = new Box3().setFromObject(scene, true);
  for (const side of ["min", "max"])
    for (let i = 0; i < 3; i++)
      assert(
        Math.abs(actual[side].getComponent(i) - bounds[side][i]) < 0.01,
        "Quantization moved the stadium bounds",
      );
  if (kind === "map") {
    let roofs = 0;
    scene.traverse((node) => {
      assert(!node.name.startsWith("catalog_seats_"));
      if (/roof|press_box/i.test(node.name)) roofs++;
    });
    assert(roofs > 0, "Roof toggle lost its separately named meshes");
  }
  console.log(
    `${kind}: decoded with browser loader, ${bytes.length} bytes, ${asset.drawCalls} draw calls; source bounds preserved`,
  );
}
