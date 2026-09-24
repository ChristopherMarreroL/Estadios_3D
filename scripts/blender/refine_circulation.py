"""Local circulation detail, preserving all seats and camera origins.

Run with Blender --background public/models/estadio-quisqueya-v1.blend
--python scripts/blender/refine_circulation.py. Dimensions are conceptual.
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
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'public/models/estadio-quisqueya-v1.blend'
OUT = ROOT / 'artifacts/blender/circulation-20260923'
REV = '20260923-circulation'
changed = []
assert Path(bpy.data.filepath).resolve() == SOURCE.resolve()
OUT.mkdir(parents=True, exist_ok=True)

# Import only pure geometry helpers; do not run an earlier build.
tree = ast.parse((ROOT / 'scripts/blender/improve_phase2.py').read_text(encoding='utf-8'))
exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n, ast.FunctionDef)
    and n.name in ['point', 'mesh', 'strip', 'beam']], type_ignores=[]), 'helpers', 'exec'))

for path in [SOURCE, SOURCE.with_name('estadio-quisqueya.glb')]:
    backup = path.with_name(path.stem + '-pre-circulation-20260923' + path.suffix)
    if not backup.exists():
        shutil.copy2(path, backup)

def seat_fingerprint():
    digest = hashlib.sha256()
    for obj in sorted(bpy.context.scene.objects, key=lambda o: o.name):
        if obj.name.startswith(('catalog_seats_', 'A6_')):
            digest.update(obj.name.encode())
            digest.update(str([list(row) for row in obj.matrix_world]).encode())
            if obj.type == 'MESH':
                digest.update(str([tuple(v.co) for v in obj.data.vertices]).encode())
                digest.update(str([tuple(p.vertices) for p in obj.data.polygons]).encode())
    return digest.hexdigest()

before = seat_fingerprint()
placements = json.loads((ROOT / 'artifacts/blender/phase2-20260907/seat-placements.json').read_text())
seats = [s for group in placements['groups'] for s in group['seats']]

def eye(s):
    return Vector(s['position']) + Vector((0, 0, 1.15))

# Actual catalogue seats nearest an aisle, at the upper tier front and rear.
upper = next(g['seats'] for g in placements['groups'] if g['id'] == 2276)
samples = [
    ('aisle', min((s for s in seats if 2 < s['position'][2] < 4),
        key=lambda s: (Vector(s['position']) - Vector(point(-21, 11, 2.8))).length)),
    ('upper-front', min(upper, key=lambda s: (Vector(s['position']) - Vector(point(21, 28.5, 6.7))).length)),
    ('upper-back', min(upper, key=lambda s: (Vector(s['position']) - Vector(point(21, 43, 10.5))).length)),
]

def render_samples(suffix):
    if os.environ.get('CIRCULATION_SKIP_RENDER') == '1':
        return
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 12
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 960
    scene.render.resolution_y = 600
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get('Background')
    background.inputs['Color'].default_value = (.45, .55, .7, 1)
    background.inputs['Strength'].default_value = .7
    original_camera = scene.camera
    for name, seat in samples:
        output = OUT / f'{name}-{suffix}.png'
        if suffix == 'before' and output.exists():
            continue
        data = bpy.data.cameras.new('circulation_review')
        obj = bpy.data.objects.new('circulation_review', data)
        scene.collection.objects.link(obj)
        obj.location = eye(seat)
        target = Vector((0, -24, 1))
        obj.rotation_euler = (target - obj.location).to_track_quat('-Z', 'Y').to_euler()
        data.type = 'PERSP'
        data.sensor_fit = 'VERTICAL'
        data.sensor_height = 24
        data.lens = 24 / (2 * math.tan(math.radians(60) / 2))
        data.clip_start = .05
        scene.camera = obj
        scene.render.filepath = str(output)
        bpy.ops.render.render(write_still=True)
        bpy.data.objects.remove(obj, do_unlink=True)
        bpy.data.cameras.remove(data)
    scene.camera = original_camera

render_samples('before')

def material(name, color, roughness, metal=0):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Roughness'].default_value = roughness
    shader.inputs['Metallic'].default_value = metal

material('Circulation_Nosing', (.64, .52, .25), .9)
material('Circulation_Steel', (.075, .10, .09), .58, .5)
material('Circulation_Fixing', (.27, .29, .27), .5, .65)
AISLES = [-82, -62, -42, -21, 0, 21, 42, 62, 82]
TIERS = [(3, 17, 1.1, 4.2, 20, 60), (17, 28, 4.2, 6.7, 14, 125),
         (28, 44, 6.7, 10.8, 20, 125)]

# Match the actual aisle's double steps, including its existing 15 mm offset.
v, f = [], []
nosing_count = 0
for s in AISLES:
    for d0, d1, z0, z1, rows, extent in TIERS:
        if abs(s) + .9 > extent:
            continue
        for j in range(rows * 2):
            d = d0 + (d1-d0) * j / (rows*2)
            z = z0 + (z1-z0) * j / (rows*2) + .015
            strip(v, f, s-.64, s+.64,
                  [(d+.006,z+.002),(d+.006,z+.006),(d+.056,z+.006),(d+.056,z+.002)])
            nosing_count += 1
mesh('circulation_step_nosings', v, f, 'Circulation_Nosing')

# Rebuild only the existing stair rails: complete their terminal posts and
# turn the ends down, so tubes do not end abruptly in the walking direction.
v, f, mv, mf = [], [], [], []
rail_runs = 0
for s in AISLES:
    for d0, d1, z0, z1, rows, extent in TIERS:
        if abs(s)+.9 > extent:
            continue
        for side in [-.72, .72]:
            start, end = d0+.12, d1-.12
            def rail_point(d):
                return point(s+side, d, z0+(z1-z0)*(d-d0)/(d1-d0)+.965)
            count = math.ceil((end-start)/1.8)
            for j in range(count):
                a = start+(end-start)*j/count
                b = start+(end-start)*(j+1)/count
                beam(v, f, rail_point(a), rail_point(b), .032, 8)
            for j in range(count+1):
                d = start+(end-start)*j/count
                tread = min(rows*2-1, math.floor((d-d0)/(d1-d0)*rows*2))
                z = z0+(z1-z0)*tread/(rows*2)+.015
                beam(v, f, point(s+side,d,z), rail_point(d), .028, 8)
                beam(mv, mf, point(s+side,d,z+.002),point(s+side,d,z+.025), .065, 8)
            for d in [start,end]:
                top = Vector(rail_point(d))
                beam(v, f, top, top-Vector((0,0,.16)), .032, 8)
            rail_runs += 1
mesh('phase3_aisle_handrails', v, f, 'Circulation_Steel', True)
mesh('circulation_rail_footplates', mv, mf, 'Circulation_Fixing')

# Keep the upper front rail's existing height and position; add a midrail and
# slender infill. The same 2.10 m aisle openings remain completely open.
v, f = [], []
segments, cursor = [], -125
for s in AISLES:
    segments.append((cursor, s-1.05))
    cursor = s+1.05
segments.append((cursor,125))
for lo, hi in segments:
    count = max(1, math.ceil((hi-lo)/1.8))
    for j in range(count):
        a, b = lo+(hi-lo)*j/count, lo+(hi-lo)*(j+1)/count
        for height, radius in [(7.55,.032),(7.10,.018)]:
            beam(v,f,point(a,28,height),point(b,28,height),radius,8)
        infill = math.ceil((b-a)/.4)
        for k in range(1,infill):
            t = a+(b-a)*k/infill
            beam(v,f,point(t,28,6.78),point(t,28,7.52),.012,6)
    for j in range(count+1):
        s = lo+(hi-lo)*j/count
        beam(v,f,point(s,28,6.72),point(s,28,7.55),.032,8)
mesh('phase3_tier_front_guards',v,f,'Circulation_Steel',True)

bpy.context.view_layer.update()
assert before == seat_fingerprint(), 'Seat or A6 geometry changed'
assert sum(o.get('catalog_seat_count',0) for o in bpy.context.scene.objects) == 11367
report = {'revision':REV, 'seat_geometry_unchanged':True, 'seat_sha256':before,
          'nosing_count':nosing_count, 'rail_runs':rail_runs,
          'aisle_guard_opening_m':2.1, 'meshes':[], 'views':[]}
for name in changed:
    obj = bpy.data.objects[name]
    assert all(math.isfinite(c) for vertex in obj.data.vertices for c in vertex.co)
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    assert all(e.is_manifold for e in bm.edges), name
    bm.free()
    report['meshes'].append({'name':name, 'vertices':len(obj.data.vertices)})

# Check that added/rebuilt circulation geometry never encloses an eye point.
vertices, faces = [], []
for name in changed:
    obj = bpy.data.objects[name]
    offset = len(vertices)
    vertices.extend(obj.matrix_world @ vertex.co for vertex in obj.data.vertices)
    faces.extend(tuple(offset+i for i in poly.vertices) for poly in obj.data.polygons)
bvh = BVHTree.FromPolygons(vertices, faces)
clearance = min(bvh.find_nearest(eye(s))[3] for s in seats)
assert clearance > .15, f'Circulation too close to a camera: {clearance}'
report['minimum_eye_clearance_m'] = clearance
for name, seat in samples:
    targets = {'home':(0,-44,.1), 'mound':(0,-19.6,.41), 'center':(0,65,1)}
    hits = {}
    for label,target in targets.items():
        delta = Vector(target)-eye(seat)
        hits[label] = bvh.ray_cast(eye(seat),delta.normalized(),delta.length)[0] is not None
    report['views'].append({'name':name,'seat_id':seat['id'],'sector_id':seat['sectorId'],
        'row':seat['row'],'label':seat['label'],'eye':list(eye(seat)),
        'circulation_intersects_sample_ray':hits})

version = bpy.context.preferences.filepaths.save_version
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE))
bpy.context.preferences.filepaths.save_version = version
exec(compile((ROOT / 'scripts/blender/export_web_phase1.py').read_text(encoding='utf-8'),'export','exec'))
report['glb_bytes'] = SOURCE.with_name('estadio-quisqueya.glb').stat().st_size
(OUT / 'checks.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
render_samples('after')
print('CIRCULATION_COMPLETE',json.dumps(report))
