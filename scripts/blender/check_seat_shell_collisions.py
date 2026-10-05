"""Check actual seat shell intersections between neighbouring seats, without saving."""
import bpy,json,ast,math,hashlib
from pathlib import Path
from mathutils import Vector,Matrix
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'artifacts/blender/all-seats-20261005'
tree=ast.parse((ROOT/'scripts/blender/improve_phase2.py').read_text(encoding='utf-8'))
exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='seat_shell'],type_ignores=[]),'shell','exec'))
sv,sf=seat_shell()
placements=json.loads((ROOT/'artifacts/blender/phase2-20260907/seat-placements.json').read_text())
if len(placements['groups'])>6:
    OUT=ROOT/'artifacts/blender/pending-seats-20261005'
def world_tree(obj,deps):
    evaluated=obj.evaluated_get(deps)
    mesh=evaluated.to_mesh()
    tree=BVHTree.FromPolygons([obj.matrix_world@v.co for v in mesh.vertices],[tuple(face.vertices) for face in mesh.polygons])
    evaluated.to_mesh_clear()
    return tree
deps=bpy.context.evaluated_depsgraph_get();buckets={};collisions=[]
for group in placements['groups']:
    obj=bpy.data.objects['catalog_seats_'+str(group['id'])]
    offset=0;face_offset=0
    for seat in group['seats']:
        p=Vector(seat['position']);angle=seat['facing']
        mat=Matrix.Translation(p)@Matrix.Rotation(angle,4,'Z')
        if seat['sectorId']==11608:
            shell=world_tree(bpy.data.objects['A6_'+str(seat['id'])+'_shell'],deps)
        else:
            vertices=[obj.matrix_world@v.co for v in obj.data.vertices[offset:offset+len(sv)]]
            expected=[mat@Vector(v) for v in sv]
            assert max((a-b).length for a,b in zip(vertices,expected))<1e-5, f'Stale seat mesh: {seat["sectorId"]}/{seat["id"]}'
            faces=[tuple(v-offset for v in face.vertices) for face in obj.data.polygons[face_offset:face_offset+len(sf)]]
            assert all(0<=v<len(sv) for face in faces for v in face)
            shell=BVHTree.FromPolygons(vertices,faces)
            offset+=len(sv);face_offset+=len(sf)

        cell=tuple(math.floor(v) for v in p)
        for x in [-1,0,1]:
            for y in [-1,0,1]:
                for z in [-1,0,1]:
                    for other_p,other_tree,other_id in buckets.get((cell[0]+x,cell[1]+y,cell[2]+z),[]):
                        if (p-other_p).length<1 and shell.overlap(other_tree):
                            collisions.append({'a':other_id,'b':[seat['sectorId'],seat['id']],'distance':(p-other_p).length})
        buckets.setdefault(cell,[]).append((p,shell,[seat['sectorId'],seat['id']]))
hash_paths=[Path(bpy.data.filepath),ROOT/'artifacts/blender/phase2-20260907/seat-placements.json']
json.dump({'sha256':{p.relative_to(ROOT).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in hash_paths},'count':sum(len(g['seats']) for g in placements['groups']),'collisions':collisions},(OUT/'seat-shell-collisions.json').open('w'),indent=2)
print('SEAT_SHELL_COLLISIONS',len(collisions))

assert not collisions, f"Intersecting actual seat shells: {len(collisions)}"
