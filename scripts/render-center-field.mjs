import sharp from "sharp";
import { mkdir } from "node:fs/promises";

await mkdir("artifacts/center-field", { recursive: true });
await sharp("public/textures/center-field-facade.svg")
  .png()
  .toFile("artifacts/center-field/facade.png");
await sharp(
  Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="128"><text x="128" y="98" text-anchor="middle" font-family="Arial,sans-serif" font-size="108" font-weight="700" fill="#edc837">411</text></svg>',
  ),
)
  .png()
  .toFile("artifacts/center-field/distance.png");
