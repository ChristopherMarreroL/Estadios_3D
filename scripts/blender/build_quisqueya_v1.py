import bpy
import math
import os
from mathutils import Vector


ROOT = r"C:\Users\chris\Programacion\Estadios_3D"
MODEL_DIR = os.path.join(ROOT, "public", "models")
DOCS_DIR = os.path.join(ROOT, "docs")
BLEND_PATH = os.path.join(MODEL_DIR, "estadio-quisqueya-v1.blend")
GLB_PATH = os.path.join(MODEL_DIR, "estadio-quisqueya.glb")
PREVIEW_PATH = os.path.join(DOCS_DIR, "quisqueya-v1-preview.png")

os.makedirs(MODEL_DIR, exist_ok=True)
os.makedirs(DOCS_DIR, exist_ok=True)


def clean_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.materials,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)
    for collection in list(bpy.data.collections):
        bpy.data.collections.remove(collection)


def collection(name, parent=None):
    result = bpy.data.collections.new(name)
    if parent is None:
        bpy.context.scene.collection.children.link(result)
    else:
        parent.children.link(result)
    return result


def move_to(obj, target):
    for current in list(obj.users_collection):
        current.objects.unlink(obj)
    target.objects.link(obj)
    return obj


def material(name, color, metallic=0.0, roughness=0.6, emission=None):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.diffuse_color = (*color[:3], color[3])
    mat.metallic = metallic
    mat.roughness = roughness
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = color
        bsdf.inputs["Metallic"].default_value = metallic
        bsdf.inputs["Roughness"].default_value = roughness
        if emission:
            bsdf.inputs["Emission Color"].default_value = emission
            bsdf.inputs["Emission Strength"].default_value = 2.5
    return mat


def assign(obj, mat):
    if mat and hasattr(obj.data, "materials"):
        obj.data.materials.append(mat)
    return obj


