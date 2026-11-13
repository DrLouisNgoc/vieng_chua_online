# Builds app/public/models/terrain.glb: a mountain range all the way round the world
# and a winding river between it and the walkable ground (owner, 2026-11-13: "xây núi
# xây sông hùng vĩ", "xây hết núi bao quanh").
#
#   blender -b -P scripts/blender/terrain.py -- <out.glb> [<preview prefix>]
#
# Written for Blender 5.x. Built in the app's world coordinates (x to the right, y up,
# z toward the gate; Blender's y is -z). The walkable land is the rectangle WALK_AREA
# (app/src/terrain-layout.ts); the terrain starts at its edge and runs out to the horizon, so
# no bare ground is left: green foothills, a river ring carved into them, then high
# snow-capped ranges. Nothing is built inside WALK_AREA (app/src/terrain-model.test.ts checks
# the shipped file); the app blocks the walk at the edge. Mountains and water are two meshes
# with vertex colours.
import math
import random
import sys

import bpy
from mathutils import Vector, noise

args = sys.argv[sys.argv.index("--") + 1 :]
out_glb = args[0]
preview = args[1] if len(args) > 1 else None
bpy.ops.wm.read_factory_settings(use_empty=True)

# WALK_AREA from terrain-layout.ts: centre and half-sizes of the walkable rectangle
CX, CZ, HX, HZ = 70.0, 20.0, 230.0, 180.0
HAZE = (0.62, 0.72, 0.86)


def ring_radius(theta, d):
    """Distance from the centre, along the angle theta, to the walkable rectangle grown by d on every side."""
    c, s = abs(math.cos(theta)), abs(math.sin(theta))
    return min((HX + d) / c if c > 1e-9 else 1e9, (HZ + d) / s if s > 1e-9 else 1e9)


def ring_point(theta, d):
    r = ring_radius(theta, d)
    return CX + r * math.cos(theta), CZ + r * math.sin(theta)


def river_course(theta):
    """Distance of the river's middle from the walkable edge, and its half width."""
    return 72 + 10 * math.sin(3 * theta + 1) + 6 * math.sin(7 * theta + 2), 10 + 3 * math.sin(5 * theta)


