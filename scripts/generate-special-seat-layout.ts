import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import catalog from "../src/data/seat-catalog.json";
import {
  measure,
  terracePoint,
  terraceFacing,
} from "../src/lib/seat-layout-math";

// UEPA plan: Licey on the left, Escogido on the right. Model dimensions
// are approximate: the public plan provides identities/order, not a survey.
export const SPECIAL_GROUP_IDS = [2279, 2281, 2282, 2283, 2812];
const revision = "20261005-pending-seats";
const pitch = 0.65;
const definitions = [
  {
    id: 2283,
    span: [-14.5, -0.6],
    order: [11599, 11598, 11597, 11596, 11595],
    rows: ["A", "B", "C", "D", "E"],
  },
  {
    id: 2282,
    span: [0.6, 14.5],
    order: [11590, 11591, 11592, 11593, 11594],
    rows: ["A", "B", "C", "D", "E"],
  },
  {
    id: 2281,
    span: [-60, -15.7],
    order: [11588, 11586, 11584, 11582, 11579, 11577, 11575, 11573, 11571],
    rows: ["A", "B", "C", "D"],
  },
  {
    id: 2279,
    span: [15.7, 60],
    order: [
      11549, 11551, 11553, 11554, 11556, 11558, 11560, 11563, 11565, 11567,
      11568,
    ],
    rows: ["1", "2", "3"],
  },
];
const platforms: {
  sectorId: number;
  lo: number;
  hi: number;
  rows: { depth: number; height: number }[];
}[] = [];
const groups = definitions.map((def) => {
  const group = catalog.groups.find((g) => g.id === def.id)!;
  const sectors = def.order.map((id) =>
    group.sectors.find((s) => s.id === id)!,
  );
  const track = measure(def.span[0], def.span[1], 49.6);
  const widths = sectors.map(
    (s) => Math.max(...s.rows.map((r) => r.seats.length)) * pitch,
  );
  const gap = 1.2;
  const length = widths.reduce((a, b) => a + b, 0) + gap * (sectors.length - 1);
  assert(length < track.length);
  let cursor = (track.length - length) / 2;
  const seats = sectors.flatMap((sector, i) => {
    const lo = track.at(cursor),
      hi = track.at(cursor + widths[i]);
    cursor += widths[i] + gap;
    const rowFloors = def.rows.map((_, row) => ({
      depth: 49.6 + row * 0.95,
      height: 12.8 + row * 0.18,
    }));
    platforms.push({
      sectorId: sector.id,
      lo: track.at(track.distance(lo) - 0.15),
      hi: track.at(track.distance(hi) + 0.15),
      rows: rowFloors,
    });
    return [...sector.rows]
      .sort((a, b) => a.label.localeCompare(b.label, "es", { numeric: true }))
      .flatMap((row) => {
        const { depth, height } = rowFloors[def.rows.indexOf(row.label)];
        const path = measure(lo, hi, depth);
        return row.seats.map((seat, j) => {
          const s = path.at(
            (path.length - (row.seats.length - 1) * pitch) / 2 + j * pitch,
          );
          const position = terracePoint(s, depth, height);
          return {
            ...seat,
            row: row.label,
            sectorId: sector.id,
            position,
            eye: [position[0], position[1], height + 1.15],
            facing: terraceFacing(s, depth),
            kind: "chair",
          };
        });
      });
  });
  return { id: def.id, seats };
});
const origin = terracePoint(-104, -2, 0.2),
  angle = -Math.PI / 4;
const local = (x: number, y: number, z: number): [number, number, number] => [
  origin[0] + x * Math.cos(angle) - y * Math.sin(angle),
  origin[1] + x * Math.sin(angle) + y * Math.cos(angle),
  z,
];
const tables = [-10.2, -6.4, 6.4, 10.2].map((x, i) => ({
  row: `Mesa ${i + 1}`,
  position: local(x, -3.4, 0.2),
  radius: 0.47,
}));
const bullpen = catalog.groups
  .find((g) => g.id === 2812)!
  .sectors.find((s) => s.id === 13416)!;
const bullpenSeats = [...bullpen.rows]
  .sort((a, b) => a.label.localeCompare(b.label, "es", { numeric: true }))
  .flatMap((row) => {
    if (row.label.startsWith("Mesa")) {
      const table = tables.find((t) => t.row === row.label)!;
      return row.seats.map((seat, i) => {
        const theta = angle + (i * Math.PI) / 2;
        const position: [number, number, number] = [
          table.position[0] + 0.9 * Math.cos(theta),
          table.position[1] + 0.9 * Math.sin(theta),
          0.2,
        ];
        return {
          ...seat,
          row: row.label,
          sectorId: bullpen.id,
          position,
          eye: [position[0], position[1], 1.35],
          facing: theta + Math.PI / 2,
          kind: "table",
        };
      });
    }
    const i = "ABCDEFG".indexOf(row.label),
      height = 0.2 + i * 0.22;
    return row.seats.map((seat, j) => {
      const position = local(
        (j - (row.seats.length - 1) / 2) * pitch,
        -(0.8 + i * 0.9),
        height,
      );
      return {
        ...seat,
        row: row.label,
        sectorId: bullpen.id,
        position,
        eye: [position[0], position[1], height + 1.15],
        facing: angle,
        kind: "chair",
      };
    });
  });
groups.push({ id: 2812, seats: bullpenSeats });
assert.equal(
  groups.reduce((n, g) => n + g.seats.length, 0),
  608,
);
const snapshot = {
  revision,
  catalogHash: createHash("sha256")
    .update(readFileSync("src/data/seat-catalog.json"))
    .digest("hex"),
  geometry: "approximate",
  reference: catalog.source.url,
  groups,
  platforms,
  bullpen: {
    origin,
    angle,
    rowCount: 7,
    rowPitch: 0.9,
    rowRise: 0.22,
    width: 7.2,
    tables,
  },
};
if (process.argv.includes("--verify")) {
  assert.deepEqual(
    JSON.parse(readFileSync("src/data/special-seat-layout.json", "utf8")),
    snapshot,
  );
  console.log(
    "Verified reproducible placements for all 608 previously unmapped seats.",
  );
} else {
  mkdirSync("src/data", { recursive: true });
  writeFileSync("src/data/special-seat-layout.json", JSON.stringify(snapshot));
  console.log(
    "Saved 608 VIP/balcony/bullpen placements, including 16 table seats.",
  );
}
