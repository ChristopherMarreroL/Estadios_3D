"""Remove the Bullpen Licey VIP, square the Escogido bullpen to AAA1-AAA10 and
run the protective net along the whole Palco A front.

The net sits between the dugout roofs and the Palco A front wall, and steps
out in front of the Corporativo wall behind home plate.

Run after add_bullpens.py:
blender -b public/models/estadio-quisqueya-v1.blend --python scripts/blender/refine_bullpens_net.py
"""
import ast, bpy, bmesh, math, json, shutil
from pathlib import Path
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'public/models/estadio-quisqueya-v1.blend'
assert Path(bpy.data.filepath).resolve() == SOURCE.resolve()
OUT = ROOT / 'artifacts/blender/bullpens-net-20261014'
OUT.mkdir(parents=True, exist_ok=True)
for path in [SOURCE, SOURCE.with_name('estadio-quisqueya.glb')]:
    backup = path.with_name(path.stem + '-pre-bullpens-net-20261014' + path.suffix)
    if not backup.exists():
        shutil.copy2(path, backup)
REV = '20261014-bullpens-net'
changed = []
phase2 = ast.parse((ROOT / 'scripts/blender/improve_phase2.py').read_text(encoding='utf-8'))
exec(compile(ast.Module(body=[n for n in phase2.body if isinstance(n, ast.FunctionDef) and n.name in ['mesh', 'beam']], type_ignores=[]), 'helpers', 'exec'))
bullpens = ast.parse((ROOT / 'scripts/blender/add_bullpens.py').read_text(encoding='utf-8'))
exec(compile(ast.Module(body=[n for n in bullpens.body if (isinstance(n, ast.ClassDef) and n.name == 'Frame') or (isinstance(n, ast.FunctionDef) and n.name in ['point', 'lanes'])]
                        + [n for n in bullpens.body if isinstance(n, ast.Assign) and getattr(n.targets[0], 'id', '') == 'MOUND'], type_ignores=[]), 'bullpen_helpers', 'exec'))

ARC = 24 * math.pi / 4


def retire(name):
    obj = bpy.data.objects.get(name)
    if obj is None:
        return None
    obj.hide_set(True); obj.hide_viewport = True; obj.hide_render = True; obj['retired_by'] = REV
    return name


def sd(p):
    """Physical (untapered) terrace coordinates of a plan point."""
    ax, yy = abs(p.x), p.y + 32
    sign = -1 if p.x < 0 else 1
    if math.atan2(yy, ax) <= -math.pi / 4:
        return sign * (math.atan2(yy, ax) + math.pi / 2) * 24, math.hypot(ax, yy) - 24
    a, w = (ax - yy) / 2, (ax + yy) / 2
    return sign * (ARC + w * math.sqrt(2)), a / math.cos(math.pi / 4) - 24


def taper(s):
    return 14 * max(0, min(1, (abs(s) - 60) / 65))


# The UEPA "Bullpen Licey" VIP is not built; only the pitchers' bullpen remains.
retired = [n for n in map(retire, ['catalog_seats_2812', 'special_bullpen_platforms', 'special_bullpen_tables',
                                    'special_bullpen_front_rail', 'advertising_left_field_panel_01',
                                    'advertising_left_field_panel_02', 'A6_safety_net', 'A6_net_supports']) if n]

v, f = [], []
door = bpy.data.objects['bullpen_licey_field_door']
door.data.materials[0] = bpy.data.materials['MAT_Steel']; door['bullpen_layout'] = REV

# --- Escogido: parallel to the AAA front (nominal depth 17, tapered), centred on AAA4-AAA6.
S_ESC = 106
front = lambda s: 17 - taper(s) - .3
along = Vector(point(S_ESC + .5, front(S_ESC + .5), 0)) - Vector(point(S_ESC - .5, front(S_ESC - .5), 0))
rf = Frame((0, 0), along)
back = Vector(point(S_ESC, front(S_ESC) - 1.5, 0))
rf.o = back + rf.n * 7.0
v, f = [], []
rf.box(v, f, -11.5, 11.5, -7.0, -.3, .09, .13)
mesh('bullpen_escogido_floor', v, f, 'MAT_Turf_Light')
lanes(rf, 'bullpen_escogido', [-2.1, -5.2], -8.9, 1, .13, 1.6)
v, f = [], []
rf.box(v, f, -11.5, 11.5, -.12, 0, .09, .55)
mesh('bullpen_escogido_kickboard', v, f, 'MAT_Escogido_Red')
v, f = [], []
beam(v, f, rf.at(-11.5, -.06, 1.2), rf.at(11.5, -.06, 1.2), .035, 8)
for x in [-11.5, -8, -4, 0, 4, 8, 11.5]:
    beam(v, f, rf.at(x, -.06, .55), rf.at(x, -.06, 1.2), .03, 6)
