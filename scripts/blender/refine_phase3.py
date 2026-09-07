"""Local visual refinement; dimensions provisional, not construction drawings."""
import bpy, math, json, os, shutil, ast, bmesh
from mathutils import Vector, Matrix
ROOT=r'C:\Users\chris\Programacion\Estadios_3D'
OUT=os.path.join(ROOT,'artifacts','blender','phase3-20260907');os.makedirs(OUT,exist_ok=True)
source=os.path.join(ROOT,'public','models','estadio-quisqueya-v1.blend')
assert bpy.data.filepath==source
for path in [source,os.path.join(ROOT,'public','models','estadio-quisqueya.glb')]:
    base,ext=os.path.splitext(path);backup=base+'-pre-phase3-20260907'+ext
    if not os.path.exists(backup):shutil.copy2(path,backup)
REV='20260907-phase3';changed=[]
# Reuse geometry helpers only, never execute the previous phase's mutations.
tree=ast.parse(open(os.path.join(ROOT,'scripts','blender','improve_phase2.py'),encoding='utf-8').read())
helpers=ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in ['point','mesh','strip','beam']],type_ignores=[])
exec(compile(helpers,'phase2_geometry_helpers','exec'))

def box(v,f,center,size,axes=None):
    axes=axes or (Vector((1,0,0)),Vector((0,1,0)),Vector((0,0,1)))
    base=len(v);center=Vector(center)
    for x in [-1,1]:
        for y in [-1,1]:
            for z in [-1,1]:v.append(tuple(center+axes[0]*x*size[0]/2+axes[1]*y*size[1]/2+axes[2]*z*size[2]/2))
    f.extend(tuple(base+i for i in face) for face in [(0,4,6,2),(1,3,7,5),(0,1,5,4),(2,6,7,3),(0,2,3,1),(4,5,7,6)])

seat_before={o.name:(len(o.data.vertices),len(o.data.polygons)) for o in bpy.context.scene.objects if o.name.startswith('catalog_seats_')}
# Open dugouts: roof, floor, back/side walls, bench and interrupted front rail.
for side,sign,mat in [('licey',-1,'MAT_Licey_Blue'),('escogido',1,'MAT_Escogido_Red')]:
    lo,hi=sorted([sign*34,sign*50])
    v,f=[],[];strip(v,f,lo-.3,hi+.3,[(-2.4,2.42),(-2.4,2.62),(2.8,2.72),(2.8,2.52)])
    mesh('dugout_'+side,v,f,mat)
    v,f=[],[]
    strip(v,f,lo,hi,[(-2,.10),(-2,.18),(2.5,.18),(2.5,.10)])
    strip(v,f,lo,hi,[(2.28,.18),(2.28,2.52),(2.5,2.52),(2.5,.18)])
    for a,b in [(lo,lo+.2),(hi-.2,hi)]:strip(v,f,a,b,[(-2,.18),(-2,2.44),(2.5,2.52),(2.5,.18)])
    mesh('phase3_dugout_'+side+'_shell',v,f,'MAT_Concrete')
    v,f=[],[];strip(v,f,lo+.6,hi-.6,[(1.25,.58),(1.25,.68),(1.85,.68),(1.85,.58)])
    strip(v,f,lo+.6,hi-.6,[(1.82,.68),(1.82,1.18),(1.92,1.18),(1.92,.68)])
    mesh('phase3_dugout_'+side+'_bench',v,f,mat)
    v,f=[],[]
    for s in [lo+1+i*2 for i in range(8)]:beam(v,f,point(s,1.55,.18),point(s,1.55,.60),.065)
    for s in [lo+2,lo+5,lo+8,lo+11,hi-2]:beam(v,f,point(s,-2,.18),point(s,-2,1.02),.045)
    beam(v,f,point(lo+2,-2,1.02),point(hi-2,-2,1.02),.045)
    mesh('phase3_dugout_'+side+'_rails',v,f,'MAT_Steel')

