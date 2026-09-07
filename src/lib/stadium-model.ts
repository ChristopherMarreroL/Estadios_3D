import { Box3, Vector3, type Object3D } from "three";

export const STADIUM_MODEL_URL =
  "/models/estadio-quisqueya.glb?v=20260907-phase3-final";
export function modelTransform(scene: Object3D) {
  const bounds = new Box3().setFromObject(scene);
  const size = bounds.getSize(new Vector3());
  const center = bounds.getCenter(new Vector3());
  const scale = 28 / Math.max(size.x, size.y, size.z);
  const offset: [number, number, number] = [
    -center.x * scale,
    -bounds.min.y * scale,
    -center.z * scale,
  ];
  return {
    scale,
    offset,
    fromBlender: (p: readonly number[]): [number, number, number] => [
      p[0] * scale + offset[0],
      p[2] * scale + offset[1],
      -p[1] * scale + offset[2],
    ],
  };
}
