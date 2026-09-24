"""A6 detail pilot. Positions remain from the shared catalogue placement file."""
import bpy, math, json, os, ast, shutil, hashlib, bmesh
from mathutils import Vector, Matrix
ROOT=r'C:\Users\chris\Programacion\Estadios_3D'
OUT=os.path.join(ROOT,'artifacts','blender','a6-detail-20260910');os.makedirs(OUT,exist_ok=True)
SOURCE=os.path.join(ROOT,'public','models','estadio-quisqueya-v1.blend')
REV='20260910-a6-detail';changed=[]
tree=ast.parse(open(os.path.join(ROOT,'scripts','blender','improve_phase2.py'),encoding='utf-8').read())
exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in ['point','mesh','strip','beam','seat_shell']],type_ignores=[]),'helpers','exec'))
seats=json.load(open(os.path.join(ROOT,'artifacts','blender','dugout-a6-seats.json')))
placements=json.load(open(os.path.join(ROOT,'artifacts','blender','phase2-20260907','seat-placements.json')))
def material(name,color,roughness,metal=0):
 m=bpy.data.materials.get(name) or bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*color,1)
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=roughness;p.inputs['Metallic'].default_value=metal
 return m
material('A6_Plastic',(.52,.39,.14),.39)
material('A6_Steel',(.055,.075,.067),.58,.55)
material('A6_Bolt',(.24,.26,.25),.38,.75)
material('A6_Number',(.82,.80,.65),.65)
material('A6_Concrete',(.40,.41,.38),.9)
material('A6_Edge',(.49,.49,.43),.91)
material('A6_Net',(.055,.067,.059),.95)

def rounded_box(v,f,c,sz):
 base=len(v)
 v.extend((c[0]+x*sz[0]/2,c[1]+y*sz[1]/2,c[2]+z*sz[2]/2) for x in [-1,1] for y in [-1,1] for z in [-1,1])
 f.extend(tuple(base+i for i in face) for face in [(0,4,6,2),(1,3,7,5),(0,1,5,4),(2,6,7,3),(0,2,3,1),(4,5,7,6)])

def shell_patch(v,f,fun,nu,nv,thickness,normal):
 base=len(v);stride=nu+1;layer=(nu+1)*(nv+1)
 for side in [0,1]:
  for j in range(nv+1):
   for i in range(nu+1):v.append(tuple(Vector(fun(i/nu,j/nv))+Vector(normal)*thickness*side))
 for j in range(nv):
  for i in range(nu):
   a=base+j*stride+i;b=a+1;c=b+stride;d=a+stride
   f.extend([(a,b,c,d),(d+layer,c+layer,b+layer,a+layer)])
 perimeter=list(range(nu+1))+[j*stride+nu for j in range(1,nv+1)]+[nv*stride+i for i in range(nu-1,-1,-1)]+[j*stride for j in range(nv-1,0,-1)]
 for a,b in zip(perimeter,perimeter[1:]+perimeter[:1]):f.append((base+a,base+a+layer,base+b+layer,base+b))

def make_prototype():
 v,f=[],[]
 # Concave pan, rising slightly at its sides and rear; rounded outline.
 def pan(u,t):
  x=(u-.5)*.44*(.92+.08*math.sin(math.pi*t));y=-.19+t*.40
  return (x,y,.445+.032*((u-.5)*2)**2+.022*(1-t)**2)
 shell_patch(v,f,pan,12,10,.026,(0,0,-1))
 def back(u,t):
  x=(u-.5)*.45*(1-.10*t);z=.48+.43*t-.025*(abs(2*u-1)**4)*t
  return (x,-.195-.065*t-.038*(1-(2*u-1)**2),z)
 shell_patch(v,f,back,12,12,.025,(0,-1,0))
 o=mesh('A6_prototype_shell',v,f,'A6_Plastic',True)
 bevel=o.modifiers.new('Rounded moulded edges','BEVEL');bevel.width=.005;bevel.segments=2
 bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=bevel.name)
 v,f=[],[]
 for x in [-.135,.135]:
  rounded_box(v,f,(x,-.05,.035),(.10,.19,.022))
  beam(v,f,(x,-.06,.045),(x,-.06,.41),.018,8)
  beam(v,f,(x,-.17,.405),(x,.15,.405),.017,8)
  beam(v,f,(x,-.22,.405),(x,-.34,.80),.013,8)
 o2=mesh('A6_prototype_support',v,f,'A6_Steel',True)
 v,f=[],[]
 for x in [-.135,.135]:
  for y in [-.115,.015]:beam(v,f,(x,y,.047),(x,y,.054),.012,6)
 o3=mesh('A6_prototype_bolts',v,f,'A6_Bolt')
 return [o,o2,o3]