AISLES=[-82,-62,-42,-21,0,21,42,62,82]
TIERS=[(3,17,1.1,4.2,20,60),(17,28,4.2,6.7,14,125),(28,44,6.7,10.8,20,125)]
v,f=[],[]
for s in AISLES:
    for d0,d1,z0,z1,steps,extent in TIERS:
        if abs(s)+.9>extent:continue
        for offset in [-.72,.72]:
            for j in range(steps):
                d=d0+(d1-d0)*j/steps;dn=d0+(d1-d0)*(j+1)/steps
                z=z0+(z1-z0)*j/steps;zn=z0+(z1-z0)*(j+1)/steps
                beam(v,f,point(s+offset,d,z+.95),point(s+offset,dn,zn+.95),.032,6)
                if j%3==0:beam(v,f,point(s+offset,d,z+.02),point(s+offset,d,z+.95),.03,6)
mesh('phase3_aisle_handrails',v,f,'MAT_Steel')
# Upper-tier front guards, interrupted at every existing staircase.
v,f=[],[]
segments=[];cursor=-125
for s in AISLES:
    segments.append((cursor,s-1.05));cursor=s+1.05
segments.append((cursor,125))
for lo,hi in segments:
    n=max(1,math.ceil((hi-lo)/2))
    for i in range(n):
        a=lo+(hi-lo)*i/n;b=lo+(hi-lo)*(i+1)/n
        beam(v,f,point(a,28,7.55),point(b,28,7.55),.032,6)
        beam(v,f,point(a,28,6.72),point(a,28,7.55),.032,6)
mesh('phase3_tier_front_guards',v,f,'MAT_Steel')

# Six open access portals in existing aisle voids. No seats removed or shifted.
access_s=[-62,-42,-21,21,42,62]
for i,s in enumerate(access_s,1):
    v,f=[],[]
    for a,b in [(s-.86,s-.72),(s+.72,s+.86)]:
        strip(v,f,a,b,[(28,6.7),(28,9.25),(33,10.53),(33,7.98)])
    strip(v,f,s-.86,s+.86,[(28,9.25),(28,9.40),(33,10.68),(33,10.53)])
    mesh('vomitory_%02d'%i,v,f,'MAT_Concrete_Light')
    # Simple wayfinding sign; no invented official gate numbering.
    v,f=[],[];strip(v,f,s-.85,s+.85,[(27.91,9.24),(27.91,9.60),(28,9.60),(28,9.24)])
    mesh('phase3_access_sign_%02d'%i,v,f,'MAT_Licey_Blue')
    name='phase3_access_text_%02d'%i;o=bpy.data.objects.get(name)
    if o is None:
        curve=bpy.data.curves.new(name,'FONT');curve.body='ACCESO';curve.size=.20;curve.align_x='CENTER'
        curve.materials.append(bpy.data.materials['MAT_Chalk']);o=bpy.data.objects.new(name,curve);bpy.data.collections['STRUCTURE'].objects.link(o)
    normal=(Vector(point(s,27,0))-Vector(point(s,28,0))).normalized();up=Vector((0,0,1));right=up.cross(normal)
    rotation=Matrix((right,up,normal)).transposed().to_4x4();o.matrix_world=Matrix.Translation(Vector(point(s,27.90,9.29)))@rotation
    o['architecture_revision']=REV

