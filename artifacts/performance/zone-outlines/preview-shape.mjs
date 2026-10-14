import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const catalog = JSON.parse(readFileSync("src/data/seat-catalog.json", "utf8"));
const layoutData = JSON.parse(readFileSync("src/data/seat-layout.json", "utf8"));
const special = JSON.parse(
  readFileSync("src/data/special-seat-layout.json", "utf8"),
);
const arcEnd = (24 * Math.PI) / 4;
const SPLIT = new Set([2287, 2288, 2289, 2278]);
const NAMES = {
  2287: "Palco A",
  2288: "Palco AA",
  2289: "Palco AAA",
  2275: "Corporativo",
  2276: "Preferencias",
  2278: "Gradas",
  2279: "VIP Escogido",
  2281: "VIP Licey",
  2282: "Balcon Escogido",
  2283: "Balcon Licey",
  2812: "Bullpen Licey",
};

function terracePoint(s, depth, z = 0) {
  let d = depth;
  if (d >= 3) d -= 14 * Math.max(0, Math.min(1, (Math.abs(s) - 60) / 65));
  const sign = s < 0 ? -1 : 1;
  const a = Math.abs(s);
  const theta = -Math.PI / 2 + Math.min(a / 24, Math.PI / 4);
  const wing = Math.max(0, a - arcEnd) / Math.sqrt(2);
  return [
    sign * ((24 + d) * Math.cos(theta) + wing),
    -32 + (24 + d) * Math.sin(theta) + wing,
    z,
  ];
}

function untaper(s, dGeom) {
  const t = Math.max(0, Math.min(1, (Math.abs(s) - 60) / 65));
  if (t === 0) return dGeom;
  const tapered = dGeom + 14 * t;
  return tapered >= 3 ? tapered : dGeom;
}

function invertTerrace(x, y) {
  const dx = x;
  const dy = y + 32;
  const phi = Math.atan2(dy, dx);
  if (phi >= (-3 * Math.PI) / 4 && phi <= -Math.PI / 4) {
    const theta = phi < -Math.PI / 2 ? -Math.PI - phi : phi;
    const a = (theta + Math.PI / 2) * 24;
    const s = phi < -Math.PI / 2 ? -a : a;
    return { s, d: untaper(s, Math.hypot(dx, dy) - 24) };
  }
  if (x >= 0) {
    const wing = (x + dy) / 2;
    const u = (x - dy) / 2;
    const s = arcEnd + wing * Math.SQRT2;
    return { s, d: untaper(s, u * Math.SQRT2 - 24) };
  }
  const wing = (-x + dy) / 2;
  const u = (-x - dy) / 2;
  const s = -(arcEnd + wing * Math.SQRT2);
  return { s, d: untaper(s, u * Math.SQRT2 - 24) };
}

function measure(lo, hi, depth) {
  const pathDistance = (s, depthValue) => {
    const a = Math.abs(s);
    const taper = depthValue >= 3 ? Math.hypot(1, 14 / 65) : 1;
    const length =
      (Math.min(a, arcEnd) * (24 + depthValue)) / 24 +
      Math.max(0, Math.min(a, 60) - arcEnd) +
      Math.max(0, Math.min(a, 125) - 60) * taper +
      Math.max(0, a - 125);
    return Math.sign(s) * length;
  };
  const pathParameter = (distance, depthValue) => {
    let a = Math.abs(distance);
    const factors = [
      (24 + depthValue) / 24,
      1,
      depthValue >= 3 ? Math.hypot(1, 14 / 65) : 1,
      1,
    ];
    const lengths = [arcEnd, 60 - arcEnd, 65, Infinity];
    let s = 0;
    for (let i = 0; i < lengths.length; i++) {
      const physical = lengths[i] * factors[i];
      if (a <= physical) return Math.sign(distance) * (s + a / factors[i]);
      a -= physical;
      s += lengths[i];
    }
    return 0;
  };
  const origin = pathDistance(lo, depth);
  return {
    length: pathDistance(hi, depth) - origin,
    at: (distance) => pathParameter(origin + distance, depth),
  };
}

