"""Reference-based architecture and catalogue seats. Run on saved phase1 copy."""
import bpy, math, json, os, shutil, bmesh
from mathutils import Vector, Matrix

ROOT=r'C:\Users\chris\Programacion\Estadios_3D'
OUT=os.path.join(ROOT,'artifacts','blender','phase2-20260907')
os.makedirs(OUT,exist_ok=True)
source=os.path.join(ROOT,'public','models','estadio-quisqueya-v1.blend')
assert bpy.data.filepath == source
backup=source.replace('.blend','-pre-phase2-20260907.blend')
if not os.path.exists(backup): shutil.copy2(source,backup)
web=os.path.join(ROOT,'public','models','estadio-quisqueya.glb')
web_backup=web.replace('.glb','-pre-phase2-20260907.glb')
if not os.path.exists(web_backup): shutil.copy2(web,web_backup)
REV='20260907-phase2'
changed=[]

def point(s,d,z):
    if d>=17:d-=14*max(0,min(1,(abs(s)-60)/65))
    sign=-1 if s<0 else 1
    a=abs(s);theta=-math.pi/2+min(a/24,math.pi/4)
    wing=max(0,a-24*math.pi/4)/math.sqrt(2)
    return (sign*((24+d)*math.cos(theta)+wing),-32+(24+d)*math.sin(theta)+wing,z)

