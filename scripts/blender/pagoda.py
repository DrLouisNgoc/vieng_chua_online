# Builds app/public/models/pagoda.glb: a Shwedagon-style Burmese pagoda complex
# (owner's reference photo, 2026-11-13) used as far scenery outside the temple wall.
#
#   blender -b -P scripts/blender/pagoda.py -- <out.glb>
#
# Written for Blender 5.x. Units are metres, the plaza top is y = 0 and its front
# faces +Z in the glb. The whole complex is baked into ONE mesh with a handful of
# material slots (a few draw calls); the small stupas use fewer segments than the
# great one because they are seen from far away.
import math
import sys

import bmesh
import bpy
from mathutils import Vector

out_glb = sys.argv[sys.argv.index("--") + 1]
bpy.ops.wm.read_factory_settings(use_empty=True)
COL = bpy.data.collections.new("pagoda")
bpy.context.scene.collection.children.link(COL)


def make_mat(name, color, emit=None, strength=0.0, metallic=0.0, rough=0.6):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = color
    b.inputs["Metallic"].default_value = metallic
    b.inputs["Roughness"].default_value = rough
    if emit is not None:
        b.inputs["Emission Color"].default_value = emit
        b.inputs["Emission Strength"].default_value = strength
    return m


# The web scene has no environment map, so metal would read dark: gold is a
# warm emissive instead.
M = {
    "gold": make_mat("pagoda_gold", (0.92, 0.55, 0.08, 1), (1.0, 0.5, 0.06, 1), 0.7, 0.1, 0.4),
    "ochre": make_mat("pagoda_ochre", (0.8, 0.4, 0.06, 1), (0.9, 0.32, 0.04, 1), 0.2, 0.0, 0.6),
    "cream": make_mat("pagoda_cream", (0.93, 0.85, 0.68, 1), rough=0.7),
    "marble": make_mat("pagoda_marble", (0.94, 0.91, 0.84, 1), rough=0.5),
    "teal": make_mat("pagoda_teal", (0.01, 0.36, 0.28, 1), rough=0.5),
    "carpet": make_mat("pagoda_carpet", (0.0, 0.32, 0.25, 1), rough=0.9),
    "brown": make_mat("pagoda_brown", (0.38, 0.23, 0.1, 1), rough=0.6),
    "dark": make_mat("pagoda_dark", (0.05, 0.04, 0.04, 1), rough=0.8),
    "stone": make_mat("pagoda_stone", (0.62, 0.56, 0.48, 1), rough=0.8),
    "red": make_mat("pagoda_red", (0.5, 0.05, 0.04, 1), rough=0.5),
    "bronze": make_mat("pagoda_bronze", (0.42, 0.27, 0.1, 1), (0.5, 0.3, 0.08, 1), 0.3, 0.1, 0.4),
}


def put(obj, material=None):
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    COL.objects.link(obj)
    if material is not None:
        obj.data.materials.append(M[material])
    return obj


def box(size, center, material, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=center, rotation=rot)
    o = bpy.context.object
    o.scale = size
    return put(o, material)


def cyl(radius, height, center, material, verts=16, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=height, location=center, rotation=rot)
    return put(bpy.context.object, material)


def cone(r1, r2, height, center, material, verts=12, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r1, radius2=r2, depth=height, location=center, rotation=rot)
    return put(bpy.context.object, material)