function rowPosition(tier, rows, label) {
  const fraction = (rows.indexOf(label) + 0.5) / rows.length;
  const step = tier.steps > 1 ? Math.floor(fraction * tier.steps) : 0;
  return {
    depth:
      tier.depth[0] +
      (tier.depth[1] - tier.depth[0]) *
        (tier.steps > 1 ? (step + 0.5) / tier.steps : fraction),
    height:
      tier.height[0] +
      ((tier.height[1] - tier.height[0]) * step) /
        Math.max(1, tier.steps),
  };
}

const layouts = new Map(
  layoutData.groups.map((group) => [
    group.id,
    {
      tier: group.tier,
      rows: group.rows,
      slots: new Map(group.slots.map((slot) => [slot.sectorId, slot])),
    },
  ]),
);
const specialSeats = new Map();
for (const group of special.groups)
  for (const seat of group.seats)
    specialSeats.set(`${group.id}:${seat.sectorId}:${seat.id}`, seat);

const seats = [];
for (const group of catalog.groups) {
  for (const sector of group.sectors) {
    if (!sector.seatCount) continue;
    const specialGroup = special.groups.some((item) => item.id === group.id);
    if (specialGroup) {
      for (const row of sector.rows)
        for (const seat of row.seats) {
          const found = specialSeats.get(`${group.id}:${sector.id}:${seat.id}`);
          if (!found) continue;
          seats.push({
            group: group.id,
            sector: sector.id,
            row: found.row,
            x: found.position[0],
            y: found.position[1],
            z: found.position[2],
          });
        }
      continue;
    }
    const layout = layouts.get(group.id);
    const slot = layout?.slots.get(sector.id);
    if (!layout || !slot) continue;
    const ordered = [...sector.rows].sort((a, b) =>
      a.label.localeCompare(b.label, "es", { numeric: true }),
    );
    for (const row of ordered) {
      const { depth, height } = rowPosition(layout.tier, layout.rows, row.label);
      const track = measure(slot.lo, slot.hi, depth);
      const padding = (track.length - row.seats.length * slot.pitch) / 2;
      row.seats.forEach((seat, index) => {
        const s = track.at(padding + slot.pitch * (index + 0.5));
        const position = terracePoint(s, depth, height);
        seats.push({
          group: group.id,
          sector: sector.id,
          row: row.label,
          x: position[0],
          y: position[1],
          z: position[2],
          s,
          d: depth,
        });
      });
    }
  }
}

let maxError = 0;
for (const seat of seats) {
  const inv = invertTerrace(seat.x, seat.y);
  const back = terracePoint(inv.s, inv.d, seat.z);
  const error = Math.hypot(back[0] - seat.x, back[1] - seat.y);
  seat.invS = inv.s;
  seat.invD = inv.d;
  seat.error = error;
  maxError = Math.max(maxError, error);
}
console.log("max inverse error", maxError.toFixed(4), "seats", seats.length);

const MARGIN = 0.4;
const GAP = 9;

function smoothEnvelope(samples) {
  const radius = 16;
  const d0 = samples.map((sample) => sample.d0);
  const d1 = samples.map((sample) => sample.d1);
  const filter = (values, pick) =>
    values.map((_, index) => {
      let chosen = pick === "max" ? -Infinity : Infinity;
      for (let cursor = index - radius; cursor <= index + radius; cursor++) {
        if (values[cursor] == null) continue;
        chosen = pick === "max" ? Math.max(chosen, values[cursor]) : Math.min(chosen, values[cursor]);
      }
      return chosen;
    });
  const closedOuter = filter(filter(d1, "max"), "min");
  const closedInner = filter(filter(d0, "min"), "max");
  return samples.map((sample, index) => ({
    ...sample,
    d0: closedInner[index],
    d1: closedOuter[index],
  }));
}

