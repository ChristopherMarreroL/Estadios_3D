"""Pitchers' bullpens without seating (2026 layout).

Licey: the former left-field-line bullpen is now the VIP "Bullpen Licey"
locality, so the pitchers warm up behind the left-center wall, which gets a
transparent front and a field door. Escogido keeps its bullpen on the right
field line, beside AAA1-AAA10. Both only hold mounds, rubbers and plates.

Run: blender -b public/models/estadio-quisqueya-v1.blend --python scripts/blender/add_bullpens.py
"""
import ast, bpy, bmesh, math, json, shutil
from pathlib import Path
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'public/models/estadio-quisqueya-v1.blend'
assert Path(bpy.data.filepath).resolve() == SOURCE.resolve()
OUT = ROOT / 'artifacts/blender/bullpens-20261013'
OUT.mkdir(parents=True, exist_ok=True)
for path in [SOURCE, SOURCE.with_name('estadio-quisqueya.glb')]:
    backup = path.with_name(path.stem + '-pre-bullpens-20261013' + path.suffix)
    if not backup.exists():
        shutil.copy2(path, backup)
REV = '20261013-bullpens'
changed = []
tree = ast.parse((ROOT / 'scripts/blender/improve_phase2.py').read_text(encoding='utf-8'))
exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name in ['mesh', 'beam']], type_ignores=[]), 'helpers', 'exec'))


def point(s, d, z):
    a = abs(s); theta = -math.pi / 2 + min(a / 24, math.pi / 4); wing = max(0, a - 24 * math.pi / 4) / math.sqrt(2)
    return ((-1 if s < 0 else 1) * ((24 + d) * math.cos(theta) + wing), -32 + (24 + d) * math.sin(theta) + wing, z)


white = bpy.data.materials['MAT_Chalk']
MOUND = 18.44  # 60 ft 6 in, front of rubber to point of plate.


class Frame:
    def __init__(self, origin, along):
        self.o = Vector((origin[0], origin[1], 0)); self.u = Vector((along[0], along[1], 0)).normalized()
        self.n = Vector((-self.u.y, self.u.x, 0))

    def at(self, x, y, z):
        p = self.o + self.u * x + self.n * y; p.z = z; return tuple(p)

    def box(self, v, f, x0, x1, y0, y1, z0, z1):
        base = len(v); v.extend(self.at(x, y, z) for x in [x0, x1] for y in [y0, y1] for z in [z0, z1])
        f.extend(tuple(base + i for i in face) for face in [(0, 4, 6, 2), (1, 3, 7, 5), (0, 1, 5, 4), (2, 6, 7, 3), (0, 2, 3, 1), (4, 5, 7, 6)])

    def disc(self, v, f, x, y, z, r, sides=24):
        base = len(v); v.extend(self.at(x + r * math.cos(i * 2 * math.pi / sides), y + r * math.sin(i * 2 * math.pi / sides), z) for i in range(sides))
        f.append(tuple(base + i for i in range(sides)))

    def mound(self, v, f, x, y, z, r=1.65, top=.55, height=.25, sides=32):
        base = len(v)
        for radius, zz in [(r, z), (top, z + height)]:
            v.extend(self.at(x + radius * math.cos(i * 2 * math.pi / sides), y + radius * math.sin(i * 2 * math.pi / sides), zz) for i in range(sides))
        for i in range(sides):
            j = (i + 1) % sides; f.append((base + i, base + j, base + sides + j, base + sides + i))
        f.append(tuple(base + sides + i for i in range(sides))); f.append(tuple(base + i for i in reversed(range(sides))))

    def plate(self, v, f, x, y, z, toward):
        # The rear point sits at (x, y); the 17 in flat edge faces the pitcher.
        w, s = .216, toward
        pts = [(x + s * .432, y - w), (x + s * .432, y + w), (x + s * .216, y + w), (x, y), (x + s * .216, y - w)]
        base = len(v)
        for zz in [z, z + .02]:
            v.extend(self.at(px, py, zz) for px, py in pts)
        f.append(tuple(base + i for i in reversed(range(5)))); f.append(tuple(base + 5 + i for i in range(5)))
        for i in range(5):
            j = (i + 1) % 5; f.append((base + i, base + j, base + 5 + j, base + 5 + i))


def lanes(frame, name, ys, x_mound, direction, z, length_pad):
    """Clay lane, mound, rubber and plate per pitcher; direction +1/-1 along x."""
    clay_v, clay_f, chalk_v, chalk_f = [], [], [], []
    for y in ys:
        x_plate = x_mound + direction * (MOUND + .46)
        lo, hi = sorted([x_mound - direction * length_pad, x_plate + direction * .6])
        frame.box(clay_v, clay_f, lo, hi, y - 1.25, y + 1.25, z, z + .025)
        frame.mound(clay_v, clay_f, x_mound, y, z + .025)
        rubber = x_mound + direction * (-.46 + .075)
        frame.box(chalk_v, chalk_f, rubber - .075, rubber + .075, y - .305, y + .305, z + .275, z + .3)
        frame.plate(chalk_v, chalk_f, x_plate, y, z + .035, -direction)
    mesh(name + '_lanes', clay_v, clay_f, 'MAT_Clay')
    mesh(name + '_rubbers_plates', chalk_v, chalk_f, 'MAT_Chalk')


