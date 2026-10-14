// Stadium-fixed outline for one seating zone. Coordinates stay in the same
// Blender space as the simulated seats: x/y horizontal, z up.
export type OutlinePoint = { x: number; y: number; z: number };

const ARC_END = (24 * Math.PI) / 4;
const MARGIN = 0.4;
const SAMPLE_STEP = 0.55;
const LOCAL_WINDOW = 0.65;
const CLUSTER_GAP = 9;
const LIFT = 1.15;

function terracePoint(s: number, depth: number, z: number): OutlinePoint {
  let d = depth;
  if (d >= 3) d -= 14 * Math.max(0, Math.min(1, (Math.abs(s) - 60) / 65));
  const sign = s < 0 ? -1 : 1;
  const a = Math.abs(s);
  const theta = -Math.PI / 2 + Math.min(a / 24, Math.PI / 4);
  const wing = Math.max(0, a - ARC_END) / Math.SQRT2;
  return {
    x: sign * ((24 + d) * Math.cos(theta) + wing),
    y: -32 + (24 + d) * Math.sin(theta) + wing,
    z,
  };
}

function untaper(s: number, geometricDepth: number) {
  const taper = Math.max(0, Math.min(1, (Math.abs(s) - 60) / 65));
  if (taper === 0) return geometricDepth;
  const restored = geometricDepth + 14 * taper;
  return restored >= 3 ? restored : geometricDepth;
}

// Inverse of terracePoint. Every stand generated from that curve, including the
// straight wings, lands back on its along-stand and across-stand parameters.
function projectSeat(x: number, y: number) {
  const dy = y + 32;
  const phi = Math.atan2(dy, x);
  if (phi >= (-3 * Math.PI) / 4 && phi <= -Math.PI / 4) {
    const theta = phi < -Math.PI / 2 ? -Math.PI - phi : phi;
    const along = (theta + Math.PI / 2) * 24;
    const s = phi < -Math.PI / 2 ? -along : along;
    return { s, d: untaper(s, Math.hypot(x, dy) - 24) };
  }
  if (x >= 0) {
    const wing = (x + dy) / 2;
    const radial = (x - dy) / 2;
    const s = ARC_END + wing * Math.SQRT2;
    return { s, d: untaper(s, radial * Math.SQRT2 - 24) };
  }
  const wing = (-x + dy) / 2;
  const radial = (-x - dy) / 2;
  const s = -(ARC_END + wing * Math.SQRT2);
  return { s, d: untaper(s, radial * Math.SQRT2 - 24) };
}

type Located = OutlinePoint & { s: number; d: number };
type Sample = { s: number; d0: number; d1: number };

// Offset after the stand curve. Subtracting the margin from the depth
// parameter disables the wing taper and pulls the line off the end seats.
function place(s: number, depth: number, z: number, radial: number) {
  const point = terracePoint(s, depth, z);
  const probe = terracePoint(s, depth + 0.25, z);
  const dx = probe.x - point.x;
  const dy = probe.y - point.y;
  const length = Math.hypot(dx, dy) || 1;
  return {
    x: point.x + (dx / length) * radial,
    y: point.y + (dy / length) * radial,
    z,
  };
}

// Along-stand parameter per physical meter on that row. On the arc, s is
// measured at radius 24, so deeper rows cover more ground per unit of s.
function alongPerMeter(s: number, depth: number) {
  const a = terracePoint(s, depth, 0);
  const b = terracePoint(s + 0.01, depth, 0);
  return 0.01 / (Math.hypot(b.x - a.x, b.y - a.y) || 0.01);
}

