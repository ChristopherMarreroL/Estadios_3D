"""Partially sunken dugouts based on user's reference photo; provisional dimensions."""
import bpy, os, json, math, ast, shutil, bmesh, hashlib
from mathutils import Vector, Matrix
ROOT=r'C:\Users\chris\Programacion\Estadios_3D'
OUT=os.path.join(ROOT,'artifacts','blender','dugout-20260907');os.makedirs(OUT,exist_ok=True)
source=os.path.join(ROOT,'public','models','estadio-quisqueya-v1.blend')
assert bpy.data.filepath==source
REV='20260907-sunken-dugout';changed=[]
for path in [source,os.path.join(ROOT,'public','models','estadio-quisqueya.glb')]:
 base,ext=os.path.splitext(path);backup=base+'-pre-sunken-dugout-20260907'+ext
 if not os.path.exists(backup):shutil.copy2(path,backup)
helpers=ast.parse(open(os.path.join(ROOT,'scripts','blender','improve_phase2.py'),encoding='utf-8').read())
exec(compile(ast.Module(body=[n for n in helpers.body if isinstance(n,ast.FunctionDef) and n.name in ['point','mesh','strip','beam']],type_ignores=[]),'helpers','exec'))
def seat_hash():
 return {o.name:hashlib.sha256(str([tuple(v.co) for v in o.data.vertices]).encode()).hexdigest() for o in bpy.context.scene.objects if o.name.startswith('catalog_seats_')}
before=seat_hash()
seats=json.load(open(os.path.join(ROOT,'artifacts','blender','dugout-a6-seats.json')))
def render(name,eye,target):
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=12;scene.cycles.use_denoising=True
 scene.render.resolution_x=1100;scene.render.resolution_y=650;scene.render.resolution_percentage=100
 scene.world.use_nodes=True;bg=scene.world.node_tree.nodes.get('Background');bg.inputs['Color'].default_value=(.45,.55,.70,1);bg.inputs['Strength'].default_value=.7
 data=bpy.data.cameras.new(name);o=bpy.data.objects.new(name,data);scene.collection.objects.link(o);o.location=eye;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();data.lens=25;scene.camera=o
 scene.render.filepath=os.path.join(OUT,name+'.png');bpy.ops.render.render(write_still=True);bpy.data.objects.remove(o,do_unlink=True)
original_camera=bpy.context.scene.camera
render('a6-before',seats[0]['eye'],(0,-24,1))
# Subtract a convex rectangle from planar terrain triangles, preserving materials.
def clip(poly,a,b,inside):
 def dist(p):return (b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x)
 out=[]
 for prev,cur in zip(poly[-1:]+poly[:-1],poly):
  dp,dc=dist(prev),dist(cur);ip=dp>=-1e-8 if inside else dp<=1e-8;ic=dc>=-1e-8 if inside else dc<=1e-8
  if ip!=ic:out.append(prev+(cur-prev)*(dp/(dp-dc)))
  if ic:out.append(cur)
 return out
