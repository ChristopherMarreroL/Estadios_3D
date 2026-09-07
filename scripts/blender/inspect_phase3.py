import bpy,json
from mathutils import Vector
items=[]
for o in bpy.context.scene.objects:
    if any(k in o.name for k in ['dugout','light_tower','lamp','access','entry','vomit']):
        items.append({'name':o.name,'type':o.type,'parent':o.parent.name if o.parent else None,'hidden':o.hide_render,'bounds':[[round(min((o.matrix_world@Vector(v))[i] for v in o.bound_box),2),round(max((o.matrix_world@Vector(v))[i] for v in o.bound_box),2)] for i in range(3)]})
print(json.dumps(items))
