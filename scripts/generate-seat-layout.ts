import { simulationLayout } from "./lib/seat-layout-builder";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { writeFileSync, readFileSync } from "node:fs";
const groups = [2275, 2276, 2278, 2287, 2288, 2289].map((id) => {
  const l = simulationLayout(id)!;
  return { id, tier: l.tier, rows: l.rows, slots: [...l.slots.values()] };
});
const snapshot = {
  revision: "20261005-all-seats",
  catalogHash: createHash("sha256")
    .update(readFileSync("src/data/seat-catalog.json"))
    .digest("hex"),
  groups,
};
if (process.argv.includes("--verify")) {
  assert.deepEqual(
    JSON.parse(readFileSync("src/data/seat-layout.json", "utf8")),
    snapshot,
    "Generated layout is stale",
  );
  console.log("Verified reproducible layout for all six simulated groups.");
} else {
  writeFileSync("src/data/seat-layout.json", JSON.stringify(snapshot));
  console.log("Saved six layouts with whole sectors between aisles.");
}
