# Builds the temple's own structure in the Myanmar style of the pagoda, the cốc and the
# hall's roof (owner, 2026-11-13: "tường cột vách cũng blender lại cho chuẩn đi"):
#
#   app/public/models/hall-body.glb       the main hall's three walls and all its pillars
#   app/public/models/perimeter-wall.glb  the wall round the grounds
#
#   blender -b -P scripts/blender/temple.py -- <out dir> [<preview prefix>]
#
# Written for Blender 5.x. Both models are built in WORLD coordinates of the app (x to
# the right, y up, z toward the gate; Blender's y is -z), so the app adds them to the
# scene as they are. The numbers below mirror app/src/temple-layout.ts (HALL, STAIRS,
# BOUNDARY, GATE, EAST_GATE); app/src/temple-structure-model.test.ts checks the shipped
# files against that layout. Each file is one mesh with a few material slots.
import math
import sys

import bmesh
import bpy
from mathutils import Vector

args = sys.argv[sys.argv.index("--") + 1 :]
out_dir = args[0].rstrip("/\\")
preview = args[1] if len(args) > 1 else None
bpy.ops.wm.read_factory_settings(use_empty=True)

# ---- mirrors of temple-layout.ts
TOP = 2.7  # the hall's platform: 9 steps of 0.3
H = 15.4  # floor to roof base
T = 0.8  # hall wall thickness
HALL_X, HALL_Z0, HALL_Z1, SIDE_FRONT_Z = 38.0, -55.0, -1.0, -6.0
FRONT_PILLAR_Z = -2.0
FRONT_PILLAR_XS = [-34.2, -26.6, -19.0, -11.4, 11.4, 19.0, 26.6, 34.2]
INNER_PILLARS = [(x, z) for z in (-10, -20, -30, -40) for x in (-28, -15, 15, 28)]
WALL_H, WALL_T = 2.6, 0.6
BX, BZ0, BZ1 = 91.0, -70.0, 129.0
GATE_OUTER = 6.5
EAST_GATE_Z, EAST_GATE_HALF = 30.0, 3.5
WALL_SEGMENTS = [
    (-BX, BZ0, BX, BZ0),
    (-BX, BZ0, -BX, BZ1),
    (BX, BZ0, BX, EAST_GATE_Z - EAST_GATE_HALF),
    (BX, EAST_GATE_Z + EAST_GATE_HALF, BX, BZ1),
    (-BX, BZ1, -GATE_OUTER, BZ1),
    (GATE_OUTER, BZ1, BX, BZ1),
]


def make_mat(name, color, emit=None, strength=0.0, rough=0.7):
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
    "saffron": make_mat("temple_saffron", (0.82, 0.45, 0.08, 1), (0.9, 0.34, 0.04, 1), 0.1),
    "gold": make_mat("temple_gold", (0.92, 0.55, 0.08, 1), (1.0, 0.5, 0.06, 1), 0.5, 0.4),
    "red": make_mat("temple_red", (0.5, 0.05, 0.04, 1), rough=0.45),
    "stone": make_mat("temple_stone", (0.62, 0.56, 0.48, 1), rough=0.85),
    "cream": make_mat("temple_cream", (0.93, 0.85, 0.68, 1), rough=0.8),
    "dark": make_mat("temple_dark", (0.05, 0.04, 0.04, 1), rough=0.8),
    "teal": make_mat("temple_teal", (0.01, 0.36, 0.28, 1), rough=0.5),
}

COL = None


def new_collection(name):
    global COL
    COL = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(COL)


def put(obj, material):
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    COL.objects.link(obj)
    obj.data.materials.append(M[material])
    return obj


def B(x, y, z):
    """App world (x, y up, z toward the gate) to Blender (x, y = -z, z up)."""
    return (x, -z, y)


def box(size, centre, material):
    """size and centre in world axes (sx, sy up, sz)."""
    bpy.ops.mesh.primitive_cube_add(size=1, location=B(*centre))
    o = bpy.context.object
    o.scale = (size[0], size[2], size[1])
    return put(o, material)


def cyl(radius, height, centre, material, verts=12):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=height, location=B(*centre))
    return put(bpy.context.object, material)


def cone(r1, r2, height, centre, material, verts=12):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r1, radius2=r2, depth=height, location=B(*centre))
    return put(bpy.context.object, material)


def export(parts, name):
    bpy.ops.object.select_all(action="DESELECT")
    for o in parts:
        o.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    merged = bpy.context.object
    merged.name = name
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    for p in merged.data.polygons:
        p.use_smooth = False
    bpy.ops.object.select_all(action="DESELECT")
    merged.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=f"{out_dir}/{name}.glb", export_format="GLB", use_selection=True, export_meshopt_compression_enable=True
    )
    print(name.upper(), "OK triangles:", sum(len(p.vertices) - 2 for p in merged.data.polygons), "materials:", len(merged.data.materials))
    return merged


