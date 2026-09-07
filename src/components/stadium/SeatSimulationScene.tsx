"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { Html, OrbitControls, useGLTF } from "@react-three/drei";
import { Vector3, Quaternion } from "three";
import { StadiumModel } from "./StadiumModel";
import { STADIUM_MODEL_URL, modelTransform } from "@/lib/stadium-model";
import type { SimulatedSeat } from "@/lib/seat-simulation";
import { SimulatedSpectators } from "./SimulatedSpectators";

function SeatCamera({
  seat,
  overview,
  reset,
  focusSeats,
  reducedMotion,
}: {
  seat: SimulatedSeat | null;
  overview: boolean;
  reset: number;
  focusSeats?: SimulatedSeat[];
  reducedMotion: boolean;
}) {
  const { scene } = useGLTF(STADIUM_MODEL_URL);
  const transform = useMemo(() => modelTransform(scene), [scene]);
  const { camera, gl, invalidate } = useThree();
  const flight = useRef<{
    start: Vector3;
    end: Vector3;
    from: Quaternion;
    to: Quaternion;
    elapsed: number;
  } | null>(null);
  useFrame((_, delta) => {
    const f = flight.current;
    if (!f) return;
    f.elapsed += delta;
    const t = Math.min(1, f.elapsed / 1.6);
    const eased = t * t * (3 - 2 * t);
    camera.position.lerpVectors(f.start, f.end, eased);
    camera.quaternion.slerpQuaternions(f.from, f.to, eased);
    if (t === 1) flight.current = null;
  });
  useEffect(() => {
    flight.current = null;
    if (!seat || overview) {
      if (focusSeats?.length) {
        const center = new Vector3();
        focusSeats.forEach((s) =>
          center.add(new Vector3(...transform.fromBlender(s.eye))),
        );
        center.divideScalar(focusSeats.length);
        const field = new Vector3(...transform.fromBlender([0, -15, 0]));
        const towardField = field.sub(center).normalize();
        const radius = Math.max(
          1,
          ...focusSeats.map((s) =>
            new Vector3(...transform.fromBlender(s.eye)).distanceTo(center),
          ),
        );
        camera.position.copy(center).addScaledVector(towardField, radius * 1.8);
        camera.position.add(new Vector3(0, 1.6, 0));
        camera.lookAt(center);
      } else {
        camera.position.set(0, 15, -13);
        camera.lookAt(0, 0, 2);
      }
      invalidate();
      return;
    }
    const eye = transform.fromBlender(seat.eye);
    const target = transform.fromBlender([0, -24, 1]);
    const start = camera.position.clone(),
      from = camera.quaternion.clone();
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
    if (!reducedMotion) {
      flight.current = {
        start,
        end: new Vector3(...eye),
        from,
        to: camera.quaternion.clone(),
        elapsed: 0,
      };
      camera.position.copy(start);
      camera.quaternion.copy(from);
    }
    const canvas = gl.domElement;
    const down = (e: PointerEvent) => {
      if (flight.current) return;
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
      if (flight.current) return;
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
  }, [
    camera,
    gl,
    invalidate,
    seat,
    overview,
    reset,
    transform,
    focusSeats,
    reducedMotion,
  ]);
  return !seat || overview ? (
    <OrbitControls
      makeDefault
      target={
        focusSeats?.length
          ? transform.fromBlender(
              focusSeats[Math.floor(focusSeats.length / 2)].eye,
            )
          : [0, 0, 2]
      }
      minDistance={2}
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
  selectionSectors = [],
  onSelectSector,
  focusSeats,
  reducedMotion = false,
}: {
  seat: SimulatedSeat | null;
  overview: boolean;
  reset: number;
  spectators: SimulatedSeat[];
  animateSpectators: boolean;
  selectionSectors?: { id: number; name: string; seats: SimulatedSeat[] }[];
  onSelectSector?: (id: number) => void;
  focusSeats?: SimulatedSeat[];
  reducedMotion?: boolean;
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
        <SectorChoices sectors={selectionSectors} onChoose={onSelectSector} />
        <SeatCamera
          seat={seat}
          overview={overview}
          reset={reset}
          focusSeats={focusSeats}
          reducedMotion={reducedMotion}
        />
      </Suspense>
    </Canvas>
  );
}

function SectorChoices({
  sectors,
  onChoose,
}: {
  sectors: { id: number; name: string; seats: SimulatedSeat[] }[];
  onChoose?: (id: number) => void;
}) {
  const { scene } = useGLTF(STADIUM_MODEL_URL);
  const transform = useMemo(() => modelTransform(scene), [scene]);
  return (
    <>
      {sectors
        .filter((s) => s.seats.length)
        .map((sector, index) => {
          const center: [number, number, number] = [0, 0, 0];
          sector.seats.forEach((s) =>
            s.position.forEach(
              (v, i) => (center[i] += v / sector.seats.length),
            ),
          );
          center[2] += 0.8 + (index % 2) * 2.5;
          return (
            <Html
              key={sector.id}
              position={transform.fromBlender(center)}
              center
              zIndexRange={[20, 0]}
            >
              <button
                aria-label={`Elegir sector ${sector.name}`}
                onClick={() => onChoose?.(sector.id)}
                className="rounded border border-white/60 bg-[#071323]/90 px-1.5 py-1 text-[10px] font-bold whitespace-nowrap text-[#f6cc7c] shadow-md hover:bg-[#f6cc7c] hover:text-[#071323] focus:bg-[#f6cc7c] focus:text-[#071323]"
              >
                {sector.name.replace("PALCO - ", "").replace("PALCO ", "")}
              </button>
            </Html>
          );
        })}
    </>
  );
}