def smooth(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def mix(c0, c1, t):
    return tuple(a + (b - a) * t for a, b in zip(c0, c1))


def B(x, y, z):
    """App world (x, y up, z) to Blender (x, -z, y)."""
    return (x, -z, y)


def mountain_height(x, z, d, theta):
    """d is the distance outside the walkable rectangle; the river is carved into the foothills."""
    ridge = (1 - abs(noise.noise(Vector((x / 230.0, z / 230.0, 0.0))))) ** 3  # sharp crests
    crest = (1 - abs(noise.noise(Vector((x / 95.0, z / 95.0, 4.2))))) ** 3  # a second, finer set of ridges
    mass = 0.5 + 0.5 * noise.noise(Vector((x / 520.0, z / 520.0, 7.1)))
    crag = noise.noise(Vector((x / 42.0, z / 42.0, 3.3))) * 13 + noise.noise(Vector((x / 15.0, z / 15.0, 1.7))) * 4
    rolling = noise.noise(Vector((x / 90.0, z / 90.0, 9.9))) * 7
    envelope = smooth(30.0, 340.0, d) ** 1.25 * (1 - 0.2 * smooth(500.0, 580.0, d))
    peak = 55 + 215 * ridge * (0.5 + 1.0 * mass) + 55 * crest * ridge
    h = envelope * (peak + crag) + rolling * smooth(5, 40, d)
    centre, half = river_course(theta)
    carve = 1 - smooth(half, half + 7.0, abs(d - centre))  # 1 in the channel, 0 beyond its banks
    return h * (1 - carve) + (-3.5) * carve


def mountain_colour(h, d, flatness, x, z):
    """Forest and grass low down, bare rock on steep ground, snow high up where it can lie; flatness is the normal's up part."""
    grass, forest, snow = (0.26, 0.4, 0.15), (0.12, 0.25, 0.11), (0.95, 0.97, 1.0)
    strata = 0.5 + 0.5 * noise.noise(Vector((x / 26.0, z / 26.0, h / 9.0)))
    rock = mix((0.36, 0.32, 0.29), (0.55, 0.49, 0.43), strata)
    patch = 0.5 + 0.5 * noise.noise(Vector((x / 70.0, z / 70.0, 8.8)))
    low = mix(grass, forest, smooth(0.25, 0.75, patch) * smooth(4, 40, h))
    steep = 1 - smooth(0.62, 0.9, flatness)  # 1 on cliffs
    c = mix(low, rock, max(steep, smooth(95, 150, h)))
    c = mix(c, snow, smooth(170, 215, h) * smooth(0.4, 0.7, flatness) + 0.5 * smooth(235, 290, h))
    return mix(c, HAZE, 0.26 * smooth(0, 580, d) ** 1.5)  # far peaks fade a little toward the sky


def build_mesh(name, verts, colours, faces, material):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    if colours is None:  # coloured from the shape: steepness decides rock and snow
        colours = [
            mountain_colour(v.co.z, DS_OF[i], max(0.0, mesh.vertices[i].normal.z), v.co.x, -v.co.y)
            for i, v in enumerate(mesh.vertices)
        ]
    layer = mesh.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
    for i, c in enumerate(colours):
        layer.data[i].color = (*c, 1.0)
    for p in mesh.polygons:
        p.use_smooth = name != "forest"
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bsdf = nodes["Principled BSDF"]
    attr = nodes.new("ShaderNodeVertexColor")
    attr.layer_name = "Col"
    links.new(attr.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 0.25 if name == "river" else 0.95
    bsdf.inputs["Metallic"].default_value = 0.0
    if name == "river":
        bsdf.inputs["Emission Color"].default_value = (0.03, 0.12, 0.2, 1)
        bsdf.inputs["Emission Strength"].default_value = 0.6
    mesh.materials.append(mat)
    return obj


# ------------------------------------------------------------------ the mountains
NA = 720
DS = [3.0 * k for k in range(51)] + [150 * (580 / 150) ** (k / 34) for k in range(1, 35)]  # 0 .. 580, fine near the walk
verts, colours, faces, DS_OF = [], [], [], []
for d in DS:
    for j in range(NA):
        theta = math.tau * j / NA
        x, z = ring_point(theta, d)
        h = mountain_height(x, z, d, theta)
        verts.append(B(x, h, z))
        DS_OF.append(d)
for i in range(len(DS) - 1):
    for j in range(NA):
        a, b = i * NA + j, i * NA + (j + 1) % NA
        faces.append((a, b, b + NA, a + NA))
mountains = build_mesh("mountains", verts, None, faces, None)

# ------------------------------------------------------------------ the river: water in the channel
NS, NC = 600, 7
verts, colours, faces = [], [], []
for j in range(NS):
    theta = math.tau * j / NS
    centre, half = river_course(theta)
    for k in range(NC):
        u = -1 + 2 * k / (NC - 1)
        x, z = ring_point(theta, centre + u * (half + 1.5))
        ripple = 0.5 + 0.5 * noise.noise(Vector((x / 14.0, z / 14.0, 5.5)))
        colour = mix((0.07, 0.27, 0.42), (0.16, 0.45, 0.6), ripple * (1 - abs(u) * 0.6))
        verts.append(B(x, -0.6, z))
        colours.append(mix(colour, HAZE, 0.12))
for j in range(NS):
    for k in range(NC - 1):
        a, b = j * NC + k, ((j + 1) % NS) * NC + k
        faces.append((a, b, b + 1, a + 1))
river = build_mesh("river", verts, colours, faces, None)

# ------------------------------------------------------------------ the forest: pines on the foothills
rng = random.Random(7)


def pine(parts, x, z, h, scale, shade):
    """Two stacked cones, as raw triangles with vertex colours (no objects: thousands of them)."""
    for k, (r, top, y0) in enumerate(((2.6, 8.0, 0.0), (1.8, 7.0, 4.4))):
        base = [(x + r * scale * math.cos(a), z + r * scale * math.sin(a)) for a in [math.tau * m / 4 for m in range(4)]]
        apex = (x, z)
        y_base, y_top = h + y0 * scale, h + (y0 + top) * scale
        col = mix((0.09, 0.2, 0.09), (0.18, 0.34, 0.14), shade * (0.6 + 0.4 * k))
        start = len(parts["verts"])
        parts["verts"] += [B(bx, y_base, bz) for bx, bz in base] + [B(apex[0], y_top, apex[1])]
        parts["colours"] += [col] * 5
        for m in range(4):
            parts["faces"].append((start + m, start + (m + 1) % 4, start + 4))


forest = {"verts": [], "colours": [], "faces": []}
tries, placed = 0, 0
while placed < 6500 and tries < 120000:
    tries += 1
    theta = rng.uniform(0, math.tau)
    d = rng.uniform(14, 330)
    x, z = ring_point(theta, d)
    centre, half = river_course(theta)
    if abs(d - centre) < half + 9:
        continue
    h = mountain_height(x, z, d, theta)
    if not 5 < h < 125:
        continue
    slope = max(abs(mountain_height(x + 6, z, d, theta) - h), abs(mountain_height(x, z + 6, d, theta) - h)) / 6
    if slope > 0.75:
        continue
    pine(forest, x, z, h - 0.3, rng.uniform(0.8, 1.7), rng.random())
    placed += 1
trees = build_mesh("forest", forest["verts"], forest["colours"], forest["faces"], None)
trees.data.shade_flat() if hasattr(trees.data, "shade_flat") else None

bpy.ops.object.select_all(action="DESELECT")
for o in (mountains, river, trees):
    o.select_set(True)
bpy.context.view_layer.objects.active = mountains
bpy.ops.export_scene.gltf(
    filepath=out_glb, export_format="GLB", use_selection=True, export_meshopt_compression_enable=True
)
tris = sum(len(p.vertices) - 2 for o in (mountains, river, trees) for p in o.data.polygons)
print("TERRAIN_OK triangles:", tris)

if preview:  # a panorama from the walkable edge, and a view from the temple's gate
    scene = bpy.context.scene
    bpy.ops.mesh.primitive_plane_add(size=1, location=B(CX, 0, CZ))
    bpy.context.object.scale = (2 * HX, 2 * HZ, 1)
    ground = bpy.data.materials.new("ground")
    ground.use_nodes = True
    ground.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.36, 0.3, 0.16, 1)
    bpy.context.object.data.materials.append(ground)
    bpy.ops.object.light_add(type="SUN", location=(0, 0, 50))
    sun = bpy.context.object
    sun.data.energy = 3.5
    sun.data.color = (1.0, 0.9, 0.78)
    sun.rotation_euler = (math.radians(50), 0, math.radians(30))
    world = bpy.data.worlds.new("sky")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.55, 0.7, 0.9, 1)
    scene.world = world
    scene.render.engine = "BLENDER_EEVEE"
    scene.view_settings.view_transform = "Standard"
    scene.render.resolution_x, scene.render.resolution_y = 1600, 800

    def shot(location, target, name, lens=22):
        cam_data = bpy.data.cameras.new("c" + name)
        cam_data.lens = lens
        cam_data.clip_end = 1500
        cam = bpy.data.objects.new("c" + name, cam_data)
        scene.collection.objects.link(cam)
        cam.location = B(*location)
        cam.rotation_euler = (Vector(B(*target)) - cam.location).to_track_quat("-Z", "Y").to_euler()
        scene.camera = cam
        scene.render.filepath = f"{preview}_{name}.png"
        bpy.ops.render.render(write_still=True)

    shot((70, 4, 20), (70, 70, -500), "north")
    shot((70, 4, 20), (700, 70, 20), "east")
    shot((250, 70, 150), (330, 0, 330), "river", 30)
