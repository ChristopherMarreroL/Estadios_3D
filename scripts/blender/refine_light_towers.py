"""Move the first- and third-base towers out of the seating bowl.

The 2022 Musco/LIDOM notes place four towers behind the outfield wall and
four behind or beside the grandstand, not among Palco A seats. This pass only
relocates the two towers that currently sit on the first/third-base terrace.
It is a visual correction, not a surveyed lighting plan.

Run: Blender --background public/models/estadio-quisqueya-v1.blend
--python scripts/blender/refine_light_towers.py
"""
import ast
import hashlib
import json
import math
import os
from pathlib import Path
import shutil

import bpy
import bmesh
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "public/models/estadio-quisqueya-v1.blend"
OUT = ROOT / "artifacts/blender/light-towers-near-20260924"
REV = "20260924-light-towers-near"
changed = []
assert Path(bpy.data.filepath).resolve() == SOURCE.resolve()
OUT.mkdir(parents=True, exist_ok=True)

tree = ast.parse((ROOT / "scripts/blender/improve_phase2.py").read_text(encoding="utf-8"))
exec(
    compile(
        ast.Module(
            body=[
                n
                for n in tree.body
                if isinstance(n, ast.FunctionDef) and n.name in ["mesh", "beam"]
            ],
            type_ignores=[],
        ),
        "helpers",
        "exec",
    )
)

for path in [SOURCE, SOURCE.with_name("estadio-quisqueya.glb")]:
    backup = path.with_name(path.stem + "-pre-light-towers-near-20260924" + path.suffix)
    if not backup.exists():
        shutil.copy2(path, backup)


def seat_fingerprint():
    digest = hashlib.sha256()
    for obj in sorted(bpy.context.scene.objects, key=lambda o: o.name):
        if obj.name.startswith(("catalog_seats_", "A6_")):
            digest.update(obj.name.encode())
            digest.update(str([list(row) for row in obj.matrix_world]).encode())
            if obj.type == "MESH":
                digest.update(str([tuple(v.co) for v in obj.data.vertices]).encode())
                digest.update(str([tuple(p.vertices) for p in obj.data.polygons]).encode())
    return digest.hexdigest()


before_seats = seat_fingerprint()

# A11 / K / 2 — the view the user reported as blocked by the lamps.
A11_K = Vector((-36.93, -47.55, 3.27))
A11_EYE = A11_K + Vector((0, 0, 1.15))
FIELD = Vector((0, -24, 1))

# Last usable terrace at the wings is ~(\u00b186, \u221242). Keep the masts outside
# that last row (~8 m out) so they hug the bowl without sitting in Palco A.
ANCHORS = [
    ("third_base", -92.0, -48.0, 38.0),
    ("first_base", 92.0, -48.0, 38.0),
]
OLD = {
    "third_base": (-102.0, -58.0, 38.0),
    "first_base": (102.0, -58.0, 38.0),
}
PREFIXES = (
    "light_tower_third_base",
    "light_tower_first_base",
    "phase3_tower_third_base",
    "phase3_tower_first_base",
)


def render_views(suffix):
    if os.environ.get("LIGHT_TOWERS_SKIP_RENDER") == "1":
        return
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 12
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 960
    scene.render.resolution_y = 600
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.45, 0.55, 0.7, 1)
    background.inputs["Strength"].default_value = 0.7
    original = scene.camera
    shots = [
        ("a11-k", A11_EYE, FIELD, 60),
        ("wing", Vector((48, -92, 42)), Vector((86, -46, 16)), 40),
    ]
    for name, location, target, fov in shots:
        output = OUT / f"{name}-{suffix}.png"
        if suffix == "before" and output.exists():
            continue
        data = bpy.data.cameras.new("light_tower_review")
        obj = bpy.data.objects.new("light_tower_review", data)
        scene.collection.objects.link(obj)
        obj.location = location
        obj.rotation_euler = (target - location).to_track_quat("-Z", "Y").to_euler()
        data.type = "PERSP"
        data.sensor_fit = "VERTICAL"
        data.sensor_height = 24
        data.lens = 24 / (2 * math.tan(math.radians(fov) / 2))
        data.clip_start = 0.05
        scene.camera = obj
        scene.render.filepath = str(output)
        bpy.ops.render.render(write_still=True)
        bpy.data.objects.remove(obj, do_unlink=True)
        bpy.data.cameras.remove(data)
    scene.camera = original


