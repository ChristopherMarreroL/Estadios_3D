import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, unlink } from "node:fs/promises";
import { NodeIO, Logger } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
  dedup,
  flatten,
  getBounds,
  join,
  meshopt,
  prune,
} from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptDecoder } from "meshoptimizer";

const source = "public/models/estadio-quisqueya.glb";
const manifestPath = "src/data/stadium-assets.json";
const pipeline = 1;
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const sourceBytes = await readFile(source);
const sourceHash = digest(sourceBytes);
const pipelineHash = digest(
  (await readFile(new URL(import.meta.url), "utf8")).replace(/\r\n/g, "\n"),
);
const toolchainHash = digest(
  (await readFile("package-lock.json", "utf8")).replace(/\r\n/g, "\n"),
);
let previous;
try {
  previous = JSON.parse(await readFile(manifestPath, "utf8"));
} catch {
  /* First export. */
}
async function current() {
  if (
    previous?.sourceHash !== sourceHash ||
    previous.pipeline !== pipeline ||
    previous.pipelineHash !== pipelineHash ||
    previous.toolchainHash !== toolchainHash
  )
    return false;
  for (const asset of [previous.map, previous.detail]) {
    try {
      const bytes = await readFile(`public${asset.url}`);
      if (digest(bytes) !== asset.hash || bytes.length !== asset.bytes)
        return false;
    } catch {
      return false;
    }
  }
  return true;
}
if (await current()) {
  console.log("Stadium web assets verified; source and output hashes match.");
} else {
  if (process.argv.includes("--check"))
    throw new Error("Stale stadium web assets. Run npm run assets:optimize.");
  await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready]);
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
      "meshopt.encoder": MeshoptEncoder,
      "meshopt.decoder": MeshoptDecoder,
    });
  const sourceDoc = await io.readBinary(new Uint8Array(sourceBytes));
  const bounds = getBounds(sourceDoc.getRoot().listScenes()[0]);
  const manifest = {
    pipeline,
    sourceHash,
    pipelineHash,
    toolchainHash,
    sourceBytes: sourceBytes.length,
    bounds,
  };
  for (const kind of ["map", "detail"]) {
    const doc = await io.readBinary(new Uint8Array(sourceBytes));
    doc.setLogger(new Logger(Logger.Verbosity.ERROR));
    if (kind === "map") {
      for (const node of doc.getRoot().listNodes()) {
        if (
          node.getName().startsWith("catalog_seats_") ||
          /^A6_\d+_(shell|support|bolts|number)/.test(node.getName())
        )
          node.dispose();
      }
    }
    for (const scene of doc.getRoot().listScenes())
      scene.setExtras({ ...scene.getExtras(), stadiumBounds: bounds });
    await doc.transform(
      prune(),
      dedup(),
      flatten(),
      join({
        filter: (node) =>
          kind === "detail" || !/roof|press_box/i.test(node.getName()),
      }),
      // ~4 mm precision across this stadium; retain normals and UVs.
      meshopt({
        encoder: MeshoptEncoder,
        level: "medium",
        quantizePosition: 16,
      }),
    );
    const bytes = await io.writeBinary(doc);
    const hash = digest(bytes);
    const url = `/models/estadio-${kind}-${hash.slice(0, 12)}.glb`;
    let triangles = 0,
      drawCalls = 0;
    for (const node of doc.getRoot().listNodes())
      for (const prim of node.getMesh()?.listPrimitives() || []) {
        triangles +=
          (prim.getIndices()?.getCount() ||
            prim.getAttribute("POSITION").getCount()) / 3;
        drawCalls++;
      }
    const budget = kind === "map" ? 3_000_000 : 8_000_000;
    if (bytes.length > budget)
      throw new Error(
        `${kind} exceeds the ${budget} byte budget: ${bytes.length}`,
      );
    await writeFile(`public${url}`, bytes);
    manifest[kind] = { url, hash, bytes: bytes.length, triangles, drawCalls };
  }
  await mkdir("src/data", { recursive: true });
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  // Remove only this generator's previously recorded, content-addressed files.
  for (const kind of ["map", "detail"]) {
    const old = previous?.[kind]?.url;
    if (
      old &&
      old !== manifest[kind].url &&
      /^\/models\/estadio-(map|detail)-[a-f0-9]{12}\.glb$/.test(old)
    )
      await unlink(`public${old}`).catch(() => {});
  }
  console.log(JSON.stringify(manifest, null, 2));
}