for side,sign in [('licey',-1),('escogido',1)]:
 lo,hi=sorted([sign*34,sign*50]);roof=bpy.data.objects['dugout_'+side]
 shift=1.37-max((roof.matrix_world@v.co).z for v in roof.data.vertices)
 for name in ['dugout_'+side]+['phase3_dugout_'+side+'_'+n for n in ['shell','bench','rails']]:
  o=bpy.data.objects[name]
  for v in o.data.vertices:v.co.z+=shift
  o['architecture_revision']=REV
 # Ground opening extends to outer shell faces. The solid slab is boolean-cut.
 v,f=[],[];strip(v,f,lo,hi,[(-2,-1.26),(-2,.35),(2.5,.35),(2.5,-1.26)])
 cutter=mesh('dugout_excavation_cutter',v,f,'MAT_Concrete')
 slab=bpy.data.objects['stadium_site'];bpy.context.view_layer.objects.active=slab
 mod=slab.modifiers.new('Dugout excavation','BOOLEAN');mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=cutter;bpy.ops.object.modifier_apply(modifier=mod.name)
 rectangle=[Vector(point(lo,-2,0)),Vector(point(hi,-2,0)),Vector(point(hi,2.5,0)),Vector(point(lo,2.5,0))]
 area=sum(a.x*b.y-b.x*a.y for a,b in zip(rectangle,rectangle[1:]+rectangle[:1]))
 if area<0:rectangle.reverse()
 for name in ['field_apron_home_backstop','field_grass']:
  o=bpy.data.objects[name];o.data.calc_loop_triangles();verts=[];faces=[];mats=[]
  for tri in o.data.loop_triangles:
   candidate=[o.matrix_world@o.data.vertices[i].co for i in tri.vertices];pieces=[]
   for a,b in zip(rectangle,rectangle[1:]+rectangle[:1]):
    if not candidate:break
    outside=clip(candidate,a,b,False)
    if len(outside)>=3:pieces.append(outside)
    candidate=clip(candidate,a,b,True)
   for poly in pieces:
    faces.append(tuple(range(len(verts),len(verts)+len(poly))));verts.extend(poly);mats.append(tri.material_index)
  materials=list(o.data.materials);obj=mesh(name,verts,faces,materials[0].name)
  for mat in materials[1:]:obj.data.materials.append(mat)
  for poly,idx in zip(obj.data.polygons,mats):poly.material_index=idx
 bpy.data.objects.remove(cutter,do_unlink=True)
 # Six treads at each end descend to the interior floor (-1.17 m).
 v,f=[],[]
 for reverse in [False,True]:
  for j in range(6):
   a=lo+j*.32 if not reverse else hi-(j+1)*.32
   top=.09-(j+1)*.21
   strip(v,f,a,a+.32,[(-1.8,-1.25),(-1.8,top),(2.1,top),(2.1,-1.25)])
 mesh('sunken_dugout_'+side+'_stairs',v,f,'MAT_Concrete')
 v,f=[],[];strip(v,f,lo,hi,[(-2.14,-1.25),(-2.14,.22),(-2,.22),(-2,-1.25)])
 mesh('sunken_dugout_'+side+'_retaining_wall',v,f,'MAT_Concrete')
 v,f=[],[]
 for s in [lo+2,lo+5,lo+8,lo+11,hi-2]:beam(v,f,point(s,-2.08,.22),point(s,-2.08,.94),.035)
 beam(v,f,point(lo+2,-2.08,.94),point(hi-2,-2.08,.94),.035)
 mesh('sunken_dugout_'+side+'_field_guard',v,f,'MAT_Steel')
assert before==seat_hash()
bpy.context.view_layer.update()
# Explicitly check each A6 camera ray toward home and the mound against both roofs.
checks=[]
for seat in seats:
 for target in [(0,-44,.15),(0,-24,1)]:
  origin=Vector(seat['eye']);direction=Vector(target)-origin;blocked=[]
  for side in ['licey','escogido']:
   o=bpy.data.objects['dugout_'+side];inv=o.matrix_world.inverted();hit=o.ray_cast(inv@origin,(inv.to_3x3()@direction).normalized(),distance=direction.length)[0]
   if hit:blocked.append(side)
  checks.append({'seat':seat['id'],'row':seat['row'],'target':target,'roof_blocks':blocked})
assert not any(c['roof_blocks'] for c in checks),checks
json.dump({'roof_top_m':1.37,'floor_m':-1.17,'seat_geometry_unchanged':True,'a6_rays':checks},open(os.path.join(OUT,'checks.json'),'w'),indent=2)
bpy.context.scene.camera=original_camera
version=bpy.context.preferences.filepaths.save_version;bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=source);bpy.context.preferences.filepaths.save_version=version
exec(compile(open(os.path.join(ROOT,'scripts','blender','export_web_phase1.py'),encoding='utf-8').read(),'export','exec'))
render('a6-after',seats[0]['eye'],(0,-24,1))
render('dugout-detail',(-19,-23,4),(-33,-32,0))
print('SUNKEN_DUGOUT_COMPLETE')
