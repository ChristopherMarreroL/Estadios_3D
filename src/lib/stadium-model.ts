import { Box3, Vector3, type Object3D } from "three";
import assets from "@/data/stadium-assets.json";

export const STADIUM_MODEL_URL = assets.detail.url;
export const STADIUM_MAP_URL = assets.map.url;
const transforms = new WeakMap<Object3D, ReturnType<typeof createTransform>>();
export function modelTransform(scene: Object3D) {
  let transform = transforms.get(scene);
  if (!transform) {
    transform = createTransform(scene);
    transforms.set(scene, transform);
  }
  return transform;
}
function createTransform(scene: Object3D) {
  // Both web assets retain the source bounds so cameras/seats never shift when
  // hidden geometry is removed or meshes are quantized during optimization.
  const saved = scene.userData.stadiumBounds;
  const bounds = saved
    ? new Box3(new Vector3(...saved.min), new Vector3(...saved.max))
    : new Box3().setFromObject(scene);
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
