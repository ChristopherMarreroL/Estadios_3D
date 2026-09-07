import bpy, os
from mathutils import Vector
root=r'C:\Users\chris\Programacion\Estadios_3D'
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=True
scene.render.resolution_x=1000;scene.render.resolution_y=760;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.film_transparent=False
for name,pos,target,lens in [
    ('camera_centerfield_aerial',(0,165,150),(0,-14,0),34),
    ('camera_grandstand',(0,-78,14),(0,-5,0),20),
    ('camera_drone_exterior',(170,-185,125),(0,-30,4),35),
    ('camera_topdown_validation',(0,-10,260),(0,-10,0),43)]:
    cam=bpy.data.objects[name];cam.location=pos;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler()
    cam.data.type='PERSP';cam.data.lens=lens;scene.camera=cam
    if name=='camera_topdown_validation':cam.data.type='ORTHO';cam.data.ortho_scale=300
    scene.render.filepath=os.path.join(root,'artifacts','blender','phase2-20260907',name+'.png')
    bpy.ops.render.render(write_still=True)