function outlineFor(points) {
  const located = points.map((seat) => ({
    ...seat,
    s: seat.s ?? seat.invS,
    d: seat.d ?? seat.invD,
  }));
  located.sort((a, b) => a.s - b.s);
  const clusters = [];
  for (const seat of located) {
    const last = clusters.at(-1);
    if (!last || seat.s - last.seats.at(-1).s > GAP)
      clusters.push({ seats: [seat] });
    else last.seats.push(seat);
  }
  return clusters.map((cluster) => {
    const step = 0.55;
    const s0 = cluster.seats[0].s - MARGIN;
    const s1 = cluster.seats.at(-1).s + MARGIN;
    const raw = [];
    let cursor = 0;
    for (let s = s0; s <= s1 + 1e-6; s += step) {
      while (
        cursor < cluster.seats.length &&
        cluster.seats[cursor].s < s - 1.5
      )
        cursor++;
      let look = cursor;
      let d0 = Infinity;
      let d1 = -Infinity;
      let zSum = 0;
      let dSum = 0;
      let count = 0;
      let varD = 0;
      let cov = 0;
      const nearby = [];
      while (
        look < cluster.seats.length &&
        cluster.seats[look].s <= s + 1.5
      ) {
        const seat = cluster.seats[look++];
        d0 = Math.min(d0, seat.d);
        d1 = Math.max(d1, seat.d);
        nearby.push(seat);
        count++;
      }
      if (!count) raw.push({ s, d0: null, d1: null, slope: 0, zMean: null, dMean: null });
      else {
        const dMean = nearby.reduce((sum, seat) => sum + seat.d, 0) / count;
        const zMean = nearby.reduce((sum, seat) => sum + seat.z, 0) / count;
        for (const seat of nearby) {
          varD += (seat.d - dMean) ** 2;
          cov += (seat.d - dMean) * (seat.z - zMean);
        }
        raw.push({
          s,
          d0: d0 - MARGIN,
          d1: d1 + MARGIN,
          slope: varD > 1e-4 ? cov / varD : 0,
          zMean,
          dMean,
        });
      }
    }
    for (let index = 0; index < raw.length; index++) {
      if (raw[index].d0 != null) continue;
      let previous = index - 1;
      let next = index + 1;
      while (previous >= 0 && raw[previous].d0 == null) previous--;
      while (next < raw.length && raw[next].d0 == null) next++;
      if (previous < 0 || next >= raw.length) continue;
      const span = raw[next].s - raw[previous].s;
      const t = span ? (raw[index].s - raw[previous].s) / span : 0;
      raw[index] = {
        s: raw[index].s,
        d0: raw[previous].d0 + (raw[next].d0 - raw[previous].d0) * t,
        d1: raw[previous].d1 + (raw[next].d1 - raw[previous].d1) * t,
        slope: raw[previous].slope + (raw[next].slope - raw[previous].slope) * t,
        zMean: raw[previous].zMean + (raw[next].zMean - raw[previous].zMean) * t,
        dMean: raw[previous].dMean + (raw[next].dMean - raw[previous].dMean) * t,
      };
    }
    const samples = smoothEnvelope(raw.filter((sample) => sample.d0 != null));
    const zAt = (sample, d) =>
      sample.zMean + sample.slope * (d - sample.dMean) + 1.15;
    const outer = samples.map((sample) =>
      terracePoint(sample.s, sample.d1, zAt(sample, sample.d1)),
    );
    const inner = samples.map((sample) =>
      terracePoint(sample.s, sample.d0, zAt(sample, sample.d0)),
    );
    const loop = [...outer, ...inner.reverse()];
    let edge = 0;
    let worst = 0;
    let worstPoint = null;
    for (const point of loop) {
      let nearest = Infinity;
      let nearestSeat = null;
      for (const seat of cluster.seats) {
        const distance = Math.hypot(point[0] - seat.x, point[1] - seat.y);
        if (distance < nearest) {
          nearest = distance;
          nearestSeat = seat;
        }
      }
      edge += nearest;
      if (nearest > worst) {
        worst = nearest;
        worstPoint = { point, nearestSeat, nearest };
      }
    }
    if (worst > 2) {
      console.log(
        " far",
        worst.toFixed(2),
        "outline",
        worstPoint.point.map((value) => value.toFixed(1)).join(","),
        "seat",
        [worstPoint.nearestSeat.x, worstPoint.nearestSeat.y]
          .map((value) => value.toFixed(1))
          .join(","),
        "seat sd",
        (worstPoint.nearestSeat.s ?? worstPoint.nearestSeat.invS).toFixed(1),
        (worstPoint.nearestSeat.d ?? worstPoint.nearestSeat.invD).toFixed(1),
      );
    }
    return {
      loop,
      s0,
      s1,
      d0: Math.min(...samples.map((sample) => sample.d0)),
      d1: Math.max(...samples.map((sample) => sample.d1)),
      meanEdge: edge / loop.length,
      worst,
      seats: cluster.seats.length,
    };
  });
}

