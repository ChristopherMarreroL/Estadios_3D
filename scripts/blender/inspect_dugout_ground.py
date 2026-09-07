import bpy
from mathutils import Vector
for o in bpy.context.scene.objects:
 if o.type=='MESH' and not o.hide_render and not o.name.startswith('catalog_seats'):
  pts=[o.matrix_world@Vector(p) for p in o.bound_box]
  if min(p.z for p in pts)<.3 and max(p.z for p in pts)>-2:
   print(o.name, tuple(round(min(p[i] for p in pts),2) for i in range(3)), tuple(round(max(p[i] for p in pts),2) for i in range(3)))