function ribbon(seats: Located[]): OutlinePoint[][] {
  const pieces: Located[][] = [];
  for (const seat of seats) {
    const last = pieces.at(-1);
    if (!last || seat.s - last.at(-1)!.s > 4.8) pieces.push([seat]);
    else last.push(seat);
  }
  const clusters: Located[][] = [];
  for (const piece of pieces) {
    const previous = clusters.at(-1);
    const span = piece.at(-1)!.s - piece[0].s;
    const gap = previous ? piece[0].s - previous.at(-1)!.s : Infinity;
    const previousSpan = previous
      ? previous.at(-1)!.s - previous[0].s
      : Infinity;
    // Keep a one-section stub, such as Palco A1 past its walkway, on its own
    // outline. Bridging that aisle draws the contour across the empty bay.
    const stub = span < 2.5 || previousSpan < 2.5;
    if (!previous || gap > CLUSTER_GAP || stub) clusters.push(piece.slice());
    else previous.push(...piece);
  }
  return clusters.flatMap((cluster) => {
    const chains: { samples: Sample[]; seats: Located[] }[] = [];
    for (const section of splitSections(cluster)) {
      const previous = chains.at(-1);
      const samples = sampleSection(section);
      const gap = previous
        ? samples[0].s - previous.samples.at(-1)!.s
        : Infinity;
      if (previous && gap <= 2.5) {
        previous.samples.push(...samples);
        previous.seats.push(...section);
      } else chains.push({ samples, seats: section.slice() });
    }
    // A stair wider than the chain gap is its own outline. Joining it would
    // draw the contour across the empty bay and into the next block.
    // Inside a block, one band from its front row to its back row keeps
    // short sections and missing rows from making the line jump.
    return chains.map(({ samples, seats: block }) => {
      const terrace = fitTerrace(block);
      const height = (depth: number) =>
        terrace.z + terrace.slope * (depth - terrace.d) + LIFT;
      const d0 = Math.min(...samples.map((sample) => sample.d0));
      const d1 = Math.max(...samples.map((sample) => sample.d1));
      const outer = samples.map((sample) =>
        place(sample.s, d1, height(d1), MARGIN),
      );
      const inner = samples.map((sample) =>
        place(sample.s, d0, height(d0), -MARGIN),
      );
      return [...outer, ...inner.reverse()];
    });
  });
}

function fitTerrace(seats: Located[]) {
  const d = seats.reduce((sum, seat) => sum + seat.d, 0) / seats.length;
  const z = seats.reduce((sum, seat) => sum + seat.z, 0) / seats.length;
  let variance = 0;
  let covariance = 0;
  for (const seat of seats) {
    variance += (seat.d - d) ** 2;
    covariance += (seat.d - d) * (seat.z - z);
  }
  return { d, z, slope: variance > 1e-4 ? covariance / variance : 0 };
}

function splitSections(seats: Located[]) {
  const sections: Located[][] = [];
  for (const seat of seats) {
    const last = sections.at(-1);
    if (!last || seat.s - last.at(-1)!.s > 1.6) sections.push([seat]);
    else last.push(seat);
  }
  return sections;
}

function sampleSection(section: Located[]) {
  const samples: Sample[] = [];
  let cursor = 0;
  const start = section[0].s - MARGIN;
  const end = section.at(-1)!.s + MARGIN;
  for (let s = start; s <= end + 1e-6; s += SAMPLE_STEP) {
    while (cursor < section.length && section[cursor].s < s - LOCAL_WINDOW)
      cursor++;
    let d0 = Infinity;
    let d1 = -Infinity;
    for (
      let look = cursor;
      look < section.length && section[look].s <= s + LOCAL_WINDOW;
      look++
    ) {
      d0 = Math.min(d0, section[look].d);
      d1 = Math.max(d1, section[look].d);
    }
    if (d0 <= d1) samples.push({ s, d0, d1 });
  }
  return samples;
}

// Chairs sit 0.40 to 0.92 above the row, 0.34 wide, and reach 0.175 in front
// of the seat point and 0.225 behind it. The front edge stays at seat level
// and the back edge at the top of the backrest, so in perspective the line
// wraps every chair instead of crossing it.
const SECTOR_SIDE = 0.34;
const SECTOR_FRONT = 0.32;
const SECTOR_BACK = 0.36;
const SECTOR_FRONT_LIFT = 0.42;
const SECTOR_BACK_LIFT = 0.96;

