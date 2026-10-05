"""Render before/after redistribution and diagnostic sectors; never save cameras."""
import bpy,json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'artifacts/blender/all-seats-20261005'
placements=json.loads((ROOT/'artifacts/blender/phase2-20260907/seat-placements.json').read_text())
def render(name,position,target,lens=35):
    scene=bpy.context.scene
    for obj in bpy.data.objects:
        if "roof" in obj.name or obj.name.startswith("press_box"):obj.hide_render=True
    scene.render.engine='CYCLES';scene.cycles.samples=8;scene.cycles.use_denoising=True
    scene.render.resolution_x=1200;scene.render.resolution_y=800;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG'
    data=bpy.data.cameras.new('redistribution_review')
    camera=bpy.data.objects.new('redistribution_review',data);scene.collection.objects.link(camera);scene.camera=camera
    camera.location=Vector(position);camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler();data.lens=lens
    scene.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(camera,do_unlink=True);bpy.data.cameras.remove(data)
backup=ROOT/'public/models/estadio-quisqueya-v1-pre-redistribution-20261005.blend'
if backup.exists():
    bpy.ops.wm.open_mainfile(filepath=str(backup))
    render('before',(0,-110,115),(0,-30,0),35)
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'public/models/estadio-quisqueya-v1.blend'))
render('after',(0,-110,115),(0,-30,0),35)
for group_id,sector_id,label in [(2287,11608,'A6'),(2288,11651,'AA11'),(2276,11451,'C4'),(2278,11522,'D12')]:
    group=next(g for g in placements['groups'] if g['id']==group_id)
    catalog=json.loads((ROOT/'src/data/seat-catalog.json').read_text())
    source=next(g for g in catalog['groups'] if g['id']==group_id)
    sector=next(s for s in source['sectors'] if s['name'].endswith('- '+label))
    seats=[s for s in group['seats'] if s['sectorId']==sector['id']]
    center=sum((Vector(s['position']) for s in seats),Vector())/len(seats)
    to_field=Vector((0,-24,0))-center;to_field.z=0;to_field.normalize()
    render(label,center+to_field*12+Vector((0,0,12)),center,32)
print('ALL_SEATS_REVIEW_RENDERED')
