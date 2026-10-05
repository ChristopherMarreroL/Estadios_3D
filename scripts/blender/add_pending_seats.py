"""Add the remaining catalogue seats without moving the existing 11,367 seats.
Model dimensions are approximate; preserve UEPA identities and relative areas.
"""
import ast,bpy,bmesh,math,json,shutil,struct,os
from pathlib import Path
from mathutils import Matrix,Vector
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'public/models/estadio-quisqueya-v1.blend'
OUT=ROOT/'artifacts/blender/pending-seats-20261005';OUT.mkdir(parents=True,exist_ok=True)
REV='20261005-pending-seats';changed=[]
assert Path(bpy.data.filepath).resolve()==SOURCE.resolve()
for path in [SOURCE,SOURCE.with_name('estadio-quisqueya.glb')]:
    backup=path.with_name(path.stem+'-pre-pending-seats-20261005'+path.suffix)
    if not backup.exists():shutil.copy2(path,backup)
tree=ast.parse((ROOT/'scripts/blender/improve_phase2.py').read_text(encoding='utf-8'))
exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in ['mesh','seat_shell','strip','beam']],type_ignores=[]),'helpers','exec'))
def point(s,d,z):
    if d>=3:d-=14*max(0,min(1,(abs(s)-60)/65))
    a=abs(s);theta=-math.pi/2+min(a/24,math.pi/4);wing=max(0,a-24*math.pi/4)/math.sqrt(2)
    return ((-1 if s<0 else 1)*((24+d)*math.cos(theta)+wing),-32+(24+d)*math.sin(theta)+wing,z)
data=json.loads((ROOT/'src/data/special-seat-layout.json').read_text())
placements=json.loads((ROOT/'artifacts/blender/phase2-20260907/seat-placements.json').read_text())
# Give the rear boxes sight over the last preference row, and keep headroom
# below the existing central press box. Apply once, including its glass/sign.
for obj in bpy.data.objects:
    if obj.name.startswith('press_box'):
        delta=3-obj.get('special_elevation',0)
        obj.location.z+=delta;obj['special_elevation']=3
sv,sf=seat_shell()
for group in data['groups']:
    v,f=[],[]
    # Keep vertex chunks in the shared exporter/catalogue order for verification.
    shared=next(g for g in placements['groups'] if g['id']==group['id'])
    for seat in shared['seats']:
        mat=Matrix.Translation(Vector(seat['position']))@Matrix.Rotation(seat['facing'],4,'Z');base=len(v)
        v.extend(tuple(mat@Vector(p)) for p in sv);f.extend(tuple(base+i for i in face) for face in sf)
    mat='MAT_Seat_Red' if group['id'] in [2279,2282] else 'MAT_Seat_Blue'
    obj=mesh('catalog_seats_'+str(group['id']),v,f,mat,True)
    obj['catalog_seat_count']=len(group['seats']);obj['placement_status']='approximate UEPA rear-ring / former Licey bullpen placement'
    obj.data.materials.append(bpy.data.materials['MAT_Steel'])
    for face in obj.data.polygons:
        if face.index%len(sf)>=len(sf)-6:face.material_index=1

# Dedicated stepped platforms behind the existing concourse, with side passages.
v,f=[],[];rails_v,rails_f=[],[]
for platform in data['platforms']:
    rows=platform['rows'];profile=[(rows[0]['depth']-.475,12.55),(rows[0]['depth']-.475,rows[0]['height'])]
    for i,row in enumerate(rows):
        end=row['depth']+.475;profile.append((end,row['height']))
        if i+1<len(rows):profile.append((end,rows[i+1]['height']))
    profile.append((rows[-1]['depth']+.475,12.55))
    strip(v,f,platform['lo'],platform['hi'],profile,step=.3)
    lo,hi=platform['lo'],platform['hi'];d=rows[-1]['depth']+.475;z=rows[-1]['height']
    steps=max(1,math.ceil((hi-lo)/.8))
    for i in range(steps):beam(rails_v,rails_f,point(lo+(hi-lo)*i/steps,d,z+1),point(lo+(hi-lo)*(i+1)/steps,d,z+1),.035,6)
    for i in range(steps+1):beam(rails_v,rails_f,point(lo+(hi-lo)*i/steps,d,z),point(lo+(hi-lo)*i/steps,d,z+1),.03,6)
mesh('special_suite_platforms',v,f,'MAT_Concrete_Light')
mesh('special_suite_rear_rails',rails_v,rails_f,'MAT_Steel')
v,f=[],[]
platforms=sorted(data['platforms'],key=lambda p:p['lo'])
# Side passages use the same risers as the seats, rather than empty gaps.
rows=max((p['rows'] for p in platforms),key=len)
profile=[(49.125,12.55),(49.125,12.8)]
for i,row in enumerate(rows):
    profile.append((row['depth']+.475,row['height']))
    if i+1<len(rows):profile.append((row['depth']+.475,rows[i+1]['height']))
profile.append((rows[-1]['depth']+.475,12.55))
for left,right in zip(platforms,platforms[1:]):
    if right['lo']>left['hi']:strip(v,f,left['hi'],right['lo'],profile,step=.3)