// A sector is a block of rows whose ends can slant, like the trapezoids in
// Palco AA. Each side is one straight line pushed out past every row's end.
function sectorBand(seats: Located[]): OutlinePoint[] {
  const rows = new Map<string, { d: number; z: number; lo: number; hi: number }>();
  for (const seat of seats) {
    const key = seat.d.toFixed(2);
    const row = rows.get(key);
    if (!row) rows.set(key, { d: seat.d, z: seat.z, lo: seat.s, hi: seat.s });
    else {
      row.lo = Math.min(row.lo, seat.s);
      row.hi = Math.max(row.hi, seat.s);
    }
  }
  const ordered = [...rows.values()].sort((a, b) => a.d - b.d);
  const front = ordered[0];
  const back = ordered.at(-1)!;
  const span = back.d - front.d;
  const leftSlope = span > 1e-3 ? (back.lo - front.lo) / span : 0;
  const rightSlope = span > 1e-3 ? (back.hi - front.hi) / span : 0;
  let left = Infinity;
  let right = -Infinity;
  for (const row of ordered) {
    const offset = row.d - front.d;
    left = Math.min(
      left,
      row.lo - leftSlope * offset - SECTOR_SIDE * alongPerMeter(row.lo, row.d),
    );
    right = Math.max(
      right,
      row.hi - rightSlope * offset + SECTOR_SIDE * alongPerMeter(row.hi, row.d),
    );
  }
  const edge = (
    row: typeof front,
    radial: number,
    lift: number,
  ): OutlinePoint[] => {
    const offset = row.d - front.d;
    const from = left + leftSlope * offset;
    const to = right + rightSlope * offset;
    const steps = Math.max(1, Math.ceil((to - from) / SAMPLE_STEP));
    return Array.from({ length: steps + 1 }, (_, index) =>
      place(from + ((to - from) * index) / steps, row.d, row.z + lift, radial),
    );
  };
  return [
    ...edge(back, SECTOR_BACK, SECTOR_BACK_LIFT),
    ...edge(front, -SECTOR_FRONT, SECTOR_FRONT_LIFT).reverse(),
  ];
}

function cross(origin: OutlinePoint, a: OutlinePoint, b: OutlinePoint) {
  return (
    (a.x - origin.x) * (b.y - origin.y) - (a.y - origin.y) * (b.x - origin.x)
  );
}

function convexHull(points: OutlinePoint[]) {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const collect = (items: OutlinePoint[]) => {
    const hull: OutlinePoint[] = [];
    for (const point of items) {
      while (hull.length > 1 && cross(hull.at(-2)!, hull.at(-1)!, point) <= 0)
        hull.pop();
      hull.push(point);
    }
    return hull;
  };
  return [
    ...collect(sorted).slice(0, -1),
    ...collect([...sorted].reverse()).slice(0, -1),
  ];
}

function roundedHull(
  seats: Located[],
  margin = 0.5,
  lift = LIFT,
): OutlinePoint[] {
  const hull = convexHull(seats);
  if (hull.length < 3) return [];
  const loop: OutlinePoint[] = [];
  for (let index = 0; index < hull.length; index++) {
    const previous = hull[(index + hull.length - 1) % hull.length];
    const current = hull[index];
    const next = hull[(index + 1) % hull.length];
    const first = normalize(current.x - previous.x, current.y - previous.y);
    const second = normalize(next.x - current.x, next.y - current.y);
    const start = Math.atan2(-first.x, first.y);
    let sweep = Math.atan2(-second.x, second.y) - start;
    if (sweep < 0) sweep += Math.PI * 2;
    if (sweep > Math.PI) sweep -= Math.PI * 2;
    const steps = Math.max(1, Math.ceil(Math.abs(sweep) / 0.45));
    for (let step = 0; step < steps; step++) {
      const angle = start + (sweep * step) / steps;
      loop.push({
        x: current.x + Math.cos(angle) * margin,
        y: current.y + Math.sin(angle) * margin,
        z: current.z + lift,
      });
    }
  }
  return loop;
}

function normalize(x: number, y: number) {
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
}

