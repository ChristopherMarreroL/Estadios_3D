"""Render the spacing revision without modifying the saved Blender scene."""
import bpy, json
from pathlib import Path
from mathutils import Vector

root = Path(__file__).resolve().parents[2]
out = root / 'artifacts/blender/seat-spacing-audit-20260925'
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 8
scene.cycles.use_denoising = True
scene.render.resolution_x = 1000
scene.render.resolution_y = 700
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
data = bpy.data.cameras.new('spacing_review')
camera = bpy.data.objects.new('spacing_review', data)
scene.collection.objects.link(camera)
scene.camera = camera
data.lens = 35
placements = json.loads((root / 'artifacts/blender/phase2-20260907/seat-placements.json').read_text())
views = [('overview', Vector((160, -175, 160)), Vector((0, -15, 0)))]
for group_id in [2287, 2278]:
    seats = next(g['seats'] for g in placements['groups'] if g['id'] == group_id)
    seat = seats[len(seats)//4]
    p = Vector(seat['position'])
    views.append((str(group_id), p + Vector((5, -7, 9)), p))
for name, pos, target in views:
    camera.location = pos
    camera.rotation_euler = (target-pos).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = str(out / (name + '.png'))
    bpy.ops.render.render(write_still=True)
