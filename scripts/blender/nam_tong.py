# Builds app/public/models/monk-nam-tong.glb: the visitor's avatar, a small novice in
# the Vietnamese Nam tông (Theravada) dress: one saffron robe wrapped over the left
# shoulder, the right shoulder and arm bare, bare feet.
#
#   blender -b -P scripts/blender/nam_tong.py -- <out.glb> [<preview.png>]
#
# Written for Blender 5.x. The whole figure is our own: nothing is taken from the
# sansatemple.com avatar (decision 0006 keeps those assets out of git). It has the
# same 17 bones, named and parented like the old rig, because body-pose.ts poses
# the avatar by those names. The robe material is called "Nam tong robe":
# avatar-look.ts tints it with the colour chosen at onboarding. Units are metres
# of the model (the app scales it to 1.7 tall); it stands on z = 0, faces +Y,
# and its right side (the R bones) is +X.
import math
import sys

import bmesh
import bpy
from mathutils import Vector

args = sys.argv[sys.argv.index("--") + 1 :]
out_glb = args[0]
out_png = args[1] if len(args) > 1 else None
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene


def make_mat(name, color, rough=0.8):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = color
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = 0.0
    return m


skin_mat = make_mat("Nam tong skin", (0.54, 0.28, 0.14, 1))
robe_mat = make_mat("Nam tong robe", (0.86, 0.5, 0.05, 1))
trim_mat = make_mat("Nam tong robe trim", (0.4, 0.12, 0.05, 1))

# ------------------------------------------------------------------ the rig
# (name, parent, head, tail): the same names, hierarchy and joint places as the old rig.
BONES = [
    ("hips", None, (0, 0, 0.70), (0, 0, 0.76)),
    ("spine", "hips", (0, 0, 0.76), (0, 0, 0.88)),
    ("chest", "spine", (0, 0, 0.88), (0, 0, 0.98)),
    ("neck", "chest", (0, 0, 0.98), (0, 0, 1.03)),
    ("head", "neck", (0, 0, 1.03), (0, 0, 1.45)),
]
for side, sx in (("L", -1), ("R", 1)):
    BONES += [
        (f"upper_arm.{side}", "chest", (sx * 0.18, 0, 0.91), (sx * 0.30, 0.02, 0.75)),
        (f"forearm.{side}", f"upper_arm.{side}", (sx * 0.30, 0.02, 0.75), (sx * 0.35, 0.06, 0.61)),
        (f"hand.{side}", f"forearm.{side}", (sx * 0.35, 0.06, 0.61), (sx * 0.37, 0.08, 0.52)),
        (f"thigh.{side}", "hips", (sx * 0.10, 0, 0.70), (sx * 0.09, 0.01, 0.36)),
        (f"shin.{side}", f"thigh.{side}", (sx * 0.09, 0.01, 0.36), (sx * 0.09, 0.0, 0.08)),
        (f"foot.{side}", f"shin.{side}", (sx * 0.09, 0.0, 0.08), (sx * 0.09, 0.12, 0.03)),
    ]

rig_data = bpy.data.armatures.new("NamTongRig")
rig = bpy.data.objects.new("NamTongRig", rig_data)
scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode="EDIT")
for name, parent, head, tail in BONES:
    eb = rig_data.edit_bones.new(name)
    eb.head, eb.tail = head, tail
    if parent:
        eb.parent = rig_data.edit_bones[parent]
bpy.ops.object.mode_set(mode="OBJECT")
BONE_SEGMENTS = {name: (Vector(head), Vector(tail)) for name, _, head, tail in BONES}

# ------------------------------------------------------------------ mesh helpers
groups = {"skin": [], "robe": [], "trim": []}


def keep(obj, group, material, smooth=True):
    obj.data.materials.append(material)
    if smooth:
        for p in obj.data.polygons:
            p.use_smooth = True
    groups[group].append(obj)
    return obj