// Compact blocks such as the bullpen are straight in the field but diagonal in
// stand coordinates, so a stand-aligned rectangle would enclose empty ground.
function straightBlock(seats: Located[]) {
  if (seats.length > 400) return false;
  let x = 0;
  let y = 0;
  for (const seat of seats) {
    x += seat.x;
    y += seat.y;
  }
  x /= seats.length;
  y /= seats.length;
  let xx = 0;
  let xy = 0;
  let yy = 0;
  for (const seat of seats) {
    const dx = seat.x - x;
    const dy = seat.y - y;
    xx += dx * dx;
    xy += dx * dy;
    yy += dy * dy;
  }
  const angle = 0.5 * Math.atan2(2 * xy, xx - yy);
  const axisX = Math.cos(angle);
  const axisY = Math.sin(angle);
  const projected = seats.map((seat) => ({
    t: (seat.x - x) * axisX + (seat.y - y) * axisY,
    seat,
  }));
  const low = Math.min(...projected.map((item) => item.t));
  const high = Math.max(...projected.map((item) => item.t));
  const centroids: OutlinePoint[] = [];
  for (let bin = 0; bin < 7; bin++) {
    const from = low + ((high - low) * bin) / 7;
    const to = low + ((high - low) * (bin + 1)) / 7;
    const group = projected.filter((item) => item.t >= from && item.t <= to);
    if (!group.length) continue;
    centroids.push({
      x: group.reduce((sum, item) => sum + item.seat.x, 0) / group.length,
      y: group.reduce((sum, item) => sum + item.seat.y, 0) / group.length,
      z: 0,
    });
  }
  if (centroids.length < 3) return true;
  const start = centroids[0];
  const finish = centroids.at(-1)!;
  const spanX = finish.x - start.x;
  const spanY = finish.y - start.y;
  const span = spanX * spanX + spanY * spanY || 1;
  let sag = 0;
  for (const point of centroids) {
    const t =
      ((point.x - start.x) * spanX + (point.y - start.y) * spanY) / span;
    sag = Math.max(
      sag,
      Math.hypot(
        point.x - (start.x + spanX * t),
        point.y - (start.y + spanY * t),
      ),
    );
  }
  return sag < 0.7;
}

function locate(seats: readonly OutlinePoint[]) {
  return seats
    .map((seat) => ({ ...seat, ...projectSeat(seat.x, seat.y) }))
    .sort((a, b) => a.s - b.s);
}

function edgeSlack(seats: readonly OutlinePoint[], loops: OutlinePoint[][]) {
  let worst = 0;
  for (const loop of loops) {
    for (let index = 0; index < loop.length; index++) {
      const current = loop[index];
      const next = loop[(index + 1) % loop.length];
      const x = (current.x + next.x) / 2;
      const y = (current.y + next.y) / 2;
      let nearest = Infinity;
      for (const seat of seats) {
        nearest = Math.min(nearest, Math.hypot(seat.x - x, seat.y - y));
      }
      worst = Math.max(worst, nearest);
    }
  }
  return worst;
}

export function zoneOutlineLoops(
  seats: readonly OutlinePoint[],
): OutlinePoint[][] {
  if (seats.length < 3) return [];
  const located = locate(seats);
  if (straightBlock(located)) {
    const loop = roundedHull(located);
    return loop.length ? [loop] : [];
  }
  return ribbon(located).filter((loop) => loop.length >= 6);
}

// One sector is too short for the straight-block test: a curved pair of rows
// looks flat and would become a skewed rectangle. Follow the stand unless that
// band drifts away from the seats, as it does on a straight block like the bullpen.
export function sectorOutlineLoops(
  seats: readonly OutlinePoint[],
): OutlinePoint[][] {
  if (seats.length < 3) return [];
  const located = locate(seats);
  const alongStand = [sectorBand(located)];
  const fitted = straightBlock(located) ? roundedHull(located, 0.36, 0.7) : [];
  if (!fitted.length) return alongStand;
  return edgeSlack(seats, alongStand) > edgeSlack(seats, [fitted]) + 0.35
    ? [fitted]
    : alongStand;
}
