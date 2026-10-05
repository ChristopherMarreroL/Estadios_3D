"""Render additions and comparisons without saving camera/visibility changes."""
import bpy,json,ast
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'artifacts/blender/pending-seats-20261005'
tree=ast.parse((ROOT/'scripts/blender/render_all_seats.py').read_text())
exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='render'],type_ignores=[]),'render','exec'))
backup=ROOT/'public/models/estadio-quisqueya-v1-pre-pending-seats-20261005.blend'
if backup.exists():
    bpy.ops.wm.open_mainfile(filepath=str(backup))
    render('before',(0,-125,130),(0,-32,0),35)
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'public/models/estadio-quisqueya-v1.blend'))
render('after',(0,-125,130),(0,-32,0),35)
placements=json.loads((ROOT/'src/data/special-seat-layout.json').read_text())
for group_id,sector_id,label in [(2281,11575,'vip-licey'),(2282,11594,'balcon-escogido'),(2812,13416,'bullpen-licey')]:
    group=next(g for g in placements['groups'] if g['id']==group_id)
    seats=[s for s in group['seats'] if s['sectorId']==sector_id]
    center=sum((Vector(s['position']) for s in seats),Vector())/len(seats)
    direction=Vector((0,-24,0))-center;direction.z=0;direction.normalize()
    distance=26 if group_id==2812 else 12
    render(label,center+direction*distance+Vector((0,0,distance)),center,32)
print('PENDING_SEATS_RENDERED')
