"use client";
import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { Mesh } from "three";
import { STADIUM_MODEL_URL, modelTransform } from "@/lib/stadium-model";

const MODEL_URL = STADIUM_MODEL_URL;

export function StadiumModel() {
  const { scene } = useGLTF(MODEL_URL);
  const model = useMemo(() => {
    const clone = scene.clone(true);
    const { scale, offset } = modelTransform(scene);
    clone.scale.setScalar(scale);
    clone.position.set(...offset);
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
