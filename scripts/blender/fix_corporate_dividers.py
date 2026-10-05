"""Align green corporate walls to catalogue sectors; dimensions are provisional.
Photo: https://listindiario.com/files/vertical_main_image/uploads/2024/03/07/65ea692b484af.jpeg
Run Blender in background on the main .blend file.
"""
import ast, bmesh, bpy, json, math, re, shutil
from pathlib import Path
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'public/models/estadio-quisqueya-v1.blend'
OUT=ROOT/'artifacts/blender/corporate-orientation-20261005'
OUT.mkdir(parents=True,exist_ok=True)
assert Path(bpy.data.filepath).resolve()==SOURCE.resolve()
for path in (SOURCE,SOURCE.with_name('estadio-quisqueya.glb')):
    backup=path.with_name(path.stem+'-pre-corporate-orientation-20261005'+path.suffix)
    if not backup.exists():shutil.copy2(path,backup)
catalog=json.loads((ROOT/'src/data/seat-catalog.json').read_text(encoding='utf-8'))
group=next(g for g in catalog['groups'] if g['id']==2275)
sectors=sorted(group['sectors'],key=lambda s:int(re.search(r'\d+',s['name'])[0]),reverse=True)
# Rebuild only corporate seats from the same updated placements used by the web.
REV='20261005-corporate-orientation'
changed=[]
tree=ast.parse((ROOT/'scripts/blender/improve_phase2.py').read_text(encoding='utf-8'))
exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in ['mesh','seat_shell']],type_ignores=[]),'helpers','exec'))
placements=json.loads((ROOT/'artifacts/blender/phase2-20260907/seat-placements.json').read_text())
corp=next(g for g in placements['groups'] if g['id']==2275)
sv,sf=seat_shell()
v,f=[],[]
for seat in corp['seats']:
    position=Vector(seat['position'])
    angle=-math.atan2(-position.x,-24-position.y)
    mat=Matrix.Translation(position)@Matrix.Rotation(angle,4,'Z')
    base=len(v)
    v.extend(tuple(mat@Vector(p)) for p in sv)
    f.extend(tuple(base+i for i in face) for face in sf)
seat_obj=mesh('catalog_seats_2275',v,f,'MAT_Corporate_Green',True)
seat_obj.data.materials.append(bpy.data.materials['MAT_Steel'])
for face in seat_obj.data.polygons:
    if face.index%len(sf)>=len(sf)-6:face.material_index=1
seat_obj['catalog_seat_count']=len(corp['seats'])
seat_obj['placement_status']='UEPA corporate sectors ordered right to left in the UEPA plan orientation'
widths=[max(len(row['seats']) for row in s['rows']) for s in sectors]
# Same physical arc parameterization as simulateSector, at the narrowest row.
depth=.4+2.2/(2*max(len(s['rows']) for s in sectors))
stretch=(24+depth)/24
gap=.3
pitch=(35.4*stretch-gap*len(sectors))/sum(widths)
boundaries=[-17.7]
distance=0
for width in widths:
    distance+=width*pitch+gap
    boundaries.append(-17.7+distance/stretch)
old=[o for o in bpy.data.objects if o.name.startswith('corporate_divider_')]
collection=old[0].users_collection[0]
before=len(old)
for obj in old:bpy.data.objects.remove(obj,do_unlink=True)
walls=[]
for index,s in enumerate(boundaries):
    angle=-math.pi/2+s/24
    center=Vector((25.51*math.cos(angle),-32+25.51*math.sin(angle),.66))
    mesh=bpy.data.meshes.new('corporate_wall_%02d'%(index+1))
    mesh.from_pydata([(x,y,z) for x in [-1.39,1.39] for y in [-.065,.065] for z in [-.34,.34]],[],[(0,2,6,4),(1,5,7,3),(0,4,5,1),(2,3,7,6),(0,1,3,2),(4,6,7,5)])
    mesh.materials.append(bpy.data.materials['MAT_Corporate_Green'])
    mesh.update()
    obj=bpy.data.objects.new('corporate_divider_%02d'%(index+1),mesh)
    collection.objects.link(obj)
    obj.matrix_world=Matrix.Translation(center)@Matrix.Rotation(angle,4,'Z')
    obj['architecture_revision']='20261005-corporate-orientation'
    obj['reference_status']='Green low walls visible in March 2024 photo; dimensions provisional'
    obj['catalog_boundary_s']=s
    walls.append(obj)