def sphere(center, radii, group, material, segs=24, rings=14):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segs, ring_count=rings, radius=1, location=center)
    o = bpy.context.object
    o.scale = radii
    bpy.ops.object.transform_apply(scale=True)
    return keep(o, group, material)


def tube(p0, p1, r0, r1, group, material, verts=14, caps="NOTHING"):
    a, b = Vector(p0), Vector(p1)
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r0, radius2=r1, depth=(b - a).length, end_fill_type=caps, location=(a + b) / 2)
    o = bpy.context.object
    o.rotation_euler = Vector((0, 0, 1)).rotation_difference((b - a).normalized()).to_euler()
    bpy.ops.object.transform_apply(rotation=True)
    return keep(o, group, material)


def solidify(obj, thickness):
    mod = obj.modifiers.new("solid", "SOLIDIFY")
    mod.thickness = thickness
    mod.offset = 1
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=mod.name)


# ------------------------------------------------------------------ the body (skin)
TORSO = (0.0, 0.0, 0.84)
sphere(TORSO, (0.2, 0.135, 0.15), "skin", skin_mat)
tube((0, 0, 0.94), (0, 0, 1.06), 0.065, 0.06, "skin", skin_mat, 16, "NGON")  # neck
for sx in (-1, 1):
    shoulder, elbow, wrist = (sx * 0.18, 0.0, 0.91), (sx * 0.3, 0.02, 0.75), (sx * 0.35, 0.06, 0.62)
    tube(shoulder, elbow, 0.058, 0.05, "skin", skin_mat)
    tube(elbow, wrist, 0.05, 0.043, "skin", skin_mat)
    sphere(elbow, (0.052, 0.052, 0.052), "skin", skin_mat, 12, 8)
    sphere((sx * 0.36, 0.075, 0.565), (0.046, 0.05, 0.065), "skin", skin_mat, 16, 10)  # mitten hand
    tube((sx * 0.095, 0.01, 0.36), (sx * 0.09, 0.0, 0.08), 0.042, 0.034, "skin", skin_mat)  # bare shin
    sphere((sx * 0.09, 0.035, 0.045), (0.05, 0.1, 0.038), "skin", skin_mat, 16, 10)  # bare foot

# ------------------------------------------------------------------ the robe
# Upper cloth: a shell round the chest, open over the right shoulder; the cut runs
# from the left side of the neck down to the right armpit.
chest = sphere(TORSO, (0.214, 0.15, 0.164), "robe", robe_mat, 64, 40)
bm = bmesh.new()
bm.from_mesh(chest.data)
bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(-0.1, 0, 1.05), plane_no=(0.27, 0, 0.3), clear_outer=True)
bm.to_mesh(chest.data)
bm.free()
solidify(chest, 0.012)
# the left shoulder and upper arm are covered down to the elbow
tube((-0.17, 0.0, 0.915), (-0.3, 0.02, 0.745), 0.082, 0.07, "robe", robe_mat, 16)
sphere((-0.175, 0.0, 0.905), (0.088, 0.085, 0.082), "robe", robe_mat, 16, 10)

# Lower robe: a flared, softly folded skirt from the waist to just above the ankles.
bm = bmesh.new()
RINGS, SIDES = 9, 36
for i in range(RINGS):
    t = i / (RINGS - 1)
    z = 0.76 - 0.64 * t
    rx, ry = 0.225 + 0.05 * t, 0.16 + 0.05 * t
    for j in range(SIDES):
        a = math.tau * j / SIDES
        fold = 1 + 0.045 * t * math.sin(a * 7)
        bm.verts.new((rx * fold * math.cos(a), ry * fold * math.sin(a), z))
bm.verts.ensure_lookup_table()
for i in range(RINGS - 1):
    for j in range(SIDES):
        bm.faces.new(
            (bm.verts[i * SIDES + j], bm.verts[i * SIDES + (j + 1) % SIDES], bm.verts[(i + 1) * SIDES + (j + 1) % SIDES], bm.verts[(i + 1) * SIDES + j])
        )
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
skirt_mesh = bpy.data.meshes.new("skirt")
bm.to_mesh(skirt_mesh)
bm.free()
skirt = bpy.data.objects.new("skirt", skirt_mesh)
scene.collection.objects.link(skirt)
solidify(skirt, 0.012)
keep(skirt, "robe", robe_mat)