# Existing six tower anchors, with a tapered truss, ladder, catwalk and 24 lamps.
anchors=[('left_field',-76,51,38),('left_center',-34,87,40),('right_center',34,87,40),('right_field',76,51,38),('third_base',-79,-15,35),('first_base',79,-15,35)]
for name,x,y,h in anchors:
    v,f=[],[]
    def corner(z,k):
        radius=1.65-.85*z/h;dx,dy=[(-1,-1),(-1,1),(1,1),(1,-1)][k]
        return (x+dx*radius,y+dy*radius,z)
    for k in range(4):beam(v,f,corner(.3,k),corner(h,k),.115,8)
    levels=math.ceil(h/3)
    for j in range(levels):
        z0=h*j/levels;z1=h*(j+1)/levels
        for k in range(4):
            beam(v,f,corner(z0,k),corner(z0,(k+1)%4),.065,6)
            beam(v,f,corner(z0,k),corner(z1,(k+1)%4),.048,6)
            beam(v,f,corner(z0,(k+1)%4),corner(z1,k),.048,6)
    for dx in [-.32,.32]:beam(v,f,(x+dx,y+1.85,.3),(x+dx,y+1.85,h),.035,6)
    for j in range(int(h/.35)):beam(v,f,(x-.32,y+1.85,.3+j*.35),(x+.32,y+1.85,.3+j*.35),.025,6)
    box(v,f,(x,y,h-.45),(3.6,3.2,.16))
    for dx,dy in [(-1.7,-1.5),(-1.7,1.5),(1.7,1.5),(1.7,-1.5)]:beam(v,f,(x+dx,y+dy,h-.4),(x+dx,y+dy,h+.65),.04,6)
    for a,b in [((-1.7,-1.5),(-1.7,1.5)),((-1.7,1.5),(1.7,1.5)),((1.7,1.5),(1.7,-1.5))]:beam(v,f,(x+a[0],y+a[1],h+.65),(x+b[0],y+b[1],h+.65),.04,6)
    mesh('light_tower_'+name+'_mesh',v,f,'MAT_Steel')
    v,f=[],[]
    for k in range(4):
        c=corner(0,k);box(v,f,(c[0],c[1],.15),(.85,.85,.3))
    mesh('phase3_tower_'+name+'_footings',v,f,'MAT_Concrete')
    center=Vector((x,y,h+1.8));normal=(Vector((0,-10,0))-center).normalized();right=normal.cross(Vector((0,0,1))).normalized();up=right.cross(normal).normalized();axes=(right,normal,up)
    v,f,lv,lf=[],[],[],[]
    for sign in [-1,1]:
        beam(v,f,(x+sign*.7,y,h-.3),center+right*(sign*1.1)-normal*.35,.115)
    for row in range(4):
        for col in range(6):
            c=center+right*((col-2.5)*1.12)+up*((row-1.5)*.93)
            box(v,f,c,(.85,.50,.80),axes)
            beam(lv,lf,c+normal*.255,c+normal*.29,.32,12)
    for z in [-1.95,1.95]:beam(v,f,center+right*-3.3+up*z-normal*.2,center+right*3.3+up*z-normal*.2,.09)
    mesh('phase3_tower_'+name+'_lamp_housings',v,f,'MAT_Steel')
    lamps=mesh('phase3_tower_'+name+'_projectors',lv,lf,'MAT_Light');lamps['projector_count']=24

bpy.context.view_layer.update()
assert seat_before=={o.name:(len(o.data.vertices),len(o.data.polygons)) for o in bpy.context.scene.objects if o.name.startswith('catalog_seats_')}
checks={'revision':REV,'changed':changed,'seat_meshes_unchanged':True,'access_portals':6,'towers':6,'projectors':144,'meshes':[]}
for name in changed:
    o=bpy.data.objects[name];assert all(math.isfinite(c) for v in o.data.vertices for c in v.co)
    bm=bmesh.new();bm.from_mesh(o.data);bad=sum(1 for e in bm.edges if not e.is_manifold);bm.free()
    assert bad==0,(name,bad)
    checks['meshes'].append({'name':name,'vertices':len(o.data.vertices),'non_manifold_edges':bad})
json.dump(checks,open(os.path.join(OUT,'checks.json'),'w'),indent=2)
version=bpy.context.preferences.filepaths.save_version;bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=source);bpy.context.preferences.filepaths.save_version=version
exec(compile(open(os.path.join(ROOT,'scripts','blender','export_web_phase1.py'),encoding='utf-8').read(),'export_web_phase1.py','exec'))
print('PHASE3_COMPLETE='+json.dumps(checks))