def sphere(radius, center, material, scale=(1, 1, 1), segs=12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segs, ring_count=max(segs // 2, 4), radius=radius, location=center)
    o = bpy.context.object
    o.scale = scale
    return put(o, material)


def segment(p0, p1, r0, r1, material, verts=4):
    a, b = Vector(p0), Vector(p1)
    d = b - a
    rot = Vector((0, 0, 1)).rotation_difference(d.normalized()).to_euler()
    return cone(r0, r1, d.length, (a + b) / 2, material, verts, rot)


def mesh_obj(name, verts, faces, materials, face_mat=None):
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
    if face_mat is not None:
        for poly, idx in zip(me.polygons, face_mat):
            poly.material_index = idx
    o = bpy.data.objects.new(name, me)
    COL.objects.link(o)
    return o


def join(objs, name):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    result = bpy.context.object
    result.name = name
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)  # bake into world space
    return result


def instance(src, location, rot_z=0.0, scale=1.0):
    o = src.copy()  # linked copy: shares the mesh until the final bake
    o.location = location
    o.rotation_euler = (0, 0, rot_z)
    o.scale = (scale, scale, scale)
    COL.objects.link(o)
    return o


def lathe(name, profile, segs, mat="gold"):
    n = len(profile)
    verts = [(r * math.cos(j / segs * math.tau), r * math.sin(j / segs * math.tau), z) for r, z in profile for j in range(segs)]
    faces = []
    for i in range(n - 1):
        for j in range(segs):
            a0, a1 = i * segs + j, i * segs + (j + 1) % segs
            faces.append((a0, a1, a1 + segs, a0 + segs))
    if profile[0][0] > 0:
        faces.append(tuple(range(segs - 1, -1, -1)))
    if profile[-1][0] > 0:
        faces.append(tuple(range((n - 1) * segs, n * segs)))
    o = mesh_obj(name, verts, faces, [mat])
    for p in o.data.polygons:
        p.use_smooth = True
    return o


def stupa(with_base, segs, ribs, door=False):
    """Gold stupa, local z = 0 at the lotus base: lotus, bell, ribbed spire, bud, hti crown."""
    parts = []
    base = [(23.0, 0.0), (23.8, 0.9), (22.4, 1.8), (20.8, 2.2)]
    bell = [(20.8 * math.cos(math.radians(a)), 2.2 + 17.0 * math.sin(math.radians(a))) for a in range(0, 80, 5 if segs > 24 else 10)]
    neck = [(5.2, 18.6), (4.7, 19.6), (5.3, 20.3), (4.9, 21.0)]
    body = lathe("body", base + bell[1:] + neck, segs)
    parts.append(body)
    if door:
        parts += stupa_entrance(body, segs)
    rib, step = [], 17.6 / ribs
    for i in range(ribs):
        r, z = 5.0 - 3.0 * i / (ribs - 1), 21.0 + i * step
        rib += [(r, z), (r + 0.4, z), (r + 0.4, z + 0.25), (r, z + 0.25)]
    parts.append(lathe("ribs", rib, max(segs * 3 // 4, 8)))
    z0 = 21.0 + ribs * step
    lotus = [(2.0, z0), (3.6, z0 + 0.7), (4.0, z0 + 1.5), (3.2, z0 + 2.6), (1.4, z0 + 3.3), (0.9, z0 + 3.6)]
    parts.append(lathe("lotus", lotus, max(segs // 2, 8)))
    bud = [(0.01, z0 + 3.5)] + [(1.1 * math.sin(t), z0 + 4.9 - 1.4 * math.cos(t)) for t in (0.4, 0.9, 1.6, 2.3, 2.8)] + [(0.01, z0 + 6.3)]
    parts.append(lathe("bud", bud, max(segs // 2, 8)))
    parts.append(cyl(0.12, 6.0, (0, 0, z0 + 9.0), "gold", 6))
    for k, r in enumerate((3.6, 3.0, 2.4, 1.8, 1.3, 0.9)):  # the hti: crown of umbrella tiers
        parts.append(cone(r, r * 0.45, 0.5, (0, 0, z0 + 6.6 + 0.8 * k), "gold", max(segs // 2, 8)))
    parts.append(cone(0.5, 0.05, 1.6, (0, 0, z0 + 12.2), "gold", 6))
    parts.append(sphere(0.35, (0, 0, z0 + 13.3), "gold", segs=8))
    if with_base:
        parts.append(cyl(27.0, 5.0, (0, 0, -2.5), "cream", 8, (0, 0, math.radians(22.5))))
        parts.append(cyl(27.6, 0.6, (0, 0, -0.3), "gold", 8, (0, 0, math.radians(22.5))))
    return join(parts, "stupa")


def stupa_entrance(body, segs):
    """Cut a doorway in the front (-Y) of the dome and hollow it: a domed chamber with a gold lotus
    ceiling, a marble floor, an altar for the Buddha (the app puts the temple's own statue on it) and a
    red-and-gold door frame. Returns the new parts. Local z = 0 is the chamber floor."""
    cutter = box((7.0, 14.0, 8.5), (0, -21.5, 4.25), "stone")
    mod = body.modifiers.new("door", "BOOLEAN")
    mod.operation, mod.solver, mod.object = "DIFFERENCE", "EXACT", cutter
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter)
    # the inside of the dome: a thin shell just inside the skin, closed so the door can be cut in it too
    inner = [(19.6, 0.0), (19.6, 2.2)] + [(19.6 * math.cos(math.radians(a)), 2.2 + 14.4 * math.sin(math.radians(a))) for a in range(5, 90, 5)] + [(0.01, 16.7)]
    shell = lathe("inner", inner, segs, "ochre")
    bm = bmesh.new()
    bm.from_mesh(shell.data)
    bmesh.ops.reverse_faces(bm, faces=bm.faces)  # faces look inward
    # open the doorway in the shell itself (a Boolean on a thin shell can miss it): drop the faces
    # in front of the door, which leaves a gap the solidify below turns into a clean frame
    doorway = [f for f in bm.faces if abs(f.calc_center_median().x) < 4.2 and f.calc_center_median().y < -8 and f.calc_center_median().z < 10]
    bmesh.ops.delete(bm, geom=doorway, context="FACES")
    bm.to_mesh(shell.data)
    bm.free()
    solid = shell.modifiers.new("thick", "SOLIDIFY")
    solid.thickness, solid.offset = 0.5, 1
    bpy.context.view_layer.objects.active = shell
    bpy.ops.object.modifier_apply(modifier=solid.name)
    parts = [shell]
    parts.append(cyl(19.6, 0.3, (0, 0, -0.1), "stone", 48))  # the floor
    for r, z in ((19.4, 2.4), (15.5, 9.0), (10.5, 13.5), (5.0, 15.9)):  # gold bands round the dome
        parts.append(cyl(r, 0.35, (0, 0, z), "gold", 48))
    parts.append(cone(3.0, 0.4, 0.8, (0, 0, 16.3), "gold", 16))  # a lotus at the apex
    parts.append(box((10.0, 8.0, 1.2), (0, 10.5, 0.6), "gold"))  # the altar at the back
    parts.append(box((8.0, 6.0, 0.7), (0, 10.5, 1.55), "ochre"))
    for sx in (-1, 1):  # door frame
        parts.append(box((0.8, 1.2, 8.8), (sx * 3.9, -23.2, 4.4), "red"))
    parts.append(box((9.4, 1.4, 1.0), (0, -23.2, 9.0), "gold"))
    return parts


def hip_roof(cx, cy, hx, hy, z0, rise, inset, trim=True):
    """Hip roof with a concave slope, lifted corners, a gold fascia and flame trim."""
    steps = [0.0, 0.1, 0.3, 0.55, 0.8, 0.985]
    lift = 0.07 * hx + 0.15

    def ring(u):
        a, b = hx - u * inset, hy - u * inset
        z = z0 + rise * (u**1.5)
        zc = z + (lift * (1 - u / 0.45) if u < 0.45 else 0.0)
        pts = [(-a, -b, zc), (0, -b, z), (a, -b, zc), (a, 0, z), (a, b, zc), (0, b, z), (-a, b, zc), (-a, 0, z)]
        return [(cx + x, cy + y, zz) for x, y, zz in pts]

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
    verts += [(x, y, z - 0.45) for x, y, z in rings[0]]
    for j in range(8):
        faces.append((j, (j + 1) % 8, base + (j + 1) % 8, base + j))
        fm.append(1)
    faces.append(tuple(range(base, base + 8)))
    fm.append(2)
    parts = [mesh_obj("roof", verts, faces, ["teal", "gold", "cream"], fm)]
    if trim:
        for j in range(0, 8, 2):  # a tall point at each corner
            p = Vector(rings[0][j])
            out = Vector((p.x - cx, p.y - cy, 0)).normalized()
            parts.append(segment(p, p + out * 0.5 + Vector((0, 0, 1.1)), 0.15 * max(hx / 4, 0.6), 0.015, "gold"))
    return join(parts, "roof_joined")


def tower(levels, half0):
    """Tall tiered pavilion (pyatthat): gold bands, teal roofs, gold spire."""
    parts = [box((half0 * 2 + 2, half0 * 2 + 2, 1.2), (0, 0, 0.6), "cream"), box((half0 * 1.8, half0 * 1.8, 5.0), (0, 0, 3.7), "ochre")]
    d = half0 * 0.9 + 0.05
    for sx, sy in ((0, -1), (0, 1), (-1, 0), (1, 0)):  # a doorway on every face
        size = (0.2, 2.0, 3.4) if sx else (2.0, 0.2, 3.4)
        parts.append(box(size, (sx * d, sy * d, 2.9), "dark"))
    z = 6.2
    for i in range(levels):
        half = half0 * (1 - 0.1 * i)
        parts.append(box((2 * (half - 0.7), 2 * (half - 0.7), 1.0), (0, 0, z + 0.5), "gold"))
        parts.append(hip_roof(0, 0, half, half, z + 0.9, 1.5, half - 0.2))
        z += 2.1
    for k, r in enumerate((1.6, 1.3, 1.0)):
        parts.append(cone(r, r * 0.5, 0.35, (0, 0, z + 0.4 + 0.55 * k), "gold", 10))
    parts.append(cyl(0.1, 3.5, (0, 0, z + 2.0), "gold", 6))
    parts.append(cone(0.5, 0.05, 1.4, (0, 0, z + 4.2), "gold", 6))
    return join(parts, "tower")


def shrine():
    """Small gold shrine with a dark doorway and a teal roof, front facing -Y."""
    parts = [box((5.2, 4.2, 0.4), (0, 0, 0.2), "cream"), box((4.4, 3.4, 3.2), (0, 0, 2.0), "ochre")]
    parts.append(box((1.5, 0.2, 2.4), (0, -1.72, 1.6), "dark"))
    parts.append(hip_roof(0, 0, 3.2, 2.7, 3.7, 1.8, 2.45, trim=False))
    parts.append(cone(0.35, 0.05, 1.4, (0, 0, 6.3), "gold", 6))
    return join(parts, "shrine")


def main_hall(hx, hy):
    """The complex's own chánh điện: hollow, with a door in front, columns inside and an altar at the back
    (the app puts a copy of the temple's Buddha on it), three teal roofs on top; front facing -Y."""
    h0, wall, t, door = 0.5, 9.0, 1.4, 4.0
    parts = [box((2 * (hx + 3), 2 * (hy + 3), h0), (0, 0, h0 / 2), "cream")]
    # the floor: a slab thick enough (0.3) not to flicker against the platform under it
    parts.append(box((2 * hx, 2 * hy, 0.3), (0, 0, h0 + 0.15), "brown"))
    floor = h0 + 0.3
    mid = h0 + wall / 2
    parts.append(box((2 * hx, t, wall), (0, hy - t / 2, mid), "ochre"))  # back wall
    for sx in (-1, 1):
        parts.append(box((t, 2 * hy, wall), (sx * (hx - t / 2), 0, mid), "ochre"))  # side walls
        seg = hx - door
        parts.append(box((seg, t, wall), (sx * (door + seg / 2), -hy + t / 2, mid), "ochre"))  # front, either side of the door
        parts.append(box((0.6, 0.8, 6.2), (sx * door, -hy - 0.1, h0 + 3.1), "red"))  # door posts
    parts.append(box((2 * door, t, wall - 6.2), (0, -hy + t / 2, h0 + 6.2 + (wall - 6.2) / 2), "ochre"))  # over the door
    parts.append(box((2 * door + 1.6, 0.9, 0.5), (0, -hy - 0.1, h0 + 6.4), "gold"))
    top = h0 + wall
    parts.append(box((2 * hx - 2 * t, 2 * hy - 2 * t, 0.3), (0, 0, top - 0.15), "ochre"))  # ceiling
    for sx in (-1, 1):  # a gold band round the top of the outside
        parts.append(box((0.6, 2 * hy + 0.8, 0.6), (sx * (hx + 0.1), 0, top - 0.3), "gold"))
    parts.append(box((2 * hx + 0.8, 0.6, 0.6), (0, hy + 0.1, top - 0.3), "gold"))
    parts.append(box((2 * hx + 0.8, 0.6, 0.6), (0, -hy - 0.1, top - 0.3), "gold"))
    for i in (0, 1, 2, 3, 5, 6, 7, 8):  # red columns along the front, none in the doorway
        parts.append(cyl(0.45, wall, (-hx + i * hx / 4, -hy - 0.6, h0 + wall / 2), "red", 8))
    for bx in (-16, -8, 8, 16):  # and two rows inside
        for by in (-6, 2):
            parts.append(cyl(0.5, wall, (bx, by, h0 + wall / 2), "red", 10))
            parts.append(cyl(0.7, 0.4, (bx, by, floor + 0.2), "gold", 10))
    parts.append(box((18, 9, 0.7), (0, hy - t - 4.5, floor + 0.35), "gold"))  # the altar at the back
    parts.append(box((15, 7, 0.6), (0, hy - t - 4.2, floor + 1.0), "ochre"))
    # worship in front of the altar: an incense urn and kneeling cushions (pagoda-layout.ts holds
    # the statue zone and the urn's collider; keep the numbers in step)
    urn_y = hy - t - 9 - 2.2
    for k in range(3):  # three legs
        ang = math.tau * k / 3 + 0.5
        parts.append(cone(0.2, 0.12, 0.7, (0.75 * math.cos(ang), urn_y + 0.75 * math.sin(ang), floor + 0.35), "bronze", 8))
    parts.append(cone(1.2, 0.8, 0.9, (0, urn_y, floor + 1.15), "bronze", 20))  # the bowl, wider at the rim
    parts.append(cyl(1.25, 0.14, (0, urn_y, floor + 1.62), "gold", 20))  # a gold rim
    parts.append(cyl(1.05, 0.1, (0, urn_y, floor + 1.62), "stone", 20))  # the sand
    for k in range(15):  # incense sticks, fanned a little
        ang = math.tau * k / 15
        r = 0.2 + 0.55 * ((k * 7) % 5) / 5
        parts.append(cyl(0.03, 1.3, (r * math.cos(ang), urn_y + r * math.sin(ang), floor + 2.25), "red", 6))
    for bx, by in ((-9, 1.6), (-4.5, 1.6), (4.5, 1.6), (9, 1.6), (-3.4, 3.4), (3.4, 3.4)):  # kneeling cushions
        parts.append(cyl(0.8, 0.22, (bx, by, floor + 0.11), "red", 16))
        parts.append(cyl(0.86, 0.06, (bx, by, floor + 0.23), "gold", 16))
    parts += [hip_roof(0, 0, hx + 3, hy + 3, top, 3.6, 8)]
    parts.append(box((2 * (hx - 5.5), 2 * (hy - 5.5), 3.0), (0, 0, top + 3.2), "ochre"))
    parts.append(box((2 * (hx - 5.5) + 0.6, 2 * (hy - 5.5) + 0.6, 0.5), (0, 0, top + 4.6), "gold"))
    parts += [hip_roof(0, 0, hx - 5, hy - 5, top + 4.8, 3.0, 5)]
    parts.append(cyl(1.8, 0.6, (0, 0, top + 8.4), "gold", 12))
    parts.append(cone(1.6, 0.3, 4.0, (0, 0, top + 10.7), "gold", 12))
    parts.append(cyl(0.12, 3.0, (0, 0, top + 14.2), "gold", 6))
    parts.append(cone(0.5, 0.04, 1.4, (0, 0, top + 16.4), "gold", 6))
    return join(parts, "main_hall")


def perimeter_wall(half, gate_half):
    """Ochre wall with a gold cap round the plaza; the gate stands in the -Y side."""
    height, thick = 3.6, 1.4
    for sgn in (1, -1):  # the two side walls
        box((thick, 2 * half + thick, height), (sgn * half, 0, height / 2), "ochre")
        box((thick + 0.5, 2 * half + thick, 0.4), (sgn * half, 0, height + 0.2), "gold")
    box((2 * half + thick, thick, height), (0, half, height / 2), "ochre")
    box((2 * half + thick, thick + 0.5, 0.4), (0, half, height + 0.2), "gold")
    for sgn in (-1, 1):  # the front wall, with a gap for the gate
        length = half - gate_half
        cx = sgn * (gate_half + length / 2)
        box((length, thick, height), (cx, -half, height / 2), "ochre")
        box((length, thick + 0.5, 0.4), (cx, -half, height + 0.2), "gold")
        cyl(1.2, 8.0, (sgn * gate_half, -half, 4.0), "red", 10)
        cyl(1.6, 0.6, (sgn * gate_half, -half, 8.2), "gold", 10)
    box((2 * gate_half + 3, 2.2, 0.9), (0, -half, 8.6), "gold")
    hip_roof(0, -half, gate_half + 3.5, 3.5, 9.0, 2.2, 2.8)


# ------------------------------------------------------------------- layout
PL = 105.0  # half-size of the marble plaza
mesh_obj("plaza", [(-PL, -PL, 0), (PL, -PL, 0), (PL, PL, 0), (-PL, PL, 0)], [(0, 1, 2, 3)], ["marble"])
box((2 * PL + 2, 2 * PL + 2, 0.6), (0, 0, -0.4), "stone")
# Layers on the marble (top at 0): inlay, then border, then carpet, each 0.08 above the last.
# Closer than that they flicker (z-fighting) from afar: the camera's depth range is 0.1 to 800.
for rz in (0, math.pi / 2):  # green carpet cross
    box((7.0, 2 * PL - 4, 0.24), (0, 0, 0.12), "carpet", (0, 0, rz))
    box((8.4, 2 * PL - 4, 0.16), (0, 0, 0.08), "brown", (0, 0, rz))
for ang in (0, math.pi / 2):  # diamond inlay
    box((2.0, 150.0, 0.08), (0, 0, 0.04), "brown", (0, 0, ang + math.pi / 4))

OCT = math.radians(22.5)
for radius, height, z, mat in ((46, 1.6, 0.8, "cream"), (40, 1.6, 2.4, "stone"), (34.5, 1.8, 4.1, "cream")):
    cyl(radius, height, (0, 0, z), mat, 8, (0, 0, OCT))
    cyl(radius + 0.6, 0.3, (0, 0, z + height / 2 - 0.1), "gold", 8, (0, 0, OCT))
cyl(29.0, 1.5, (0, 0, 5.75), "ochre", 32)
cyl(25.5, 1.5, (0, 0, 7.25), "gold", 32)

main = stupa(False, 48, 14, door=True)
main.location = (0, 0, 8.0)

# The way in (owner, 2026-11-13: "xây lại đường vào bảo tháp"): 20 steps from the plaza, over the
# terraces, to the door; 0.4 up and 1.35 along each. pagoda-layout.ts mirrors these numbers.
STEP_RISE, STEP_RUN, STAIR_Y0 = 0.4, 1.35, -48.0
for k in range(20):
    top = STEP_RISE * (k + 1)
    y = STAIR_Y0 + STEP_RUN * (k + 0.5)
    box((8.0, STEP_RUN, top), (0, y, top / 2), "cream" if k % 2 else "stone")
    for sx in (-1, 1):  # low walls either side
        box((0.9, STEP_RUN, top + 0.7), (sx * 4.45, y, (top + 0.7) / 2), "cream")
        box((1.1, STEP_RUN, 0.12), (sx * 4.45, y, top + 0.76), "gold")

small = stupa(True, 16, 8)
ring_r, terrace_top = 37.6, 3.3
first = True
for k in range(24):
    ang = k * math.tau / 24
    s = 0.26 if k % 3 == 0 else 0.17
    loc = (ring_r * math.cos(ang), ring_r * math.sin(ang), terrace_top + 5.0 * s)
    if abs(loc[0]) < 8 and loc[1] < 0:  # keep the way in to the stupa clear
        continue
    if first:
        small.location, small.scale = loc, (s, s, s)
        first = False
    else:
        instance(small, loc, ang, s)

sh = shrine()
first = True
for k in range(32):  # gold shrines round the lowest terrace, doors facing out
    ang = k * math.tau / 32
    loc = (41.5 * math.cos(ang), 41.5 * math.sin(ang), 1.65)
    if abs(loc[0]) < 8 and loc[1] < 0:  # keep the way in to the stupa clear
        continue
    if first:
        sh.location, sh.rotation_euler = loc, (0, 0, ang - math.pi / 2)
        first = False
    else:
        instance(sh, loc, ang - math.pi / 2)

tw = tower(7, 6.2)
tw.location = (-70, -70, 0)
for pos in ((70, -70), (70, 70), (-70, 70)):
    instance(tw, (pos[0], pos[1], 0), 0)
for i in (-3, -2, -1, 1, 2, 3):  # shrine rows along the plaza edge, facing the stupa
    for sgn in (-1, 1):
        instance(sh, (i * 24.0, sgn * 92.0, 0.0), 0.0 if sgn > 0 else math.pi)
        instance(sh, (sgn * 92.0, i * 24.0, 0.0), math.pi / 2 if sgn > 0 else -math.pi / 2)

# The complex's own wall and chánh điện (owner, 2026-11-13). The hall stands outside the wall
# on the temple-facing side, to one side of the gate, its front toward the temple.
perimeter_wall(PL + 5.0, 9.0)
hall = main_hall(28.0, 16.0)
hall.location = (-165.0, -62.0, 0)

# --------------------------------------------------- bake into one mesh, export
for o in [o for o in COL.objects if o.type == "MESH"]:
    if o.data.users > 1:
        o.data = o.data.copy()
everything = [o for o in COL.objects if o.type == "MESH"]
bpy.ops.object.select_all(action="DESELECT")
for o in everything:
    o.select_set(True)
bpy.context.view_layer.objects.active = everything[0]
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
merged = join(everything, "pagoda")
bpy.ops.object.select_all(action="DESELECT")
merged.select_set(True)
# meshopt-compressed: the scene already sets a MeshoptDecoder on its GLTFLoader
bpy.ops.export_scene.gltf(
    filepath=out_glb, export_format="GLB", use_selection=True, export_meshopt_compression_enable=True
)
print("PAGODA_OK triangles:", sum(len(p.vertices) - 2 for p in merged.data.polygons), "materials:", len(merged.data.materials))