def mesh(name,v,f,material,smooth=False):
    o=bpy.data.objects.get(name)
    old=o.data if o else None
    data=bpy.data.meshes.new(name+'_'+REV);data.from_pydata(v,[],f);data.update()
    data.materials.append(bpy.data.materials[material])
    if o is None:
        o=bpy.data.objects.new(name,data);bpy.data.collections['STRUCTURE'].objects.link(o)
    else:o.data=data
    o.matrix_world=Matrix.Identity(4)
    o.hide_set(False);o.hide_render=False;o.hide_viewport=False
    for m in list(o.modifiers):o.modifiers.remove(m)
    bm=bmesh.new();bm.from_mesh(data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(data);bm.free()
    for face in data.polygons:face.use_smooth=smooth
    if old and old.users==0 and isinstance(old,bpy.types.Mesh):bpy.data.meshes.remove(old)
    o['architecture_revision']=REV;changed.append(name)
    return o

def strip(v,f,lo,hi,profile,step=1):
    count=max(1,math.ceil((hi-lo)/step));n=len(profile);base=len(v)
    for i in range(count+1):v.extend(point(lo+(hi-lo)*i/count,d,z) for d,z in profile)
    for i in range(count):
        for j in range(n):
            a=base+i*n+j;b=base+i*n+(j+1)%n;f.append((a,b,b+n,a+n))
    f.append(tuple(base+j for j in reversed(range(n))));f.append(tuple(base+count*n+j for j in range(n)))

def beam(v,f,a,b,r=.08,sides=8):
    a,b=Vector(a),Vector(b);direction=(b-a).normalized();u=direction.cross(Vector((0,0,1)))
    if u.length<.01:u=direction.cross(Vector((0,1,0)))
    u.normalize();w=direction.cross(u);base=len(v)
    for c in [a,b]:
        for i in range(sides):v.append(tuple(c+r*(math.cos(i*2*math.pi/sides)*u+math.sin(i*2*math.pi/sides)*w)))
    f.append(tuple(base+i for i in reversed(range(sides))));f.append(tuple(base+sides+i for i in range(sides)))
    for i in range(sides):j=(i+1)%sides;f.append((base+i,base+j,base+sides+j,base+sides+i))

# Three separated curved roof masses follow the bowl instead of a rectangle.
def roof_z(d):return 15.2+1.2*(d-24)/23+3*math.sin(math.pi*(d-24)/23)
roof_profile=[(24+23*i/16,roof_z(24+23*i/16)) for i in range(17)]
roof_profile += [(d,z-.22) for d,z in reversed(roof_profile)]
for name,lo,hi in [('main_grandstand_roof',-11.8,11.8),('roof_panel_left',-46,-12.5),('roof_panel_right',12.5,46)]:
    v,f=[],[];strip(v,f,lo,hi,roof_profile);mesh(name,v,f,'MAT_Roof',True)
v,f=[],[]
for lo,hi in [(-46,-12.5),(-11.8,11.8),(12.5,46)]:strip(v,f,lo,hi,[(23.9,14.7),(23.9,15.3),(24.15,15.3),(24.15,14.7)])
mesh('roof_front_fascia',v,f,'MAT_Roof_Edge_Green')
v,f=[],[]
for s in [-46,-40,-34,-28,-22,-16,-11.8,-6,0,6,11.8,16,22,28,34,40,46]:
    for i in range(16):
        d=24+23*i/16;dn=24+23*(i+1)/16
        beam(v,f,point(s,d,roof_z(d)+.06),point(s,dn,roof_z(dn)+.06),.09)
mesh('roof_rib_system',v,f,'MAT_Roof_Rib_Dark')
v,f=[],[]
for s in [-44,-30,-16,16,30,44]:
    beam(v,f,point(s,45,10.8),point(s,45,roof_z(45)-.2),.17)
    beam(v,f,point(s,45,13.8),point(s,27,roof_z(27)-.28),.12)
mesh('roof_support_system',v,f,'MAT_Steel')

# Curved press box and rear circulation follow the same directrix.
for name,profile,mat in [
    ('press_box',[(47,13.8),(47,19.4),(52,19.4),(52,13.8)],'MAT_Concrete_Light'),
    ('press_box_glass',[(46.86,15),(46.86,18.8),(46.98,18.8),(46.98,15)],'MAT_Glass'),
    ('press_box_canopy',[(46,19.5),(46,19.8),(53,19.8),(53,19.5)],'MAT_Roof')]:
    v,f=[],[];strip(v,f,-12,12,profile);mesh(name,v,f,mat)
label=bpy.data.objects.get('press_box_name')
if label:
    label.location=(0,-102.9,19);label['architecture_revision']=REV
v,f=[],[];strip(v,f,-125,125,[(44,10.55),(44,10.8),(48,10.8),(48,10.55)])
mesh('grandstand_concourse',v,f,'MAT_Concrete_Light')
v,f=[],[]
for profile in [[(48,0),(48,2),(48.3,2),(48.3,0)],[(48,10),(48,10.8),(48.3,10.8),(48.3,10)]]:strip(v,f,-125,125,profile)
mesh('grandstand_outer_facade',v,f,'MAT_Concrete_Light')
v,f=[],[]
for s in range(-124,125,8):beam(v,f,point(s,48,0),point(s,48,10.7),.26,4)
mesh('facade_column_system',v,f,'MAT_Concrete_Light')
v,f=[],[]
for i in range(250):beam(v,f,point(-125+i,48,11.8),point(-124+i,48,11.8),.045,6)
for s in range(-125,126,3):beam(v,f,point(s,48,10.8),point(s,48,11.8),.04,6)
mesh('phase2_concourse_railing',v,f,'MAT_Steel')

# Concrete terraces with coloured seats rather than solid coloured terraces.
for name in ['section_palco_a','section_palco_aa','section_bleachers_left','section_bleachers_right']:
    obj=bpy.data.objects[name];obj.data.materials.clear();obj.data.materials.append(bpy.data.materials['MAT_Concrete_Light'])
    obj['surface_revision']=REV

# Seat shell: shallow cushion, curved/tapered back. Single merged mesh per group.
def seat_shell():
    v=[(x,y,z) for x in [-.22,.22] for y in [-.20,.20] for z in [.40,.48]]
    f=[(0,4,6,2),(1,3,7,5),(0,1,5,4),(2,6,7,3),(0,2,3,1),(4,5,7,6)]
    base=len(v)
    for side in [0,.055]:
        for height in [0,1]:
            for i in range(5):
                x=-.23+.46*i/4
                v.append((x*(1-.08*height),-.17-.07*(1-(x/.23)**2)-side,.47+height*(.44-.025*abs(x/.23))))
    for side in [0,10]:
        for i in range(4):f.append((base+side+i,base+side+i+1,base+side+i+6,base+side+i+5))
    for i in range(4):
        f.append((base+i,base+i+1,base+i+11,base+i+10));f.append((base+i+5,base+i+6,base+i+16,base+i+15))
    f.extend([(base,base+5,base+15,base+10),(base+4,base+9,base+19,base+14)])
    base=len(v)
    v.extend((x,y,z) for x in [-.06,.06] for y in [-.08,.08] for z in [.02,.40])
    f.extend(tuple(base+i for i in face) for face in [(0,4,6,2),(1,3,7,5),(0,1,5,4),(2,6,7,3),(0,2,3,1),(4,5,7,6)])
    return v,f
sv,sf=seat_shell()
placements=json.load(open(os.path.join(OUT,'seat-placements.json'),encoding='utf-8'))
for group in placements['groups']:
    v,f=[],[]
    for seat in group['seats']:
        x,y,z=seat['position'];angle=math.atan2(-x,-24-y);sn,cs=math.sin(angle),math.cos(angle);base=len(v)
        v.extend((x+px*cs+py*sn,y-px*sn+py*cs,z+pz) for px,py,pz in sv)
        f.extend(tuple(base+i for i in face) for face in sf)
    obj=mesh('catalog_seats_'+str(group['id']),v,f,group['material'],True)
    obj.data.materials.append(bpy.data.materials['MAT_Steel'])
    for face in obj.data.polygons:
        if face.index % len(sf) >= len(sf)-6:face.material_index=1
    obj['catalog_seat_count']=len(group['seats']);obj['placement_status']='approximate shared with web cameras'

# Turf bands via actual material strips: glTF-compatible, original polygon footprint.
# Explicit perimeter also makes repeat runs independent of the strip tessellation.
poly=[(x,y,0) for x,y in [(0,-48),(-72,27),(-69,40),(-58,58),(-40,72),(-19,80),(0,82),(19,80),(40,72),(58,58),(69,40),(72,27)]]
for o in bpy.context.scene.objects:
    if o.name.startswith('grass_stripe_'):o.hide_set(True);o.hide_render=True
def clip(points,bound,keep_greater):
    out=[]
    for a,b in zip(points,points[1:]+points[:1]):
        ai=a[0]>=bound if keep_greater else a[0]<=bound;bi=b[0]>=bound if keep_greater else b[0]<=bound
        if ai:out.append(a)
        if ai != bi:
            t=(bound-a[0])/(b[0]-a[0]);out.append((bound,a[1]+t*(b[1]-a[1]),a[2]))
    return out
for name,color in [('MAT_Turf_Light',(.045,.24,.06,1)),('MAT_Turf_Dark',(.026,.17,.038,1))]:
    mat=bpy.data.materials.get(name) or bpy.data.materials.new(name);mat.diffuse_color=color;mat.use_nodes=True
    mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=color
    mat.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.94
v,f,indices=[],[],[]
for i,x in enumerate(range(-75,75,5)):
    clipped=clip(clip(poly,x,True),x+5,False)
    if len(clipped)<3:continue
    base=len(v);v.extend(clipped);f.append(tuple(range(base,len(v))));indices.append(i%2)
obj=mesh('field_grass',v,f,'MAT_Turf_Light');obj.data.materials.append(bpy.data.materials['MAT_Turf_Dark'])
for face,index in zip(obj.data.polygons,indices):face.material_index=index

# Baseball infield: grass diamond inside the clay fan, not concentric circles.
clay=[(-4.2,-48.2,.026)]
clay += [(43*math.cos(math.radians(135-90*i/48)),-44+43*math.sin(math.radians(135-90*i/48)),.026) for i in range(49)]
clay += [(4.2,-48.2,.026),(0,-50,.026)]
mesh('infield_clay',clay,[tuple(range(len(clay)))],'MAT_Clay')
diamond=[(0,-39,.05),(-14.8,-24.2,.05),(0,-9.4,.05),(14.8,-24.2,.05)]
v,f,indices=[],[],[]
for i,x in enumerate(range(-75,75,5)):
    clipped=clip(clip(diamond,x,True),x+5,False)
    if len(clipped)<3:continue
    base=len(v);v.extend(clipped);f.append(tuple(range(base,len(v))));indices.append(i%2)
obj=mesh('infield_grass',v,f,'MAT_Turf_Light');obj.data.materials.append(bpy.data.materials['MAT_Turf_Dark'])
for face,index in zip(obj.data.polygons,indices):face.material_index=index
v=[(17*math.cos(i*math.pi/32),-44-9*math.sin(i*math.pi/32),.105) for i in range(33)]
v += [(11*math.cos(i*math.pi/32),-44-5.5*math.sin(i*math.pi/32),.105) for i in reversed(range(33))]
mesh('phase2_backstop_grass_crescent',v,[tuple(range(len(v)))],'MAT_Turf_Dark')
v,f=[],[]
for x,y,z in poly[1:]:
    length=math.hypot(x,y+5);v.extend([(x,y,.016),(x-3.5*x/length,y-3.5*(y+5)/length,.016)])
for i in range(len(poly)-2):f.append((2*i,2*i+1,2*i+3,2*i+2))
mesh('phase2_warning_track',v,f,'MAT_Clay')

# Clamp foul apron to the existing foul-line endpoints; avoid grass spikes
# projecting beyond the outfield wall at the ends of the seating wings.
v,f=[],[]
for i in range(161):
    s=-125+250*i/160;edge=3 if abs(s)<=60 else 17
    x,y,_=point(s,edge,.09)
    t=max(0,min(1,(abs(x)*72+(y+44)*71)/(72*72+71*71)))
    v.extend([(math.copysign(72*t,s),-44+71*t,.09),(x,y,.09)])
    if i:f.append((2*i-2,2*i,2*i+1,2*i-1))
obj=mesh('field_apron_home_backstop',v,f,'MAT_Clay');obj.data.materials.append(bpy.data.materials['MAT_Turf_Light'])
for i,face in enumerate(obj.data.polygons):face.material_index=int(abs(-125+250*(i+.5)/160)>28)

# Bring the obsolete detached service volume back against the rear concourse.
for o in bpy.context.scene.objects:
    if 'service_tower' in o.name:
        o.hide_set(True);o.hide_render=True;o['replaced_by']='phase2_service_annex'
v,f=[],[];strip(v,f,22,29,[(48,0),(48,12.5),(54,12.5),(54,0)])
mesh('phase2_service_annex',v,f,'MAT_Concrete_Light')

# Normalize tiny blockout bases to plausible baseball proportions, still approximate.
for name in ['first_base','second_base','third_base']:
    o=bpy.data.objects.get(name)
    if o:o.dimensions=(.46,.46,.08)
bpy.context.view_layer.update()
checks={'revision':REV,'seat_count':sum(len(g['seats']) for g in placements['groups']),'objects':len(bpy.context.scene.objects),'changed':changed,'meshes':[]}
for name in changed:
    obj=bpy.data.objects[name]
    assert all(math.isfinite(c) for v in obj.data.vertices for c in v.co)
    checks['meshes'].append({'name':name,'vertices':len(obj.data.vertices),'faces':len(obj.data.polygons)})
json.dump(checks,open(os.path.join(OUT,'checks.json'),'w'),indent=2)
versions=bpy.context.preferences.filepaths.save_version;bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=source)
bpy.context.preferences.filepaths.save_version=versions
exec(compile(open(os.path.join(ROOT,'scripts','blender','export_web_phase1.py'),encoding='utf-8').read(),'export_web_phase1.py','exec'))
print('PHASE2_COMPLETE='+json.dumps(checks))
