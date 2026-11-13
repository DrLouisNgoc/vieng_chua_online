# Builds app/public/models/coc.glb: a small Burmese-style monk's hut (cốc) in the
# style of the pagoda (gold-ochre walls, red columns, two teal roofs, gold spire).
#
#   blender -b -P scripts/blender/coc.py -- <out.glb> [<preview.png>]
#
# Written for Blender 5.x. Units are metres. The footprint is 2.4 x 2.4 (the
# size of every cốc in temple-layout.ts), the ground is y = 0, the doorway is on
# the +X side (east, facing the path) and the floor slab's top is 0.2, so the
# walls start where the old wooden hut's did and the nameplate that the app
# hangs on the east wall (x = 1.24, y about 1.8) still sits right.
import math
import sys

import bmesh
import bpy
from mathutils import Vector

args = sys.argv[sys.argv.index("--") + 1 :]
out_glb = args[0]
out_png = args[1] if len(args) > 1 else None
bpy.ops.wm.read_factory_settings(use_empty=True)
COL = bpy.data.collections.new("coc")
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
    "gold": make_mat("coc_gold", (0.92, 0.55, 0.08, 1), (1.0, 0.5, 0.06, 1), 0.5, 0.4),
    "ochre": make_mat("coc_ochre", (0.82, 0.45, 0.08, 1), (0.9, 0.34, 0.04, 1), 0.12, 0.7),
    "cream": make_mat("coc_cream", (0.93, 0.85, 0.68, 1), rough=0.8),
    "teal": make_mat("coc_teal", (0.01, 0.36, 0.28, 1), rough=0.5),
    "red": make_mat("coc_red", (0.5, 0.05, 0.04, 1), rough=0.5),
    "dark": make_mat("coc_dark", (0.05, 0.04, 0.04, 1), rough=0.8),
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


def hip_roof(hx, z0, rise, inset):
    """Square hip roof with a concave slope, lifted corners and a gold fascia; corner points added."""
    steps = [0.0, 0.1, 0.3, 0.55, 0.8, 0.985]
    lift = 0.07 * hx + 0.12

    def ring(u):
        a = hx - u * inset
        z = z0 + rise * (u**1.5)
        zc = z + (lift * (1 - u / 0.45) if u < 0.45 else 0.0)
        pts = [(-a, -a, zc), (0, -a, z), (a, -a, zc), (a, 0, z), (a, a, zc), (0, a, z), (-a, a, zc), (-a, 0, z)]
        return pts

    rings = [ring(u) for u in steps]
    verts = [p for r in rings for p in r]
    faces, fm = [], []
    for k in range(len(steps) - 1):
        for j in range(8):
            a0, a1 = k * 8 + j, k * 8 + (j + 1) % 8
            faces.append((a0, a1, a1 + 8, a0 + 8))
            fm.append(0)
    top = (len(steps) - 1) * 8
    faces.append(tuple(range(top, top + 8)))
    fm.append(0)
    base = len(verts)
    verts += [(x, y, z - 0.25) for x, y, z in rings[0]]
    for j in range(8):
        faces.append((j, (j + 1) % 8, base + (j + 1) % 8, base + j))
        fm.append(1)
    faces.append(tuple(range(base, base + 8)))
    fm.append(2 if False else 1)
    parts = [mesh_obj("roof", verts, faces, ["teal", "gold"], fm)]
    for j in range(0, 8, 2):  # a tall point at each corner
        p = Vector(rings[0][j])
        out = Vector((p.x, p.y, 0)).normalized()
        parts.append(segment(p, p + out * 0.3 + Vector((0, 0, 0.6)), 0.09, 0.01, "gold"))
    return parts