render_views("before")


def remove_named(prefixes):
    removed = []
    for obj in list(bpy.data.objects):
        if any(obj.name.startswith(prefix) for prefix in prefixes):
            removed.append(obj.name)
            bpy.data.objects.remove(obj, do_unlink=True)
    return removed


removed = remove_named(PREFIXES)


def box(v, f, center, size, axes=None):
    axes = axes or (Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1)))
    base = len(v)
    center = Vector(center)
    for x in (-1, 1):
        for y in (-1, 1):
            for z in (-1, 1):
                v.append(
                    tuple(
                        center
                        + axes[0] * x * size[0] / 2
                        + axes[1] * y * size[1] / 2
                        + axes[2] * z * size[2] / 2
                    )
                )
    f.extend(
        tuple(base + i for i in face)
        for face in [
            (0, 4, 6, 2),
            (1, 3, 7, 5),
            (0, 1, 5, 4),
            (2, 6, 7, 3),
            (0, 2, 3, 1),
            (4, 5, 7, 6),
        ]
    )


def build_tower(name, x, y, h):
    v, f = [], []

    def corner(z, k):
        radius = 1.65 - 0.85 * z / h
        dx, dy = [(-1, -1), (-1, 1), (1, 1), (1, -1)][k]
        return (x + dx * radius, y + dy * radius, z)

    for k in range(4):
        beam(v, f, corner(0.3, k), corner(h, k), 0.115, 8)
    levels = math.ceil(h / 3)
    for j in range(levels):
        z0 = h * j / levels
        z1 = h * (j + 1) / levels
        for k in range(4):
            beam(v, f, corner(z0, k), corner(z0, (k + 1) % 4), 0.065, 6)
            beam(v, f, corner(z0, k), corner(z1, (k + 1) % 4), 0.048, 6)
            beam(v, f, corner(z0, (k + 1) % 4), corner(z1, k), 0.048, 6)
    for dx in (-0.32, 0.32):
        beam(v, f, (x + dx, y + 1.85, 0.3), (x + dx, y + 1.85, h), 0.035, 6)
    for j in range(int(h / 0.35)):
        beam(
            v,
            f,
            (x - 0.32, y + 1.85, 0.3 + j * 0.35),
            (x + 0.32, y + 1.85, 0.3 + j * 0.35),
            0.025,
            6,
        )
    box(v, f, (x, y, h - 0.45), (3.6, 3.2, 0.16))
    for dx, dy in [(-1.7, -1.5), (-1.7, 1.5), (1.7, 1.5), (1.7, -1.5)]:
        beam(v, f, (x + dx, y + dy, h - 0.4), (x + dx, y + dy, h + 0.65), 0.04, 6)
    for a, b in [
        ((-1.7, -1.5), (-1.7, 1.5)),
        ((-1.7, 1.5), (1.7, 1.5)),
        ((1.7, 1.5), (1.7, -1.5)),
    ]:
        beam(
            v,
            f,
            (x + a[0], y + a[1], h + 0.65),
            (x + b[0], y + b[1], h + 0.65),
            0.04,
            6,
        )
    mesh("light_tower_" + name + "_mesh", v, f, "MAT_Steel")
    v, f = [], []
    for k in range(4):
        c = corner(0, k)
        box(v, f, (c[0], c[1], 0.15), (0.85, 0.85, 0.3))
    mesh("phase3_tower_" + name + "_footings", v, f, "MAT_Concrete")
    center = Vector((x, y, h + 1.8))
    # Face the infield, not the parking lot behind the grandstand.
    normal = (FIELD - center).normalized()
    right = normal.cross(Vector((0, 0, 1))).normalized()
    up = right.cross(normal).normalized()
    axes = (right, normal, up)
    v, f, lv, lf = [], [], [], []
    for sign in (-1, 1):
        beam(v, f, (x + sign * 0.7, y, h - 0.3), center + right * (sign * 1.1) - normal * 0.35, 0.115)
    for row in range(4):
        for col in range(6):
            c = center + right * ((col - 2.5) * 1.12) + up * ((row - 1.5) * 0.93)
            box(v, f, c, (0.85, 0.50, 0.80), axes)
            beam(lv, lf, c + normal * 0.255, c + normal * 0.29, 0.32, 12)
    for z in (-1.95, 1.95):
        beam(
            v,
            f,
            center + right * -3.3 + up * z - normal * 0.2,
            center + right * 3.3 + up * z - normal * 0.2,
            0.09,
        )
    mesh("phase3_tower_" + name + "_lamp_housings", v, f, "MAT_Steel")
    lamps = mesh("phase3_tower_" + name + "_projectors", lv, lf, "MAT_Light")
    lamps["projector_count"] = 24
    lamps["architecture_revision"] = REV


