export type Tier = {
  depth: [number, number];
  height: [number, number];
  steps: number;
};
// Shared with Blender. Distances remain provisional model metres.
export function terracePoint(
  s: number,
  depth: number,
  z: number,
): [number, number, number] {
  let d = depth;
  if (d >= 3) d -= 14 * Math.max(0, Math.min(1, (Math.abs(s) - 60) / 65));
  const sign = s < 0 ? -1 : 1,
    a = Math.abs(s);
  const theta = -Math.PI / 2 + Math.min(a / 24, Math.PI / 4);
  const wing = Math.max(0, a - (24 * Math.PI) / 4) / Math.sqrt(2);
  return [
    sign * ((24 + d) * Math.cos(theta) + wing),
    -32 + (24 + d) * Math.sin(theta) + wing,
    z,
  ];
}

// Exact physical distance on the same rounded arc/tangent/tapered wings.
const arcEnd = (24 * Math.PI) / 4;
function pathDistance(s: number, depth: number) {
  const a = Math.abs(s),
    taper = depth >= 3 ? Math.hypot(1, 14 / 65) : 1;
  const length =
    (Math.min(a, arcEnd) * (24 + depth)) / 24 +
    Math.max(0, Math.min(a, 60) - arcEnd) +
    Math.max(0, Math.min(a, 125) - 60) * taper +
    Math.max(0, a - 125);
  return Math.sign(s) * length;
}
function pathParameter(distance: number, depth: number) {
  let a = Math.abs(distance);
  const factors = [
    (24 + depth) / 24,
    1,
    depth >= 3 ? Math.hypot(1, 14 / 65) : 1,
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
}
export function measure(lo: number, hi: number, depth: number) {
  const origin = pathDistance(lo, depth);
  return {
    lo,
    hi,
    length: pathDistance(hi, depth) - origin,
    at: (distance: number) => pathParameter(origin + distance, depth),
    distance: (s: number) => pathDistance(s, depth) - origin,
  };
}
export function rowPosition(tier: Tier, rows: string[], label: string) {
  const fraction = (rows.indexOf(label) + 0.5) / rows.length;
  const step = tier.steps > 1 ? Math.floor(fraction * tier.steps) : 0;
  return {
    depth:
      tier.depth[0] +
      (tier.depth[1] - tier.depth[0]) *
        (tier.steps > 1 ? (step + 0.5) / tier.steps : fraction),
    height:
      tier.height[0] + ((tier.height[1] - tier.height[0]) * step) / tier.steps,
  };
}

// Face into the field, perpendicular to the actual row tangent on each wing.
export function terraceFacing(s: number, depth: number) {
  const taper =
    depth >= 3 && Math.abs(s) > 60 && Math.abs(s) < 125
      ? Math.atan(14 / 65)
      : 0;
  return Math.sign(s) * (Math.min(Math.abs(s) / 24, Math.PI / 4) + taper);
}
