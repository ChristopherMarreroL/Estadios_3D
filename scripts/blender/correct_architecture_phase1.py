"""Apply audited phase 1 to the existing Quisqueya scene, never a new scene.

Run via Blender MCP after saving a separate backup. Dimensions are provisional
reference-based blockout parameters, not surveyed architectural measurements.
Does not export GLB or save: inspect renders before saving the phase.
"""
import bpy
import math
from mathutils import Matrix, Vector

SCENE = bpy.context.scene
assert bpy.data.filepath.endswith('estadio-quisqueya-v1.blend')
R = 24.0
ARC = R * math.pi / 4
AISLES = [-82, -62, -42, -21, 0, 21, 42, 62, 82]
HALF_AISLE = .9
TIERS = [(3, 17, 1.1, 4.2, 20, 60), (17, 28, 4.2, 6.7, 14, 125), (28, 44, 6.7, 10.8, 20, 125)]

def wing_shift(s):
    t=max(0,min(1,(abs(s)-60)/65))
    return 14*t


def point(s, d, z):
    if d >= 17:
        d -= wing_shift(s)
    sign = -1 if s < 0 else 1
    a = abs(s)
    theta = -math.pi / 2 + min(a / R, math.pi / 4)
    nx, ny = sign * math.cos(theta), math.sin(theta)
    x, y = (R + d) * nx, -32 + (R + d) * ny
    if a > ARC:
        x += sign * (a - ARC) / math.sqrt(2)
        y += (a - ARC) / math.sqrt(2)
    return (x, y, z)


def replace(name, verts, faces, material=None):
    obj = bpy.data.objects.get(name)
    if obj is None:
        obj = bpy.data.objects.new(name, None)
        bpy.data.collections['STRUCTURE'].objects.link(obj)
    mats = list(obj.data.materials) if obj.type == 'MESH' else []
    old = obj.data
    mesh = bpy.data.meshes.new(name + '_phase1_20260906')
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    if material:
        mats = [bpy.data.materials[material]]
    for mat in mats:
        mesh.materials.append(mat)
    obj.data = mesh
    obj.matrix_world = Matrix.Identity(4)
    obj.hide_viewport = False
    obj.hide_render = False
    obj.hide_set(False)
    for modifier in list(obj.modifiers):
        obj.modifiers.remove(modifier)
    obj['architecture_revision'] = '20260906-phase1'
    if old and old.users == 0:
        bpy.data.meshes.remove(old)
    return obj


def intervals(start, end, cuts=True):
    result, cursor = [], start
    for s in AISLES if cuts else []:
        lo, hi = max(start, s-HALF_AISLE), min(end, s+HALF_AISLE)
        if hi <= lo:
            continue
        if lo > cursor:
            result.append((cursor, lo))
        cursor = max(cursor, hi)
    if cursor < end:
        result.append((cursor, end))
    return result


def solid_strip(verts, faces, lo, hi, profile):
    """Closed extrusion of a radial section along the rounded-V directrix."""
    count = max(1, math.ceil((hi-lo)/2))
    base, n = len(verts), len(profile)
    for i in range(count+1):
        s = lo + (hi-lo)*i/count
        verts.extend(point(s, d, z) for d, z in profile)
    for i in range(count):
        for j in range(n):
            a = base+i*n+j
            b = base+i*n+(j+1)%n
            faces.append((a,b,b+n,a+n))
    faces.append(tuple(base+j for j in reversed(range(n))))
    faces.append(tuple(base+count*n+j for j in range(n)))


def steps(d0, d1, z0, z1, rows):
    p = [(d0, .10), (d0, z0)]
    for i in range(rows):
        d = d0+(d1-d0)*(i+1)/rows
        z = z0+(z1-z0)*i/rows
        p.append((d,z))
        p.append((d,z0+(z1-z0)*(i+1)/rows))
    p.append((d1,.10))
    return p


for name, tier, start, end in [
    ('section_palco_a',TIERS[0],-60,60),
    ('section_palco_aa',TIERS[1],-125,125),
    ('section_bleachers_left',TIERS[2],-125,0),
    ('section_bleachers_right',TIERS[2],0,125),
]:
    d0,d1,z0,z1,rows,_ = tier
    verts,faces=[],[]
    for lo,hi in intervals(start,end):
        solid_strip(verts,faces,lo,hi,steps(d0,d1,z0,z1,rows))
    obj=replace(name,verts,faces)
    for key in ['tier_radial_range','tier_height_range','tier_angle_inner','tier_angle_outer','angular_extent_deg','profile_center']:
        if key in obj: del obj[key]
    obj['layout_curve']='24m central arc with tangent straight foul-line wings'
    obj['offset_range']=[d0,d1]
    obj['height_range']=[z0,z1]
    obj['path_interval']=[start,end]
    obj['tier_geometry']='stepped terrace with open radial aisle gaps'
    obj['row_count_blockout']=rows

