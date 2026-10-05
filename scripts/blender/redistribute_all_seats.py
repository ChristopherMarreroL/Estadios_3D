"""Rebuild shared seat placement and extend supporting terraces where required.
Run after export-seat-placements.ts. Existing field/roof/access geometry is retained.
"""
import ast, bpy, bmesh, math, json, shutil
from pathlib import Path
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'public/models/estadio-quisqueya-v1.blend'
OUT=ROOT/'artifacts/blender/all-seats-20261005'
OUT.mkdir(parents=True,exist_ok=True)
REV='20261005-all-seats'
changed=[]
assert Path(bpy.data.filepath).resolve()==SOURCE.resolve()
for path in [SOURCE,SOURCE.with_name('estadio-quisqueya.glb')]:
    backup=path.with_name(path.stem+'-pre-redistribution-20261005'+path.suffix)
    if not backup.exists(): shutil.copy2(path,backup)
tree=ast.parse((ROOT/'scripts/blender/improve_phase2.py').read_text(encoding='utf-8'))
exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in ['mesh','seat_shell','strip','beam']],type_ignores=[]),'helpers','exec'))
def point(s,d,z):
    if d>=3:d-=14*max(0,min(1,(abs(s)-60)/65))
    a=abs(s); theta=-math.pi/2+min(a/24,math.pi/4)
    wing=max(0,a-24*math.pi/4)/math.sqrt(2)
    return ((-1 if s<0 else 1)*((24+d)*math.cos(theta)+wing),-32+(24+d)*math.sin(theta)+wing,z)
placements=json.loads((ROOT/'artifacts/blender/phase2-20260907/seat-placements.json').read_text())
# This script owns only the original six terraces. Special VIP/balcony/bullpen
# groups have separate platforms and are rebuilt by add_pending_seats.py.
base_group_ids={2287,2288,2289,2275,2276,2278}
placements['groups']=[g for g in placements['groups'] if g['id'] in base_group_ids]
assert {g['id'] for g in placements['groups']}==base_group_ids
assert sum(len(g['seats']) for g in placements['groups'])==11367
sv,sf=seat_shell()
for group in placements['groups']:
    v,f=[],[]
    for seat in group['seats']:
        p=Vector(seat['position']); angle=seat['facing']
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
    obj['placement_status']='UEPA orientation; shared named rows; complete sectors between stairs; minimum centre distance 0.52 m'

def profile(d0,d1,z0,z1,rows):
    p=[(d0,.1),(d0,z0)]
    for i in range(rows):
        d=d0+(d1-d0)*(i+1)/rows
        p.extend([(d,z0+(z1-z0)*i/rows),(d,z0+(z1-z0)*(i+1)/rows)])
    return p+[(d1,.1)]
v,f=[],[]
for lo,hi,d0,d1,z0,z1,rows in [
    (-89,-60,3,17,1.1,4.2,20),(60,89,3,17,1.1,4.2,20),
    (-127,-125,17,28,4.2,6.7,14),(125,127,17,28,4.2,6.7,14),
    (-145,-125,28,44,6.7,10.8,20),(125,145,28,44,6.7,10.8,20)]:
    spans=[(lo,hi)]
    for aisle in [-82,-62,-42,-21,0,21,42,62,82]:
        spans=[piece for a,b in spans for piece in ([(a,min(b,aisle-.9))] if a<aisle-.9 else [])+([(max(a,aisle+.9),b)] if b>aisle+.9 else []) if piece[1]>piece[0]]
    for a,b in spans:strip(v,f,a,b,profile(d0,d1,z0,z1,rows))
mesh('spacing_terrace_extensions',v,f,'MAT_Concrete_Light')
# Rear walking surface and edge protection continue behind the extended wings.
v,f=[],[]
for lo,hi in [(-145,-125),(125,145)]:strip(v,f,lo,hi,[(44,10.55),(44,10.8),(48,10.8),(48,10.55)])
mesh('spacing_concourse_extensions',v,f,'MAT_Concrete_Light')
v,f=[],[]
for lo,hi in [(-145,-125),(125,145)]:
    for i in range(20):beam(v,f,point(lo+i,48,11.8),point(lo+i+1,48,11.8),.045,6)
    for i in range(0,21,2):beam(v,f,point(lo+i,48,10.8),point(lo+i,48,11.8),.04,6)
mesh('spacing_concourse_rails',v,f,'MAT_Steel')
bpy.context.view_layer.update()
# Every seat must be supported by actual terrace geometry, not just a JSON position.
names=['section_palco_a','section_palco_aa','section_bleachers_left','section_bleachers_right','section_corporate','spacing_terrace_extensions']
def world_tree(obj,deps):
    evaluated=obj.evaluated_get(deps)
    mesh=evaluated.to_mesh()
    tree=BVHTree.FromPolygons([obj.matrix_world@v.co for v in mesh.vertices],[tuple(face.vertices) for face in mesh.polygons])
    evaluated.to_mesh_clear()
    return tree
