"use client";

import { Suspense, useEffect, useMemo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { Vector3 } from "three";
import { StadiumModel } from "./StadiumModel";
import { STADIUM_MODEL_URL, modelTransform } from "@/lib/stadium-model";
import type { SimulatedSeat } from "@/lib/seat-simulation";
import { SimulatedSpectators } from "./SimulatedSpectators";

function SeatCamera({
  seat,
  overview,
  reset,
}: {
  seat: SimulatedSeat | null;
  overview: boolean;
  reset: number;
}) {
  const { scene } = useGLTF(STADIUM_MODEL_URL);
  const transform = useMemo(() => modelTransform(scene), [scene]);
  const { camera, gl, invalidate } = useThree();
  useEffect(() => {
    if (!seat || overview) {
      camera.position.set(0, 12, -15);
      camera.lookAt(0, 0, 0);
      invalidate();
      return;
    }
    const eye = transform.fromBlender(seat.eye);
    const target = transform.fromBlender([0, -24, 1]);
    camera.position.set(...eye);
    const direction = new Vector3(...target).sub(camera.position).normalize();
    let yaw = Math.atan2(direction.x, direction.z),
      pitch = Math.asin(direction.y);
    let dragging = false,
      lastX = 0,
      lastY = 0;
    const aim = () => {
      camera.lookAt(
        eye[0] + Math.sin(yaw) * Math.cos(pitch),
        eye[1] + Math.sin(pitch),
        eye[2] + Math.cos(yaw) * Math.cos(pitch),
      );
      invalidate();
    };
    aim();
    const canvas = gl.domElement;
    const down = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      yaw -= (e.clientX - lastX) * 0.004;
      pitch = Math.max(
        -1.1,
        Math.min(1.1, pitch + (e.clientY - lastY) * 0.004),
      );
      lastX = e.clientX;
      lastY = e.clientY;
      aim();
    };
    const up = () => {
      dragging = false;
    };
    const key = (e: KeyboardEvent) => {
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key))
        return;
      e.preventDefault();
      yaw += e.key === "ArrowLeft" ? 0.08 : e.key === "ArrowRight" ? -0.08 : 0;
      pitch = Math.max(
        -1.1,
        Math.min(
          1.1,
          pitch +
            (e.key === "ArrowUp" ? 0.08 : e.key === "ArrowDown" ? -0.08 : 0),
        ),
      );
      aim();
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("keydown", key);
    return () => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("keydown", key);
    };
  }, [camera, gl, invalidate, seat, overview, reset, transform]);
  return !seat || overview ? (
    <OrbitControls
      makeDefault
      target={[0, 0, 0]}
      minDistance={5}
      maxDistance={45}
      maxPolarAngle={Math.PI / 2.02}
    />
  ) : null;
}

function SectorMarker({
  selected,
  overview,
}: {
  selected: SimulatedSeat | null;
  overview: boolean;
}) {
  const { scene } = useGLTF(STADIUM_MODEL_URL);
  const transform = useMemo(() => modelTransform(scene), [scene]);
  return selected && overview ? (
    <mesh position={transform.fromBlender(selected.eye)}>
      <sphereGeometry args={[0.14, 16, 12]} />
      <meshBasicMaterial color="#ff773e" />
    </mesh>
  ) : null;
}

export function SeatSimulationScene({
  seat,
  overview,
  reset,
  spectators,
  animateSpectators,
}: {
  seat: SimulatedSeat | null;
  overview: boolean;
  reset: number;
  spectators: SimulatedSeat[];
  animateSpectators: boolean;
}) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 12, -15], fov: 60, near: 0.008, far: 150 }}
      gl={{ antialias: true }}
      onCreated={({ gl }) => {
        gl.domElement.tabIndex = 0;
        gl.domElement.setAttribute(
          "aria-label",
          "Vista 3D: arrastra o usa las flechas para mirar desde la butaca",
        );
      }}
    >
      <color attach="background" args={["#a8c7db"]} />
      <hemisphereLight args={["#e5f3ff", "#7c7058", 2]} />
      <directionalLight position={[-12, 25, 5]} intensity={2.5} />
      <Suspense fallback={null}>
        <StadiumModel />
        <SectorMarker selected={seat} overview={overview} />
        <SimulatedSpectators seats={spectators} animate={animateSpectators} />
        <SeatCamera seat={seat} overview={overview} reset={reset} />
      </Suspense>
    </Canvas>
  );
}
