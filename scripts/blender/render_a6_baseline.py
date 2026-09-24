import bpy,os,ast,json,bmesh,math
from mathutils import Vector
ROOT=r'C:\Users\chris\Programacion\Estadios_3D';OUT=os.path.join(ROOT,'artifacts','blender','a6-detail-20260910')
seats=json.load(open(os.path.join(ROOT,'artifacts','blender','dugout-a6-seats.json')))
tree=ast.parse(open(os.path.join(ROOT,'scripts','blender','detail_a6.py'),encoding='utf-8').read())
exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='render'],type_ignores=[]),'render','exec'))
s=seats[len(seats)//2+2];p=Vector(s['position'])
from mathutils import Matrix
rot=Matrix.Rotation(-math.atan2(-p.x,-24-p.y),3,'Z')
render('chair-detail-before',p+rot@Vector((.8,1.35,.85)),p+Vector((0,0,.42)),38)
render('chair-number-before',p+rot@Vector((-.55,-1.0,1.05)),p+Vector((0,0,.7)),48)
