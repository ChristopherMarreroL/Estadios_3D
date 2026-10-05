import { writeFileSync, mkdirSync } from "node:fs";
import layout from "../src/data/seat-layout.json";
import specialLayout from "../src/data/special-seat-layout.json";
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
  2279: "MAT_Seat_Red",
  2281: "MAT_Seat_Blue",
  2282: "MAT_Seat_Red",
  2283: "MAT_Seat_Blue",
  2812: "MAT_Seat_Blue",
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
  JSON.stringify({
    revision: specialLayout.revision,
    terraceRevision: layout.revision,
    groups,
  }),
);
writeFileSync(
  "artifacts/blender/dugout-a6-seats.json",
  JSON.stringify(
    groups
      .find((g) => g.id === 2287)!
      .seats.filter((seat) => seat.sectorId === 11608),
  ),
);
console.log(groups.map((g) => ({ group: g.id, seats: g.seats.length })));