# ------------------------------------------------------------------ the hall
def pillar(x, z, parts):
    """A lacquer-red pillar on a stone plinth with a lotus ring, gold bands and a flared gold capital."""
    parts.append(cyl(0.95, 0.3, (x, TOP + 0.15, z), "stone", 8))
    parts.append(cyl(0.8, 0.25, (x, TOP + 0.42, z), "cream", 12))
    for k in range(12):  # lotus petals round the foot
        a = math.tau * k / 12
        parts.append(cone(0.2, 0.02, 0.6, (x + 0.62 * math.cos(a), TOP + 0.85, z + 0.62 * math.sin(a)), "gold", 6))
    shaft = H - 2.9
    parts.append(cone(0.62, 0.5, shaft, (x, TOP + 0.55 + shaft / 2, z), "red", 16))
    parts.append(cyl(0.67, 0.2, (x, TOP + 1.6, z), "gold", 16))
    parts.append(cyl(0.58, 0.2, (x, TOP + H - 2.3, z), "gold", 16))
    parts.append(cone(0.6, 1.0, 0.8, (x, TOP + H - 1.55, z), "gold", 16))
    parts.append(box((2.0, 0.4, 2.0), (x, TOP + H - 0.9, z), "red"))
    parts.append(box((1.5, 0.15, 1.5), (x, TOP + H - 0.62, z), "gold"))


