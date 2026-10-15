"""Render the actual web GLB, without modifying the authoring .blend file."""
from pathlib import Path
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "artifacts/center-field"
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(ROOT / "public/models/estadio-quisqueya.glb"))
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 16
scene.cycles.use_denoising = True
scene.render.resolution_x = 1100
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
scene.world = bpy.data.worlds.new("Center field daylight")
scene.world.use_nodes = True
scene.world.node_tree.nodes["Background"].inputs[0].default_value = (0.55, 0.65, 0.75, 1)
scene.world.node_tree.nodes["Background"].inputs[1].default_value = 0.6
bpy.ops.object.light_add(type="AREA", location=(0, 50, 35))
light = bpy.context.object
light.data.energy = 4000
light.data.shape = "DISK"
light.data.size = 30
light.rotation_euler = (Vector((0, 88, 15)) - light.location).to_track_quat("-Z", "Y").to_euler()
bpy.ops.object.camera_add(location=(0, 30, 19))
camera = bpy.context.object
scene.camera = camera
camera.data.lens = 43
camera.rotation_euler = (Vector((0, 88, 18)) - camera.location).to_track_quat("-Z", "Y").to_euler()
scene.render.filepath = str(OUT / "center-field-front.png")
bpy.ops.render.render(write_still=True)
camera.location = (0, -35, 12)
camera.data.lens = 43
camera.rotation_euler = (Vector((0, 88, 13)) - camera.location).to_track_quat("-Z", "Y").to_euler()
scene.render.filepath = str(OUT / "center-field-from-stands.png")
bpy.ops.render.render(write_still=True)