mesh('special_suite_side_aisles',v,f,'MAT_Concrete_Light')
# Staircases enter through gaps between complete sectors and openings in the
# old concourse rail. Front landings leave the staircase slots open.
stairs=[]
for left,right in zip(platforms,platforms[1:]):
    if right['lo']-left['hi']<.1:continue
    s=(left['hi']+right['lo'])/2
    factor=(24+49.6)/24 if abs(s)<24*math.pi/4 else 1
    stairs.append((s-.38/factor,s+.38/factor))
def subtract(spans,openings):
    for lo,hi in openings:
        spans=[piece for a,b in spans for piece in ([(a,min(b,lo))] if a<lo else [])+([(max(a,hi),b)] if b>hi else []) if piece[1]>piece[0]]
    return spans
v,f=[],[]
for lo,hi in subtract([(-60.5,60.5)],stairs):strip(v,f,lo,hi,[(48.15,12.55),(48.15,12.8),(49.125,12.8),(49.125,12.55)],step=.3)
mesh('special_suite_front_walkway',v,f,'MAT_Concrete_Light')
v,f=[],[]
profile=[(45.5,10.55),(45.5,10.8)]
for i in range(12):
    depth=45.5+(49.125-45.5)*(i+1)/12
    profile.extend([(depth,10.8+2*i/12),(depth,10.8+2*(i+1)/12)])
profile.append((49.125,10.55))
for lo,hi in stairs:strip(v,f,lo,hi,profile,step=.2)
mesh('special_suite_access_stairs',v,f,'MAT_Concrete_Light')
v,f=[],[]
for lo,hi in subtract([(-125,125)],[(lo-.06,hi+.06) for lo,hi in stairs]):
    steps=max(1,math.ceil(hi-lo))
    for i in range(steps):beam(v,f,point(lo+(hi-lo)*i/steps,48,11.8),point(lo+(hi-lo)*(i+1)/steps,48,11.8),.045,6)
    for i in range(steps+1):beam(v,f,point(lo+(hi-lo)*i/steps,48,10.8),point(lo+(hi-lo)*i/steps,48,11.8),.04,6)
mesh('phase2_concourse_railing',v,f,'MAT_Steel')
v,f=[],[]
for lo,hi in subtract([(-60.5,60.5)],[(lo-.06,hi+.06) for lo,hi in stairs]):
    steps=max(1,math.ceil(hi-lo))
    for i in range(steps):beam(v,f,point(lo+(hi-lo)*i/steps,48.15,13.8),point(lo+(hi-lo)*(i+1)/steps,48.15,13.8),.035,6)
    for i in range(steps+1):beam(v,f,point(lo+(hi-lo)*i/steps,48.15,12.8),point(lo+(hi-lo)*i/steps,48.15,13.8),.03,6)
mesh('special_suite_front_rail',v,f,'MAT_Steel')

# Bullpen catalogue: seven rows plus four actual tables with four chairs each.
bp=data['bullpen'];rotation=Matrix.Rotation(bp['angle'],4,'Z');origin=Vector(bp['origin'])
def local(x,y,z):
    p=origin+rotation@Vector((x,y,0));p.z=z;return tuple(p)
def box(v,f,x0,x1,y0,y1,z0,z1):
    base=len(v);v.extend(local(x,y,z) for x in [x0,x1] for y in [y0,y1] for z in [z0,z1])
    f.extend(tuple(base+i for i in face) for face in [(0,4,6,2),(1,3,7,5),(0,1,5,4),(2,6,7,3),(0,2,3,1),(4,5,7,6)])
v,f=[],[]
for i in range(7):box(v,f,-3.6,3.6,-(.8+i*.9+.45),-(.8+i*.9-.45),.08,.2+i*.22)
for x in [-10.2,-6.4,6.4,10.2]:box(v,f,x-1.45,x+1.45,-4.85,-1.95,.08,.2)
# Level front circulation connects seating, tables and side access.
box(v,f,-11.65,11.65,-1.95,-.05,.08,.2)
mesh('special_bullpen_platforms',v,f,'MAT_Concrete_Light')
v,f=[],[]
for table in bp['tables']:
    p=Vector(table['position'])
    # Disc top and pedestal have world coordinates; table height is 0.74 m.
    base=len(v);sides=24
    for z in [.89,.94]:
        v.extend((p.x+table['radius']*math.cos(i*2*math.pi/sides),p.y+table['radius']*math.sin(i*2*math.pi/sides),z) for i in range(sides))
    f.append(tuple(base+i for i in reversed(range(sides))));f.append(tuple(base+sides+i for i in range(sides)))
    for i in range(sides):j=(i+1)%sides;f.append((base+i,base+j,base+sides+j,base+sides+i))
    beam(v,f,(p.x,p.y,.2),(p.x,p.y,.89),.06,8)
