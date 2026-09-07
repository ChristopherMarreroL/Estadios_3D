"""Export the current visible architecture without altering the Blender scene."""
import bpy
import os
import shutil
import json
import struct

root = r'C:\Users\chris\Programacion\Estadios_3D'
assert bpy.data.filepath == os.path.join(root, 'public', 'models', 'estadio-quisqueya-v1.blend')
assert bpy.context.mode == 'OBJECT'
target = os.path.join(root, 'public', 'models', 'estadio-quisqueya.glb')
backup = os.path.join(root, 'public', 'models', 'estadio-quisqueya-pre-web-phase1.glb')
if os.path.exists(target) and not os.path.exists(backup):
    shutil.copy2(target, backup)
out = bpy.ops.export_scene.gltf(
    filepath=target, export_format='GLB', use_visible=True, use_renderable=True,
    use_active_scene=True, export_cameras=False, export_lights=False,
    export_animations=False, export_extras=True, export_yup=True,
    export_apply=True, will_save_settings=False)
# glTF cannot translate Blender's procedural grass wave/ramp. Preserve its
# viewport base colour in the exported asset without modifying the .blend.
with open(target, 'rb') as f:
    data = f.read()
json_length = struct.unpack_from('<I', data, 12)[0]
document = json.loads(data[20:20+json_length])
for material in document.get('materials', []):
    if material.get('name') == 'MAT_Grass':
        material.setdefault('pbrMetallicRoughness', {})['baseColorFactor'] = list(bpy.data.materials['MAT_Grass'].diffuse_color)
        material.setdefault('extras', {})['web_material_fallback'] = 'Blender viewport base colour; procedural stripes not baked'
chunk = json.dumps(document, separators=(',', ':')).encode('utf-8')
chunk += b' ' * ((-len(chunk)) % 4)
tail = data[20+json_length:]
with open(target, 'wb') as f:
    f.write(struct.pack('<III', 0x46546c67, 2, 20+len(chunk)+len(tail)))
    f.write(struct.pack('<II', len(chunk), 0x4e4f534a))
    f.write(chunk)
    f.write(tail)
result = {'status': list(out), 'path': target, 'bytes': os.path.getsize(target), 'backup': backup}
