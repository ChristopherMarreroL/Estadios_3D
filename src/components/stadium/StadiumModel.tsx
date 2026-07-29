"use client";
import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { Box3, Mesh, Vector3 } from "three";

const MODEL_URL = "/models/estadio-quisqueya.glb?v=20260729-1";
const MODEL_SIZE = 28;

export function StadiumModel() {
  const { scene } = useGLTF(MODEL_URL);
  const model = useMemo(() => {
    const clone = scene.clone(true);
    const bounds = new Box3().setFromObject(clone);
    const size = bounds.getSize(new Vector3());
    const center = bounds.getCenter(new Vector3());
    const scale = MODEL_SIZE / Math.max(size.x, size.y, size.z);

    clone.scale.setScalar(scale);
    clone.position.set(
      -center.x * scale,
      -bounds.min.y * scale,
      -center.z * scale,
    );
    clone.traverse((object) => {
      if (object instanceof Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });

    return clone;
  }, [scene]);

  return <primitive object={model} />;
}

useGLTF.preload(MODEL_URL);
