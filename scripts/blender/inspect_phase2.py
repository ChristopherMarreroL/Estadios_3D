import bpy, json
from mathutils import Vector
items=[]
for o in bpy.context.scene.objects:
    if any(k in o.name for k in ['roof','facade','press','concourse','field_grass','track','camera_']):
        items.append({'name':o.name,'type':o.type,'hidden':o.hide_get(),'bounds':[[round(min((o.matrix_world@Vector(v))[i] for v in o.bound_box),2),round(max((o.matrix_world@Vector(v))[i] for v in o.bound_box),2)] for i in range(3)]})
print('INSPECTION='+json.dumps(items))
