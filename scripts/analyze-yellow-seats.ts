import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import catalog from "../src/data/seat-catalog.json";
import { simulateSector } from "../src/lib/seat-simulation";
const group = catalog.groups.find((g) => g.id === 2287)!;
const blocks = group.sectors.map((sector) => ({
  sector,
  seats: simulateSector(group.id, sector),
}));
const distances = blocks.flatMap(({ sector, seats }) =>
  sector.rows.flatMap((row) => {
    const items = seats.filter((s) => s.row === row.label);
    return items
      .slice(1)
      .map((s, i) => ({
        sector: sector.name,
        row: row.label,
        from: items[i].label,
        to: s.label,
        metres: Math.hypot(
          ...s.position.map((n, k) => n - items[i].position[k]),
        ),
      }));
  }),
);
const centers = blocks.map(({ sector, seats }) => ({
  sector: sector.name,
  x: seats.reduce((n, s) => n + s.position[0], 0) / seats.length,
  startsAt: sector.rows[0].label,
  firstHeight: seats[0].position[2],
}));
const heights = new Map<string, number[]>();
for (const { seats } of blocks)
  for (const seat of seats) {
    const values = heights.get(seat.row) ?? [];
    values.push(seat.position[2]);
    heights.set(seat.row, values);
  }
const heightRanges = [...heights].map(([row, values]) => ({
  row,
  min: Math.min(...values),
  max: Math.max(...values),
}));
const rawText = readFileSync(
  "artifacts/uepa-reference/plano-sala.js.txt",
  "utf8",
);
type SourceSector = {
  idZona: number;
  butacas?: { litFila: string; litButaca: string; idButaca: number }[];
};
const archived: SourceSector[] = JSON.parse(
  rawText.slice(rawText.indexOf("["), rawText.lastIndexOf("]") + 1),
);
const mismatches: string[] = [];
for (const { sector } of blocks) {
  const official = archived.find((s) => s.idZona === sector.id)!;
  const local = sector.rows
    .flatMap((r) => r.seats.map((s) => `${r.label}:${s.label}:${s.id}`))
    .sort();
  const source = official
    .butacas!.map((s) => `${s.litFila}:${s.litButaca}:${s.idButaca}`)
    .sort();
  if (JSON.stringify(local) !== JSON.stringify(source))
    mismatches.push(sector.name);
}
const all = blocks.flatMap((b) => b.seats);
let near = 0,
  minimum = Infinity;
for (let i = 0; i < all.length; i++)
  for (let j = i + 1; j < all.length; j++) {
    const d = Math.hypot(
      ...all[i].position.map((n, k) => n - all[j].position[k]),
    );
    minimum = Math.min(minimum, d);
    if (d < 0.52 - 1e-6) near++;
  }
const report = {
  reference:
    "https://licey.uepatickets.com/beisbol/en/comprarEvento?idEvento=2248",
  referenceCatalog:
    "archived September 2026 public UEPA catalogue; live map visually checked October 5",
  sectors: blocks.length,
  seats: all.length,
  catalogMismatches: mismatches,
  centers,
  heightRanges,
  minimumDistance: minimum,
  pairsBelow52cm: near,
  minInRowSpacing: Math.min(...distances.map((d) => d.metres)),
  maxInRowSpacing: Math.max(...distances.map((d) => d.metres)),
  rowBreaksOver2m: distances.filter((d) => d.metres > 2),
  sectorsStartingAtD: centers.filter((c) => c.startsAt === "D"),
};
mkdirSync("artifacts/blender/yellow-seats-audit-20261005", { recursive: true });
writeFileSync(
  "artifacts/blender/yellow-seats-audit-20261005/checks.json",
  JSON.stringify(report, null, 2),
);
console.log(
  JSON.stringify(
    {
      ...report,
      centers: [centers[0], centers.at(-1)],
      rowBreaksOver2m: {
        count: report.rowBreaksOver2m.length,
        sectors: [...new Set(report.rowBreaksOver2m.map((d) => d.sector))],
        examples: report.rowBreaksOver2m.slice(0, 3),
      },
      sectorsStartingAtD: report.sectorsStartingAtD.map((c) => c.sector),
    },
    null,
    2,
  ),
);