for x in [-11.5, 11.5]:
    beam(v, f, rf.at(x, -.06, 1.2), rf.at(x, -7.0, 1.2), .035, 8)
    for y in [-.06, -3.5, -7.0]:
        beam(v, f, rf.at(x, y, .13), rf.at(x, y, 1.2), .03, 6)
mesh('bullpen_escogido_rail', v, f, 'MAT_Steel')

# --- Protective net along every Palco A sector.
def max_abs_s(name):
    obj = bpy.data.objects[name]
    return max(abs(sd(obj.matrix_world @ p.co)[0]) for p in obj.data.vertices)


S_CORP = max(max_abs_s('corporate_front_wall'), max_abs_s('section_corporate')) + .3
S_END = 87.3 + .4
D_CORP, BOTTOM, TOP = -.45, .13, 7.0
net_d = lambda s: 2.9 - taper(s)
wing = [S_END - (S_END - S_CORP) * i / 64 for i in range(65)]
path = ([(-s, net_d(s)) for s in wing] + [(-S_CORP + 2 * S_CORP * i / 48, D_CORP) for i in range(49)]
        + [(s, net_d(s)) for s in reversed(wing)])
plan = [Vector(point(s, d, 0)) for s, d in path]
distance = [0.0]
for a, b in zip(plan, plan[1:]):
    distance.append(distance[-1] + (b - a).length)
v, f = [], []
for p in plan:
    v += [(p.x, p.y, BOTTOM), (p.x, p.y, TOP)]
for i in range(len(plan) - 1):
    f.append((2 * i, 2 * i + 2, 2 * i + 3, 2 * i + 1))
net = mesh('palco_a_safety_net', v, f, 'A6_Net')
uv = net.data.uv_layers.new(name='UVMap')
for poly in net.data.polygons:
    for li in poly.loop_indices:
        vi = net.data.loops[li].vertex_index
        uv.data[li].uv = (distance[vi // 2] / .14, (TOP - BOTTOM) / .14 * (vi % 2))
v, f = [], []
posts = [0]
for i in range(1, len(plan) - 1):
    corner = abs(path[i][1] - path[i - 1][1]) > 1 or abs(path[i + 1][1] - path[i][1]) > 1
    if corner or distance[i] - distance[posts[-1]] >= 7.5:
        posts.append(i)
posts.append(len(plan) - 1)
for i in posts:
    beam(v, f, (plan[i].x, plan[i].y, .1), (plan[i].x, plan[i].y, TOP + .15), .04, 8)
for a, b in zip(plan, plan[1:]):
    beam(v, f, (a.x, a.y, TOP), (b.x, b.y, TOP), .008, 6)
mesh('palco_a_net_supports', v, f, 'A6_Steel')

for name in changed:
    bpy.data.objects[name]['bullpen_layout'] = REV
bpy.context.view_layer.update()


def world_tree(obj):
    ev = obj.evaluated_get(bpy.context.evaluated_depsgraph_get()); m = ev.to_mesh()
    t = BVHTree.FromPolygons([obj.matrix_world @ p.co for p in m.vertices], [tuple(p.vertices) for p in m.polygons]); ev.to_mesh_clear(); return t


others = [o for o in bpy.context.scene.objects if o.type == 'MESH' and not o.hide_render and o.visible_get() and o.name not in changed
          and not o.name.startswith(('field_', 'infield', 'stadium_site', 'phase2_backstop', 'A6_dugout_junction', 'foul_line'))]
others_t = [(o.name, world_tree(o)) for o in others]
clashes = []
for name in changed:
    if name in ['bullpen_escogido_lanes', 'bullpen_escogido_rubbers_plates']:
        continue
    t = world_tree(bpy.data.objects[name])
    clashes += [[name, other] for other, ot in others_t if t.overlap(ot)]
checks = {'revision': REV, 'added': changed, 'retired': retired, 'corporateNetS': S_CORP, 'netLength': distance[-1],
          'netPosts': len(posts), 'clashes': clashes}
(OUT / 'model-checks.json').write_text(json.dumps(checks, indent=2))
print('NET_CHECKS', json.dumps(checks))
assert not clashes, clashes
version = bpy.context.preferences.filepaths.save_version; bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE)); bpy.context.preferences.filepaths.save_version = version
exec(compile((ROOT / 'scripts/blender/export_web_phase1.py').read_text(encoding='utf-8'), 'export', 'exec'))
print('BULLPENS_NET_DONE')