const bySector = new Map();
for (const seat of seats) {
  const list = bySector.get(seat.sector) || [];
  list.push(seat);
  bySector.set(seat.sector, list);
}
const sectors = [...bySector.entries()].map(([id, list]) => {
  const cx = list.reduce((sum, seat) => sum + seat.x, 0) / list.length;
  return { id, group: list[0].group, cx, seats: list };
});
const groups = new Map();
for (const sector of sectors) {
  const side = SPLIT.has(sector.group) ? (sector.cx < 0 ? -1 : 1) : 0;
  const key = `${sector.group}:${side}`;
  const bucket = groups.get(key) || [];
  bucket.push(sector);
  groups.set(key, bucket);
}

const zones = [...groups.entries()]
  .map(([key, members]) => {
    const points = members.flatMap((sector) => sector.seats);
    const parts = outlineFor(points);
    return { key, name: NAMES[members[0].group], side: key.split(":")[1], parts, points };
  })
  .sort((a, b) => a.key.localeCompare(b.key));

console.log("zones", zones.length);
for (const key of ["2276:0", "2287:-1", "2812:0", "2278:-1"]) {
  const found = zones.find((item) => item.key === key);
  const points = found.points.map((seat) => ({
    s: seat.s ?? seat.invS,
    d: seat.d ?? seat.invD,
  }));
  const s0 = Math.min(...points.map((seat) => seat.s));
  const s1 = Math.max(...points.map((seat) => seat.s));
  console.log("PROFILE", key);
  for (let s = s0; s <= s1; s += (s1 - s0) / 18) {
    const sub = points.filter((seat) => Math.abs(seat.s - s) <= 1.2);
    if (!sub.length) {
      console.log(s.toFixed(1), "empty");
      continue;
    }
    const ds = sub.map((seat) => seat.d);
    console.log(
      s.toFixed(1),
      "n",
      sub.length,
      "d",
      Math.min(...ds).toFixed(2),
      Math.max(...ds).toFixed(2),
    );
  }
}
for (const zone of ["2276:0", "2278:-1", "2287:-1", "2812:0", "2281:0", "2282:0", "2275:0", "2289:1"]) {
  const found = zones.find((item) => item.key === zone);
  const points = found.points.map((seat) => ({
    s: seat.s ?? seat.invS,
    d: seat.d ?? seat.invD,
  }));
  const s0 = Math.min(...points.map((seat) => seat.s));
  const s1 = Math.max(...points.map((seat) => seat.s));
  console.log("\\nBINS", zone);
  const bins = 10;
  for (let i = 0; i < bins; i++) {
    const a = s0 + ((s1 - s0) * i) / bins;
    const b = s0 + ((s1 - s0) * (i + 1)) / bins;
    const sub = points.filter((seat) => seat.s >= a && seat.s <= b + 1e-6);
    if (!sub.length) {
      console.log(" empty", a.toFixed(1), b.toFixed(1));
      continue;
    }
    const ds = sub.map((seat) => seat.d);
    console.log(
      " bin",
      a.toFixed(1).padStart(7),
      "n",
      String(sub.length).padStart(4),
      "d",
      Math.min(...ds).toFixed(2),
      Math.max(...ds).toFixed(2),
    );
  }
}
for (const zone of zones) {
  console.log(
    zone.key,
    zone.name,
    "parts",
    zone.parts.length,
    zone.parts
      .map(
        (part) =>
          `seats ${part.seats} s ${part.s0.toFixed(1)}..${part.s1.toFixed(1)} d ${part.d0.toFixed(1)}..${part.d1.toFixed(1)} edge ${part.meanEdge.toFixed(2)}/${part.worst.toFixed(2)}`,
      )
      .join(" | "),
  );
}