H = 1.2  # half of the 2.4 footprint
WALL_BASE, WALL_TOP = 0.2, 2.4
parts = [box((2.8, 2.8, 0.2), (0, 0, 0.1), "cream"), box((0.6, 1.4, 0.1), (1.7, 0, 0.05), "cream")]
parts.append(box((2.4, 2.4, WALL_TOP - WALL_BASE), (0, 0, (WALL_TOP + WALL_BASE) / 2), "ochre"))
parts.append(box((2.52, 2.52, 0.16), (0, 0, WALL_TOP - 0.08), "gold"))
parts.append(box((2.52, 2.52, 0.1), (0, 0, WALL_BASE + 0.05), "gold"))
for sx in (-1, 1):  # red lacquered corner columns
    for sy in (-1, 1):
        parts.append(cyl(0.13, WALL_TOP - WALL_BASE, (sx * H, sy * H, (WALL_TOP + WALL_BASE) / 2), "red", 8))
        parts.append(cyl(0.17, 0.12, (sx * H, sy * H, WALL_TOP - 0.2), "gold", 8))
# doorway on the east face (+X): dark recess, red jambs, a gold lintel
parts.append(box((0.1, 0.9, 1.4), (H + 0.01, 0, WALL_BASE + 0.7), "dark"))
for sy in (-1, 1):
    parts.append(box((0.16, 0.1, 1.5), (H + 0.02, sy * 0.5, WALL_BASE + 0.75), "red"))
parts.append(box((0.18, 1.2, 0.12), (H + 0.03, 0, WALL_BASE + 1.5), "gold"))
# windows on the other three faces: a gold frame with the dark pane standing slightly proud of it
for nx, ny in ((0, 1), (0, -1), (-1, 0)):
    across = (0.9, 1.0) if nx == 0 else (1.0, 0.9)  # frame size along x, along y
    thick = 0.08
    c = (nx * H, ny * H, 1.4)
    f = (abs(nx) and thick or across[0], abs(ny) and thick or across[1], 1.1)
    parts.append(box(f, (c[0] + nx * thick / 2, c[1] + ny * thick / 2, c[2]), "gold"))
    p = (abs(nx) and thick * 2 or across[0] - 0.2, abs(ny) and thick * 2 or across[1] - 0.2, 0.9)
    parts.append(box(p, (c[0] + nx * thick * 0.75, c[1] + ny * thick * 0.75, c[2]), "dark"))
parts += hip_roof(1.75, 2.55, 0.9, 1.55)
parts.append(box((1.7, 1.7, 0.95), (0, 0, 3.4), "ochre"))
parts.append(box((1.8, 1.8, 0.12), (0, 0, 3.8), "gold"))
parts += hip_roof(1.25, 3.85, 0.75, 1.05)
parts.append(cyl(0.22, 0.14, (0, 0, 4.72), "gold", 10))
parts.append(cone(0.28, 0.08, 0.5, (0, 0, 5.02), "gold", 10))
for k, r in enumerate((0.24, 0.19, 0.14)):
    parts.append(cone(r, r * 0.5, 0.1, (0, 0, 5.34 + 0.15 * k), "gold", 10))
parts.append(cyl(0.025, 0.7, (0, 0, 5.7), "gold", 6))
parts.append(cone(0.07, 0.01, 0.25, (0, 0, 6.15), "gold", 6))

bpy.ops.object.select_all(action="DESELECT")
for o in parts:
    o.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.object.join()
hut = bpy.context.object
hut.name = "coc"
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)  # bake into world space
bpy.ops.object.select_all(action="DESELECT")
hut.select_set(True)
bpy.ops.export_scene.gltf(filepath=out_glb, export_format="GLB", use_selection=True)
print("COC_OK triangles:", sum(len(p.vertices) - 2 for p in hut.data.polygons), "materials:", len(hut.data.materials))

if out_png:  # preview: the hut on grass in warm evening light
    scene = bpy.context.scene
    ground = bpy.data.materials.new("grass")
    ground.use_nodes = True
    ground.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.2, 0.36, 0.14, 1)
    bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, 0))
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
    scene.render.resolution_x, scene.render.resolution_y = 1600, 1200
    cam_data = bpy.data.cameras.new("cam")
    cam_data.lens = 40
    cam = bpy.data.objects.new("cam", cam_data)
    scene.collection.objects.link(cam)
    cam.location = (11.0, -9.5, 4.4)
    cam.rotation_euler = (Vector((0, 0, 2.9)) - cam.location).to_track_quat("-Z", "Y").to_euler()
    scene.camera = cam
    scene.render.filepath = out_png
    bpy.ops.render.render(write_still=True)
