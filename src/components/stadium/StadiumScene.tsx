"use client";
import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";

import { CameraController } from "./CameraController";
import { StadiumModel } from "./StadiumModel";
function Scene() {
  return (
    <>
      <color attach="background" args={["#03070f"]} />
      <fog attach="fog" args={["#03070f", 22, 55]} />
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[0, 18, 12]}
        intensity={1.8}
        color="#d6e2ff"
        castShadow
      />
      <StadiumModel />
      <CameraController />
    </>
  );
}
export function StadiumScene() {
  const webgl = useMemo(() => {
    try {
      const canvas = document.createElement("canvas");
      return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
    } catch {
      return false;
    }
  }, []);
  if (!webgl)
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <p className="max-w-sm text-sm text-white/70">
          WebGL no está disponible. Usa la lista de secciones para continuar.
        </p>
      </div>
    );
  return (
    <Canvas
      dpr={[1, 1.5]}
      shadows="percentage"
      camera={{ position: [0, 24, -30], fov: 42, near: 0.1, far: 120 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      <Suspense fallback={null}>
        <Scene />
      </Suspense>
    </Canvas>
  );
}