# a darker band at the waist and along the hem
for z0, z1, rx, ry in ((0.73, 0.78, 0.229, 0.164), (0.12, 0.145, 0.275, 0.21)):  # the skirt is oval
    band = tube((0, 0, z0), (0, 0, z1), rx, rx, "trim", trim_mat, 36)
    band.scale = (1, ry / rx, 1)
    bpy.ops.object.transform_apply(scale=True)

# ------------------------------------------------------------------ the head
HEAD_CENTER, HEAD_RADII = Vector((0, 0, 1.2)), Vector((0.26, 0.245, 0.25))


def paint_face(size=512):
    """A calm closed-eyed smile with brows and blush, drawn on a skin-coloured texture."""
    skin, ink, blush = (0.78, 0.5, 0.33), (0.18, 0.08, 0.05), (0.9, 0.45, 0.4)
    pixels = [0.0] * (size * size * 4)
    for py in range(size):
        z = HEAD_CENTER.z + (py / size - 0.5) * 2 * HEAD_RADII.z
        for px in range(size):
            x = (px / size - 0.5) * 2 * HEAD_RADII.x
            color = skin
            for sx in (-1, 1):
                if ((x - sx * 0.145) / 0.05) ** 2 + ((z - 1.135) / 0.032) ** 2 < 1:  # blush
                    color = tuple(0.65 * s + 0.35 * b for s, b in zip(skin, blush))
                dx = x - sx * 0.092
                if abs(dx) < 0.042 and abs(z - (1.215 + 0.018 * (1 - (dx / 0.042) ** 2))) < 0.0045:  # closed eye
                    color = ink
                dxb = x - sx * 0.095
                if abs(dxb) < 0.05 and abs(z - (1.285 + 0.012 * (1 - (dxb / 0.05) ** 2))) < 0.0035:  # brow
                    color = tuple(0.5 * s + 0.5 * i for s, i in zip(skin, ink))
            if abs(x) < 0.035 and abs(z - (1.105 - 0.012 * (1 - (x / 0.035) ** 2))) < 0.004:  # smile
                color = ink
            i = (py * size + px) * 4
            pixels[i : i + 4] = (*color, 1.0)
    image = bpy.data.images.new("nam_tong_face", size, size)
    image.pixels.foreach_set(pixels)
    image.pack()
    return image


face_mat = bpy.data.materials.new("Nam tong face")
face_mat.use_nodes = True
tree = face_mat.node_tree
tex = tree.nodes.new("ShaderNodeTexImage")
tex.image = paint_face()
bsdf = tree.nodes["Principled BSDF"]
bsdf.inputs["Roughness"].default_value = 0.8
bsdf.inputs["Metallic"].default_value = 0.0
tree.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=32, radius=1, location=HEAD_CENTER)
head = bpy.context.object
head.scale = HEAD_RADII
bpy.ops.object.transform_apply(scale=True)
for p in head.data.polygons:
    p.use_smooth = True
uv = head.data.uv_layers[0] if head.data.uv_layers else head.data.uv_layers.new(name="UVMap")
for loop in head.data.loops:  # seen from the front, x and z map straight onto the texture
    v = head.data.vertices[loop.vertex_index].co
    uv.data[loop.index].uv = (0.5 + (v.x - HEAD_CENTER.x) / (2 * HEAD_RADII.x), 0.5 + (v.z - HEAD_CENTER.z) / (2 * HEAD_RADII.z))
head.data.materials.append(face_mat)
for sx in (-1, 1):  # ears
    sphere((sx * 0.252, -0.005, 1.19), (0.022, 0.03, 0.05), "skin", skin_mat, 12, 8)