mesh('special_bullpen_tables',v,f,'MAT_Steel')
v,f=[],[]
beam(v,f,local(-11.65,-.05,1.2),local(11.65,-.05,1.2),.035,8)
for x in [-11.65,-8,-4,0,4,8,11.65]:beam(v,f,local(x,-.05,.2),local(x,-.05,1.2),.03,6)
mesh('special_bullpen_front_rail',v,f,'MAT_Steel')
bpy.context.view_layer.update()
def world_tree(obj):
    evaluated=obj.evaluated_get(bpy.context.evaluated_depsgraph_get());m=evaluated.to_mesh()
    result=BVHTree.FromPolygons([obj.matrix_world@v.co for v in m.vertices],[tuple(p.vertices) for p in m.polygons]);evaluated.to_mesh_clear();return result
supports=[world_tree(bpy.data.objects[n]) for n in ['special_suite_platforms','special_bullpen_platforms']]
unsupported=[];headroom=[]
obstacles=[o for o in bpy.context.scene.objects if o.type=='MESH' and not o.hide_render and (o.name.startswith(('aisle_','corporate_divider_','special_')) or o.name in ['section_palco_a','section_palco_aa','section_bleachers_left','section_bleachers_right','press_box','press_box_glass','phase2_concourse_railing','grandstand_outer_facade'])]
obstacle_trees=[(o.name,world_tree(o)) for o in obstacles if 'platform' not in o.name and 'walkway' not in o.name]
intersections=[]
for group in data['groups']:
    shell=world_tree(bpy.data.objects['catalog_seats_'+str(group['id'])])
    for name,t in obstacle_trees:
        if t.overlap(shell):intersections.append([group['id'],name])
    for seat in group['seats']:
        p=Vector(seat['position']);hits=[t.ray_cast(p+Vector((0,0,.05)),Vector((0,0,-1)),.1)[0] for t in supports]
        if not any(h is not None for h in hits):unsupported.append([seat['sectorId'],seat['id']])
        ceiling=world_tree(bpy.data.objects['press_box']).ray_cast(p+Vector((0,0,.05)),Vector((0,0,1)),2.05)[0]
        if ceiling is not None:headroom.append([seat['sectorId'],seat['id']])
checks={'revision':REV,'added':608,'modelSeats':11975,'unsupported':unsupported,'obstacle_intersections':intersections,'low_headroom':headroom}
(OUT/'model-checks.json').write_text(json.dumps(checks,indent=2))
assert not unsupported and not intersections and not headroom,checks
# Save only after geometric validation. Export candidate before replacing web asset.
version=bpy.context.preferences.filepaths.save_version;bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE));bpy.context.preferences.filepaths.save_version=version
export_code=(ROOT/'scripts/blender/export_web_phase1.py').read_text(encoding='utf-8').replace("target = os.path.join(root, 'public', 'models', 'estadio-quisqueya.glb')","target = "+repr(str(OUT/'candidate.glb')))
exec(compile(export_code,'export','exec'))
def glb(path):
    data=bytearray(path.read_bytes());length=struct.unpack_from('<I',data,12)[0];return json.loads(data[20:20+length]),data,28+length
old,oldbytes,oldbase=glb(SOURCE.with_name('estadio-quisqueya-pre-pending-seats-20261005.glb'))
new,newbytes,newbase=glb(OUT/'candidate.glb');nodes={n['name']:n for n in new['nodes'] if 'mesh' in n}
def buf(doc,index,base):
    acc=doc['accessors'][index];view=doc['bufferViews'][acc['bufferView']];a=base+view.get('byteOffset',0);return a,a+view['byteLength']
preserved=0;adjusted=[]
for node in old['nodes']:
    if 'mesh' not in node:continue
    if node['name'].startswith('press_box') or node['name']=='phase2_concourse_railing':
        adjusted.append(node['name']);continue
    other=nodes[node['name']];assert node.get('translation')==other.get('translation') and node.get('rotation')==other.get('rotation') and node.get('scale')==other.get('scale')
    aa=old['meshes'][node['mesh']]['primitives'];bb=new['meshes'][other['mesh']]['primitives'];assert len(aa)==len(bb)
    for a,b in zip(aa,bb):
        for key,index in a['attributes'].items():
            lo,hi=buf(old,index,oldbase);x,y=buf(new,b['attributes'][key],newbase)
            if key.startswith('TEXCOORD_'):assert hi-lo==y-x;newbytes[x:y]=oldbytes[lo:hi]
            else:assert oldbytes[lo:hi]==newbytes[x:y],(node['name'],key)
        lo,hi=buf(old,a['indices'],oldbase);x,y=buf(new,b['indices'],newbase);assert oldbytes[lo:hi]==newbytes[x:y],node['name']
    preserved+=1
assert sum(n.get('extras',{}).get('catalog_seat_count',0) for n in new['nodes'])==11975
(OUT/'candidate.glb').write_bytes(newbytes);os.replace(OUT/'candidate.glb',SOURCE.with_name('estadio-quisqueya.glb'))
checks['preservedMeshes']=preserved;checks['adjustedExistingMeshes']=adjusted;checks['preservedSeats']=11367
(OUT/'model-checks.json').write_text(json.dumps(checks,indent=2))
print('PENDING_SEATS_ADDED',608,'PRESERVED_MESHES',preserved)
