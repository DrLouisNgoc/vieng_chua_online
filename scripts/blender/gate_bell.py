# Builds the temple's main gate (tam quan) and its bell pavilion in the Myanmar / Nam tông
# style of the pagoda (owner, 2026-11-13: "chuông này thay theo trường phái chuông nam
# tông", "cổng cũng đổi theo trường phái nam tông"):
#
#   app/public/models/gate.glb         red pillars, gold lintels and three-tier teal roofs;
#                                      origin at the gate's middle on the ground (x along the
#                                      gate, z depth), the app puts it at z = GATE.z
#   app/public/models/bell-tower.glb   a bell pavilion with a Burmese bell; origin at its centre
#                                      on the ground, the app puts it at BELL_TOWER
#
#   blender -b -P scripts/blender/gate_bell.py -- <out dir> [<preview prefix>]
#
# Written for Blender 5.x. World axes as in the app (x right, y up, z toward the gate; Blender's
# y is -z). The numbers mirror app/src/temple-layout.ts (GATE, BELL_TOWER); the SƠN TỰ plaque
# stays in the app (it is a drawn texture), so the gate leaves its place under the lintel.
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
GATE_XS = [-6.0, -2.2, 2.2, 6.0]
GATE_CENTRE_H, GATE_SIDE_H = 5.2, 4.0
BELL_HALF, BELL_BASE, BELL_PILLAR_OFFSET = 2.6, 0.4, 1.9


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
    "saffron": make_mat("gate_saffron", (0.82, 0.45, 0.08, 1), (0.9, 0.34, 0.04, 1), 0.1),
    "gold": make_mat("gate_gold", (0.92, 0.55, 0.08, 1), (1.0, 0.5, 0.06, 1), 0.5, 0.4),
    "red": make_mat("gate_red", (0.5, 0.05, 0.04, 1), rough=0.45),
    "stone": make_mat("gate_stone", (0.62, 0.56, 0.48, 1), rough=0.85),
    "cream": make_mat("gate_cream", (0.93, 0.85, 0.68, 1), rough=0.8),
    "teal": make_mat("gate_teal", (0.01, 0.36, 0.28, 1), rough=0.5),
    "bronze": make_mat("gate_bronze", (0.42, 0.27, 0.1, 1), (0.5, 0.3, 0.08, 1), 0.35, 0.4),
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
    return (x, -z, y)


def box(size, centre, material):
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


def hip_roof(cx, cz, hx, hz, y0, rise, inset_x, inset_z, fascia=0.35):
    """Rectangular hip roof with a concave slope, lifted corners and a gold fascia; hx runs along x."""
    steps = [0.0, 0.1, 0.3, 0.55, 0.8, 0.985]
    lift = 0.07 * min(hx, hz) + 0.1
    verts, faces, face_mat = [], [], []

    def ring(u):
        ax, az = hx - u * inset_x, hz - u * inset_z
        y = y0 + rise * (u**1.5)
        yc = y + (lift * (1 - u / 0.45) if u < 0.45 else 0.0)
        pts = [(-ax, -az, yc), (0, -az, y), (ax, -az, yc), (ax, 0, y), (ax, az, yc), (0, az, y), (-ax, az, yc), (-ax, 0, y)]
        return [B(cx + x, y_, cz + z) for x, z, y_ in pts]

    rings = [ring(u) for u in steps]
    for r in rings:
        verts += r
    for k in range(len(steps) - 1):
        for j in range(8):
            a0, a1 = k * 8 + j, k * 8 + (j + 1) % 8
            faces.append((a0, a1, a1 + 8, a0 + 8))
            face_mat.append(0)
    top = (len(steps) - 1) * 8
    faces.append(tuple(range(top, top + 8)))
    face_mat.append(0)
    base = len(verts)
    verts += [(x, y, z - fascia) for x, y, z in rings[0]]  # Blender z is up
    for j in range(8):
        faces.append((j, (j + 1) % 8, base + (j + 1) % 8, base + j))
        face_mat.append(1)
    faces.append(tuple(range(base, base + 8)))
    face_mat.append(1)
    return [mesh_obj("roof", verts, faces, ["teal", "gold"], face_mat)]