for name, x, y, h in ANCHORS:
    build_tower(name, x, y, h)

bpy.context.view_layer.update()
assert before_seats == seat_fingerprint()

placements = json.loads(
    (ROOT / "artifacts/blender/phase2-20260907/seat-placements.json").read_text()
)
seats = [s for group in placements["groups"] for s in group["seats"]]
clearance = []
for name, x, y, h in ANCHORS:
    nearest = min(
        seats,
        key=lambda s: math.hypot(s["position"][0] - x, s["position"][1] - y),
    )
    distance = math.hypot(nearest["position"][0] - x, nearest["position"][1] - y)
    assert distance > 8, (name, nearest, distance)
    clearance.append(
        {
            "tower": name,
            "xy": [x, y],
            "height": h,
            "nearest_seat": nearest["id"] if "id" in nearest else nearest.get("label"),
            "nearest_position": [round(c, 2) for c in nearest["position"]],
            "clearance_m": round(distance, 2),
        }
    )

a11_after = {
    name: round(math.hypot(x - A11_K.x, y - A11_K.y), 2)
    for name, x, y, _h in ANCHORS
}

render_views("after")

checks = {
    "revision": REV,
    "seat_meshes_unchanged": True,
    "removed": removed,
    "relocated": {
        name: {"from": list(OLD[name]), "to": [x, y, h]}
        for name, x, y, h in ANCHORS
    },
    "aim": [FIELD.x, FIELD.y, FIELD.z],
    "a11_k_distance": {
        "before": {
            name: round(math.hypot(OLD[name][0] - A11_K.x, OLD[name][1] - A11_K.y), 2)
            for name in OLD
        },
        "after": a11_after,
    },
    "clearance": clearance,
    "meshes": [],
}
for name, _x, _y, _h in ANCHORS:
    for suffix in ("_mesh",):
        obj = bpy.data.objects["light_tower_" + name + suffix]
        assert all(math.isfinite(c) for v in obj.data.vertices for c in v.co)
        bm = bmesh.new()
        bm.from_mesh(obj.data)
        bad = sum(1 for e in bm.edges if not e.is_manifold)
        bm.free()
        assert bad == 0, (obj.name, bad)
        checks["meshes"].append(
            {
                "name": obj.name,
                "vertices": len(obj.data.vertices),
                "non_manifold_edges": bad,
            }
        )

json.dump(checks, open(OUT / "checks.json", "w"), indent=2)
version = bpy.context.preferences.filepaths.save_version
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE))
bpy.context.preferences.filepaths.save_version = version
exec(
    compile(
        open(ROOT / "scripts/blender/export_web_phase1.py", encoding="utf-8").read(),
        "export_web_phase1.py",
        "exec",
    )
)
print("LIGHT_TOWERS_COMPLETE=" + json.dumps(checks))