# Corporate boxes: a single low platform, shared dividers and green fascia.
verts,faces=[],[]
solid_strip(verts,faces,-18,18,[(0,.1),(0,.32),(3,.32),(3,.1)])
corp=replace('section_corporate',verts,faces)
corp['reservable']=False
corp['reservation_status']='non_reservable'
corp['interaction_mode']='informational_only'
corp['physical_seat_color']='MAT_Corporate_Green'
corp['physical_surface_note']='small low corporate platform, 12 provisional boxes'
for key in ['tier_radial_range','tier_height_range','tier_angle_inner','tier_angle_outer','angular_extent_deg','profile_center']:
    if key in corp: del corp[key]
corp['height_range']=[.1,.32]
corp['offset_range']=[0,3]
corp['path_interval']=[-18,18]
verts,faces=[],[]
solid_strip(verts,faces,-18,18,[(-.18,.1),(-.18,1.0),(0,1.0),(0,.1)])
replace('corporate_front_wall',verts,faces)

for i in range(13):
    obj=bpy.data.objects['corporate_divider_%02d'%(i+1)]
    s=-18+i*3
    center=Vector(point(s,1.5,.66))
    normal=Vector(point(s,2.5,.66))-center
    # Shared mesh dimensions are normalized below once, not per instance.
    obj.matrix_world=Matrix.Translation(center) @ Matrix.Rotation(math.atan2(normal.y,normal.x),4,'Z')
mesh=bpy.data.objects['corporate_divider_01'].data
# Keep the shared datablock and its 13 users; replace its simple box geometry.
mesh.clear_geometry()
mesh.from_pydata([(x,y,z) for x in [-1.5,1.5] for y in [-.065,.065] for z in [-.34,.34]],[],
                 [(0,4,6,2),(1,3,7,5),(0,1,5,4),(2,6,7,3),(0,2,3,1),(4,5,7,6)])
mesh.update()

# Replace elevated cylinders with stairs physically seated in terrace gaps.
for i,s in enumerate(AISLES):
    verts,faces=[],[]
    for d0,d1,z0,z1,rows,extent in TIERS:
        if abs(s)+HALF_AISLE > extent: continue
        solid_strip(verts,faces,s-HALF_AISLE,s+HALF_AISLE,steps(d0,d1,z0+.015,z1+.015,rows*2))
    obj=replace('aisle_%02d'%(i+1),verts,faces,'MAT_Concrete')
    obj['web_role']='stepped_aisle'

# Reposition existing dugout blocks against the lower terrace, long axis tangent.
for side,sign in [('licey',-1),('escogido',1)]:
    s=sign*42
    obj=bpy.data.objects['dugout_'+side]
    obj.matrix_world=Matrix.Translation(Vector(point(s,0,1.25))) @ Matrix.Rotation(sign*math.pi/4,4,'Z')
    # Offset negative half-width so the back meets the lower terrace at d=3.
    obj['placement_basis']='tangent to lower-tier front; provisional blockout'

# Foul apron: ground-level strip from the foul lines to the stand/dugout edge.
verts,faces=[],[]
for i in range(161):
    s=-125+250*i/160
    edge = 3 if abs(s)<=60 else 17
    x,y,_=point(s,edge,.09)
    t=max(0,(abs(x)+y+44)/2)
    field=(math.copysign(t,s),-44+t,.09)
    verts.extend([field,(x,y,.09)])
    if i: faces.append((2*i-2,2*i,2*i+1,2*i-1))
apron=replace('field_apron_home_backstop',verts,faces)
grass=bpy.data.objects['field_grass'].data.materials[0]
apron.data.materials.append(grass)
for i,poly in enumerate(apron.data.polygons):
    midpoint=-125+250*(i+.5)/160
    poly.material_index=1 if abs(midpoint)>28 else 0

# Bullpens: one coherent assembly per side, with the old double translation removed.
def box_geometry(center, size, angle):
    mat=Matrix.Translation(Vector(center)) @ Matrix.Rotation(angle,4,'Z')
    v=[tuple(mat@Vector((x*size[0]/2,y*size[1]/2,z*size[2]/2))) for x in [-1,1] for y in [-1,1] for z in [-1,1]]
    return v,[(0,4,6,2),(1,3,7,5),(0,1,5,4),(2,6,7,3),(0,2,3,1),(4,5,7,6)]

for side,sign in [('licey',-1),('escogido',1)]:
    s=sign*79
    center=point(s,0,.13)
    angle=sign*math.pi/4
    v,f=box_geometry(center,(18,7,.12),angle)
    replace('bullpen_'+side,v,f)
    v,f=box_geometry((center[0],center[1],.205),(14.5,2.8,.03),angle)
    replace('bullpen_'+side+'_grass_lane',v,f)
    obj=bpy.data.objects['bullpen_'+side+'_mound']
    verts=[(center[0]+1.45*math.cos(i*2*math.pi/24),center[1]+1.45*math.sin(i*2*math.pi/24),.24) for i in range(24)]
    replace(obj.name,verts,[tuple(range(24))])
    SCENE.objects['bullpen_'+side]['placement_basis']='integrated between foul apron and long red tier; provisional'

bpy.context.view_layer.update()
import bmesh
for obj in SCENE.objects:
    if obj.type == 'MESH' and obj.get('architecture_revision') == '20260906-phase1':
        bm=bmesh.new()
        bm.from_mesh(obj.data)
        bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
        bm.to_mesh(obj.data)
        bm.free()
result={'phase':'architecture-20260906','objects':len(SCENE.objects),'saved':False}
