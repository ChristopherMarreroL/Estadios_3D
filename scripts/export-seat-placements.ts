import { writeFileSync, mkdirSync } from "node:fs";
import catalog from "../src/data/seat-catalog.json";
import { simulateSector } from "../src/lib/seat-simulation";
mkdirSync("artifacts/blender/phase2-20260907", { recursive: true });
const colors: Record<number, string> = {
  2287: "MAT_Seat_Yellow",
  2288: "MAT_Seat_Red",
  2289: "MAT_Seat_Red",
  2275: "MAT_Corporate_Green",
  2276: "MAT_Seat_Blue",
  2278: "MAT_Seat_Blue",
};
const groups = catalog.groups
  .filter((g) => colors[g.id])
  .map((g) => ({
    id: g.id,
    material: colors[g.id],
    seats: g.sectors.flatMap((s) => simulateSector(g.id, s)),
  }));
writeFileSync(
  "artifacts/blender/phase2-20260907/seat-placements.json",
  JSON.stringify({ revision: "20260907-phase2", groups }),
);
console.log(groups.map((g) => ({ group: g.id, seats: g.seats.length })));