def wall_face_details(parts, centre_x, centre_z, along_x, length, face_sign):
    """Gold-framed panels on one face of a hall wall; face_sign says which side the face looks to."""
    off = (T / 2 + 0.04) * face_sign
    n = max(1, int(length // 9.5))
    step = length / n
    for i in range(n):
        s = -length / 2 + step * (i + 0.5)
        w = step - 2.2
        cy = TOP + 7.6
        for dy, h in ((-4.1, 0.28), (4.1, 0.28)):  # horizontal bars
            size = (w, h, 0.1) if along_x else (0.1, h, w)
            pos = (centre_x + s, cy + dy, centre_z + off) if along_x else (centre_x + off, cy + dy, centre_z + s)
            parts.append(box(size, pos, "gold"))
        for dx in (-w / 2, w / 2):  # vertical bars
            size = (0.28, 8.2, 0.1) if along_x else (0.1, 8.2, 0.28)
            pos = (centre_x + s + dx, cy, centre_z + off) if along_x else (centre_x + off, cy, centre_z + s + dx)
            parts.append(box(size, pos, "gold"))
        # the sunk panel itself, slightly darker
        size = (w - 0.2, 7.9, 0.05) if along_x else (0.05, 7.9, w - 0.2)
        pos = (centre_x + s, cy, centre_z + off * 0.98) if along_x else (centre_x + off * 0.98, cy, centre_z + s)
        parts.append(box(size, pos, "red" if i % 2 == 0 else "saffron"))


def hall_body():
    new_collection("hall")
    parts = []
    width = 2 * HALL_X
    side_depth = SIDE_FRONT_Z - HALL_Z0
    side_z = (HALL_Z0 + SIDE_FRONT_Z) / 2
    mid = TOP + H / 2
    # the walls
    parts.append(box((width, H, T), (0, mid, HALL_Z0 + T / 2), "saffron"))
    for sx in (-1, 1):
        parts.append(box((T, H, side_depth), (sx * (HALL_X - T / 2), mid, side_z), "saffron"))
    # gold plinth and a red-and-gold cornice round the top, on every wall face
    for centre, size in (
        ((0, TOP + 0.3, HALL_Z0 + T / 2), (width + 0.2, 0.6, T + 0.3)),
        ((0, TOP + H - 0.35, HALL_Z0 + T / 2), (width + 0.2, 0.7, T + 0.5)),
        ((0, TOP + H - 1.1, HALL_Z0 + T / 2), (width + 0.2, 0.4, T + 0.3)),
    ):
        parts.append(box(size, centre, "gold" if size[1] != 0.4 else "red"))
    for sx in (-1, 1):
        x = sx * (HALL_X - T / 2)
        for dy, h, extra, mat in ((0.3, 0.6, 0.3, "gold"), (H - 0.35, 0.7, 0.5, "gold"), (H - 1.1, 0.4, 0.3, "red")):
            parts.append(box((T + extra, h, side_depth + 0.2), (x, TOP + dy, side_z), mat))
    # panels on both faces of the back wall and of the side walls
    for face in (1, -1):
        wall_face_details(parts, 0, HALL_Z0 + T / 2, True, width - 8, face)
        for sx in (-1, 1):
            wall_face_details(parts, sx * (HALL_X - T / 2), side_z, False, side_depth - 4, face)
    # pillars: the front row, the inner grid, the two back corners
    spots = [(x, FRONT_PILLAR_Z) for x in FRONT_PILLAR_XS] + INNER_PILLARS
    spots += [(-HALL_X + 1.4, HALL_Z0 + 1.4), (HALL_X - 1.4, HALL_Z0 + 1.4)]
    for x, z in spots:
        pillar(x, z, parts)
    # the beam over the front row
    parts.append(box((width, 0.9, 0.9), (0, TOP + H - 0.45, FRONT_PILLAR_Z), "red"))
    parts.append(box((width, 0.2, 1.05), (0, TOP + H - 0.9, FRONT_PILLAR_Z), "gold"))
    return export(parts, "hall-body")


# ------------------------------------------------------------------ the wall
def wall_segment(x0, z0, x1, z1, parts):
    along_x = abs(z1 - z0) < 1e-6
    length = abs(x1 - x0) if along_x else abs(z1 - z0)
    cx, cz = (x0 + x1) / 2, (z0 + z1) / 2

    def sized(along, up, across):
        return (along, up, across) if along_x else (across, up, along)

    parts.append(box(sized(length, WALL_H, WALL_T), (cx, WALL_H / 2, cz), "saffron"))
    parts.append(box(sized(length, 0.4, WALL_T + 0.3), (cx, 0.2, cz), "stone"))  # plinth
    parts.append(box(sized(length, 0.14, WALL_T + 0.06), (cx, WALL_H * 0.78, cz), "gold"))  # a gold line
    parts.append(box(sized(length + 0.2, 0.32, WALL_T + 0.5), (cx, WALL_H + 0.16, cz), "teal"))  # tiled cap
    parts.append(box(sized(length + 0.2, 0.08, WALL_T + 0.56), (cx, WALL_H + 0.34, cz), "gold"))
    n = max(1, round(length / 6.0))
    for i in range(n + 1):  # pilasters at both ends and every ~6 m, each with a gold finial
        u = -length / 2 + length * i / n
        px, pz = (cx + u, cz) if along_x else (cx, cz + u)
        parts.append(box(sized(0.9, WALL_H + 0.1, WALL_T + 0.34), (px, (WALL_H + 0.1) / 2, pz), "red"))
        parts.append(box(sized(1.1, 0.14, WALL_T + 0.56), (px, WALL_H + 0.17, pz), "gold"))
        parts.append(cone(0.36, 0.03, 0.7, (px, WALL_H + 0.55, pz), "gold", 8))


def perimeter_wall():
    new_collection("wall")
    parts = []
    for seg in WALL_SEGMENTS:
        wall_segment(*seg, parts)
    return export(parts, "perimeter-wall")


hall = hall_body()
wall = perimeter_wall()

if preview:  # previews: the hall's front-left corner from the yard, and the east gate end of the wall
    scene = bpy.context.scene
    bpy.ops.mesh.primitive_plane_add(size=600, location=(0, 0, 0))
    ground = bpy.data.materials.new("grass")
    ground.use_nodes = True
    ground.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.3, 0.38, 0.2, 1)
    bpy.context.object.data.materials.append(ground)
    bpy.ops.object.light_add(type="SUN", location=(-20, -30, 30))
    sun = bpy.context.object
    sun.data.energy = 3.5
    sun.data.color = (1.0, 0.85, 0.7)
    sun.rotation_euler = (math.radians(55), 0, math.radians(-30))
    world = bpy.data.worlds.new("sky")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.6, 0.7, 0.88, 1)
    scene.world = world
    scene.render.engine = "BLENDER_EEVEE"
    scene.view_settings.view_transform = "Standard"
    scene.render.resolution_x, scene.render.resolution_y = 1500, 900

    def shot(location, target, name, lens=28):
        cam_data = bpy.data.cameras.new("c" + name)
        cam_data.lens = lens
        cam_data.clip_end = 1000
        cam = bpy.data.objects.new("c" + name, cam_data)
        scene.collection.objects.link(cam)
        cam.location = B(*location)
        cam.rotation_euler = (Vector(B(*target)) - cam.location).to_track_quat("-Z", "Y").to_euler()
        scene.camera = cam
        scene.render.filepath = f"{preview}_{name}.png"
        bpy.ops.render.render(write_still=True)

    shot((-70, 12, 40), (-30, 8, -20), "hall")
    shot((-20, 6, 18), (-20, 8, -52), "inside")
    shot((70, 3, 55), (91, 1.3, 30), "wall", 24)
