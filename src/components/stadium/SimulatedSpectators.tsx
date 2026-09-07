"use client";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Color, InstancedMesh, Matrix4, Object3D, Vector3 } from "three";
import { modelTransform, STADIUM_MODEL_URL } from "@/lib/stadium-model";
import type { SimulatedSeat } from "@/lib/seat-simulation";

const shirts = ["#195cb7", "#c63e49", "#e4d9c4", "#258276", "#e1a33b"];
const skins = ["#8b5035", "#ba805b", "#d6a77d", "#603c2b"];
const UP = new Vector3(0, 1, 0);
const PARTS = 10;

export function SimulatedSpectators({
  seats,
  animate,
}: {
  seats: SimulatedSeat[];
  animate: boolean;
}) {
  const { scene } = useGLTF(STADIUM_MODEL_URL);
  const transform = useMemo(() => modelTransform(scene), [scene]);
  const bodies = useRef<InstancedMesh>(null),
    heads = useRef<InstancedMesh>(null);
  const elapsed = useRef(0);
  const lastSeats = useRef<SimulatedSeat[] | null>(null);
  const helpers = useMemo(
    () => ({
      dummy: new Object3D(),
      root: new Object3D(),
      matrix: new Matrix4(),
      a: new Vector3(),
      b: new Vector3(),
      direction: new Vector3(),
      color: new Color(),
    }),
    [],
  );
  useFrame((_, delta) => {
    if (!bodies.current || !heads.current) return;
    if (!animate && lastSeats.current === seats) return;
    lastSeats.current = seats;
    if (animate) elapsed.current += Math.min(delta, 0.05);
    const { dummy, root, matrix, a, b, direction, color } = helpers;
    seats.forEach((seat, index) => {
      const p = transform.fromBlender(seat.position);
      const target = transform.fromBlender([0, -24, 0]);
      root.position.set(...p);
      root.rotation.set(0, Math.atan2(target[0] - p[0], target[2] - p[2]), 0);
      root.scale.setScalar(transform.scale);
      root.updateMatrix();
      const phase = (seat.id % 31) * 0.37;
      const wave = Math.max(0, Math.sin(elapsed.current * 1.5 + phase));
      const sway = 0.025 * Math.sin(elapsed.current * 1.1 + phase);
      const shirt = shirts[seat.id % shirts.length],
        skin = skins[seat.id % skins.length];
      const box = (
        part: number,
        x: number,
        y: number,
        z: number,
        sx: number,
        sy: number,
        sz: number,
        tint: string,
      ) => {
        dummy.position.set(x, y, z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(sx, sy, sz);
        dummy.updateMatrix();
        matrix.multiplyMatrices(root.matrix, dummy.matrix);
        bodies.current!.setMatrixAt(index * PARTS + part, matrix);
        bodies.current!.setColorAt(index * PARTS + part, color.set(tint));
      };
      const limb = (
        part: number,
        from: number[],
        to: number[],
        width: number,
        tint: string,
      ) => {
        a.set(...(from as [number, number, number]));
        b.set(...(to as [number, number, number]));
        direction.subVectors(b, a);
        dummy.position.copy(a).add(b).multiplyScalar(0.5);
        const length = direction.length();
        dummy.quaternion.setFromUnitVectors(UP, direction.normalize());
        dummy.scale.set(width, length, width);
        dummy.updateMatrix();
        matrix.multiplyMatrices(root.matrix, dummy.matrix);
        bodies.current!.setMatrixAt(index * PARTS + part, matrix);
        bodies.current!.setColorAt(index * PARTS + part, color.set(tint));
      };
      box(0, sway, 0.77, 0, 0.34, 0.49, 0.22, shirt);
      box(1, 0, 0.48, 0.11, 0.34, 0.17, 0.36, "#273448");
      box(2, -0.105, 0.25, 0.27, 0.12, 0.4, 0.12, "#273448");
      box(3, 0.105, 0.25, 0.27, 0.12, 0.4, 0.12, "#273448");
      box(4, -0.105, 0.055, 0.32, 0.14, 0.1, 0.24, "#ddd8cd");
      box(5, 0.105, 0.055, 0.32, 0.14, 0.1, 0.24, "#ddd8cd");
      for (const [side, start] of [
        [-1, 6],
        [1, 8],
      ]) {
        const raise = wave * (side === 1 ? 1 : 0.88);
        const shoulder = [sway + side * 0.19, 0.92, 0];
        const elbow = [
          sway + side * (0.23 + 0.12 * raise),
          0.69 + 0.57 * raise,
          0.1,
        ];
        const hand = [
          sway + side * (0.15 + 0.2 * raise),
          0.57 + 0.98 * raise,
          0.23 - 0.15 * raise,
        ];
        limb(start, shoulder, elbow, 0.105, shirt);
        limb(start + 1, elbow, hand, 0.085, skin);
        dummy.position.set(...(hand as [number, number, number]));
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(0.055, 0.075, 0.045);
        dummy.updateMatrix();
        matrix.multiplyMatrices(root.matrix, dummy.matrix);
        const handIndex = index * 3 + (side < 0 ? 1 : 2);
        heads.current!.setMatrixAt(handIndex, matrix);
        heads.current!.setColorAt(handIndex, color.set(skin));
      }
      dummy.position.set(sway, 1.13, 0.015);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(0.12, 0.15, 0.12);
      dummy.updateMatrix();
      matrix.multiplyMatrices(root.matrix, dummy.matrix);
      heads.current!.setMatrixAt(index * 3, matrix);
      heads.current!.setColorAt(index * 3, color.set(skin));
    });
    bodies.current.instanceMatrix.needsUpdate = true;
    heads.current.instanceMatrix.needsUpdate = true;
    if (bodies.current.instanceColor)
      bodies.current.instanceColor.needsUpdate = true;
    if (heads.current.instanceColor)
      heads.current.instanceColor.needsUpdate = true;
  });
  return (
    <>
      <instancedMesh
        key={`b-${seats.length}`}
        ref={bodies}
        args={[undefined, undefined, seats.length * PARTS]}
        frustumCulled={false}
      >
        <boxGeometry />
        <meshStandardMaterial roughness={0.9} />
      </instancedMesh>
      <instancedMesh
        key={`h-${seats.length}`}
        ref={heads}
        args={[undefined, undefined, seats.length * 3]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 10, 8]} />
        <meshStandardMaterial roughness={0.9} />
      </instancedMesh>
    </>
  );
}
