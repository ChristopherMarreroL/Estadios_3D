"""Rebuild Preferencias (2276) and Gradas (2278) seats from the shared placements.

Run after `bun scripts/export-seat-placements.ts`:
Blender --background public/models/estadio-quisqueya-v1.blend
--python scripts/blender/rebuild_seat_spacing.py

Only these two merged seat meshes change. Palco A (with the A6 pilot), AA, AAA
and corporate seats keep their geometry.
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
OUT = ROOT / "artifacts/blender/seat-spacing-walkways-20260924"
REV = "20260924-seat-walkways"
GROUPS = {2276, 2278}
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
                if isinstance(n, ast.FunctionDef) and n.name in ["mesh", "seat_shell"]
            ],
            type_ignores=[],
        ),
        "helpers",
        "exec",
    )
)

for path in [SOURCE, SOURCE.with_name("estadio-quisqueya.glb")]:
    backup = path.with_name(path.stem + "-pre-seat-walkways-20260924" + path.suffix)
    if not backup.exists():
        shutil.copy2(path, backup)


def fingerprint(names):
    digest = hashlib.sha256()
    for name in sorted(names):
        obj = bpy.data.objects[name]
        digest.update(name.encode())
        digest.update(str([tuple(v.co) for v in obj.data.vertices]).encode())
    return digest.hexdigest()


kept = [
    o.name
    for o in bpy.context.scene.objects
    if o.type == "MESH"
    and (
        (o.name.startswith("catalog_seats_") and int(o.name.split("_")[-1]) not in GROUPS)
        or o.name.startswith("A6_")
    )
]
kept_before = fingerprint(kept)

placements = json.loads(
    (ROOT / "artifacts/blender/phase2-20260907/seat-placements.json").read_text()
)
sample = min(
    (s for g in placements["groups"] if g["id"] == 2278 for s in g["seats"]),
    key=lambda s: (Vector(s["position"]) - Vector((-98, 4, 8))).length,
)


def render(suffix):
    if os.environ.get("SEAT_SPACING_SKIP_RENDER") == "1":
        return
    output = OUT / f"gradas-{suffix}.png"
    if suffix == "before" and output.exists():
        return
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 12
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 960
    scene.render.resolution_y = 600
    scene.render.image_settings.file_format = "PNG"
    data = bpy.data.cameras.new("seat_spacing_review")
    obj = bpy.data.objects.new("seat_spacing_review", data)
    scene.collection.objects.link(obj)
    eye = Vector(sample["position"]) + Vector((0, 0, 1.15))
    obj.location = eye + Vector((0, 0, 3.5))
    target = Vector(sample["position"]) + Vector((6, 6, -1))
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()
    data.lens = 24 / (2 * math.tan(math.radians(60) / 2))
    data.sensor_fit = "VERTICAL"
    data.sensor_height = 24
    original = scene.camera
    scene.camera = obj
    scene.render.filepath = str(output)
    bpy.ops.render.render(write_still=True)
    scene.camera = original
    bpy.data.objects.remove(obj, do_unlink=True)
    bpy.data.cameras.remove(data)


render("before")

sv, sf = seat_shell()
# Gradas keep a walkway between sectors, which leaves ~0.43 m per seat;
# a 0.40 m shell (vs 0.46 m) avoids neighbouring seats intersecting.
WIDTH = {2276: 1.0, 2278: 0.40 / 0.46}
counts = {}
for group in placements["groups"]:
    if group["id"] not in GROUPS:
        continue
    shell = [(px * WIDTH[group["id"]], py, pz) for px, py, pz in sv]
    v, f = [], []
    for seat in group["seats"]:
        x, y, z = seat["position"]
        angle = math.atan2(-x, -24 - y)
        sn, cs = math.sin(angle), math.cos(angle)
        base = len(v)
        v.extend((x + px * cs + py * sn, y - px * sn + py * cs, z + pz) for px, py, pz in shell)
        f.extend(tuple(base + i for i in face) for face in sf)
    obj = mesh("catalog_seats_" + str(group["id"]), v, f, group["material"], True)
    obj.data.materials.append(bpy.data.materials["MAT_Steel"])
    for face in obj.data.polygons:
        if face.index % len(sf) >= len(sf) - 6:
            face.material_index = 1
    obj["catalog_seat_count"] = len(group["seats"])
    obj["placement_status"] = "approximate shared with web cameras; width-weighted slots"
    counts[group["id"]] = len(group["seats"])

bpy.context.view_layer.update()
assert kept_before == fingerprint(kept)
render("after")

checks = {
    "revision": REV,
    "rebuilt": {str(k): v for k, v in counts.items()},
    "other_seats_unchanged": True,
}
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
print("SEAT_SPACING_COMPLETE=" + json.dumps(checks))
