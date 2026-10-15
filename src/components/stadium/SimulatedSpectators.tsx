"use client";
import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Color, InstancedMesh, Matrix4, Object3D, Vector3 } from "three";
import { modelTransform, STADIUM_MODEL_URL } from "@/lib/stadium-model";
import { seatFacingAngle, type SimulatedSeat } from "@/lib/seat-simulation";

const shirts = ["#195cb7", "#c63e49", "#e4d9c4", "#258276", "#e1a33b"];
const skins = ["#8b5035", "#ba805b", "#d6a77d", "#603c2b"];
const UP = new Vector3(0, 1, 0);
const PARTS = 10;
const NEAR_COUNT = 320;
const SORT_EVERY = 0.22;
const INIT_BATCH = 1800;

// Seat ids are sequential along a row, so derive motion from a hash instead;
// otherwise neighbours raise their arms in lockstep like a stadium wave.
function unit(id: number, salt: number) {
  let h = Math.imul(id ^ salt, 2654435761) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0;
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
}

export function SimulatedSpectators({
  seats,
  animate,
}: {
  seats: SimulatedSeat[];
  animate: boolean;
}) {
  const { scene } = useGLTF(STADIUM_MODEL_URL);
  const transform = useMemo(() => modelTransform(scene), [scene]);
  const { camera, invalidate } = useThree();
  const placements = useMemo(() => {
    return seats.map((seat) => {
      const position = new Vector3(...transform.fromBlender(seat.position));
      const key = seat.id * 131 + seat.sectorId;
      return {
        position,
        yaw: Math.PI + seatFacingAngle(seat),
        phase: unit(key, 1) * Math.PI * 2,
        speed: 1.2 + unit(key, 2) * 0.9,
        // Roughly half cheer with arms overhead; the rest only shift and clap.
        cheers: unit(key, 3) < 0.55,
        lag: 0.15 + unit(key, 4) * 0.5,
        reach: 0.8 + unit(key, 5) * 0.2,
        shirt: shirts[seat.id % shirts.length],
        skin: skins[seat.id % skins.length],
        rest: 0.06 + 0.16 * unit(key, 6),
      };
    });
  }, [seats, transform]);
  const bodies = useRef<InstancedMesh>(null),
    heads = useRef<InstancedMesh>(null);
  const elapsed = useRef(0);
  const sortClock = useRef(0);
  const initAt = useRef(0);
  const lastSeats = useRef<SimulatedSeat[] | null>(null);
  const near = useRef<number[]>([]);
  const order = useRef<number[]>([]);
  const helpers = useMemo(
    () => ({
      dummy: new Object3D(),
      root: new Object3D(),
      matrix: new Matrix4(),
      hidden: new Matrix4().makeScale(0, 0, 0),
      a: new Vector3(),
      b: new Vector3(),
      direction: new Vector3(),
      color: new Color(),
    }),
    [],
  );

  function pose(
    index: number,
    raiseL: number,
    raiseR: number,
    sway: number,
    paint: boolean,
  ) {
    const { dummy, root, matrix, a, b, direction, color } = helpers;
    const { position, yaw, shirt, skin } = placements[index];
    root.position.copy(position);
    root.rotation.set(0, yaw, 0);
    root.scale.setScalar(transform.scale);
    root.updateMatrix();
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
      if (paint)
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
      if (paint)
        bodies.current!.setColorAt(index * PARTS + part, color.set(tint));
    };
    box(0, sway, 0.77, 0, 0.34, 0.49, 0.22, shirt);
    box(1, 0, 0.48, 0.11, 0.34, 0.17, 0.36, "#273448");
    box(2, -0.105, 0.25, 0.27, 0.12, 0.4, 0.12, "#273448");
    box(3, 0.105, 0.25, 0.27, 0.12, 0.4, 0.12, "#273448");
    box(4, -0.105, 0.055, 0.32, 0.14, 0.1, 0.24, "#ddd8cd");
    box(5, 0.105, 0.055, 0.32, 0.14, 0.1, 0.24, "#ddd8cd");
    for (const [side, start, raise] of [
      [-1, 6, raiseL],
      [1, 8, raiseR],
    ] as const) {
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
      if (paint) heads.current!.setColorAt(handIndex, color.set(skin));
    }
    dummy.position.set(sway, 1.13, 0.015);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(0.12, 0.15, 0.12);
    dummy.updateMatrix();
    matrix.multiplyMatrices(root.matrix, dummy.matrix);
    heads.current!.setMatrixAt(index * 3, matrix);
    if (paint) heads.current!.setColorAt(index * 3, color.set(skin));
  }

  useFrame((_, delta) => {
    if (!bodies.current || !heads.current) return;
    const reset = lastSeats.current !== seats;
    if (reset) {
      lastSeats.current = seats;
      initAt.current = 0;
      elapsed.current = 0;
      sortClock.current = SORT_EVERY;
      order.current = seats.map((_, i) => i);
      near.current = [];
      // InstancedMesh starts at identity, so hide every slot before posing
      // or thousands of boxes pile up at the world origin for a few frames.
      const { hidden } = helpers;
      for (let i = 0, n = seats.length * PARTS; i < n; i++)
        bodies.current.setMatrixAt(i, hidden);
      for (let i = 0, n = seats.length * 3; i < n; i++)
        heads.current.setMatrixAt(i, hidden);
      bodies.current.instanceMatrix.needsUpdate = true;
      heads.current.instanceMatrix.needsUpdate = true;
    }
    if (!animate && initAt.current >= seats.length) return;
    const dt = Math.min(delta, 0.05);
    if (initAt.current < seats.length) {
      const end = Math.min(seats.length, initAt.current + INIT_BATCH);
      for (let i = initAt.current; i < end; i++) {
        const rest = placements[i].rest;
        pose(i, rest, rest * 0.86, 0, true);
      }
      initAt.current = end;
      invalidate();
      bodies.current.instanceMatrix.needsUpdate = true;
      heads.current.instanceMatrix.needsUpdate = true;
      if (bodies.current.instanceColor)
        bodies.current.instanceColor.needsUpdate = true;
      if (heads.current.instanceColor)
        heads.current.instanceColor.needsUpdate = true;
      return;
    }
    if (!animate) return;
    elapsed.current += dt;
    sortClock.current += dt;
    const cam = camera.position;
    if (sortClock.current >= SORT_EVERY) {
      sortClock.current = 0;
      const ranked = order.current;
      ranked.sort((i, j) => {
        const a = placements[i].position,
          b = placements[j].position;
        const da = (a.x - cam.x) ** 2 + (a.y - cam.y) ** 2 + (a.z - cam.z) ** 2;
        const db = (b.x - cam.x) ** 2 + (b.y - cam.y) ** 2 + (b.z - cam.z) ** 2;
        return da - db;
      });
      const next = ranked.slice(0, Math.min(NEAR_COUNT, ranked.length));
      const keep = new Set(next);
      // Anyone leaving the animated set sits back down instead of freezing
      // with arms in the air.
      for (const index of near.current)
        if (!keep.has(index)) {
          const rest = placements[index].rest;
          pose(index, rest, rest * 0.86, 0, false);
        }
      near.current = next;
    }
    const t = elapsed.current;
    const up = (x: number) => Math.max(0, Math.sin(x)) ** 0.7;
    for (const index of near.current) {
      const { phase, speed, cheers, lag, reach, rest } = placements[index];
      const sway = 0.025 * Math.sin(t * speed * 0.7 + phase);
      let raiseL: number, raiseR: number;
      if (cheers) {
        // Up, hold briefly, down, pause — each person on their own clock.
        raiseL = rest + (reach - rest) * up(t * speed + phase);
        raiseR = rest + (reach - rest) * up(t * speed + phase - lag);
      } else {
        raiseL = rest + 0.12 * (0.5 + 0.5 * Math.sin(t * speed * 1.6 + phase));
        raiseR =
          rest + 0.12 * (0.5 + 0.5 * Math.sin(t * speed * 1.6 + phase + 0.6));
      }
      pose(index, raiseL, raiseR, sway, false);
    }
    bodies.current.instanceMatrix.needsUpdate = true;
    heads.current.instanceMatrix.needsUpdate = true;
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
        <meshLambertMaterial />
      </instancedMesh>
      <instancedMesh
        key={`h-${seats.length}`}
        ref={heads}
        args={[undefined, undefined, seats.length * 3]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 7, 6]} />
        <meshLambertMaterial />
      </instancedMesh>
    </>
  );
}
