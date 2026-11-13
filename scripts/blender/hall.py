# Builds app/public/models/hall-roof.glb: the Burmese-style roof stack of the main hall
# (chánh điện): three teal hip roofs on gold-banded ochre drums under a gold spire.
#
#   blender -b -P scripts/blender/hall.py -- <out.glb> [<preview.png>]
#
# Written for Blender 5.x. Units are metres. The model is centred on the hall (x, y = 0
# at its middle), its lowest eave at z = 0 (the app puts that on the hall's ceiling
# level) and it overhangs the 76 x 54 hall by 3 on every side.
import math
import sys

import bmesh
import bpy
from mathutils import Vector

args = sys.argv[sys.argv.index("--") + 1 :]
out_glb = args[0]
out_png = args[1] if len(args) > 1 else None
bpy.ops.wm.read_factory_settings(use_empty=True)
COL = bpy.data.collections.new("hall")
bpy.context.scene.collection.children.link(COL)


def make_mat(name, color, emit=None, strength=0.0, rough=0.6):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = color
    b.inputs["Metallic"].default_value = 0.0
    b.inputs["Roughness"].default_value = rough
    if emit is not None:
        b.inputs["Emission Color"].default_value = emit
        b.inputs["Emission Strength"].default_value = strength
    return m


M = {
    "gold": make_mat("hall_gold", (0.92, 0.55, 0.08, 1), (1.0, 0.5, 0.06, 1), 0.5, 0.4),
    "ochre": make_mat("hall_ochre", (0.82, 0.45, 0.08, 1), (0.9, 0.34, 0.04, 1), 0.12, 0.7),
    "cream": make_mat("hall_cream", (0.93, 0.85, 0.68, 1), rough=0.8),
    "teal": make_mat("hall_teal", (0.01, 0.36, 0.28, 1), rough=0.5),
    "red": make_mat("hall_red", (0.5, 0.05, 0.04, 1), rough=0.5),
    "dark": make_mat("hall_dark", (0.05, 0.04, 0.04, 1), rough=0.8),
}


def put(obj, material=None):
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    COL.objects.link(obj)
    if material is not None:
        obj.data.materials.append(M[material])
    return obj


def box(size, center, material):
    bpy.ops.mesh.primitive_cube_add(size=1, location=center)
    o = bpy.context.object
    o.scale = size
    return put(o, material)


def cyl(radius, height, center, material, verts=12):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=height, location=center)
    return put(bpy.context.object, material)


def cone(r1, r2, height, center, material, verts=12, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r1, radius2=r2, depth=height, location=center, rotation=rot)
    return put(bpy.context.object, material)


def segment(p0, p1, r0, r1, material, verts=5):
    a, b = Vector(p0), Vector(p1)
    d = b - a
    rot = Vector((0, 0, 1)).rotation_difference(d.normalized()).to_euler()
    return cone(r0, r1, d.length, (a + b) / 2, material, verts, rot)


def mesh_obj(name, verts, faces, materials, face_mat):
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update()
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    for m in materials:
        me.materials.append(M[m])
    for poly, idx in zip(me.polygons, face_mat):
        poly.material_index = idx
    o = bpy.data.objects.new(name, me)
    COL.objects.link(o)
    return o




def hip_roof(hx, hy, z0, rise, ix, iy, fascia=0.6):
    """Rectangular hip roof with a concave slope, lifted corners, a gold fascia and a gold spike on each corner."""
    steps = [0.0, 0.1, 0.3, 0.55, 0.8, 0.985]
    lift = 0.07 * min(hx, hy) + 0.12
    spike = 0.04 * min(hx, hy) + 0.3

    def ring(u):
        ax, ay = hx - u * ix, hy - u * iy
        z = z0 + rise * (u**1.5)
        zc = z + (lift * (1 - u / 0.45) if u < 0.45 else 0.0)
        return [(-ax, -ay, zc), (0, -ay, z), (ax, -ay, zc), (ax, 0, z), (ax, ay, zc), (0, ay, z), (-ax, ay, zc), (-ax, 0, z)]

    rings = [ring(u) for u in steps]
    verts = [p for r in rings for p in r]
    faces, face_mat = [], []
    for k in range(len(steps) - 1):
        for j in range(8):
            a0, a1 = k * 8 + j, k * 8 + (j + 1) % 8
            faces.append((a0, a1, a1 + 8, a0 + 8))
            face_mat.append(0)
    top = (len(steps) - 1) * 8
    faces.append(tuple(range(top, top + 8)))
    face_mat.append(0)
    base = len(verts)
    verts += [(x, y, z - fascia) for x, y, z in rings[0]]
    for j in range(8):
        faces.append((j, (j + 1) % 8, base + (j + 1) % 8, base + j))
        face_mat.append(1)
    faces.append(tuple(range(base, base + 8)))
    face_mat.append(1)
    parts = [mesh_obj("roof", verts, faces, ["teal", "gold"], face_mat)]
    for j in range(0, 8, 2):
        p = Vector(rings[0][j])
        out = Vector((p.x, p.y, 0)).normalized()
        parts.append(segment(p, p + out * spike * 0.6 + Vector((0, 0, spike * 2)), spike * 0.3, 0.03, "gold"))
    return parts


