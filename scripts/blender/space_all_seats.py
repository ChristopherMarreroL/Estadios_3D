"""Rebuild shared seat placement and extend supporting terraces where required.
Run after export-seat-placements.ts. Existing field/roof/access geometry is retained.
"""
import ast, bpy, bmesh, math, json, shutil
from pathlib import Path
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'public/models/estadio-quisqueya-v1.blend'
OUT=ROOT/'artifacts/blender/seat-spacing-audit-20260925'
REV='20260925-seat-spacing'
changed=[]
assert Path(bpy.data.filepath).resolve()==SOURCE.resolve()
for path in [SOURCE,SOURCE.with_name('estadio-quisqueya.glb')]:
    backup=path.with_name(path.stem+'-pre-all-seat-spacing-20260925'+path.suffix)
    if not backup.exists(): shutil.copy2(path,backup)
tree=ast.parse((ROOT/'scripts/blender/improve_phase2.py').read_text(encoding='utf-8'))
exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in ['mesh','seat_shell','strip','beam']],type_ignores=[]),'helpers','exec'))
def point(s,d,z):
    if d>=3:d-=14*max(0,min(1,(abs(s)-60)/65))
    a=abs(s); theta=-math.pi/2+min(a/24,math.pi/4)
    wing=max(0,a-24*math.pi/4)/math.sqrt(2)
    return ((-1 if s<0 else 1)*((24+d)*math.cos(theta)+wing),-32+(24+d)*math.sin(theta)+wing,z)
placements=json.loads((ROOT/'artifacts/blender/phase2-20260907/seat-placements.json').read_text())
sv,sf=seat_shell()
for group in placements['groups']:
    v,f=[],[]
    for seat in group['seats']:
        p=Vector(seat['position']); angle=-math.atan2(-p.x,-24-p.y)
        mat=Matrix.Translation(p)@Matrix.Rotation(angle,4,'Z')
        if seat['sectorId']==11608:
            shell=bpy.data.objects['A6_'+str(seat['id'])+'_shell']
            delta=mat@shell.matrix_world.inverted()
            for part in ['shell','support','bolts','number']:
                obj=bpy.data.objects.get('A6_'+str(seat['id'])+'_'+part)
                if obj:obj.matrix_world=delta@obj.matrix_world
            shell['seat_origin']=seat['position']
            continue
        base=len(v)
        v.extend(tuple(mat@Vector(p)) for p in sv)
        f.extend(tuple(base+i for i in face) for face in sf)
    obj=mesh('catalog_seats_'+str(group['id']),v,f,group['material'],True)
    obj.data.materials.append(bpy.data.materials['MAT_Steel'])
    for face in obj.data.polygons:
        if face.index%len(sf)>=len(sf)-6:face.material_index=1
    obj['catalog_seat_count']=len(group['seats'])-(84 if group['id']==2287 else 0)
    obj['placement_status']='shared physical-length spacing; minimum centre distance 0.52 m'

def profile(d0,d1,z0,z1,rows):
    p=[(d0,.1),(d0,z0)]
    for i in range(rows):
        d=d0+(d1-d0)*(i+1)/rows
        p.extend([(d,z0+(z1-z0)*i/rows),(d,z0+(z1-z0)*(i+1)/rows)])
    return p+[(d1,.1)]
v,f=[],[]
for lo,hi,d0,d1,z0,z1,rows in [
    (-81,-60,3,17,1.1,4.2,20),(60,81,3,17,1.1,4.2,20),
    (-127,-125,17,28,4.2,6.7,14),(125,127,17,28,4.2,6.7,14),
    (-137,-125,28,44,6.7,10.8,20),(125,137,28,44,6.7,10.8,20)]:
    spans=[(lo,hi)]
    for aisle in [-82,-62,-42,-21,0,21,42,62,82]:
        spans=[piece for a,b in spans for piece in ([(a,min(b,aisle-.9))] if a<aisle-.9 else [])+([(max(a,aisle+.9),b)] if b>aisle+.9 else []) if piece[1]>piece[0]]
    for a,b in spans:strip(v,f,a,b,profile(d0,d1,z0,z1,rows))
mesh('spacing_terrace_extensions',v,f,'MAT_Concrete_Light')
# Rear walking surface and edge protection continue behind the extended wings.
v,f=[],[]
for lo,hi in [(-137,-125),(125,137)]:strip(v,f,lo,hi,[(44,10.55),(44,10.8),(48,10.8),(48,10.55)])
mesh('spacing_concourse_extensions',v,f,'MAT_Concrete_Light')
v,f=[],[]
for lo,hi in [(-137,-125),(125,137)]:
    for i in range(12):beam(v,f,point(lo+i,48,11.8),point(lo+i+1,48,11.8),.045,6)
    for i in range(0,13,3):beam(v,f,point(lo+i,48,10.8),point(lo+i,48,11.8),.04,6)
mesh('spacing_concourse_rails',v,f,'MAT_Steel')
bpy.context.view_layer.update()
# Every seat must be supported by actual terrace geometry, not just a JSON position.
names=['section_palco_a','section_palco_aa','section_bleachers_left','section_bleachers_right','section_corporate','spacing_terrace_extensions']
deps=bpy.context.evaluated_depsgraph_get()
trees=[BVHTree.FromObject(bpy.data.objects[n],deps) for n in names]
unsupported=[]
for group in placements['groups']:
    for s in group['seats']:
        origin=Vector(s['position'])+Vector((0,0,.08))
        hits=[tree.ray_cast(origin,Vector((0,0,-1)),.18)[0] for tree in trees]
        if not any(h is not None for h in hits):
            high=[tree.ray_cast(Vector(s['position'])+Vector((0,0,2)),Vector((0,0,-1)),4)[0] for tree in trees]
            unsupported.append({'id':s['id'],'sector':s['sectorId'],'position':s['position'],'floor':[h.z for h in high if h is not None]})
json.dump({'revision':REV,'count':sum(len(g['seats']) for g in placements['groups']),'unsupported':unsupported},open(OUT/'model-checks.json','w'),indent=2)
assert not unsupported, f'{len(unsupported)} unsupported seats; inspect model-checks.json'
version=bpy.context.preferences.filepaths.save_version;bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE));bpy.context.preferences.filepaths.save_version=version
exec(compile((ROOT/'scripts/blender/export_web_phase1.py').read_text(encoding='utf-8'),'export','exec'))
print('ALL_SEATS_SPACED')
