# Builds app/public/models/lantern.glb: the red paper lantern of the temple.
#
#   blender -b -P scripts/blender/lantern.py -- <out.glb> [<preview.png>]
#
# Written for Blender 5.x. The glb holds geometry only, in three joined meshes
# with the names app/src/lantern-model.ts looks for; the app supplies the
# materials (paper glow at night, gold trim), so the colours here are only for
# the optional preview render. Units are Blender metres: body radius 0.5.
import math
import sys

import bpy
from mathutils import Matrix, Vector

args = sys.argv[sys.argv.index("--") + 1 :]
out_glb = args[0]
out_png = args[1] if len(args) > 1 else None

bpy.ops.wm.read_factory_settings(use_empty=True)


def make_mat(name, base, metallic=0.0, rough=0.5, emit=None, strength=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = base
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = rough
    if emit is not None:
        bsdf.inputs["Emission Color"].default_value = emit
        bsdf.inputs["Emission Strength"].default_value = strength
    return mat


paper_mat = make_mat("lantern_paper", (0.5, 0.01, 0.01, 1), rough=0.55, emit=(0.95, 0.04, 0.01, 1), strength=0.9)
gold_mat = make_mat("lantern_gold", (0.95, 0.68, 0.18, 1), metallic=0.9, rough=0.35)
hanging_mat = make_mat("lantern_hanging", (0.6, 0.02, 0.02, 1), rough=0.8, emit=(0.9, 0.1, 0.03, 1), strength=0.4)

parts = {"lantern_paper": [], "lantern_gold": [], "lantern_hanging": []}


def keep(part, material, smooth=True):
    obj = bpy.context.object
    obj.data.materials.append(material)
    if smooth:
        bpy.ops.object.shade_smooth()
    parts[part].append(obj)


# Body: a squashed sphere (semi-axes 0.5 x 0.5 x 0.425)
BODY_R, BODY_H = 0.5, 0.425
bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, radius=BODY_R)
body = bpy.context.object
body.scale = (1, 1, BODY_H / BODY_R)
bpy.ops.object.transform_apply(scale=True)
keep("lantern_paper", paper_mat)

# Gold ribs following the body outline
for fraction in (-0.7, -0.35, 0.0, 0.35, 0.7):
    ring_r = BODY_R * math.sqrt(1 - fraction**2)
    bpy.ops.mesh.primitive_torus_add(
        major_radius=ring_r + 0.004,
        minor_radius=0.012,
        major_segments=28,
        minor_segments=6,
        location=(0, 0, BODY_H * fraction),
    )
    keep("lantern_gold", gold_mat)

# Top and bottom caps
for z in (BODY_H + 0.035, -BODY_H - 0.035):
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.2, depth=0.07, location=(0, 0, z))
    keep("lantern_gold", gold_mat)

# Hanging cord
bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.008, depth=0.5, location=(0, 0, BODY_H + 0.07 + 0.25))
keep("lantern_hanging", hanging_mat)

# Tassel: bead and a fringe fanned out at the bottom
bead_z = -BODY_H - 0.07 - 0.04
bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=0.045, location=(0, 0, bead_z))
keep("lantern_hanging", hanging_mat)
STRANDS = 14
for index in range(STRANDS):
    angle = index / STRANDS * math.tau
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=6,
        radius=0.011,
        depth=0.38,
        location=(math.cos(angle) * 0.03, math.sin(angle) * 0.03, bead_z - 0.22),
    )
    strand = bpy.context.object
    strand.rotation_euler = Matrix.Rotation(-0.16, 3, Vector((-math.sin(angle), math.cos(angle), 0))).to_euler()
    keep("lantern_hanging", hanging_mat, smooth=False)

# Join each group into one mesh with the group's name, transforms applied
for name, objects in parts.items():
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    joined = bpy.context.object
    joined.name = name
    joined.data.name = name
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# Preview render (optional): lights and camera are added after the export
scene = bpy.context.scene
bpy.ops.object.select_all(action="DESELECT")
for obj in scene.objects:
    obj.select_set(obj.type == "MESH")
bpy.ops.export_scene.gltf(filepath=out_glb, export_format="GLB", use_selection=True)

if out_png:
    bpy.ops.object.light_add(type="POINT", location=(0, 0, 0))
    bpy.context.object.data.energy = 60
    bpy.context.object.data.color = (1.0, 0.45, 0.15)
    for location, energy in (((3, -3, 3), 120), ((-3, -2, 1.5), 60)):
        bpy.ops.object.light_add(type="AREA", location=location)
        bpy.context.object.data.energy = energy
        bpy.context.object.data.size = 2
        direction = Vector((0, 0, 0)) - Vector(location)
        bpy.context.object.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    world = bpy.data.worlds.new("night")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.03, 0.035, 0.07, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.8
    scene.world = world
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 800
    scene.render.resolution_y = 900
    bpy.ops.object.camera_add(location=(1.5, -2.55, 0.75))
    camera = bpy.context.object
    camera.data.lens = 50
    camera.rotation_euler = (Vector((0, 0, 0.0)) - camera.location).to_track_quat("-Z", "Y").to_euler()
    scene.camera = camera
    scene.render.filepath = out_png
    bpy.ops.render.render(write_still=True)

print("LANTERN_OK")