# ------------------------------------------------------------------ join, skin weights, rig
def bones_near(v, part):
    """The bones a vertex may follow, chosen from where on the body it is."""
    if part == "head":
        return ["head"]
    if part == "trim":
        return ["hips", "thigh.L", "thigh.R"]
    side = "L" if v.x < 0 else "R"
    if part == "robe":
        if v.z < 0.77:
            return ["hips", "thigh.L", "thigh.R"]
        if abs(v.x) > 0.17:
            return ["chest", f"upper_arm.{side}", f"forearm.{side}"]
        return ["spine", "chest", "neck", "hips"]
    if v.z < 0.45 or (v.z < 0.7 and 0.04 < abs(v.x) < 0.14):
        return [f"thigh.{side}", f"shin.{side}", f"foot.{side}"]
    if abs(v.x) > 0.2 and v.z > 0.45:
        return ["chest", f"upper_arm.{side}", f"forearm.{side}", f"hand.{side}"]
    if v.z > 0.93:
        return ["chest", "neck", "head"]
    return ["hips", "spine", "chest"]


def seg_distance(p, a, b):
    ab = b - a
    t = max(0.0, min(1.0, (p - a).dot(ab) / ab.length_squared))
    return (p - (a + ab * t)).length


def weigh(obj, part):
    for name in BONE_SEGMENTS:
        obj.vertex_groups.new(name=name)
    for v in obj.data.vertices:
        names = bones_near(v.co, part)
        raw = sorted(((1.0 / (seg_distance(v.co, *BONE_SEGMENTS[n]) + 0.02) ** 4, n) for n in names), reverse=True)[:3]
        total = sum(w for w, _ in raw)
        for w, n in raw:
            obj.vertex_groups[n].add([v.index], w / total, "REPLACE")
    obj.parent = rig
    obj.modifiers.new("Armature", "ARMATURE").object = rig


def join(objs, name):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    out = bpy.context.object
    out.name = name
    return out


parts = {
    "skin": join(groups["skin"], "skin"),
    "robe": join(groups["robe"], "robe"),
    "trim": join(groups["trim"], "trim"),
    "head": head,
}
for part, obj in parts.items():
    weigh(obj, part)

# ------------------------------------------------------------------ export
bpy.ops.object.select_all(action="DESELECT")
rig.select_set(True)
for obj in parts.values():
    obj.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.export_scene.gltf(filepath=out_glb, export_format="GLB", use_selection=True, export_skins=True)
tris = sum(len(p.vertices) - 2 for o in parts.values() for p in o.data.polygons)
print("NAMTONG_OK triangles:", tris, "meshes:", len(parts), "bones:", len(BONES))

if out_png:  # preview: front and three-quarter view in soft light
    bpy.ops.mesh.primitive_plane_add(size=20, location=(0, 0, 0))
    scene.world = bpy.data.worlds.new("sky")
    scene.world.use_nodes = True
    scene.world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.75, 0.8, 0.9, 1)
    scene.world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.6
    bpy.ops.object.light_add(type="SUN", location=(2, 3, 4))
    bpy.context.object.data.energy = 2.2
    bpy.context.object.rotation_euler = (math.radians(50), 0, math.radians(150))
    scene.render.engine = "BLENDER_EEVEE"
    scene.view_settings.view_transform = "Standard"
    scene.render.resolution_x, scene.render.resolution_y = 1400, 1000
    for loc, name in (((1.5, 3.2, 1.0), "a"), ((-3.0, 1.6, 0.9), "b")):
        cam_data = bpy.data.cameras.new("cam" + name)
        cam_data.lens = 50
        cam = bpy.data.objects.new("cam" + name, cam_data)
        scene.collection.objects.link(cam)
        cam.location = loc
        cam.rotation_euler = (Vector((0, 0, 0.72)) - cam.location).to_track_quat("-Z", "Y").to_euler()
        scene.camera = cam
        scene.render.filepath = out_png.replace(".png", f"_{name}.png")
        bpy.ops.render.render(write_still=True)