deps=bpy.context.evaluated_depsgraph_get()
trees=[world_tree(bpy.data.objects[n],deps) for n in names]
unsupported=[]
for group in placements['groups']:
    for s in group['seats']:
        origin=Vector(s['position'])+Vector((0,0,.08))
        hits=[tree.ray_cast(origin,Vector((0,0,-1)),.18)[0] for tree in trees]
        if not any(h is not None for h in hits):
            high=[tree.ray_cast(Vector(s['position'])+Vector((0,0,2)),Vector((0,0,-1)),4)[0] for tree in trees]
            unsupported.append({'id':s['id'],'sector':s['sectorId'],'position':s['position'],'floor':[h.z for h in high if h is not None]})
# Verify whole seat shells stay clear of stairs and corporate walls.
seat_names=['catalog_seats_'+str(g['id']) for g in placements['groups']]
seat_names += [o.name for o in bpy.data.objects if o.name.startswith('A6_') and o.name.endswith('_shell')]
obstacles=[o for o in bpy.data.objects if o.name.startswith('aisle_') or o.name.startswith('corporate_divider_')]
obstacle_trees=[(o.name,world_tree(o,deps)) for o in obstacles]
intersections=[]
for name in seat_names:
    seat_tree=world_tree(bpy.data.objects[name],deps)
    for obstacle,tree in obstacle_trees:
        if tree.overlap(seat_tree):intersections.append([name,obstacle])
assert not intersections, f'Seat/aisle intersections: {intersections}'
json.dump({'revision':REV,'obstacle_intersections':intersections,'count':sum(len(g['seats']) for g in placements['groups']),'unsupported':unsupported},open(OUT/'model-checks.json','w'),indent=2)
assert not unsupported, f'{len(unsupported)} unsupported seats; inspect model-checks.json'
version=bpy.context.preferences.filepaths.save_version;bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE));bpy.context.preferences.filepaths.save_version=version
export_code=(ROOT/'scripts/blender/export_web_phase1.py').read_text(encoding='utf-8')
export_code=export_code.replace("target = os.path.join(root, 'public', 'models', 'estadio-quisqueya.glb')","target = "+repr(str(OUT/'candidate.glb')))
exec(compile(export_code,'export','exec'))
print('ALL_SEATS_REDISTRIBUTED')

# Keep unaffected geometry and its texture coordinates identical to the backup.
import struct
web=OUT/'candidate.glb'
# Compare untouched meshes with the asset present at the start of this run.
# Historical backups predate intentional later changes to the press box/rails.
backup=SOURCE.with_name('estadio-quisqueya.glb')
def glb(path):
    data=bytearray(path.read_bytes());length=struct.unpack_from('<I',data,12)[0]
    return json.loads(data[20:20+length]),data,28+length
old_doc,old_data,old_bin=glb(backup)
new_doc,new_data,new_bin=glb(web)
new_nodes={n['name']:n for n in new_doc['nodes'] if 'mesh' in n}
def buffer_range(doc,index,base):
    acc=doc['accessors'][index];view=doc['bufferViews'][acc['bufferView']]
    start=base+view.get('byteOffset',0)
    return start,start+view['byteLength']
unaffected=0
for node in old_doc['nodes']:
    name=node.get('name','')
    if 'mesh' not in node or name.startswith(('catalog_seats_','A6_','spacing_')):continue
    old_prims=old_doc['meshes'][node['mesh']]['primitives']
    new_prims=new_doc['meshes'][new_nodes[name]['mesh']]['primitives']
    assert len(old_prims)==len(new_prims)
    for old_p,new_p in zip(old_prims,new_prims):
        for key,index in old_p['attributes'].items():
            a,z=buffer_range(old_doc,index,old_bin);b,y=buffer_range(new_doc,new_p['attributes'][key],new_bin)
            if key.startswith('TEXCOORD_'):
                assert z-a==y-b;new_data[b:y]=old_data[a:z]
            else:assert old_data[a:z]==new_data[b:y],(name,key)
        a,z=buffer_range(old_doc,old_p['indices'],old_bin);b,y=buffer_range(new_doc,new_p['indices'],new_bin)
        assert old_data[a:z]==new_data[b:y],name
    unaffected+=1
base_seat_names={'catalog_seats_'+str(g) for g in base_group_ids}
assert sum(n.get('extras',{}).get('catalog_seat_count',0) for n in new_doc['nodes'] if n.get('name') in base_seat_names or n.get('name','').startswith('A6_'))==11367
web.write_bytes(new_data)
import os
os.replace(web,SOURCE.with_name('estadio-quisqueya.glb'))
print('UNAFFECTED_MESHES_VERIFIED',unaffected)