# Retire the first-draft bullpens that later tiers covered at the line ends.
retired = []
for obj in list(bpy.context.scene.objects):
    if obj.name.split('.')[0] in ['bullpen_licey', 'bullpen_escogido', 'bullpen_licey_grass_lane', 'bullpen_escogido_grass_lane', 'bullpen_licey_mound', 'bullpen_escogido_mound']:
        obj.hide_set(True); obj.hide_viewport = True; obj.hide_render = True; obj['retired_by'] = REV; retired.append(obj.name)

# --- Licey: behind the left-center wall (outfield_wall_03).
A, B = Vector((-58, 58, 0)), Vector((-40, 72, 0))
L = (B - A).length
lc = Frame(A, B - A)
X0, X1, DEPTH, DOOR = .9, L - .6, 9.0, (10.6, 11.8)
v, f = [], []
lc.box(v, f, X0, X1, .32, DEPTH, -.2, .02)
mesh('bullpen_licey_floor', v, f, 'MAT_Grass')
lanes(lc, 'bullpen_licey', [3.0, 6.4], X0 + 1.65, 1, .02, 1.6)
v, f = [], []
lc.box(v, f, X0 - .3, X1 + .3, DEPTH, DEPTH + .3, -.2, 3.5)
for x in [X0 - .3, X1]:
    lc.box(v, f, x, x + .3, .32, DEPTH, -.2, 3.5)
mesh('bullpen_licey_enclosure', v, f, 'MAT_Concrete_Light')

# The bar wall keeps its ends; the bullpen front is glass with a field door.
wall = bpy.data.objects['outfield_wall_03']
wall_z = (wall.matrix_world @ Vector((0, 0, 0))).z
v, f = [], []
for lo, hi in [(0, X0 - .3), (X1 + .3, L)]:
    beam(v, f, lc.at(lo, 0, wall_z), lc.at(hi, 0, wall_z), .32, 8)
mesh('outfield_wall_03_ends', v, f, 'MAT_Batters_Eye')
wall.hide_set(True); wall.hide_viewport = True; wall.hide_render = True; wall['retired_by'] = REV
v, f = [], []
for lo, hi in [(X0 - .3, DOOR[0]), (DOOR[1], X1 + .3)]:
    lc.box(v, f, lo, hi, -.02, .02, .25, 2.55)
mesh('bullpen_licey_glass_front', v, f, 'MAT_Glass')
v, f = [], []
lc.box(v, f, X0 - .3, X1 + .3, -.06, .06, 0, .25)
lc.box(v, f, X0 - .3, X1 + .3, -.06, .06, 2.55, 2.7)
posts = [X0 - .3 + i * (DOOR[0] - X0 + .3) / 4 for i in range(5)] + [DOOR[1] + i * (X1 + .3 - DOOR[1]) / 4 for i in range(5)]
for x in posts:
    lc.box(v, f, x - .05, x + .05, -.06, .06, 0, 2.7)
mesh('bullpen_licey_front_frame', v, f, 'MAT_Steel')
v, f = [], []
lc.box(v, f, DOOR[0] + .03, DOOR[1] - .03, -.04, .04, .02, 2.5)
mesh('bullpen_licey_field_door', v, f, 'MAT_Licey_Blue')

# The left-center board sat over the new enclosure: mount it on the back wall.
panel = bpy.data.objects['advertising_left_field_panel_02']
panel.matrix_world = Matrix.Translation(Vector(lc.at((X0 + X1) / 2 + 3, DEPTH + .15, 5.06))) @ Matrix.Rotation(math.atan2(lc.u.y, lc.u.x), 4, 'Z')

# --- Escogido: right field line, mirror of the VIP Bullpen Licey footprint.
origin = point(104, -2, 0)
rf = Frame(origin, (math.cos(math.pi / 4), math.sin(math.pi / 4)))
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

for name in changed:
    bpy.data.objects[name]['bullpen_layout'] = REV
bpy.context.view_layer.update()


def world_tree(obj):
    from mathutils.bvhtree import BVHTree
    ev = obj.evaluated_get(bpy.context.evaluated_depsgraph_get()); m = ev.to_mesh()
    t = BVHTree.FromPolygons([obj.matrix_world @ p.co for p in m.vertices], [tuple(p.vertices) for p in m.polygons]); ev.to_mesh_clear(); return t


new = [bpy.data.objects[n] for n in changed if 'floor' in n or 'lanes' in n or 'enclosure' in n or 'rail' in n]
others = [o for o in bpy.context.scene.objects if o.type == 'MESH' and not o.hide_render and o.visible_get() and o.name not in changed
          and (o.name.startswith(('catalog_seats_', 'section_', 'special_', 'spacing_', 'light_tower', 'phase3_tower', 'aisle_')) or o.name == 'advertising_left_field_panel_02')]
others_t = [(o.name, world_tree(o)) for o in others]
clashes = []
for o in new:
    t = world_tree(o)
    clashes += [[o.name, name] for name, other in others_t if t.overlap(other)]
checks = {'revision': REV, 'added': changed, 'retired': retired + ['outfield_wall_03'], 'clashes': clashes}
(OUT / 'model-checks.json').write_text(json.dumps(checks, indent=2))
print('BULLPEN_CHECKS', json.dumps(checks))
assert not clashes, clashes
version = bpy.context.preferences.filepaths.save_version; bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE)); bpy.context.preferences.filepaths.save_version = version
exec(compile((ROOT / 'scripts/blender/export_web_phase1.py').read_text(encoding='utf-8'), 'export', 'exec'))
print('BULLPENS_DONE')