def render(name,pos,target,lens=27):
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=12;scene.cycles.use_denoising=True
 scene.render.resolution_x=1100;scene.render.resolution_y=700;scene.render.resolution_percentage=100
 scene.world.use_nodes=True;p=scene.world.node_tree.nodes.get('Background');p.inputs['Color'].default_value=(.45,.55,.7,1);p.inputs['Strength'].default_value=.7
 data=bpy.data.cameras.new('A6_render');cam=bpy.data.objects.new('A6_render',data);scene.collection.objects.link(cam);cam.location=pos;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();data.lens=lens;scene.camera=cam;scene.render.filepath=os.path.join(OUT,name+'.png');bpy.ops.render.render(write_still=True);bpy.data.objects.remove(cam,do_unlink=True)

if __name__=='__main__':
 assert bpy.data.filepath==SOURCE
 width=float(os.environ['A6_APPROVED_WIDTH'])
 assert .24<=width<=.46
 for path in [SOURCE,os.path.join(ROOT,'public','models','estadio-quisqueya.glb')]:
  base,ext=os.path.splitext(path);backup=base+'-pre-a6-detail-20260910'+ext
  if not os.path.exists(backup):shutil.copy2(path,backup)
 original_camera=bpy.context.scene.camera
 sample=[seats[2],seats[len(seats)//2+2],seats[-3]]
 for name,s in zip(['front','middle','back'],sample):
  if not os.path.exists(os.path.join(OUT,name+'-before.png')):render(name+'-before',s['eye'],(0,-24,1))
 # Remove only A6 vertices from the original merged Palco A mesh, once.
 group=next(g for g in placements['groups'] if g['id']==2287)
 old=bpy.data.objects['catalog_seats_2287'];old_count=old['catalog_seat_count'];sv,sf=seat_shell();n=len(sv)
 if not old.get('a6_removed'):
  assert len(old.data.vertices)==len(group['seats'])*n
  indices={i for i,s in enumerate(group['seats']) if s['sectorId']==11608};assert len(indices)==len(seats)
  retained=[tuple(v.co) for i,v in enumerate(old.data.vertices) if i//n not in indices]
  bm=bmesh.new();bm.from_mesh(old.data);bm.verts.ensure_lookup_table();bmesh.ops.delete(bm,geom=[v for i,v in enumerate(bm.verts) if i//n in indices],context='VERTS');bm.to_mesh(old.data);bm.free()
  assert retained==[tuple(v.co) for v in old.data.vertices]
  old['catalog_seat_count']=old_count-len(seats);old['a6_removed']=True
 # Clear only pilot objects for repeatable rebuilds.
 for o in list(bpy.data.objects):
  if o.name.startswith('A6_'):bpy.data.objects.remove(o,do_unlink=True)
 prototypes=make_prototype();shared=[o.data for o in prototypes]
 variants=[shared[0]]
 for i,color in enumerate([(.50,.37,.135),(.54,.41,.155)]):
  data=shared[0].copy();data.materials.clear();data.materials.append(material('A6_Plastic_variant_'+str(i),color,.42+i*.02));variants.append(data)
 for o in prototypes:bpy.data.objects.remove(o,do_unlink=True)
 for s in seats:
  x,y,z=s['position'];angle=math.atan2(-x,-24-y)
  mat=Matrix.Translation(Vector((x,y,z)))@Matrix.Rotation(-angle,4,'Z')@Matrix.Diagonal(Vector((width/.45,1,1,1)))
  for part,data in zip(['shell','support','bolts'],shared):
   o=bpy.data.objects.new('A6_'+str(s['id'])+'_'+part,variants[s['id']%3] if part=='shell' else data);bpy.data.collections['STRUCTURE'].objects.link(o);o.matrix_world=mat;o['architecture_revision']=REV
   if part=='shell':o['catalog_seat_count']=1;o['seat_id']=s['id'];o['row']=s['row'];o['seat_number']=s['label'];o['seat_origin']=s['position']
  curve=bpy.data.curves.new('A6_number','FONT');curve.body=s['label'];curve.align_x='CENTER';curve.size=.035;curve.extrude=0;curve.resolution_u=2;curve.materials.append(bpy.data.materials['A6_Number'])
  o=bpy.data.objects.new('A6_'+str(s['id'])+'_number',curve);bpy.data.collections['STRUCTURE'].objects.link(o)
  o.matrix_world=mat@Matrix.Translation(Vector((0,-.327,.80)))@Matrix.Rotation(math.pi/2,4,'X')
 # Narrow edge strips on existing treads; no changes to seat origins.
 ss=[-((abs(s['position'][0])+s['position'][1]+32)/math.sqrt(2)+24*math.pi/4) for s in seats]
 lo,hi=min(ss)-.2,max(ss)+.2
 v,f=[],[]
 for j in range(20):
  d=3+14*j/20;z=1.1+3.1*j/20
  strip(v,f,lo,hi,[(d,z+.003),(d,z+.013),(d+.045,z+.013),(d+.045,z+.003)])
 mesh('A6_tread_edges',v,f,'A6_Edge')
 v,f=[],[]
 for j in range(20):
  d=3+14*j/20;z=1.1+3.1*j/20
  strip(v,f,lo,hi,[(d+.05,z+.001),(d+.05,z+.003),(d+.69,z+.003),(d+.69,z+.001)])
 slab=mesh('A6_tread_finish',v,f,'A6_Concrete')
 for k in range(3):slab.data.materials.append(material('A6_Concrete_'+str(k),(.39+k*.012,.40+k*.012,.37+k*.012),.92))
 for face in slab.data.polygons:face.material_index=(face.index//6)%4
 # Small metal mounting collars at the existing adjacent stair rail; do not duplicate handrails.
 v,f=[],[]
 for j in range(0,20,3):
  d=3+14*j/20;z=1.1+3.1*j/20
  for offset in [-.72,.72]:beam(v,f,point(-42+offset,d,z+.02),point(-42+offset,d,z+.055),.052,8)
 mesh('A6_adjacent_rail_mounts',v,f,'A6_Bolt')
 # Front safety net sample: thin threads, bounded to the A6 sightline.
 netlo,nethi=-50.5,-33.5
 # Mipmapped alpha mesh avoids subpixel wire aliasing in the mobile WebGL view.
 netimage=bpy.data.images.get('A6_net_alpha') or bpy.data.images.new('A6_net_alpha',width=64,height=64,alpha=True)
 pixels=[]
 for y in range(64):
  for x in range(64):
   distance=min(x,63-x,y,63-y);alpha=.48*max(0,1-distance/1.5)
   pixels.extend([.10,.12,.11,alpha])
 netimage.pixels=pixels;netimage.pack()
 mat=bpy.data.materials['A6_Net'];mat.surface_render_method='BLENDED';mat.use_backface_culling=False
 nodes=mat.node_tree.nodes;tex=nodes.get('A6_net_texture') or nodes.new('ShaderNodeTexImage');tex.name='A6_net_texture';tex.image=netimage;tex.interpolation='Linear'
 mat.node_tree.links.new(tex.outputs['Color'],nodes.get('Principled BSDF').inputs['Base Color']);mat.node_tree.links.new(tex.outputs['Alpha'],nodes.get('Principled BSDF').inputs['Alpha'])
 v=[point(netlo,-3,.3),point(nethi,-3,.3),point(nethi,-3,7),point(netlo,-3,7)]
 net=mesh('A6_safety_net',v,[(0,1,2,3)],'A6_Net');uv=net.data.uv_layers.new(name='UVMap')
 for loop,coord in zip(uv.data,[(0,0),((nethi-netlo)/.14,0),((nethi-netlo)/.14,6.7/.14),(0,6.7/.14)]):loop.uv=coord
 v,f=[],[]
 for s in [netlo,nethi]:beam(v,f,point(s,-3,.1),point(s,-3,7.15),.025,8)
 beam(v,f,point(netlo,-3,7),point(nethi,-3,7),.007,6)
 mesh('A6_net_supports',v,f,'A6_Steel')
 # Ground-level trim where the lowered dugout meets the front of the terrace.
 v,f=[],[];strip(v,f,lo,hi,[(2.55,.1),(2.55,.13),(2.95,.13),(2.95,.1)])
 mesh('A6_dugout_junction',v,f,'A6_Concrete')
 # UV-backed micro-roughness survives glTF export, unlike procedural Blender-only nodes.
 import random
 image=bpy.data.images.get('A6_micro_roughness') or bpy.data.images.new('A6_micro_roughness',width=64,height=64)
 image.colorspace_settings.name='Non-Color';rng=random.Random(11608);pixels=[]
 for i in range(64*64):
  value=.40+rng.random()*.16;pixels.extend([value,value,value,1])
 image.pixels=pixels;image.pack()
 for mat in bpy.data.materials:
  if mat.name.startswith('A6_Plastic'):
   nodes=mat.node_tree.nodes;tex=nodes.get('A6_roughness') or nodes.new('ShaderNodeTexImage');tex.name='A6_roughness';tex.image=image
   mat.node_tree.links.new(tex.outputs['Color'],nodes.get('Principled BSDF').inputs['Roughness'])
 for data in variants:
  uv=data.uv_layers.get('UVMap') or data.uv_layers.new(name='UVMap')
  for poly in data.polygons:
   for idx in poly.loop_indices:
    co=data.vertices[data.loops[idx].vertex_index].co;uv.data[idx].uv=(co.x*4,(co.y+co.z)*4)
 bpy.context.view_layer.update()
 shells=[o for o in bpy.data.objects if o.name.startswith('A6_') and o.name.endswith('_shell')]
 assert len(shells)==84
 assert sum(o.get('catalog_seat_count',0) for o in bpy.context.scene.objects)==11367
 for s in seats:
  assert (bpy.data.objects['A6_'+str(s['id'])+'_shell'].matrix_world.translation-Vector(s['position'])).length<1e-5
 report={'revision':REV,'a6_count':84,'total_seats':11367,'width_m':width,'minimum_center_spacing_m':min((Vector(a['position'])-Vector(b['position'])).length for a in seats for b in seats if a['id']!=b['id']),'origins_match_shared_positions':True,'a6_pitch_m':.42,'shared_seat_meshes':5}
 bpy.context.scene.camera=original_camera
 version=bpy.context.preferences.filepaths.save_version;bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=SOURCE);bpy.context.preferences.filepaths.save_version=version
 before_size=os.path.getsize(os.path.join(ROOT,'public','models','estadio-quisqueya-pre-a6-detail-20260910.glb'))
 exec(compile(open(os.path.join(ROOT,'scripts','blender','export_web_phase1.py'),encoding='utf-8').read(),'export','exec'))
 report['glb_before_bytes']=before_size;report['glb_after_bytes']=os.path.getsize(os.path.join(ROOT,'public','models','estadio-quisqueya.glb'))
 json.dump(report,open(os.path.join(OUT,'checks.json'),'w'),indent=2)
 for name,s in zip(['front','middle','back'],sample):render(name+'-after',s['eye'],(0,-24,1))
 s=seats[len(seats)//2+2];p=Vector(s['position']);rot=Matrix.Rotation(-math.atan2(-p.x,-24-p.y),3,'Z')
 render('chair-detail',p+rot@Vector((.8,1.35,.85)),p+Vector((0,0,.42)),38)
 render('chair-number',p+rot@Vector((-.55,-1.0,1.05)),p+Vector((0,0,.7)),48)
 print('A6_DETAIL_COMPLETE',json.dumps(report))