def spire(parts, x, y, z, scale=1.0):
    """A gold hti: a bell, rings and a tip."""
    parts.append(cyl(0.3 * scale, 0.14 * scale, (x, y + 0.07 * scale, z), "gold", 10))
    parts.append(cone(0.34 * scale, 0.08 * scale, 0.55 * scale, (x, y + 0.42 * scale, z), "gold", 10))
    for k, r in enumerate((0.26, 0.2, 0.15)):
        parts.append(cone(r * scale, r * 0.5 * scale, 0.1 * scale, (x, y + (0.75 + 0.16 * k) * scale, z), "gold", 10))
    parts.append(cyl(0.025 * scale, 0.8 * scale, (x, y + 1.35 * scale, z), "gold", 6))
    parts.append(cone(0.08 * scale, 0.01 * scale, 0.3 * scale, (x, y + 1.9 * scale, z), "gold", 6))


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
    print(name.upper(), "OK triangles:", sum(len(p.vertices) - 2 for p in merged.data.polygons))
    return merged


# ------------------------------------------------------------------ the gate (tam quan)
def gate():
    new_collection("gate")
    parts = []
    for x in GATE_XS:
        h = GATE_CENTRE_H if abs(x) < 3 else GATE_SIDE_H
        parts.append(box((1.5, 0.4, 1.5), (x, 0.2, 0), "stone"))  # plinth
        parts.append(box((0.9, h, 0.9), (x, h / 2, 0), "red"))
        parts.append(box((1.05, 0.16, 1.05), (x, 0.8, 0), "gold"))  # gold band near the foot
        parts.append(box((1.3, 0.35, 1.3), (x, h - 0.17, 0), "gold"))  # capital
        parts.append(box((1.0, 0.25, 1.0), (x, h + 0.12, 0), "red"))
    # lintels: a gold-edged beam across the centre and across each side bay
    centre_span = GATE_XS[2] - GATE_XS[1]
    parts.append(box((centre_span + 0.9, 0.55, 0.7), (0, GATE_CENTRE_H - 0.5, 0), "red"))
    parts.append(box((centre_span + 0.9, 0.12, 0.8), (0, GATE_CENTRE_H - 0.18, 0), "gold"))
    side_span = GATE_XS[1] - GATE_XS[0]
    for sx in (-1, 1):
        cx = sx * (GATE_XS[3] + GATE_XS[2]) / 2
        parts.append(box((side_span + 0.9, 0.45, 0.6), (cx, GATE_SIDE_H - 0.4, 0), "red"))
        parts.append(box((side_span + 0.9, 0.1, 0.7), (cx, GATE_SIDE_H - 0.15, 0), "gold"))
    # the centre: three tiers of teal roof on gold-banded drums, under a gold spire
    parts += hip_roof(0, 0, centre_span / 2 + 1.7, 2.1, GATE_CENTRE_H + 0.3, 1.3, 1.2, 0.5)
    parts.append(box((2 * (centre_span / 2 + 0.4), 1.0, 2 * 1.2), (0, GATE_CENTRE_H + 1.95, 0), "saffron"))
    parts.append(box((2 * (centre_span / 2 + 0.5), 0.14, 2 * 1.3), (0, GATE_CENTRE_H + 2.5, 0), "gold"))
    parts += hip_roof(0, 0, centre_span / 2 + 0.9, 1.5, GATE_CENTRE_H + 2.55, 1.2, 1.0, 0.45)
    parts.append(box((2 * (centre_span / 2 - 0.3), 0.8, 2 * 0.8), (0, GATE_CENTRE_H + 3.5, 0), "saffron"))
    parts += hip_roof(0, 0, centre_span / 2 - 0.1, 1.0, GATE_CENTRE_H + 3.8, 1.0, 0.8, 0.3)
    spire(parts, 0, GATE_CENTRE_H + 4.7, 0, 1.3)
    # each side bay: one teal roof and a small gold finial
    for sx in (-1, 1):
        cx = sx * (GATE_XS[3] + GATE_XS[2]) / 2
        parts += hip_roof(cx, 0, side_span / 2 + 0.9, 1.7, GATE_SIDE_H + 0.2, 1.1, 0.9, 0.7)
        spire(parts, cx, GATE_SIDE_H + 1.1, 0, 0.7)
    return export(parts, "gate")