def drum(hx, hy, z0, height):
    """An ochre block between two roofs, banded in gold top and bottom."""
    return [
        box((2 * hx, 2 * hy, height), (0, 0, z0 + height / 2), "ochre"),
        box((2 * hx + 0.5, 2 * hy + 0.5, 0.5), (0, 0, z0 + height - 0.25), "gold"),
        box((2 * hx + 0.5, 2 * hy + 0.5, 0.4), (0, 0, z0 + 0.2), "gold"),
    ]


parts = []
parts += hip_roof(41, 30, 0, 7, 10, 10, 0.9)
parts += drum(29, 19, 6.4, 3.6)
parts += hip_roof(30, 19, 10, 5.5, 8, 7, 0.7)
parts += drum(20, 11, 15.0, 3.0)
parts += hip_roof(21, 12, 18, 4.5, 8, 6, 0.6)
# the spire: a last small drum and roof, then the gold bell, rings and crowning tip
parts += drum(11, 5, 22.0, 2.4)
parts += hip_roof(12, 6, 24.4, 3.2, 8, 3, 0.5)
parts.append(cyl(2.6, 0.7, (0, 0, 27.9), "gold", 16))
parts.append(cone(2.4, 0.9, 6.0, (0, 0, 31.2), "gold", 16))
for k, r in enumerate((1.5, 1.2, 0.95, 0.7, 0.5)):
    parts.append(cone(r, r * 0.55, 0.7, (0, 0, 34.5 + 0.75 * k), "gold", 14))
parts.append(cyl(0.12, 4.0, (0, 0, 39.0), "gold", 8))
parts.append(cone(0.5, 0.04, 1.6, (0, 0, 41.8), "gold", 10))

bpy.ops.object.select_all(action="DESELECT")
for o in parts:
    o.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.object.join()
roof = bpy.context.object
roof.name = "hall_roof"
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
bpy.ops.object.select_all(action="DESELECT")
roof.select_set(True)
bpy.ops.export_scene.gltf(filepath=out_glb, export_format="GLB", use_selection=True)
print("HALL_OK triangles:", sum(len(p.vertices) - 2 for p in roof.data.polygons), "materials:", len(roof.data.materials))

if out_png:  # preview: the roof on a plain ochre slab the size of the hall, evening light
    scene = bpy.context.scene
    slab = bpy.data.materials.new("slab")
    slab.use_nodes = True
    slab.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.75, 0.62, 0.4, 1)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, -9))
    wall = bpy.context.object
    wall.scale = (76, 54, 18)
    wall.data.materials.append(slab)
    ground = bpy.data.materials.new("grass")
    ground.use_nodes = True
    ground.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.2, 0.36, 0.14, 1)
    bpy.ops.mesh.primitive_plane_add(size=400, location=(0, 0, -18))
    bpy.context.object.data.materials.append(ground)
    bpy.ops.object.light_add(type="SUN", location=(-20, -30, 30))
    sun = bpy.context.object
    sun.data.energy = 4.5
    sun.data.color = (1.0, 0.75, 0.5)
    sun.rotation_euler = (math.radians(60), 0, math.radians(-40))
    world = bpy.data.worlds.new("sky")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.55, 0.65, 0.85, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.9
    scene.world = world
    scene.render.engine = "BLENDER_EEVEE"
    scene.view_settings.view_transform = "Standard"
    scene.render.resolution_x, scene.render.resolution_y = 1600, 1000
    cam_data = bpy.data.cameras.new("cam")
    cam_data.lens = 32
    cam = bpy.data.objects.new("cam", cam_data)
    scene.collection.objects.link(cam)
    cam.location = (110, -120, 30)
    cam.rotation_euler = (Vector((0, 0, 14)) - cam.location).to_track_quat("-Z", "Y").to_euler()
    scene.camera = cam
    scene.render.filepath = out_png
    bpy.ops.render.render(write_still=True)