bpy.context.view_layer.update()
deps=bpy.context.evaluated_depsgraph_get()
seat_tree=BVHTree.FromObject(bpy.data.objects['catalog_seats_2275'],deps)
collisions=[w.name for w in walls if BVHTree.FromObject(w,deps).overlap(seat_tree)]
assert not collisions, f'Walls intersect seats: {collisions}'
assert len(walls)==len(sectors)+1
json.dump({'old_dividers':before,'new_dividers':len(walls),'sectors':len(sectors),'seat_intersections':collisions,'boundaries_s':boundaries,'material':'MAT_Corporate_Green'},(OUT/'checks.json').open('w'),indent=2)
version=bpy.context.preferences.filepaths.save_version
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE))
bpy.context.preferences.filepaths.save_version=version
exec(compile((ROOT/'scripts/blender/export_web_phase1.py').read_text(encoding='utf-8'),'export','exec'))
# Preserve UV buffers outside the edited walls: exporter versions can rewrite them.
import struct
web=SOURCE.with_name('estadio-quisqueya.glb')
backup=SOURCE.with_name('estadio-quisqueya-pre-corporate-orientation-20261005.glb')
def glb(path):
    data=bytearray(path.read_bytes())
    length=struct.unpack_from('<I',data,12)[0]
    return json.loads(data[20:20+length]),data,28+length
old_doc,old_data,old_bin=glb(backup)
new_doc,new_data,new_bin=glb(web)
new_nodes={n['name']:n for n in new_doc['nodes'] if 'mesh' in n}
def buffer_range(doc,index,base):
    acc=doc['accessors'][index]
    view=doc['bufferViews'][acc['bufferView']]
    start=base+view.get('byteOffset',0)
    return start,start+view['byteLength']
for node in old_doc['nodes']:
    if 'mesh' not in node or node['name'].startswith('corporate_divider_') or node['name']=='catalog_seats_2275':continue
    old_prims=old_doc['meshes'][node['mesh']]['primitives']
    new_prims=new_doc['meshes'][new_nodes[node['name']]['mesh']]['primitives']
    assert len(old_prims)==len(new_prims)
    for old_p,new_p in zip(old_prims,new_prims):
        for key,index in old_p['attributes'].items():
            a,z=buffer_range(old_doc,index,old_bin)
            b,y=buffer_range(new_doc,new_p['attributes'][key],new_bin)
            if key.startswith('TEXCOORD_'):
                assert z-a==y-b
                new_data[b:y]=old_data[a:z]
            else:
                assert old_data[a:z]==new_data[b:y],(node['name'],key)
        a,z=buffer_range(old_doc,old_p['indices'],old_bin)
        b,y=buffer_range(new_doc,new_p['indices'],new_bin)
        assert old_data[a:z]==new_data[b:y],node['name']
web.write_bytes(new_data)

# Render review only; do not save temporary camera settings.
scene=bpy.context.scene
scene.render.engine='CYCLES'
scene.cycles.samples=8
scene.cycles.use_denoising=True
scene.render.resolution_x=1200
scene.render.resolution_y=720
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
data=bpy.data.cameras.new('corporate_dividers_review')
camera=bpy.data.objects.new('corporate_dividers_review',data)
scene.collection.objects.link(camera)
scene.camera=camera
camera.location=(8,-42,9)
camera.rotation_euler=(Vector((0,-57,.5))-camera.location).to_track_quat('-Z','Y').to_euler()
data.lens=32
scene.render.filepath=str(OUT/'closeup.png')
bpy.ops.render.render(write_still=True)
print('CORPORATE_DIVIDERS_OK',len(walls),'walls; zero seat intersections')