# ------------------------------------------------------------------ the bell pavilion
def bell_tower():
    new_collection("bell")
    parts = []
    size = 2 * BELL_HALF
    base, h = BELL_BASE, 3.8
    parts.append(box((size, base, size), (0, base / 2, 0), "stone"))
    parts.append(box((size - 0.5, 0.16, size - 0.5), (0, base + 0.08, 0), "cream"))
    o = BELL_PILLAR_OFFSET
    for sx in (-1, 1):
        for sz in (-1, 1):
            parts.append(box((0.5, 0.25, 0.5), (sx * o, base + 0.25, sz * o), "stone"))
            parts.append(box((0.36, h, 0.36), (sx * o, base + h / 2, sz * o), "red"))
            parts.append(box((0.5, 0.14, 0.5), (sx * o, base + 0.9, sz * o), "gold"))
            parts.append(box((0.6, 0.3, 0.6), (sx * o, base + h - 0.15, sz * o), "gold"))
    top = base + h
    for sz in (-1, 1):
        parts.append(box((2 * o + 0.6, 0.3, 0.3), (0, top - 0.45, sz * o), "red"))
        parts.append(box((0.3, 0.3, 2 * o + 0.6), (sz * o, top - 0.45, 0), "red"))
    parts.append(box((2 * o + 0.6, 0.3, 0.3), (0, top - 0.8, 0), "red"))  # the beam the bell hangs from
    # two tiers of teal roof under a gold spire
    parts += hip_roof(0, 0, BELL_HALF + 1.0, BELL_HALF + 1.0, top, 1.6, 1.6, 1.6, 0.4)
    parts.append(box((2 * 1.5, 0.9, 2 * 1.5), (0, top + 2.05, 0), "saffron"))
    parts.append(box((2 * 1.6, 0.14, 2 * 1.6), (0, top + 2.55, 0), "gold"))
    parts += hip_roof(0, 0, 1.9, 1.9, top + 2.6, 1.3, 1.2, 1.2, 0.3)
    spire(parts, 0, top + 3.95, 0, 1.2)
    # the Burmese bell: a heavy bronze bell with a flared lip, hung from the beam on two straps
    bell_top = top - 0.95
    for dz in (-0.18, 0.18):
        parts.append(cyl(0.035, 0.7, (0, bell_top + 0.1, dz), "gold", 6))
    parts.append(cone(0.42, 0.34, 0.2, (0, bell_top - 0.35, 0), "gold", 16))  # crown
    parts.append(cone(0.95, 0.46, 1.5, (0, bell_top - 1.2, 0), "bronze", 20))  # body: wide at the lip
    parts.append(cyl(1.0, 0.2, (0, bell_top - 1.9, 0), "gold", 20))  # the lip
    parts.append(cyl(0.7, 0.1, (0, bell_top - 1.2, 0), "gold", 20))  # a gold band
    return export(parts, "bell-tower")


gate_model = gate()
bell_model = bell_tower()

if preview:
    scene = bpy.context.scene
    bpy.ops.mesh.primitive_plane_add(size=120, location=(0, 0, 0))
    ground = bpy.data.materials.new("ground")
    ground.use_nodes = True
    ground.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.55, 0.3, 0.22, 1)
    bpy.context.object.data.materials.append(ground)
    bpy.ops.object.light_add(type="SUN", location=(-20, -30, 30))
    sun = bpy.context.object
    sun.data.energy = 3.5
    sun.data.color = (1.0, 0.88, 0.72)
    sun.rotation_euler = (math.radians(55), 0, math.radians(-30))
    world = bpy.data.worlds.new("sky")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.6, 0.72, 0.9, 1)
    scene.world = world
    scene.render.engine = "BLENDER_EEVEE"
    scene.view_settings.view_transform = "Standard"
    scene.render.resolution_x, scene.render.resolution_y = 1400, 900
    # the two models sit side by side for the preview: move the bell pavilion away from the gate
    bell_model.location = (20, 0, 0)

    def shot(location, target, name, lens=32):
        cam_data = bpy.data.cameras.new("c" + name)
        cam_data.lens = lens
        cam = bpy.data.objects.new("c" + name, cam_data)
        scene.collection.objects.link(cam)
        cam.location = B(*location)
        cam.rotation_euler = (Vector(B(*target)) - cam.location).to_track_quat("-Z", "Y").to_euler()
        scene.camera = cam
        scene.render.filepath = f"{preview}_{name}.png"
        bpy.ops.render.render(write_still=True)

    shot((0, 4, -16), (0, 4.5, 0), "gate")
    shot((20 + 9, 4, -9), (20, 4.5, 0), "bell")
