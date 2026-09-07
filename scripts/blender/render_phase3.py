import bpy,os,math
from mathutils import Vector
OUT=r'C:\Users\chris\Programacion\Estadios_3D\artifacts\blender\phase3-20260907'
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=True
scene.render.resolution_x=1000;scene.render.resolution_y=760;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
scene.world.use_nodes=True
background=scene.world.node_tree.nodes.get('Background')
if background:
    background.inputs['Color'].default_value=(.45,.55,.70,1)
    background.inputs['Strength'].default_value=.7
for name,pos,target,lens in [
    ('overview',(0,165,150),(0,-14,0),34),
    ('dugout',(-18,-14,2.4),(-33,-32,1.2),40),
    ('access',(32,-61,8.2),(40,-69,8.3),30),
    ('tower',(60,14,42),(76,51,36),42)]:
    data=bpy.data.cameras.new('phase3_'+name);cam=bpy.data.objects.new('phase3_'+name,data);scene.collection.objects.link(cam)
    cam.location=pos;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();data.lens=lens;scene.camera=cam
    scene.render.filepath=os.path.join(OUT,name+'.png');bpy.ops.render.render(write_still=True)