def cube(name, loc, scale, mat, target, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod = obj.modifiers.new("soft_edges", "BEVEL")
        mod.width = bevel
        mod.segments = 2
    assign(obj, mat)
    return move_to(obj, target)


def cylinder(name, loc, radius, depth, mat, target, vertices=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc)
    obj = bpy.context.object
    obj.name = name
    assign(obj, mat)
    return move_to(obj, target)


def mesh_object(name, verts, faces, mat, target):
    mesh = bpy.data.meshes.new(name + "_mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    target.objects.link(obj)
    assign(obj, mat)
    return obj


def polygon(name, points, z, mat, target):
    verts = [(x, y, z) for x, y in points]
    return mesh_object(name, verts, [tuple(range(len(verts)))], mat, target)


def beam(name, start, end, radius, mat, target):
    start = Vector(start)
    end = Vector(end)
    vec = end - start
    mid = (start + end) / 2
    obj = cylinder(name, mid, radius, vec.length, mat, target, vertices=8)
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = vec.to_track_quat("Z", "Y")
    return obj


def ring_section(name, angle_start, angle_end, r_inner, r_outer, z_inner, z_outer, mat, target, zone, team="shared", steps=24):
    center = Vector((0.0, -44.0, 0.0))
    verts = []
    faces = []
    rows = 5
    for row in range(rows + 1):
        t = row / rows
        radius = r_inner + (r_outer - r_inner) * t
        z = z_inner + (z_outer - z_inner) * t
        for i in range(steps + 1):
            angle = math.radians(angle_start + (angle_end - angle_start) * i / steps)
            verts.append((center.x + radius * math.cos(angle), center.y + radius * math.sin(angle), z))
    width = steps + 1
    for row in range(rows):
        for i in range(steps):
            a = row * width + i
            faces.append((a, a + 1, a + width + 1, a + width))
    obj = mesh_object(name, verts, faces, mat, target)
    obj["selectable"] = True
    obj["section_id"] = name.replace("section_", "")
    obj["zone"] = zone
    obj["team"] = team
    obj["lod"] = 1
    solidify = obj.modifiers.new("concrete_depth", "SOLIDIFY")
    solidify.thickness = 0.65
    return obj


def arc_wall(name, points, height, thickness, mat, target):
    parent = bpy.data.objects.new(name, None)
    target.objects.link(parent)
    for index, (a, b) in enumerate(zip(points[:-1], points[1:]), 1):
        p1 = Vector((a[0], a[1], height / 2))
        p2 = Vector((b[0], b[1], height / 2))
        wall = beam(f"{name}_{index:02d}", p1, p2, thickness, mat, target)
        wall.parent = parent
    return parent


def text_object(name, body, loc, size, mat, target, rotation=(math.radians(90), 0, 0), align="CENTER"):
    curve = bpy.data.curves.new(name + "_curve", type="FONT")
    curve.body = body
    curve.align_x = align
    curve.align_y = "CENTER"
    curve.size = size
    curve.extrude = 0.025
    obj = bpy.data.objects.new(name, curve)
    obj.location = loc
    obj.rotation_euler = rotation
    target.objects.link(obj)
    assign(obj, mat)
    return obj


def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def seat_mesh():
    verts = []
    faces = []

    def add_box(center, scale):
        x, y, z = center
        sx, sy, sz = scale
        base = len(verts)
        verts.extend([
            (x - sx, y - sy, z - sz), (x + sx, y - sy, z - sz),
            (x + sx, y + sy, z - sz), (x - sx, y + sy, z - sz),
            (x - sx, y - sy, z + sz), (x + sx, y - sy, z + sz),
            (x + sx, y + sy, z + sz), (x - sx, y + sy, z + sz),
        ])
        faces.extend([
            (base, base + 1, base + 2, base + 3),
            (base + 4, base + 7, base + 6, base + 5),
            (base, base + 4, base + 5, base + 1),
            (base + 1, base + 5, base + 6, base + 2),
            (base + 2, base + 6, base + 7, base + 3),
            (base + 4, base, base + 3, base + 7),
        ])

    add_box((0, 0, 0.48), (0.28, 0.28, 0.08))
    add_box((0, 0.24, 0.83), (0.28, 0.06, 0.34))
    mesh = bpy.data.meshes.new("seat_shared_mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    return mesh


def add_seat_samples(section, start_deg, end_deg, radius, z, mat, target, row_letter):
    shared = seat_mesh() if "seat_shared_mesh" not in bpy.data.meshes else bpy.data.meshes["seat_shared_mesh"]
    for number in range(1, 9):
        t = (number - 0.5) / 8
        angle_deg = start_deg + (end_deg - start_deg) * t
        angle = math.radians(angle_deg)
        obj = bpy.data.objects.new(f"seat_{section}_{row_letter}{number:02d}", shared)
        obj.location = (radius * math.cos(angle), -44 + radius * math.sin(angle), z)
        obj.rotation_euler[2] = angle - math.radians(90)
        obj["seat_id"] = f"{section}_{row_letter}{number:02d}"
        obj["section"] = section
        obj["row"] = row_letter
        obj["number"] = number
        obj["selectable"] = True
        target.objects.link(obj)
        assign(obj, mat)


clean_scene()

root = collection("ESTADIO_QUISQUEYA")
field_col = collection("FIELD", root)
seating_col = collection("SEATING", root)
palcos_col = collection("PALCOS", seating_col)
prefs_col = collection("PREFERENCIAS", seating_col)
bleachers_col = collection("BLEACHERS", seating_col)
seat_system_col = collection("SEAT_SYSTEM", seating_col)
team_col = collection("TEAM_AREAS", root)
score_col = collection("SCOREBOARD", root)
lights_col = collection("LIGHTS", root)
ads_col = collection("ADVERTISING", root)
structure_col = collection("STRUCTURE", root)
export_col = collection("EXPORT", root)

root["project"] = "Quisqueya 3D"
root["location"] = "Santo Domingo, República Dominicana"
root["units"] = "meters"
export_col["target"] = "Three.js / React Three Fiber"
export_col["format"] = "glTF 2.0 binary"

grass = material("MAT_Grass", (0.055, 0.30, 0.10, 1))
grass_alt = material("MAT_Grass_Stripe", (0.075, 0.38, 0.12, 1))
clay = material("MAT_Clay", (0.64, 0.25, 0.07, 1))
dirt = material("MAT_Dirt", (0.44, 0.18, 0.05, 1))
chalk = material("MAT_Chalk", (0.95, 0.95, 0.88, 1), roughness=0.8)
concrete = material("MAT_Concrete", (0.24, 0.27, 0.28, 1), roughness=0.9)
concrete_light = material("MAT_Concrete_Light", (0.55, 0.58, 0.58, 1), roughness=0.85)
steel = material("MAT_Steel", (0.035, 0.055, 0.06, 1), metallic=0.7, roughness=0.28)
roof_mat = material("MAT_Roof", (0.18, 0.22, 0.22, 1), metallic=0.15, roughness=0.5)
glass = material("MAT_Glass", (0.12, 0.38, 0.48, 0.75), metallic=0.05, roughness=0.15)
blue = material("MAT_Licey_Blue", (0.02, 0.16, 0.62, 1))
red = material("MAT_Escogido_Red", (0.72, 0.025, 0.045, 1))
yellow = material("MAT_Palco_A_Yellow", (0.95, 0.58, 0.03, 1))
palco_red = material("MAT_Palco_AA_Red", (0.78, 0.04, 0.08, 1))
pref_blue = material("MAT_Preferencias_Blue", (0.04, 0.26, 0.72, 1))
purple = material("MAT_Bleachers_Purple", (0.12, 0.025, 0.26, 1))
corporate_green = material("MAT_Corporate_Green", (0.03, 0.42, 0.19, 1))
screen_mat = material("MAT_Scoreboard_Screen", (0.006, 0.012, 0.018, 1), metallic=0.15, roughness=0.22, emission=(0.01, 0.035, 0.06, 1))
white_light = material("MAT_Light", (0.85, 0.88, 0.78, 1), roughness=0.15, emission=(0.9, 0.95, 0.75, 1))

# Field footprint derived from the supplied aerial references.
outfield_points = [
    (0, -48), (-72, 27), (-69, 40), (-58, 58), (-40, 72),
    (-19, 80), (0, 82), (19, 80), (40, 72), (58, 58),
    (69, 40), (72, 27),
]
polygon("field_grass", outfield_points, 0.0, grass, field_col)

# Alternating low-poly mowing strips, limited to the visible outfield.
stripe_specs = [
    (-55, -44, 20, 60), (-34, -23, 8, 74), (-12, -2, 2, 81),
    (12, 22, 2, 78), (34, 44, 9, 68), (55, 64, 22, 51),
]
for index, (x1, x2, y1, y2) in enumerate(stripe_specs, 1):
    polygon(f"grass_stripe_{index:02d}", [(x1, y1), (x2, y1), (x2, y2), (x1, y2)], 0.012, grass_alt, field_col)

# Infield clay and grass island.
bpy.ops.mesh.primitive_circle_add(vertices=64, radius=29, fill_type="NGON", location=(0, -20, 0.025))
infield = bpy.context.object
infield.name = "infield_clay"
assign(infield, clay)
move_to(infield, field_col)

bpy.ops.mesh.primitive_circle_add(vertices=64, radius=14.8, fill_type="NGON", location=(0, -20, 0.045))
inner_grass = bpy.context.object
inner_grass.name = "infield_grass"
assign(inner_grass, grass)
move_to(inner_grass, field_col)

home = Vector((0, -44, 0.08))
first = Vector((19.4, -24.6, 0.08))
second = Vector((0, -5.2, 0.08))
third = Vector((-19.4, -24.6, 0.08))
for name, point in (("home_plate", home), ("first_base", first), ("second_base", second), ("third_base", third)):
    base = cube(name, point, (0.75, 0.75, 0.08), chalk, field_col, bevel=0.08)
    base.rotation_euler[2] = math.radians(45)

cylinder("pitchers_mound", (0, -19.6, 0.22), 2.7, 0.38, clay, field_col, vertices=48)
cube("pitchers_rubber", (0, -19.6, 0.45), (0.7, 0.12, 0.05), chalk, field_col)

beam("foul_line_left", home, (-72, 27, 0.10), 0.09, chalk, field_col)
beam("foul_line_right", home, (72, 27, 0.10), 0.09, chalk, field_col)
for name, a, b in (
    ("basepath_home_first", home, first), ("basepath_first_second", first, second),
    ("basepath_second_third", second, third), ("basepath_third_home", third, home),
):
    beam(name, a, b, 0.22, dirt, field_col)

cube("batters_box_left", (-1.4, -43.2, 0.11), (0.55, 1.3, 0.04), chalk, field_col)
cube("batters_box_right", (1.4, -43.2, 0.11), (0.55, 1.3, 0.04), chalk, field_col)

fence_points = outfield_points[1:]
outfield_wall = arc_wall("outfield_wall", fence_points, 2.7, 0.32, corporate_green, structure_col)
outfield_wall["center_field_ft"] = 411
outfield_wall["corner_field_ft"] = 335
outfield_wall["alley_ft"] = 383
text_object("center_field_411_ft", "411 FT", (0, 80.9, 3.0), 1.25, chalk, structure_col)

# Bowl zones: horseshoe open toward center field.
section_corporate = ring_section("section_corporate", 215, 325, 13, 21, 0.8, 2.6, corporate_green, palcos_col, "corporate")
section_palco_a = ring_section("section_palco_a", 160, 380, 22, 32, 1.2, 4.2, yellow, palcos_col, "palco_a")
section_palco_aa = ring_section("section_palco_aa", 153, 387, 33, 44, 2.1, 6.2, palco_red, palcos_col, "palco_aa")
section_preferencias = ring_section("section_preferencias", 148, 392, 45, 57, 3.2, 8.4, pref_blue, prefs_col, "preferencias")
section_bleachers_left = ring_section("section_bleachers_left", 138, 220, 58, 72, 4.0, 10.5, purple, bleachers_col, "bleachers", "licey", steps=14)
section_bleachers_right = ring_section("section_bleachers_right", 320, 402, 58, 72, 4.0, 10.5, purple, bleachers_col, "bleachers", "escogido", steps=14)
section_licey = ring_section("section_licey_side", 220, 270, 58, 73, 5.1, 11.6, blue, bleachers_col, "team_side", "licey", steps=12)
section_escogido = ring_section("section_escogido_side", 270, 320, 58, 73, 5.1, 11.6, red, bleachers_col, "team_side", "escogido", steps=12)

# Radial concrete aisles visible in the seating maps.
for index, angle_deg in enumerate((158, 190, 225, 250, 270, 290, 315, 350, 382), 1):
    angle = math.radians(angle_deg)
    start = Vector((20 * math.cos(angle), -44 + 20 * math.sin(angle), 1.0))
    end = Vector((72 * math.cos(angle), -44 + 72 * math.sin(angle), 11.8))
    beam(f"aisle_{index:02d}", start, end, 0.58, concrete_light, structure_col)

# Representative linked seats with web metadata.
add_seat_samples("corporate", 225, 315, 18, 2.7, corporate_green, seat_system_col, "A")
add_seat_samples("palco_a", 205, 335, 28, 4.6, yellow, seat_system_col, "A")
add_seat_samples("palco_aa", 198, 342, 39, 6.7, palco_red, seat_system_col, "A")
add_seat_samples("preferencias", 190, 350, 52, 8.8, pref_blue, seat_system_col, "A")

# Team areas along the foul lines.
dugout_licey = cube("dugout_licey", (-29, -28, 1.25), (8.5, 2.6, 1.25), blue, team_col, bevel=0.2)
dugout_licey.rotation_euler[2] = math.radians(-42)
dugout_licey["team"] = "Tigres del Licey"
dugout_licey["selectable"] = True
dugout_escogido = cube("dugout_escogido", (29, -28, 1.25), (8.5, 2.6, 1.25), red, team_col, bevel=0.2)
dugout_escogido.rotation_euler[2] = math.radians(42)
dugout_escogido["team"] = "Leones del Escogido"
dugout_escogido["selectable"] = True

cube("bullpen_licey", (-66, 10, 0.55), (8, 3.1, 0.55), blue, team_col, bevel=0.15)
cube("bullpen_escogido", (66, 10, 0.55), (8, 3.1, 0.55), red, team_col, bevel=0.15)

# Scoreboard and center-field identity.
scoreboard = cube("scoreboard_center", (0, 88, 13), (10.5, 0.75, 6.5), steel, score_col, bevel=0.35)
scoreboard["selectable"] = True
scoreboard["content_slot"] = "scoreboard_texture"
cube("scoreboard_screen", (0, 87.18, 13.3), (8.8, 0.08, 4.7), screen_mat, score_col, bevel=0.2)
text_object("scoreboard_title", "QUISQUEYA 3D", (0, 87.05, 15.7), 1.25, chalk, score_col)
text_object("scoreboard_match", "LICEY   VS   ESCOGIDO", (0, 87.0, 12.8), 0.72, chalk, score_col)
text_object("scoreboard_distance", "411 FT", (0, 86.95, 10.5), 0.8, yellow, score_col)

def advertising_group(name, specs, accent):
    parent = bpy.data.objects.new(name, None)
    ads_col.objects.link(parent)
    parent["replaceable_material"] = True
    parent["texture_slot"] = name + "_texture"
    for index, (x, y, width) in enumerate(specs, 1):
        panel = cube(f"{name}_panel_{index:02d}", (x, y, 5.0), (width, 0.28, 1.5), accent, ads_col, bevel=0.12)
        panel.parent = parent
    return parent


advertising_group("advertising_left_field", [(-58, 60, 5.5), (-43, 72, 5.0)], blue)
advertising_group("advertising_center_field", [(-16, 83, 5.5), (16, 83, 5.5)], yellow)
advertising_group("advertising_right_field", [(43, 72, 5.0), (58, 60, 5.5)], red)

# Curved main roof and visible steel ribs.
roof_verts = []
roof_faces = []
roof_steps = 36
for band, radius in enumerate((54, 78)):
    for i in range(roof_steps + 1):
        angle = math.radians(178 + (362 - 178) * i / roof_steps)
        z = 16.0 + band * 4.2 + 1.4 * math.cos((angle - math.radians(270)) * 1.1)
        roof_verts.append((radius * math.cos(angle), -44 + radius * math.sin(angle), z))
for i in range(roof_steps):
    roof_faces.append((i, i + 1, roof_steps + 2 + i, roof_steps + 1 + i))
roof = mesh_object("main_grandstand_roof", roof_verts, roof_faces, roof_mat, structure_col)
roof["reference"] = "curved canopy from supplied interior photos"
roof_solid = roof.modifiers.new("roof_thickness", "SOLIDIFY")
roof_solid.thickness = 0.45

for index, angle_deg in enumerate(range(185, 356, 17), 1):
    angle = math.radians(angle_deg)
    inner = (54 * math.cos(angle), -44 + 54 * math.sin(angle), 16.2)
    outer = (78 * math.cos(angle), -44 + 78 * math.sin(angle), 20.5)
    beam(f"roof_truss_{index:02d}", inner, outer, 0.18, steel, structure_col)
    beam(f"roof_column_{index:02d}", outer, (outer[0], outer[1], 7.0), 0.24, steel, structure_col)

# Press box centered behind home plate.
press_box = cube("press_box", (0, -113.5, 16.2), (17, 3.5, 4.2), concrete, structure_col, bevel=0.25)
cube("press_box_glass", (0, -109.85, 16.3), (15, 0.12, 2.25), glass, structure_col)
text_object("press_box_name", "ESTADIO QUISQUEYA", (0, -109.6, 19.2), 0.9, chalk, structure_col)

# Low-poly lattice light towers.
def light_tower(name, x, y, height=34):
    parent = bpy.data.objects.new(name, None)
    lights_col.objects.link(parent)
    corners = [(-1.25, -1.25), (1.25, -1.25), (1.25, 1.25), (-1.25, 1.25)]
    for index, (dx, dy) in enumerate(corners):
        leg = beam(f"{name}_leg_{index + 1}", (x + dx, y + dy, 0), (x + dx * 0.55, y + dy * 0.55, height), 0.16, steel, lights_col)
        leg.parent = parent
    for level in range(4, int(height), 4):
        t = level / height
        half = 1.25 - 0.56 * t
        for index, ((ax, ay), (bx, by)) in enumerate(zip(corners, corners[1:] + corners[:1])):
            a = (x + ax * half / 1.25, y + ay * half / 1.25, level)
            b = (x + bx * half / 1.25, y + by * half / 1.25, level)
            member = beam(f"{name}_brace_{level}_{index}", a, b, 0.09, steel, lights_col)
            member.parent = parent
    cube(f"{name}_lamp_rack", (x, y, height + 1.0), (4.5, 0.65, 1.7), steel, lights_col)
    for row in range(2):
        for col in range(6):
            lamp = cube(
                f"{name}_lamp_{row + 1}_{col + 1}",
                (x - 3.5 + col * 1.4, y - 0.72, height + 0.35 + row * 1.3),
                (0.48, 0.12, 0.42),
                white_light,
                lights_col,
                bevel=0.08,
            )
            lamp.parent = parent
    return parent


for name, x, y, height in (
    ("light_tower_left_field", -76, 51, 38),
    ("light_tower_left_center", -34, 87, 40),
    ("light_tower_right_center", 34, 87, 40),
    ("light_tower_right_field", 76, 51, 38),
    ("light_tower_third_base", -79, -15, 35),
    ("light_tower_first_base", 79, -15, 35),
):
    light_tower(name, x, y, height)

# Cameras for overview and future seat-view work.
bpy.ops.object.camera_add(location=(0, -188, 156))
camera_overview = bpy.context.object
camera_overview.name = "camera_overview"
camera_overview.data.lens = 48
look_at(camera_overview, (0, 5, 2.5))
move_to(camera_overview, export_col)

bpy.ops.object.camera_add(location=(0, -105, 16))
camera_grandstand = bpy.context.object
camera_grandstand.name = "camera_grandstand"
camera_grandstand.data.lens = 28
look_at(camera_grandstand, (0, 20, 1.8))
move_to(camera_grandstand, export_col)

bpy.context.scene.camera = camera_overview

# Presentation lighting.
bpy.ops.object.light_add(type="SUN", location=(30, -30, 120))
sun = bpy.context.object
sun.name = "sun_daylight"
sun.data.energy = 2.1
sun.rotation_euler = (math.radians(28), math.radians(-18), math.radians(28))
move_to(sun, lights_col)

bpy.context.scene.render.engine = "BLENDER_EEVEE"
bpy.context.scene.render.resolution_x = 1280
bpy.context.scene.render.resolution_y = 720
bpy.context.scene.render.resolution_percentage = 100
bpy.context.scene.render.image_settings.file_format = "PNG"
bpy.context.scene.render.filepath = PREVIEW_PATH
bpy.context.scene.render.film_transparent = False
bpy.context.scene.world.color = (0.035, 0.055, 0.085)

# Ground plane gives the model a readable perimeter in previews.
cube("stadium_site", (0, 3, -1.2), (105, 125, 1.0), concrete, structure_col, bevel=1.5)

bpy.context.scene["project"] = "Quisqueya 3D"
bpy.context.scene["version"] = "V1 references"
bpy.context.scene["web_ready"] = True
bpy.context.scene["source_notes"] = "Supplied aerial, interior, seating-map and scoreboard references"

bpy.ops.wm.save_as_mainfile(filepath=BLEND_PATH)
bpy.context.scene.render.filepath = PREVIEW_PATH
bpy.ops.render.render(write_still=True)

bpy.ops.export_scene.gltf(
    filepath=GLB_PATH,
    export_format="GLB",
    use_selection=False,
    export_yup=True,
    export_cameras=False,
    export_lights=False,
    export_extras=True,
    export_apply=True,
)
bpy.ops.wm.save_as_mainfile(filepath=BLEND_PATH)
print("QUISQUEYA_V1_DONE", BLEND_PATH, GLB_PATH, PREVIEW_PATH)
