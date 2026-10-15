"use client";
import {
  memo,
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PerspectiveCamera,
  Vector3,
  DoubleSide,
  type Intersection,
  type Raycaster,
} from "three";
import type { OrbitControls as Controls } from "three-stdlib";
import { MapLoading } from "./MapLoading";
import { seatFacingAngle, seatRowLabel } from "@/lib/seat-simulation";
import { modelTransform, STADIUM_MAP_URL } from "@/lib/stadium-model";
import {
  availableCount,
  ticketSectors,
  type TicketSeat,
  type TicketSector,
  type TicketZone,
} from "@/lib/ticket-inventory";
import {
  sectorOutlineLoops,
  zoneOutlineLoops,
  type OutlinePoint,
} from "@/lib/zone-outline";

type Props = {
  zone: TicketZone | null;
  onZone: (zone: TicketZone) => void;
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
function cameraRequestId({
  zone,
  sector,
  reset,
  reducedMotion,
}: Pick<Props, "zone" | "sector" | "reset" | "reducedMotion">) {
  return `${zone?.key ?? ""}|${sector?.id ?? ""}|${reset}|${reducedMotion ? 1 : 0}`;
}
function miterOffsets(loop: OutlinePoint[], half: number) {
  const count = loop.length;
  return loop.map((point, index) => {
    const previous = loop[(index + count - 1) % count];
    const next = loop[(index + 1) % count];
    const first = normalize(point.x - previous.x, point.y - previous.y);
    const second = normalize(next.x - point.x, next.y - point.y);
    const leftA = { x: -first.y, y: first.x };
    const leftB = { x: -second.y, y: second.x };
    let x = leftA.x + leftB.x;
    let y = leftA.y + leftB.y;
    const length = Math.hypot(x, y);
    if (length < 1e-5) return { x: leftA.x * half, y: leftA.y * half };
    x /= length;
    y /= length;
    const alignment = Math.max(0.4, x * leftA.x + y * leftA.y);
    const scale = Math.min(1.8, 1 / alignment) * half;
    return { x: x * scale, y: y * scale };
  });
}
function ribbonGeometry(
  loops: OutlinePoint[][],
  fromBlender: (point: [number, number, number]) => [number, number, number],
  halfWidth: number,
) {
  const geometry = new BufferGeometry();
  const positions: number[] = [];
  const indices: number[] = [];
  for (const loop of loops) {
    const base = positions.length / 3;
    const offsets = miterOffsets(loop, halfWidth);
    loop.forEach((point, index) => {
      positions.push(
        ...fromBlender([
          point.x + offsets[index].x,
          point.y + offsets[index].y,
          point.z,
        ]),
        ...fromBlender([
          point.x - offsets[index].x,
          point.y - offsets[index].y,
          point.z,
        ]),
      );
    });
    for (let index = 0; index < loop.length; index++) {
      const next = (index + 1) % loop.length;
      const a = base + index * 2;
      const b = a + 1;
      const c = base + next * 2;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}
function normalize(x: number, y: number) {
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
}
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
  zone,
  onZone,
  sector,
  selected,
  onSector,
  onSeat,
  onHover,
  reset,
  roof,
  reducedMotion,
}: Props) {
  const { scene } = useGLTF(STADIUM_MAP_URL);
  const transform = useMemo(() => modelTransform(scene), [scene]);
  const { camera, size, invalidate, gl } = useThree();
  const controls = useRef<Controls>(null);
  const labels = useRef(new Map<number, HTMLButtonElement>());
  const zoneLabels = useRef(new Map<string, HTMLButtonElement>());
  const flightToken = useRef(0);
  const requestId = cameraRequestId({ zone, sector, reset, reducedMotion });
  const flightId = `${zone?.key ?? ""}|${sector?.id ?? ""}|${reset}|${size.width}x${size.height}|${reducedMotion ? 1 : 0}`;
  const [settledOutline, setSettledOutline] = useState<{
    id: string;
    key: string | null;
  } | null>(null);
  const outlineKey = reducedMotion
    ? zone && !sector
      ? zone.key
      : null
    : settledOutline?.id === flightId
      ? settledOutline.key
      : null;
  const focusedIds = useMemo(
    () => new Set(sector ? [sector.id] : zone?.sectorIds || []),
    [sector, zone],
  );
  const cursor = (value: string) => {
    if (gl.domElement.style.cursor !== value)
      gl.domElement.style.setProperty("cursor", value);
  };
  useEffect(() => {
    const previous = gl.domElement.style.cursor;
    gl.domElement.style.setProperty("cursor", "grab");
    return () => {
      gl.domElement.style.setProperty("cursor", previous);
    };
  }, [gl]);
  useEffect(() => {
    gl.domElement.style.setProperty("cursor", "grab");
  }, [gl, sector?.id, zone?.key]);
  const dragging = useRef(false);
  const pendingSeat = useRef<TicketSeat | null>(null);
  const confirmSeat = useRef(onSeat);
  useLayoutEffect(() => {
    confirmSeat.current = onSeat;
  }, [onSeat]);
  const bases = useRef<InstancedMesh>(null),
    backs = useRef<InstancedMesh>(null);
  const overlayMesh = useRef<Mesh>(null);
  const flight = useRef<{
    from: Vector3;
    to: Vector3;
    fromTarget: Vector3;
    target: Vector3;
    time: number;
    startedAt: number | null;
    requestId: string;
    token: number;
    flightId: string;
    outlineKey: string | null;
  } | null>(null);
  const pickers = useRef(
    new Map<InstancedMesh, { mesh: InstancedMesh; indices: number[] }[]>(),
  );
  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.scale.setScalar(transform.scale);
    clone.position.set(...transform.offset);
    clone.traverse((o) => {
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
        geometry.boundingBox = bounds;
        geometry.computeBoundingSphere();
        const first = s.seats[0];
        const peer = s.seats.filter((seat) => seat.row === first.row).at(-1)!;
        const labelDirection = new Vector3(
          ...transform.fromBlender(peer.simulation.position),
        )
          .sub(new Vector3(...transform.fromBlender(first.simulation.position)))
          .normalize();
        if (labelDirection.lengthSq() === 0) labelDirection.set(1, 0, 0);
        return {
          sector: s,
          geometry,
          center: bounds.getCenter(new Vector3()),
          labelDirection,
          labelPoints: outline.map(
            (point) =>
              new Vector3(
                ...transform.fromBlender([point.x, point.y, point.z]),
              ),
          ),
          shortLabel: s.label
            .replace("VIP ESCOGIDO - ", "VIP E")
            .replace("VIP LICEY - ", "VIP L")
            .replace("BALCON ESCOGIDO - ", "Balc. E")
            .replace("BALCON LICEY - ", "Balc. L"),
          radius: bounds.getSize(new Vector3()).length() / 2,
        };
      }),
    [transform],
  );
  useEffect(
    () => () => regions.forEach((r) => r.geometry.dispose()),
    [regions],
  );
  const sectorOverlay = useMemo(() => {
    const geometry = new BufferGeometry();
    const material = new MeshBasicMaterial({ side: DoubleSide });
    const pickers: { mesh: Mesh; triangleOffset: number }[] = [];
    const positions: number[] = [],
      colors: number[] = [],
      triangles: TicketSector[] = [];
    for (const r of regions) {
      pickers.push({
        mesh: new Mesh(r.geometry, material),
        triangleOffset: triangles.length,
      });
      const count = availableCount(r.sector, selected);
      const outside = Boolean(zone && !zone.sectorIds.includes(r.sector.id));
      const color = new Color(
        outside ? "#d5dde1" : count ? r.sector.category.color : "#b6c0c6",
      );
      const alpha = outside
        ? 0.5
        : count
          ? 0.38 + (0.55 * count) / r.sector.seats.length
          : 0.9;
      const vertices = r.geometry.getAttribute("position");
      const indices = r.geometry.index!;
      for (let i = 0; i < indices.count; i++) {
        const v = indices.getX(i);
        positions.push(vertices.getX(v), vertices.getY(v), vertices.getZ(v));
        colors.push(color.r, color.g, color.b, alpha);
        if (i % 3 === 0) triangles.push(r.sector);
      }
    }
    geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
    geometry.setAttribute("color", new Float32BufferAttribute(colors, 4));
    geometry.computeBoundingSphere();
    return { geometry, triangles, pickers, material };
  }, [regions, selected, zone]);
  const zones = useMemo(() => {
    const groups = new Map<string, number[]>();
    regions.forEach((r, index) => {
      const split = [2287, 2288, 2289, 2278].includes(r.sector.category.id);
      const key = `${r.sector.category.id}:${split ? Math.sign(r.center.x) : 0}`;
      const members = groups.get(key) || [];
      members.push(index);
      groups.set(key, members);
    });
    return [...groups].map(([key, members]) => {
      const center = members
        .reduce((sum, index) => sum.add(regions[index].center), new Vector3())
        .divideScalar(members.length);
      const index = members.reduce((best, candidate) =>
        regions[candidate].center.distanceToSquared(center) <
        regions[best].center.distanceToSquared(center)
          ? candidate
          : best,
      );
      const category = regions[index].sector.category;
      const side: TicketZone["side"] = [2287, 2288, 2289, 2278].includes(
        category.id,
      )
        ? regions[index].center.x < 0
          ? "izquierdo"
          : "derecho"
        : null;
      return {
        key,
        index,
        category,
        sectorIds: members.map((i) => regions[i].sector.id),
        side,
      };
    });
  }, [regions]);
  const zoneOutlines = useMemo(() => {
    return zones.map((item) => {
      const seats = regions
        .filter((region) => item.sectorIds.includes(region.sector.id))
        .flatMap((region) =>
          region.sector.seats.map((seat) => ({
            x: seat.simulation.position[0],
            y: seat.simulation.position[1],
            z: seat.simulation.position[2],
          })),
        );
      return {
        key: item.key,
        geometry: ribbonGeometry(
          zoneOutlineLoops(seats),
          transform.fromBlender,
          0.064,
        ),
      };
    });
  }, [zones, regions, transform]);
  useEffect(
    () => () => zoneOutlines.forEach((item) => item.geometry.dispose()),
    [zoneOutlines],
  );
  useEffect(
    () => () => {
      sectorOverlay.geometry.dispose();
      sectorOverlay.material.dispose();
    },
    [sectorOverlay],
  );
  const projectedLabel = useMemo(() => new Vector3(), []);
  const activeOutline = useMemo(() => {
    if (!sector) return null;
    const seats = sector.seats.map((seat) => ({
      x: seat.simulation.position[0],
      y: seat.simulation.position[1],
      z: seat.simulation.position[2],
    }));
    const loops = sectorOutlineLoops(seats);
    if (!loops.length) return null;
    return ribbonGeometry(loops, transform.fromBlender, 0.016);
  }, [sector, transform]);
  useEffect(() => () => activeOutline?.dispose(), [activeOutline]);
  const projectedCenters = useMemo(
    () => regions.map(() => new Vector3()),
    [regions],
  );
  const allSeats = useMemo(
    () =>
      ticketSectors.flatMap((s) =>
        s.seats.map((seat) => ({ seat, color: s.category.color })),
      ),
    [],
  );
  const seatIndices = useMemo(
    () => new Map(allSeats.map(({ seat }, i) => [seat.key, i])),
    [allSeats],
  );
  useLayoutEffect(() => {
    if (!bases.current || !backs.current) return;
    const dummy = new Object3D();
    allSeats.forEach(({ seat }, i) => {
      const pos = seat.simulation.position;
      const yaw = -seatFacingAngle(seat.simulation);
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
    });
    for (const mesh of [bases.current, backs.current]) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }, [allSeats, transform]);
  useLayoutEffect(() => {
    if (!bases.current || !backs.current) return;
    const color = new Color();
    const contextColor = new Color("#dce2e5");
    const chosen = new Set(selected);
    allSeats.forEach(({ seat, color: category }, i) => {
      color.set(
        chosen.has(seat.key)
          ? "#122a46"
          : seat.available
            ? category
            : "#b6c0c6",
      );
      const outside = Boolean(zone && !zone.sectorIds.includes(seat.sectorId));
      // Seats outside the open zone stay quiet. Neighbors in the same zone
      // keep their real availability, even while another sector is selected.
      if (outside && !chosen.has(seat.key))
        color.lerp(contextColor, seat.available ? 0.84 : 0.45);
      bases.current!.setColorAt(i, color);
      backs.current!.setColorAt(i, color);
    });
    for (const mesh of [bases.current, backs.current]) {
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    invalidate();
  }, [allSeats, selected, zone, invalidate]);
  useLayoutEffect(() => {
    // Each sector has its own bounding sphere, so raycasting rejects distant
    // groups before testing individual chairs. Every sector stays interactive.
    if (!bases.current || !backs.current) return;
    const matrix = new Object3D().matrix;
    const active = pickers.current;
    for (const source of [bases.current, backs.current]) {
      const groups = ticketSectors.map((s) => {
        const indices = s.seats.map((seat) => seatIndices.get(seat.key)!);
        const mesh = new InstancedMesh(
          source.geometry,
          source.material,
          indices.length,
        );
        indices.forEach((index, i) => {
          source.getMatrixAt(index, matrix);
          mesh.setMatrixAt(i, matrix);
        });
        mesh.computeBoundingSphere();
        return { mesh, indices };
      });
      active.set(source, groups);
    }
    return () => {
      active.forEach((groups) => groups.forEach(({ mesh }) => mesh.dispose()));
      active.clear();
    };
  }, [seatIndices, transform]);
  function raycastSeats(
    source: InstancedMesh | null,
    raycaster: Raycaster,
    hits: Intersection[],
  ) {
    if (!source || dragging.current || !sector) return;
    for (const picker of pickers.current.get(source) || []) {
      picker.mesh.matrixWorld.copy(source.matrixWorld);
      const picked: Intersection[] = [];
      picker.mesh.raycast(raycaster, picked);
      for (const hit of picked) {
        hit.instanceId = picker.indices[hit.instanceId!];
        hit.object = source;
        hits.push(hit);
      }
    }
  }
  useEffect(() => {
    const control = controls.current;
    if (!control) return;
    const token = ++flightToken.current;
    gl.domElement.setAttribute("data-camera-state", "moving");
    const nextOutline = zone && !sector ? zone.key : null;
    if (pendingSeat.current?.sectorId !== sector?.id)
      pendingSeat.current = null;
    let target = new Vector3(0, 1, 3),
      end = new Vector3(0, 34, 11);
    if (!sector && !zone && size.width < size.height) {
      end = target
        .clone()
        .add(end.sub(target).multiplyScalar(size.height / size.width));
    }
    if (sector) {
      const region = regions.find((r) => r.sector.id === sector.id)!;
      target = region.center.clone();
      const fieldDirection = new Vector3(
        ...transform.fromBlender([0, -24, 0]),
      ).sub(target);
      const direction = new Vector3(
        -region.labelDirection.z,
        0,
        region.labelDirection.x,
      );
      if (direction.dot(fieldDirection) < 0) direction.negate();
      direction.normalize();
      const radius = Math.max(region.radius, 0.3);
      const aspect = Math.min(1, size.width / size.height);
      const distance =
        (radius / Math.sin(Math.atan(Math.tan(Math.PI / 8) * aspect))) * 1.1;
      end = target
        .clone()
        .addScaledVector(direction, distance * 0.48)
        .add(new Vector3(0, distance * 0.88, 0));
    } else if (zone) {
      const bounds = new Box3();
      for (const region of regions) {
        if (focusedIds.has(region.sector.id))
          bounds.union(region.geometry.boundingBox!);
      }
      target = bounds.getCenter(new Vector3());
      const direction = new Vector3(...transform.fromBlender([0, -24, 0])).sub(
        target,
      );
      direction.y = 0;
      direction.normalize();
      const radius = Math.max(bounds.getSize(new Vector3()).length() / 2, 0.3);
      const aspect = Math.min(1, size.width / size.height);
      let distance =
        (radius / Math.sin(Math.atan(Math.tan(Math.PI / 8) * aspect))) * 0.58;
      const probe = camera.clone() as PerspectiveCamera;
      const point = new Vector3();
      const eyeAt = (span: number) =>
        target
          .clone()
          .addScaledVector(direction, span * 0.35)
          .add(new Vector3(0, span * 0.94, 0));
      const membersInside = (span: number) => {
        probe.position.copy(eyeAt(span));
        probe.lookAt(target);
        probe.updateProjectionMatrix();
        probe.updateMatrixWorld();
        for (const region of regions) {
          if (!focusedIds.has(region.sector.id)) continue;
          point.copy(region.center).project(probe);
          const x = ((point.x + 1) * size.width) / 2;
          const y = ((1 - point.y) * size.height) / 2;
          if (
            point.z < -1 ||
            point.z > 1 ||
            x < 10 ||
            x > size.width - 10 ||
            y < 10 ||
            y > size.height - 56
          )
            return false;
        }
        return true;
      };
      if (!membersInside(distance)) {
        let far = distance;
        for (let i = 0; i < 8 && !membersInside(far); i++) far *= 1.4;
        let near = distance;
        for (let i = 0; i < 10; i++) {
          const mid = (near + far) / 2;
          if (membersInside(mid)) far = mid;
          else near = mid;
        }
        distance = far;
      }
      end = eyeAt(distance);
    }
    if (reducedMotion) {
      camera.position.copy(end);
      control.target.copy(target);
      control.update();
      flight.current = null;
      gl.domElement.setAttribute("data-camera-state", "settled");
      gl.domElement.setAttribute("data-camera-settled", requestId);
      if (pendingSeat.current) {
        const seat = pendingSeat.current;
        pendingSeat.current = null;
        confirmSeat.current(seat);
      }
    } else
      flight.current = {
        from: camera.position.clone(),
        to: end,
        fromTarget: control.target.clone(),
        target,
        time: 0,
        startedAt: null,
        requestId,
        token,
        flightId,
        outlineKey: nextOutline,
      };
    invalidate();
  }, [
    sector,
    zone,
    focusedIds,
    reset,
    regions,
    camera,
    reducedMotion,
    size.width,
    size.height,
    transform,
    invalidate,
    flightId,
    requestId,
    gl,
  ]);
  useFrame(() => {
    const f = flight.current;
    if (f && controls.current) {
      // Start on the first rendered frame so an idle clock cannot skip the
      // approach. Thereafter use real elapsed time, independent of GPU FPS.
      const now = performance.now();
      f.startedAt ??= now;
      f.time = Math.min(1, (now - f.startedAt) / 1100);
      const t = f.time * f.time * (3 - 2 * f.time);
      camera.position.lerpVectors(f.from, f.to, t);
      controls.current.target.lerpVectors(f.fromTarget, f.target, t);
      controls.current.update();
      if (f.time === 1) {
        flight.current = null;
        gl.domElement.setAttribute("data-camera-state", "settled");
        gl.domElement.setAttribute("data-camera-settled", f.requestId);
        if (f.token === flightToken.current)
          setSettledOutline({ id: f.flightId, key: f.outlineKey });
        if (pendingSeat.current) {
          const seat = pendingSeat.current;
          pendingSeat.current = null;
          confirmSeat.current(seat);
        }
      } else invalidate();
    }
    // Projecting every label while the pointer is down blocks the drag on a
    // slow machine. Positions catch up on the frame after release.
    if (dragging.current) return;
    camera.updateMatrixWorld();
    regions.forEach((r, i) => {
      const p = projectedCenters[i].copy(r.center).project(camera);
      p.x = ((p.x + 1) * size.width) / 2;
      p.y = ((1 - p.y) * size.height) / 2;
    });
    const overview =
      !sector &&
      !zone &&
      camera.position.distanceTo(controls.current?.target || new Vector3()) >
        14;
    const placedZones: {
      x: number;
      y: number;
      width: number;
      height: number;
    }[] = [];
    const compact = size.width < 600;
    const step = compact ? 24 : 28;
    for (const zone of zones) {
      const element = zoneLabels.current.get(zone.key);
      if (!element) continue;
      const p = projectedCenters[zone.index];
      let placement: (typeof placedZones)[number] | undefined;
      if (overview && p.z >= -1 && p.z <= 1) {
        const width = zone.category.name.length * (compact ? 5.85 : 6.5) + 15;
        const height = compact ? 20 : 24;
        // Only the few overview guides need spacing. Sector names remain
        // fixed to their geometry and never participate in this layout.
        for (const dx of [0, -28, 28, -56, 56]) {
          for (const dy of [
            0,
            -step,
            step,
            -2 * step,
            2 * step,
            -3 * step,
            3 * step,
          ]) {
            const candidate = { x: p.x + dx, y: p.y + dy, width, height };
            if (
              candidate.x - width / 2 < 6 ||
              candidate.x + width / 2 > size.width - 6 ||
              candidate.y - height / 2 < 60 ||
              candidate.y + height / 2 > size.height - 48
            )
              continue;
            if (
              placedZones.some(
                (other) =>
                  Math.abs(candidate.x - other.x) <
                    (width + other.width) / 2 + 3 &&
                  Math.abs(candidate.y - other.y) <
                    (height + other.height) / 2 + 3,
              )
            )
              continue;
            placement = candidate;
            break;
          }
          if (placement) break;
        }
      }
      element.style.visibility = placement ? "visible" : "hidden";
      if (placement) {
        placedZones.push(placement);
        element.style.translate = `calc(${placement.x}px - 50%) calc(${placement.y}px - 50%)`;
      }
    }
    for (const [index, r] of regions.entries()) {
      const element = labels.current.get(r.sector.id);
      if (!element) continue;
      const p = projectedCenters[index];
      const x = p.x,
        y = p.y;
      const zoneMember = Boolean(zone?.sectorIds.includes(r.sector.id));
      const hidden =
        overview ||
        Boolean(zone && !zoneMember) ||
        sector?.id === r.sector.id ||
        p.z > 1 ||
        p.z < -1 ||
        x < 0 ||
        x > size.width ||
        y < 0 ||
        y > size.height - 44;
      const direction = projectedLabel
        .copy(r.center)
        .addScaledVector(r.labelDirection, 0.2)
        .project(camera);
      const dx = ((direction.x + 1) * size.width) / 2 - x;
      const dy = ((1 - direction.y) * size.height) / 2 - y;
      const length = Math.hypot(dx, dy) || 1;
      const ux = dx / length,
        uy = dy / length;
      let minAlong = Infinity,
        maxAlong = -Infinity;
      let minAcross = Infinity,
        maxAcross = -Infinity;
      for (const point of r.labelPoints) {
        const projected = projectedLabel.copy(point).project(camera);
        const px = ((projected.x + 1) * size.width) / 2 - x;
        const py = ((1 - projected.y) * size.height) / 2 - y;
        const along = px * ux + py * uy;
        const across = -px * uy + py * ux;
        minAlong = Math.min(minAlong, along);
        maxAlong = Math.max(maxAlong, along);
        minAcross = Math.min(minAcross, across);
        maxAcross = Math.max(maxAcross, across);
      }
      const width = maxAlong - minAlong,
        height = maxAcross - minAcross;
      const compactCorporate =
        /^PC\s*\d+$/.test(r.shortLabel) &&
        (Math.max(width, height) < 20 || (zoneMember && !sector)) &&
        sector?.id !== r.sector.id;
      const displayLabel = compactCorporate
        ? r.shortLabel.replace(/^PC\s*/, "")
        : r.shortLabel;
      const name = element.firstElementChild;
      if (name && name.textContent !== displayLabel)
        name.textContent = displayLabel;
      // Use the longer axis of narrow sections, so lower-bowl names can be
      // larger without moving their anchors away from the seats.
      const radial = height > width * 1.25;
      const fontSize = Math.max(
        8,
        Math.min(
          16,
          (radial ? height : width) / (displayLabel.length * 0.7 + 0.65),
          (radial ? width : height) / 1.4,
        ),
      );
      let angle = (Math.atan2(dy, dx) * 180) / Math.PI + (radial ? 90 : 0);
      if (angle > 90) angle -= 180;
      if (angle < -90) angle += 180;
      const fits =
        Math.max(width, height) >= r.shortLabel.length * 5.5 &&
        Math.min(width, height) >= 9;
      element.style.visibility =
        hidden || (!fits && !zoneMember) ? "hidden" : "visible";
      element.style.translate = `calc(${x}px - 50%) calc(${y}px - 50%)`;
      const horizontalGroup =
        zoneMember && !sector && [2275, 2278].includes(r.sector.category.id);
      element.style.rotate = `${sector?.id === r.sector.id || horizontalGroup ? 0 : angle.toFixed(1)}deg`;
      // Scale a fixed text layout so camera movement does not relayout and
      // rasterize every sector name at a different font size each frame.
      element.style.scale =
        sector?.id === r.sector.id
          ? "1"
          : horizontalGroup
            ? "0.833"
            : (fontSize / 12).toFixed(3);
    }
  });
  function seatClick(e: ThreeEvent<MouseEvent>) {
    if (e.delta > 5 || e.instanceId === undefined) return;
    e.stopPropagation();
    const seat = allSeats[e.instanceId].seat;
    if (sector?.id !== seat.sectorId) {
      pendingSeat.current = seat;
      onSector(ticketSectors.find((s) => s.id === seat.sectorId)!);
      return;
    }
    onSeat(seat);
  }
  function seatHover(e: ThreeEvent<PointerEvent>) {
    if (e.instanceId === undefined) return;
    e.stopPropagation();
    const s = allSeats[e.instanceId].seat;
    cursor(s.available || selected.includes(s.key) ? "pointer" : "not-allowed");
    onHover(
      `${s.sector} · ${seatRowLabel(s.row)} · Butaca ${s.label} · ${s.available ? "Disponible" : "Agotada"}`,
    );
  }
  return (
    <>
      <primitive object={model} />
      {activeOutline && (
        <mesh geometry={activeOutline} raycast={() => {}} renderOrder={4}>
          <meshBasicMaterial
            color="#185dac"
            polygonOffset
            polygonOffsetFactor={-2}
            polygonOffsetUnits={-2}
            depthWrite={false}
            side={DoubleSide}
          />
        </mesh>
      )}
      {zoneOutlines.map((outline) =>
        outline.key === outlineKey ? (
          <mesh
            key={outline.key}
            geometry={outline.geometry}
            raycast={() => {}}
            renderOrder={3}
          >
            <meshBasicMaterial
              color="#185dac"
              polygonOffset
              polygonOffsetFactor={-2}
              polygonOffsetUnits={-2}
              depthWrite={false}
              side={DoubleSide}
            />
          </mesh>
        ) : null,
      )}
      <instancedMesh
        ref={bases}
        args={[undefined, undefined, allSeats.length]}
        raycast={(raycaster, hits) =>
          raycastSeats(bases.current, raycaster, hits)
        }
        onClick={seatClick}
        onPointerMove={seatHover}
        onPointerOut={() => {
          cursor(dragging.current ? "grabbing" : "grab");
          onHover("");
        }}
      >
        <boxGeometry args={[0.34, 0.12, 0.35]} />
        <meshStandardMaterial roughness={0.72} />
      </instancedMesh>
      <instancedMesh
        ref={backs}
        args={[undefined, undefined, allSeats.length]}
        raycast={(raycaster, hits) =>
          raycastSeats(backs.current, raycaster, hits)
        }
        onClick={seatClick}
        onPointerMove={seatHover}
        onPointerOut={() => {
          cursor(dragging.current ? "grabbing" : "grab");
          onHover("");
        }}
      >
        <boxGeometry args={[0.34, 0.4, 0.065]} />
        <meshStandardMaterial roughness={0.72} />
      </instancedMesh>
      {!sector && (
        <mesh
          ref={overlayMesh}
          geometry={sectorOverlay.geometry}
          raycast={(raycaster, hits) => {
            const source = overlayMesh.current;
            if (!source || dragging.current) return;
            for (const picker of sectorOverlay.pickers) {
              picker.mesh.matrixWorld.copy(source.matrixWorld);
              const picked: Intersection[] = [];
              picker.mesh.raycast(raycaster, picked);
              for (const hit of picked) {
                hit.faceIndex = hit.faceIndex! + picker.triangleOffset;
                hit.object = source;
                hits.push(hit);
              }
            }
          }}
          onClick={(e) => {
            if (e.delta > 5 || e.faceIndex == null) return;
            e.stopPropagation();
            onSector(sectorOverlay.triangles[e.faceIndex]);
          }}
          onPointerOver={(e) => {
            if (dragging.current || e.faceIndex == null) return;
            const hovered = sectorOverlay.triangles[e.faceIndex];
            const count = availableCount(hovered, selected);
            cursor("pointer");
            e.stopPropagation();
            onHover(
              `${hovered.label} · ${count} de ${hovered.seats.length} disponibles`,
            );
          }}
          onPointerMove={(e) => {
            if (dragging.current || e.faceIndex == null) return;
            const hovered = sectorOverlay.triangles[e.faceIndex];
            cursor("pointer");
            e.stopPropagation();
            onHover(
              `${hovered.label} · ${availableCount(hovered, selected)} de ${hovered.seats.length} disponibles`,
            );
          }}
          onPointerOut={() => {
            cursor(dragging.current ? "grabbing" : "grab");
            onHover("");
          }}
        >
          <meshBasicMaterial
            vertexColors
            transparent
            side={DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}
      <Html
        calculatePosition={() => [0, 0]}
        onOcclude={() => {}}
        zIndexRange={[12, 12]}
        style={{
          width: size.width,
          height: size.height,
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        <span data-zone-outline={outlineKey ?? ""} hidden />
        {zones.map((zone) => (
          <button
            type="button"
            key={zone.key}
            data-map-category={zone.category.id}
            data-zone-key={zone.key}
            className="map-zone-tag"
            aria-label={`Explorar ${zone.category.name}${zone.side ? `, lado ${zone.side}` : ""}`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              pendingSeat.current = null;
              onZone(zone);
            }}
            ref={(element) => {
              if (element) zoneLabels.current.set(zone.key, element);
              else zoneLabels.current.delete(zone.key);
            }}
            style={{ borderColor: zone.category.color }}
          >
            {zone.category.name}
          </button>
        ))}
        {regions.map((r) => {
          const count = availableCount(r.sector, selected);
          return (
            <button
              key={r.sector.id}
              data-sector-id={r.sector.id}
              ref={(element) => {
                if (element) {
                  labels.current.set(r.sector.id, element);
                  invalidate();
                } else labels.current.delete(r.sector.id);
              }}
              className={`sector-tag ${sector?.id === r.sector.id ? "sector-tag-detail" : zone?.sectorIds.includes(r.sector.id) && !sector ? "sector-tag-zone" : ""}`}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                pointerEvents: "auto",
                translate: "-50% -50%",
                borderColor: count ? r.sector.category.color : "#9ea9af",
              }}
              aria-label={`${r.sector.label}, ${count} disponibles, demostración`}
              title={`${r.sector.label} · ${r.sector.category.name} · ${count} disponibles`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onSector(r.sector);
              }}
            >
              <span>{r.shortLabel}</span>
              {sector?.id === r.sector.id && <small>{count} libres</small>}
            </button>
          );
        })}
      </Html>
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
        enableDamping={false}
        minDistance={0.3}
        maxDistance={45}
        maxPolarAngle={Math.PI / 2.05}
        onStart={() => {
          gl.domElement.setAttribute("data-camera-state", "interacting");
          cursor("grabbing");
          dragging.current = true;
          pendingSeat.current = null;
          if (flight.current) {
            flight.current = null;
            flightToken.current += 1;
          }
        }}
        onEnd={() => {
          gl.domElement.setAttribute("data-camera-state", "settled");
          gl.domElement.setAttribute("data-camera-settled", requestId);
          cursor("grab");
          dragging.current = false;
          invalidate();
        }}
      />
    </>
  );
}
export const TicketSelectionScene = memo(function TicketSelectionScene(
  props: Props,
) {
  return (
    <Canvas
      data-camera-request={cameraRequestId(props)}
      frameloop={props.paused ? "never" : "demand"}
      dpr={[1, 2]}
      camera={{ position: [0, 28, 16], fov: 45, near: 0.008, far: 150 }}
      // Preserve depth precision for closely layered turf/clay at aerial zoom.
      gl={{
        antialias: true,
        logarithmicDepthBuffer: true,
        powerPreference: "high-performance",
      }}
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
          <Html fullscreen>
            <MapLoading />
          </Html>
        }
      >
        <Content {...props} />
      </Suspense>
    </Canvas>
  );
});
