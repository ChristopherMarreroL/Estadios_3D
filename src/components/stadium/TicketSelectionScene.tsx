"use client";
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  Canvas,
  useFrame,
  useThree,
  type ThreeEvent,
} from "@react-three/fiber";
import { Html, OrbitControls, useGLTF } from "@react-three/drei";
import {
  Box3,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  InstancedMesh,
  Object3D,
  Vector3,
  DoubleSide,
} from "three";
import type { OrbitControls as Controls } from "three-stdlib";
import { modelTransform, STADIUM_MODEL_URL } from "@/lib/stadium-model";
import {
  availableCount,
  ticketSectors,
  type TicketSeat,
  type TicketSector,
} from "@/lib/ticket-inventory";

type Props = {
  sector: TicketSector | null;
  selected: string[];
  onSector: (s: TicketSector) => void;
  onSeat: (s: TicketSeat) => void;
  onHover: (label: string) => void;
  reset: number;
  roof: boolean;
  reducedMotion: boolean;
  paused?: boolean;
};
type Point = { x: number; y: number; z: number };
function hull(points: Point[]) {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (a: Point, b: Point, c: Point) =>
    (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const half = (items: Point[]) => {
    const result: Point[] = [];
    for (const p of items) {
      while (result.length > 1 && cross(result.at(-2)!, result.at(-1)!, p) <= 0)
        result.pop();
      result.push(p);
    }
    return result;
  };
  return [...half(sorted).slice(0, -1), ...half(sorted.reverse()).slice(0, -1)];
}

function Content({
  sector,
  selected,
  onSector,
  onSeat,
  onHover,
  reset,
  roof,
  reducedMotion,
}: Props) {
  const { scene } = useGLTF(STADIUM_MODEL_URL);
  const transform = useMemo(() => modelTransform(scene), [scene]);
  const { camera, size } = useThree();
  const controls = useRef<Controls>(null);
  const labels = useRef(new Map<number, HTMLButtonElement>());
  const bases = useRef<InstancedMesh>(null),
    backs = useRef<InstancedMesh>(null);
  const flight = useRef<{
    from: Vector3;
    to: Vector3;
    fromTarget: Vector3;
    target: Vector3;
    time: number;
  } | null>(null);
  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.scale.setScalar(transform.scale);
    clone.position.set(...transform.offset);
    clone.traverse((o) => {
      if (
        o.name.startsWith("catalog_seats_") ||
        /^A6_\d+_(shell|support|bolts|number)/.test(o.name)
      )
        o.visible = false;
      if (!roof && /roof|press_box/i.test(o.name)) o.visible = false;
    });
    return clone;
  }, [scene, transform, roof]);
  const regions = useMemo(
    () =>
      ticketSectors.map((s) => {
        const points = s.seats.flatMap((seat) =>
          [-0.23, 0.23].flatMap((dx) =>
            [-0.23, 0.23].map((dy) => ({
              x: seat.simulation.position[0] + dx,
              y: seat.simulation.position[1] + dy,
              z: seat.simulation.position[2] + 1.03,
            })),
          ),
        );
        const outline = hull(points);
        const geometry = new BufferGeometry();
        const vertices = outline.flatMap((p) =>
          transform.fromBlender([p.x, p.y, p.z]),
        );
        const indices = [];
        for (let i = 1; i < outline.length - 1; i++) indices.push(0, i, i + 1);
        geometry.setAttribute(
          "position",
          new Float32BufferAttribute(vertices, 3),
        );
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        const bounds = new Box3().setFromBufferAttribute(
          geometry.getAttribute("position") as Float32BufferAttribute,
        );
        return {
          sector: s,
          geometry,
          center: bounds.getCenter(new Vector3()),
          labelPosition: new Vector3(
            bounds.getCenter(new Vector3()).x,
            bounds.max.y + 0.12,
            bounds.getCenter(new Vector3()).z,
          ),
          radius: bounds.getSize(new Vector3()).length() / 2,
        };
      }),
    [transform],
  );
  useEffect(
    () => () => regions.forEach((r) => r.geometry.dispose()),
    [regions],
  );
  const allSeats = useMemo(
    () =>
      ticketSectors.flatMap((s) =>
        s.seats.map((seat) => ({ seat, color: s.category.color })),
      ),
    [],
  );
  useLayoutEffect(() => {
    if (!bases.current || !backs.current) return;
    const dummy = new Object3D();
    const color = new Color();
    allSeats.forEach(({ seat, color: category }, i) => {
      const pos = seat.simulation.position;
      const yaw = Math.atan2(-pos[0], -24 - pos[1]);
      dummy.position.set(
        ...transform.fromBlender([pos[0], pos[1], pos[2] + 0.46]),
      );
      dummy.rotation.set(0, Math.PI - yaw, 0);
      dummy.scale.setScalar(transform.scale);
      dummy.updateMatrix();
      bases.current!.setMatrixAt(i, dummy.matrix);
      const behindX = -Math.sin(yaw) * 0.19,
        behindY = -Math.cos(yaw) * 0.19;
      dummy.position.set(
        ...transform.fromBlender([
          pos[0] + behindX,
          pos[1] + behindY,
          pos[2] + 0.72,
        ]),
      );
      dummy.updateMatrix();
      backs.current!.setMatrixAt(i, dummy.matrix);
      color.set(
        selected.includes(seat.key)
          ? "#122a46"
          : seat.available
            ? category
            : "#b6c0c6",
      );
      bases.current!.setColorAt(i, color);
      backs.current!.setColorAt(i, color);
    });
    for (const mesh of [bases.current, backs.current]) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }, [allSeats, selected, transform]);
  useEffect(() => {
    const control = controls.current;
    if (!control) return;
    let target = new Vector3(0, 1, 3),
      end = new Vector3(0, 34, 11);
    if (!sector && size.width < size.height) {
      end = target
        .clone()
        .add(end.sub(target).multiplyScalar(size.height / size.width));
    }
    if (sector) {
      const region = regions.find((r) => r.sector.id === sector.id)!;
      target = region.center.clone();
      const direction = new Vector3(...transform.fromBlender([0, -24, 0])).sub(
        target,
      );
      direction.y = 0;
      direction.normalize();
      const radius = Math.max(region.radius, 0.3);
      const aspect = Math.min(1, size.width / size.height);
      const distance =
        (radius / Math.sin(Math.atan(Math.tan(Math.PI / 8) * aspect))) * 1.2;
      end = target
        .clone()
        .addScaledVector(direction, distance * 0.48)
        .add(new Vector3(0, distance * 0.88, 0));
    }
    if (reducedMotion) {
      camera.position.copy(end);
      control.target.copy(target);
      control.update();
      flight.current = null;
    } else
      flight.current = {
        from: camera.position.clone(),
        to: end,
        fromTarget: control.target.clone(),
        target,
        time: 0,
      };
  }, [
    sector,
    reset,
    regions,
    camera,
    reducedMotion,
    size.width,
    size.height,
    transform,
  ]);
  useFrame((_, delta) => {
    const occupied: { x: number; y: number; width: number; height: number }[] =
      [];
    const ordered = [...regions].sort(
      (a, b) =>
        Number(b.sector.id === sector?.id) - Number(a.sector.id === sector?.id),
    );
    for (const r of ordered) {
      const element = labels.current.get(r.sector.id);
      if (!element) continue;
      const p = (sector ? r.labelPosition : r.center).clone().project(camera);
      const x = ((p.x + 1) * size.width) / 2,
        y = ((1 - p.y) * size.height) / 2;
      const width = element.offsetWidth + 4,
        height = element.offsetHeight + 3;
      const hidden =
        p.z > 1 ||
        occupied.some(
          (b) =>
            Math.abs(b.x - x) < (b.width + width) / 2 &&
            Math.abs(b.y - y) < (b.height + height) / 2,
        );
      element.style.visibility = hidden ? "hidden" : "visible";
      if (!hidden) occupied.push({ x, y, width, height });
    }
    const f = flight.current;
    if (!f || !controls.current) return;
    f.time = Math.min(1, f.time + delta / 1.1);
    const t = f.time * f.time * (3 - 2 * f.time);
    camera.position.lerpVectors(f.from, f.to, t);
    controls.current.target.lerpVectors(f.fromTarget, f.target, t);
    controls.current.update();
    if (f.time === 1) flight.current = null;
  });
  function seatClick(e: ThreeEvent<MouseEvent>) {
    if (e.delta > 5 || e.instanceId === undefined) return;
    e.stopPropagation();
    const seat = allSeats[e.instanceId].seat;
    if (!sector) {
      onSector(ticketSectors.find((s) => s.id === seat.sectorId)!);
      return;
    }
    onSeat(seat);
  }
  function seatHover(e: ThreeEvent<PointerEvent>) {
    if (e.instanceId === undefined) return;
    e.stopPropagation();
    const s = allSeats[e.instanceId].seat;
    onHover(
      `${s.sector} · Fila ${s.row} · Butaca ${s.label} · ${s.available ? "Disponible" : "Agotada"}`,
    );
  }
  const nearby = sector
    ? regions.filter(
        (r) =>
          r.sector.id === sector.id ||
          r.center.distanceTo(
            regions.find((r) => r.sector.id === sector.id)!.center,
          ) < 1.2,
      )
    : regions;
  return (
    <>
      <primitive object={model} />
      <instancedMesh
        ref={bases}
        args={[undefined, undefined, allSeats.length]}
        onClick={seatClick}
        onPointerMove={seatHover}
        onPointerOut={() => onHover("")}
      >
        <boxGeometry args={[0.34, 0.12, 0.35]} />
        <meshStandardMaterial roughness={0.72} />
      </instancedMesh>
      <instancedMesh
        ref={backs}
        args={[undefined, undefined, allSeats.length]}
        onClick={seatClick}
        onPointerMove={seatHover}
        onPointerOut={() => onHover("")}
      >
        <boxGeometry args={[0.34, 0.4, 0.065]} />
        <meshStandardMaterial roughness={0.72} />
      </instancedMesh>
      {!sector &&
        regions.map((r) => {
          const count = availableCount(r.sector, selected);
          return (
            <mesh
              key={r.sector.id}
              geometry={r.geometry}
              onClick={(e) => {
                if (e.delta > 5) return;
                e.stopPropagation();
                onSector(r.sector);
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                onHover(
                  `${r.sector.label} · ${count} de ${r.sector.seats.length} disponibles`,
                );
              }}
              onPointerOut={() => onHover("")}
            >
              <meshBasicMaterial
                color={count ? r.sector.category.color : "#b6c0c6"}
                transparent
                opacity={
                  count ? 0.38 + (0.55 * count) / r.sector.seats.length : 0.9
                }
                side={DoubleSide}
                depthWrite={false}
              />
            </mesh>
          );
        })}
      {nearby.map((r) => {
        const count = availableCount(r.sector, selected);
        return (
          <Html
            key={r.sector.id}
            position={sector ? r.labelPosition : r.center}
            center
            zIndexRange={[12, 0]}
          >
            <button
              ref={(element) => {
                if (element) labels.current.set(r.sector.id, element);
                else labels.current.delete(r.sector.id);
              }}
              className={`sector-tag ${sector ? "sector-tag-detail" : ""}`}
              style={{
                borderColor: count ? r.sector.category.color : "#9ea9af",
              }}
              aria-label={`${r.sector.label}, ${count} disponibles, demostración`}
              title={`${r.sector.category.name} · ${count} disponibles`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onSector(r.sector);
              }}
            >
              {r.sector.label}
              {sector && <small>{count} libres</small>}
            </button>
          </Html>
        );
      })}
      {sector &&
        [...new Set(sector.seats.map((s) => s.row))].map((row) => {
          const first = sector.seats.find((s) => s.row === row)!;
          const p = first.simulation.position;
          const peer = sector.seats.filter((s) => s.row === row).at(-1)!;
          const direction = new Vector3(
            p[0] - peer.simulation.position[0],
            p[1] - peer.simulation.position[1],
            0,
          ).normalize();
          return (
            <Html
              key={row}
              position={transform.fromBlender([
                p[0] + direction.x * 0.4,
                p[1] + direction.y * 0.4,
                p[2] + 0.6,
              ])}
              center
              zIndexRange={[10, 0]}
              style={{ pointerEvents: "none" }}
            >
              <span className="row-tag">{row}</span>
            </Html>
          );
        })}
      {selected.map((key) => {
        const seat = allSeats.find((s) => s.seat.key === key)?.seat;
        if (!seat) return null;
        return (
          <Html
            key={key}
            position={transform.fromBlender(seat.simulation.eye)}
            center
            zIndexRange={[14, 0]}
            style={{ pointerEvents: "none" }}
          >
            <span className="selected-pin">✓</span>
          </Html>
        );
      })}
      <OrbitControls
        ref={controls}
        makeDefault
        enableDamping
        minDistance={0.3}
        maxDistance={45}
        maxPolarAngle={Math.PI / 2.05}
        onStart={() => {
          flight.current = null;
        }}
      />
    </>
  );
}
export function TicketSelectionScene(props: Props) {
  return (
    <Canvas
      frameloop={props.paused ? "never" : "always"}
      dpr={[1, 2]}
      camera={{ position: [0, 28, 16], fov: 45, near: 0.008, far: 150 }}
      // Preserve depth precision for closely layered turf/clay at aerial zoom.
      gl={{ antialias: true, logarithmicDepthBuffer: true }}
      onCreated={({ gl }) => {
        gl.domElement.tabIndex = 0;
        gl.domElement.setAttribute(
          "aria-label",
          "Estadio 3D: selecciona un sector o una butaca. También puedes usar la lista accesible.",
        );
      }}
    >
      <color attach="background" args={["#e4edf1"]} />
      <hemisphereLight args={["#ffffff", "#82918c", 2.6]} />
      <directionalLight position={[-12, 25, 5]} intensity={2.2} />
      <Suspense
        fallback={
          <Html center>
            <div className="scene-loading">Preparando el estadio 3D…</div>
          </Html>
        }
      >
        <Content {...props} />
      </Suspense>
    </Canvas>
  );
}
