"""Replace provisional above-stair portal boxes with open stair approaches.

Conceptual model correction, not a survey of the real stadium. Run on the
current main blend. Preserves seats, circulation rails, roofs and camera origins.
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
OUT = ROOT / 'artifacts/blender/access-views-20260923'
REV = '20260923-open-access'
changed = []
assert Path(bpy.data.filepath).resolve() == SOURCE.resolve()
OUT.mkdir(parents=True, exist_ok=True)
for path in [SOURCE, SOURCE.with_name('estadio-quisqueya.glb')]:
    backup = path.with_name(path.stem+'-pre-access-20260923'+path.suffix)
    if not backup.exists():
        shutil.copy2(path, backup)

def import_functions(path, names):
    tree = ast.parse(path.read_text(encoding='utf-8'))
    exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef)
        and n.name in names], type_ignores=[]), str(path), 'exec'), globals())

import_functions(ROOT/'scripts/blender/improve_phase2.py', ['point','mesh','strip'])
import_functions(ROOT/'scripts/blender/refine_circulation.py', ['eye','render_samples'])

access_names = {f'{prefix}{i:02d}' for i in range(1,7)
    for prefix in ['vomitory_', 'phase3_access_sign_', 'phase3_access_text_']}

def preserved_geometry():
    digest = hashlib.sha256()
    for obj in sorted(bpy.context.scene.objects,key=lambda o:o.name):
        if obj.name in access_names or obj.type not in ['MESH','FONT']:
            continue
        digest.update(obj.name.encode())
        digest.update(str([list(row) for row in obj.matrix_world]).encode())
        if obj.type == 'MESH':
            digest.update(str([tuple(v.co) for v in obj.data.vertices]).encode())
            digest.update(str([tuple(p.vertices) for p in obj.data.polygons]).encode())
    return digest.hexdigest()

def obstacle_bvh():
    vertices, faces = [], []
    depsgraph = bpy.context.evaluated_depsgraph_get()
    for name in sorted(access_names):
        obj = bpy.data.objects[name].evaluated_get(depsgraph)
        data = obj.to_mesh()
        offset = len(vertices)
        vertices.extend(obj.matrix_world @ v.co for v in data.vertices)
        faces.extend(tuple(offset+i for i in p.vertices) for p in data.polygons)
        obj.to_mesh_clear()
    return BVHTree.FromPolygons(vertices,faces)

placements = json.loads((ROOT/'artifacts/blender/phase2-20260907/seat-placements.json').read_text())
seats = [s for g in placements['groups'] for s in g['seats']]
samples = [
    ('c13-front', next(s for s in seats if s['sectorId']==11489 and s['id']==5936)),
    ('c13-back', next(s for s in seats if s['sectorId']==11489 and s['id']==6024)),
]
# Include the corresponding opposite side, not just the originally reported seat.
opposite = min((s for s in seats if s['sectorId'] != 11489 and s['position'][2]>10),
    key=lambda s:(eye(s)-Vector((-49.81376,-76.93855,11.54))).length)
samples.append(('opposite-back',opposite))

# Field points inside the current model's foul lines: plate, mound, bases and
# an outfield grid. These rays assess access geometry only, not total visibility.
targets = [(0,-44,.15),(0,-19.6,.41),(19.4,-24.6,.15),(-19.4,-24.6,.15),(0,-5.2,.15)]
targets += [(x,y,.15) for y in range(-30,71,10) for x in range(-60,61,10)
            if abs(x) <= y+44 and x*x+(y+20)**2 < 105**2]

def blocked_rays(tree):
    blocked = set()
    for index,seat in enumerate(seats):
        origin = eye(seat)
        for ti,target in enumerate(targets):
            delta = Vector(target)-origin
            if tree.ray_cast(origin,delta.normalized(),delta.length)[0] is not None:
                blocked.add((index,ti))
    return blocked

baseline_hash = preserved_geometry()
already_refined = all(bpy.data.objects[f'vomitory_{i:02d}'].get('architecture_revision') == REV
    for i in range(1,7))
previous_report_path = OUT/'checks.json'
previous_report = json.loads(previous_report_path.read_text(encoding='utf-8')) if (
    already_refined and previous_report_path.exists()) else None
before_bvh = obstacle_bvh()
before_rays = blocked_rays(before_bvh)
if not already_refined:
    render_samples('before')

for i,s in enumerate([-62,-42,-21,21,42,62],1):
    # Low cheek curbs outside the existing rail footplates, stepped on the
    # actual 40-tread aisle profile. No overhead slab or opaque tall side wall.
    v,f = [],[]
    for a,b in [(s-.88,s-.79),(s+.79,s+.88)]:
        for j in range(13):
            d = 28+j*.4
            end = min(33,d+.4)
            z = 6.7+4.1*j/40+.015
            strip(v,f,a,b,[(d,z),(d,z+.28),(end,z+.28),(end,z)])
    obj = mesh(f'vomitory_{i:02d}',v,f,'MAT_Concrete_Light')
    obj['access_type'] = 'open stair approach; provisional geometry'
    obj['curb_height_m'] = .28
    obj['placement_basis'] = 'within existing aisle; no seat displacement'

    # Thin floor signage on the existing rear concourse, behind all upper rows.
    v,f = [],[]
    strip(v,f,s-.72,s+.72,[(44.35,10.802),(44.35,10.806),(45.05,10.806),(45.05,10.802)])
    mesh(f'phase3_access_sign_{i:02d}',v,f,'MAT_Licey_Blue')
    text = bpy.data.objects[f'phase3_access_text_{i:02d}']
    text.data.body = 'ACCESO'
    text.data.align_x = 'CENTER'
    text.data.size = .20
    # Baseline runs across the aisle; local +Y points towards the field.
    xaxis = (Vector(point(s+.1,44.7,0))-Vector(point(s-.1,44.7,0))).normalized()
    normal = Vector((0,0,1))
    yaxis = normal.cross(xaxis)
    rotation = Matrix((xaxis,yaxis,normal)).transposed().to_4x4()
    text.matrix_world = Matrix.Translation(Vector(point(s,44.78,10.809))) @ rotation
    text['architecture_revision'] = REV

bpy.context.view_layer.update()
assert preserved_geometry() == baseline_hash, 'Unrelated stadium geometry changed'
assert sum(o.get('catalog_seat_count',0) for o in bpy.context.scene.objects) == 11367
after_bvh = obstacle_bvh()
after_rays = blocked_rays(after_bvh)
newly_blocked = after_rays-before_rays
assert not newly_blocked, f'New access obstruction rays: {len(newly_blocked)}'
assert len(after_rays) <= len(before_rays) if already_refined else len(after_rays) < len(before_rays), 'Access visibility did not improve'
clearance = min(after_bvh.find_nearest(eye(s))[3] for s in seats)
assert clearance > .15
for name in changed:
    obj = bpy.data.objects[name]
    assert all(math.isfinite(c) for v in obj.data.vertices for c in v.co)
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    assert all(e.is_manifold for e in bm.edges), name
    bm.free()

report = {'revision':REV,'unrelated_geometry_unchanged':True,'geometry_sha256':baseline_hash,
    'total_seats':11367,'accesses':6,'targets_per_seat':len(targets),
    'rays_tested':len(seats)*len(targets),'blocked_before':len(before_rays),
    'blocked_after':len(after_rays),'newly_blocked':len(newly_blocked),
    'minimum_eye_clearance_m':clearance,'scope':'access meshes and their signage only',
    'views':[]}
for name,seat in samples:
    index = seats.index(seat)
    report['views'].append({'name':name,'sector_id':seat['sectorId'],'seat_id':seat['id'],
        'row':seat['row'],'label':seat['label'],'eye':list(eye(seat)),
        'blocked_before':sum(si==index for si,ti in before_rays),
        'blocked_after':sum(si==index for si,ti in after_rays)})
if previous_report:
    # Retain original before/after evidence on an identical repeat build.
    assert previous_report['geometry_sha256'] == baseline_hash
    assert previous_report['blocked_after'] == report['blocked_after']
    report['blocked_before'] = previous_report['blocked_before']
    for view in report['views']:
        prior = next(v for v in previous_report['views'] if v['name']==view['name'])
        assert prior['seat_id'] == view['seat_id']
        view['blocked_before'] = prior['blocked_before']
version = bpy.context.preferences.filepaths.save_version
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE))
bpy.context.preferences.filepaths.save_version = version
exec(compile((ROOT/'scripts/blender/export_web_phase1.py').read_text(encoding='utf-8'),'export','exec'))
report['glb_bytes'] = SOURCE.with_name('estadio-quisqueya.glb').stat().st_size
(OUT/'checks.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
render_samples('after')
print('ACCESS_VIEWS_COMPLETE',json.dumps(report))