const allX = seats.map((seat) => seat.x);
const allY = seats.map((seat) => seat.y);
const minX = Math.min(...allX) - 8;
const maxX = Math.max(...allX) + 8;
const minY = Math.min(...allY) - 8;
const maxY = Math.max(...allY) + 8;
const scale = 4;
const svg = (content, width, height) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${minX} ${-maxY} ${maxX - minX} ${maxY - minY}">${content}</svg>`;
const project = (x, y) => `${x.toFixed(2)},${(-y).toFixed(2)}`;

let body = `<rect x="${minX}" y="${-maxY}" width="${maxX - minX}" height="${maxY - minY}" fill="#e4edf1"/>`;
body += zones
  .map((zone) => {
    const dots = zone.points
      .map((seat) => `<circle cx="${seat.x.toFixed(2)}" cy="${(-seat.y).toFixed(2)}" r="0.28" fill="#7d8b86"/>`)
      .join("");
    const loops = zone.parts
      .map(
        (part) =>
          `<polyline fill="none" stroke="#185dac" stroke-width="0.28" points="${part.loop.map((point) => project(point[0], point[1])).join(" ")} ${project(part.loop[0][0], part.loop[0][1])}"/>`,
      )
      .join("");
    return dots + loops;
  })
  .join("");
mkdirSync("artifacts/performance/zone-outlines", { recursive: true });
writeFileSync(
  "artifacts/performance/zone-outlines/shape-all.svg",
  svg(body, (maxX - minX) * scale, (maxY - minY) * scale),
);

for (const zone of zones) {
  const xs = zone.points.map((seat) => seat.x);
  const ys = zone.points.map((seat) => seat.y);
  const pad = 3;
  const x0 = Math.min(...xs) - pad;
  const x1 = Math.max(...xs) + pad;
  const y0 = Math.min(...ys) - pad;
  const y1 = Math.max(...ys) + pad;
  const dots = zone.points
    .map((seat) => `<circle cx="${seat.x.toFixed(2)}" cy="${(-seat.y).toFixed(2)}" r="0.22" fill="#31464a"/>`)
    .join("");
  const loops = zone.parts
    .map(
      (part) =>
        `<polyline fill="rgba(24,93,172,0.08)" stroke="#185dac" stroke-width="0.22" points="${part.loop.map((point) => project(point[0], point[1])).join(" ")} ${project(part.loop[0][0], part.loop[0][1])}"/>`,
    )
    .join("");
  writeFileSync(
    `artifacts/performance/zone-outlines/shape-${zone.key.replace(":", "_")}.svg`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="700" viewBox="${x0} ${-y1} ${x1 - x0} ${y1 - y0}"><rect x="${x0}" y="${-y1}" width="${x1 - x0}" height="${y1 - y0}" fill="#e7eef2"/>${dots}${loops}<text x="${x0 + 0.4}" y="${-y1 + 1.4}" font-size="1.4" fill="#132e46">${zone.name} ${zone.key}</text></svg>`,
  );
}
console.log("wrote svgs");
