"""Independent read-only audit of current seat support and structural obstacles.

Run Blender --background MODEL --python this_file. Does not save or rebuild.
"""
import ast
import hashlib
import json
import struct
from pathlib import Path

import bpy
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parents[2]
placements = json.loads((ROOT / 'artifacts/blender/phase2-20260907/seat-placements.json').read_text())
source = ast.parse((ROOT / 'scripts/blender/improve_phase2.py').read_text(encoding='utf-8'))
exec(compile(ast.Module(body=[n for n in source.body if isinstance(n, ast.FunctionDef) and n.name == 'seat_shell'], type_ignores=[]), 'shell', 'exec'))
sv, sf = seat_shell()
deps = bpy.context.evaluated_depsgraph_get()

def world_tree(obj):
    evaluated = obj.evaluated_get(deps)
    mesh = evaluated.to_mesh()
    result = BVHTree.FromPolygons([obj.matrix_world @ v.co for v in mesh.vertices], [tuple(p.vertices) for p in mesh.polygons])
    evaluated.to_mesh_clear()
    return result

support_names = ['section_palco_a', 'section_palco_aa', 'section_bleachers_left', 'section_bleachers_right', 'section_corporate', 'spacing_terrace_extensions', 'special_suite_platforms', 'special_bullpen_platforms']
supports = [world_tree(bpy.data.objects[n]) for n in support_names]
obstacles = [(o.name, world_tree(o)) for o in bpy.context.scene.objects if o.type == 'MESH' and not o.hide_render and (
    o.name.startswith(('aisle_', 'corporate_divider_', 'press_box', 'roof', 'special_suite_access', 'special_suite_side')) or
    'rail' in o.name or o.name == 'special_bullpen_tables')]
unsupported = []
obstructed = []
count = 0
for group in placements['groups']:
    obj = bpy.data.objects['catalog_seats_' + str(group['id'])]
    count += len(group['seats'])
    for seat in group['seats']:
        p = Vector(seat['position'])
        mat = Matrix.Translation(p) @ Matrix.Rotation(seat['facing'], 4, 'Z')
        # Pedestal footprint must sit on actual surfaces at the expected height.
        for x, y in [(-.06,-.08),(-.06,.08),(.06,-.08),(.06,.08)]:
            foot = mat @ Vector((x,y,0))
            if not any(tree.ray_cast(foot + Vector((0,0,.08)), Vector((0,0,-1)), .18)[0] is not None for tree in supports):
                unsupported.append([seat['sectorId'], seat['id'], x, y])
    tree = world_tree(obj)
    for name, other in obstacles:
        if tree.overlap(other):
            obstructed.append([obj.name, name])
for obj in bpy.context.scene.objects:
    if obj.name.startswith('A6_') and obj.name.endswith('_shell'):
        tree = world_tree(obj)
        for name, other in obstacles:
            if tree.overlap(other):
                obstructed.append([obj.name, name])
asset = ROOT / 'public/models/estadio-quisqueya.glb'
asset_bytes = asset.read_bytes()
document = json.loads(asset_bytes[20:20+struct.unpack_from('<I', asset_bytes, 12)[0]])
web_count = sum(n.get('extras', {}).get('catalog_seat_count', 0) for n in document['nodes'])
assert web_count == count, (web_count, count)
hash_paths = [Path(bpy.data.filepath), asset, ROOT / 'artifacts/blender/phase2-20260907/seat-placements.json']
result = {'model': bpy.data.filepath, 'sha256': {p.relative_to(ROOT).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest() for p in hash_paths}, 'count': count, 'glbCount': web_count, 'supportObjects': support_names, 'obstaclesChecked': [n for n,_ in obstacles], 'unsupportedFootprints': unsupported, 'obstacleIntersections': obstructed}
# Current access visibility, using every final camera origin and the original
# 116 field targets. This measures access meshes/signage only, not all sightlines.
vertices, faces = [], []
for index in range(1, 7):
    for prefix in ['vomitory_', 'phase3_access_sign_', 'phase3_access_text_']:
        obj = bpy.data.objects[f'{prefix}{index:02d}'].evaluated_get(deps)
        mesh = obj.to_mesh()
        offset = len(vertices)
        vertices.extend(obj.matrix_world @ v.co for v in mesh.vertices)
        faces.extend(tuple(offset+i for i in face.vertices) for face in mesh.polygons)
        obj.to_mesh_clear()
access_tree = BVHTree.FromPolygons(vertices, faces)
targets = [(0,-44,.15),(0,-19.6,.41),(19.4,-24.6,.15),(-19.4,-24.6,.15),(0,-5.2,.15)]
targets += [(x,y,.15) for y in range(-30,71,10) for x in range(-60,61,10) if abs(x) <= y+44 and x*x+(y+20)**2 < 105**2]
blocked, clearance = [], float('inf')
for group in placements['groups']:
    for seat in group['seats']:
        eye = Vector(seat.get('eye', [seat['position'][0],seat['position'][1],seat['position'][2]+1.15]))
        clearance = min(clearance, access_tree.find_nearest(eye)[3])
        for index, target in enumerate(targets):
            delta = Vector(target)-eye
            if access_tree.ray_cast(eye, delta.normalized(), delta.length)[0] is not None:
                blocked.append([seat['sectorId'], seat['id'], index])
result['accessVisibility'] = {'scope':'six access meshes and signage only', 'totalSeats':count, 'targetsPerSeat':len(targets), 'raysTested':count*len(targets), 'blocked':blocked, 'minimumEyeClearance':clearance}
report_path = ROOT / 'artifacts/blender/pending-seats-20261005/current-geometry-checks.json'
report_path.write_text(json.dumps(result, indent=2))
print('CURRENT_SEAT_GEOMETRY', json.dumps(result))
assert count == 11975, count
assert not unsupported, unsupported
assert not obstructed, obstructed
assert not blocked, blocked
assert clearance > .15, clearance
