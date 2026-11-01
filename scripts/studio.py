"""
Photoreal studio renders of every TINVO design (Blender + Cycles).

    blender -b -P scripts/studio.py -- [--only slug,slug] [--shots hero,detail,spin,lineup] [--test]

Builds a measured 20 oz skinny tumbler (rounded base, steel lip, clear
press-on lid, brushed straw), wraps each print-ready design from
resized/With Logo/ around it and shoots it on a dark sweep:

  public/products/<slug>-hero.webp     front, logo to camera       (1600x2000)
  public/products/<slug>-detail.webp   lid and straw, from above   (1600x2000)
  public/products/spin/<slug>-NN.webp  24-frame turntable          (800x1000)
  public/products/lineup.webp          all designs together        (2520x1080)

Re-run after changing a design file. Renders are slow on CPU; --test makes
quick low-sample previews in the scratch folder instead.
"""

import math
import os
import sys
import time
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "resized" / "With Logo"
OUT = ROOT / "public" / "products"

# slug -> (wrap file, logo centre u on the wrap, backdrop glow colour)
DESIGNS = {
    "aurora-gilt": ("Golden Foil.png", 0.776, "#c9a24a"),
    "chroma-tide": ("blue foil.png", 0.773, "#8fb4d0"),
    "opal-drift": ("Pink Foil.png", 0.684, "#d29ae0"),
    "midnight-slate": ("Navy Blue.png", 0.688, "#6f86c4"),
    "cloud-theory": ("Sky Blue.png", 0.684, "#9cb8d4"),
    "pink-serenity": ("Baby Pink.png", 0.688, "#da9191"),
    "solara": ("Cream.png", 0.684, "#e8cf8a"),
    "mauve-mode": ("Purple.png", 0.688, "#b07a96"),
    "cocoa-noir": ("Voilet.png", 0.688, "#b08470"),
    "olive-dusk": ("Brown.png", 0.684, "#a59a72"),
}

# --- barrel geometry, metres ---------------------------------------------
R = 0.0375  # outer radius (75 mm barrel)
PRINT_Z0 = 0.006  # print starts above the rounded base
# the wrap is exactly one turn, so print height follows its aspect
PRINT_H = 2 * math.pi * R * 4000 / 4650
LIP_Z = PRINT_Z0 + PRINT_H + 0.003
SEG = 256


def hex_rgb(h):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    # sRGB -> linear
    return [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c] + [1]


def arc(cx, cz, rad, a0, a1, n):
    return [(cx + rad * math.cos(a0 + (a1 - a0) * i / n), cz + rad * math.sin(a0 + (a1 - a0) * i / n))
            for i in range(n + 1)]


def lathe(name, profile, mats, uv_v=None, segs=SEG):
    """Revolve a (r, z, material index) profile around Z with per-loop UVs."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new("UV")
    rings = []
    for r, z, _ in profile:
        if r < 1e-6:
            rings.append([bm.verts.new((0, 0, z))] * segs)
        else:
            rings.append([bm.verts.new((r * math.cos(2 * math.pi * j / segs - math.pi / 2),
                                        r * math.sin(2 * math.pi * j / segs - math.pi / 2), z))
                          for j in range(segs)])
    for i in range(len(profile) - 1):
        a, b = rings[i], rings[i + 1]
        for j in range(segs):
            k = (j + 1) % segs
            quad = [a[j], a[k], b[k], b[j]]
            uniq = list(dict.fromkeys(quad))
            if len(uniq) < 3:
                continue
            try:
                f = bm.faces.new(uniq)
            except ValueError:
                continue
            f.material_index = profile[i][2]
            f.smooth = True
            for loop in f.loops:
                vj = a.index(loop.vert) if loop.vert in a else b.index(loop.vert)
                # the column closing the ring takes u = 1, not 0
                u = 1.0 if (vj == 0 and j == segs - 1) else vj / segs
                z = loop.vert.co.z
                v = uv_v(z) if uv_v else 0
                loop[uv].uv = (u, v)
    bm.normal_update()
    bm.to_mesh(me)
    bm.free()
    obj = bpy.data.objects.new(name, me)
    for m in mats:
        me.materials.append(m)
    bpy.context.collection.objects.link(obj)
    return obj


def node_mat(name):
    m = bpy.data.materials.new(name)
    try:
        m.use_nodes = True
    except Exception:
        pass
    return m, m.node_tree.nodes, m.node_tree.links


def principled(nodes):
    return next(n for n in nodes if n.type == "BSDF_PRINCIPLED")


def set_in(node, name, value):
    if name in node.inputs:
        node.inputs[name].default_value = value


def materials():
    # printed, coated barrel: satin sublimation coat
    pm, nodes, links = node_mat("Print")
    bsdf = principled(nodes)
    tex = nodes.new("ShaderNodeTexImage")
    tex.extension = "REPEAT"
    tex.interpolation = "Cubic"
    links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    set_in(bsdf, "Roughness", 0.32)
    set_in(bsdf, "Coat Weight", 1.0)
    set_in(bsdf, "Coat Roughness", 0.07)
    set_in(bsdf, "Coat IOR", 1.5)
    set_in(bsdf, "Specular IOR Level", 0.5)

    sm, nodes, links = node_mat("Steel")
    bsdf = principled(nodes)
    set_in(bsdf, "Base Color", (0.82, 0.82, 0.84, 1))
    set_in(bsdf, "Metallic", 1.0)
    set_in(bsdf, "Roughness", 0.16)
    set_in(bsdf, "Anisotropic", 0.7)

    im, nodes, links = node_mat("SteelInside")
    bsdf = principled(nodes)
    set_in(bsdf, "Base Color", (0.55, 0.55, 0.57, 1))
    set_in(bsdf, "Metallic", 1.0)
    set_in(bsdf, "Roughness", 0.3)

    lm, nodes, links = node_mat("Lid")
    bsdf = principled(nodes)
    set_in(bsdf, "Base Color", (0.93, 0.95, 0.97, 1))
    set_in(bsdf, "Roughness", 0.04)
    set_in(bsdf, "IOR", 1.49)
    set_in(bsdf, "Transmission Weight", 1.0)

    gm, nodes, links = node_mat("Grommet")
    bsdf = principled(nodes)
    set_in(bsdf, "Base Color", (0.02, 0.02, 0.022, 1))
    set_in(bsdf, "Roughness", 0.55)
    return pm, sm, im, lm, gm, tex


def build_tumbler(pm, sm, im, lm, gm):
    # outer skin: rounded base -> printed wall -> steel lip -> inner wall
    prof = [(0.0, 0.0012, 0), (R - 0.009, 0.0, 0)]
    prof += [(r, z, 0) for r, z in arc(R - 0.0045, 0.0045, 0.0045, -math.pi / 2, 0, 8)][1:]
    prof += [(R, PRINT_Z0, 0), (R, PRINT_Z0 + PRINT_H, 1), (R, LIP_Z - 0.0012, 1)]
    prof += [(r, z, 1) for r, z in arc(R - 0.0012, LIP_Z - 0.0012, 0.0012, 0, math.pi / 2, 4)][1:]
    prof += [(R - 0.0025, LIP_Z, 2), (R - 0.0028, LIP_Z - 0.004, 2), (R - 0.0028, 0.012, 2), (0.0, 0.012, 2)]
    body = lathe("Barrel", prof, [pm, sm, im],
                 uv_v=lambda z: min(max((z - PRINT_Z0) / PRINT_H, 0.0005), 0.9995))

    # clear lid: an outer skirt over the lip and a flat top, solid for refraction
    lz = LIP_Z
    lid_prof = [(0.0, lz + 0.0085, 0), (0.024, lz + 0.0085, 0), (0.026, lz + 0.0072, 0),
                (R - 0.0015, lz + 0.0072, 0)]
    lid_prof += [(r, z, 0) for r, z in arc(R - 0.0015, lz + 0.0057, 0.0027, math.pi / 2, 0, 5)][1:]
    lid_prof += [(R + 0.0012, lz - 0.0095, 0), (R + 0.0002, lz - 0.0095, 0),
                 (R + 0.0002, lz + 0.0005, 0), (0.0261, lz + 0.006, 0), (0.0241, lz + 0.0073, 0),
                 (0.0, lz + 0.0073, 0)]
    # walked bottom-up like the barrel so the faces point outward
    lid = lathe("Lid", lid_prof[::-1], [lm])

    # brushed straw, tilted, through a silicone grommet
    tilt = math.radians(7)
    base = Vector((0.012, 0.004, 0.02))
    length = 0.27
    bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=0.0031, depth=length)
    straw = bpy.context.active_object
    straw.name = "Straw"
    straw.rotation_euler = (0, tilt, 0)
    straw.location = base + Vector((math.sin(tilt), 0, math.cos(tilt))) * length / 2
    straw.data.materials.append(sm)
    for p in straw.data.polygons:
        p.use_smooth = True
    at_lid = (lz + 0.0085 - base.z) / math.cos(tilt)
    gx = base.x + math.sin(tilt) * at_lid
    bpy.ops.mesh.primitive_torus_add(major_radius=0.0042, minor_radius=0.0013,
                                     major_segments=48, minor_segments=12,
                                     location=(gx, base.y, lz + 0.0088))
    grom = bpy.context.active_object
    grom.data.materials.append(gm)
    for p in grom.data.polygons:
        p.use_smooth = True

    rig = bpy.data.objects.new("Tumbler", None)
    bpy.context.collection.objects.link(rig)
    for o in (body, lid, straw, grom):
        o.parent = rig
    return rig


def build_set():
    # dark seamless sweep
    me = bpy.data.meshes.new("Sweep")
    bm = bmesh.new()
    pts = [(-3.0, 0.0)] + [(0.9 + 0.5 * math.sin(a), 0.5 - 0.5 * math.cos(a))
                           for a in [i * math.pi / 2 / 16 for i in range(17)]] + [(1.4, 3.0)]
    prev = None
    for y, z in pts:
        row = (bm.verts.new((-4, y, z)), bm.verts.new((4, y, z)))
        if prev:
            bm.faces.new((prev[0], prev[1], row[1], row[0])).smooth = True
        prev = row
    bm.to_mesh(me)
    bm.free()
    sweep = bpy.data.objects.new("Sweep", me)
    bpy.context.collection.objects.link(sweep)
    m, nodes, _ = node_mat("Backdrop")
    bsdf = principled(nodes)
    set_in(bsdf, "Base Color", (0.018, 0.018, 0.02, 1))
    set_in(bsdf, "Roughness", 0.38)
    set_in(bsdf, "Specular IOR Level", 0.35)
    me.materials.append(m)

    def area(name, size, loc, target, power, shape="RECTANGLE", color=(1, 1, 1)):
        light = bpy.data.lights.new(name, "AREA")
        light.shape = shape
        light.size, light.size_y = size
        light.energy = power
        light.color = color
        obj = bpy.data.objects.new(name, light)
        obj.location = loc
        bpy.context.collection.objects.link(obj)
        d = Vector(target) - Vector(loc)
        obj.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
        return obj

    # tall strip key: the long vertical highlight that sells a glossy cylinder
    area("Key", (0.18, 0.9), (-0.55, -0.42, 0.22), (0, 0, 0.12), 60)
    area("Fill", (1.2, 1.2), (0.9, -0.9, 0.35), (0, 0, 0.12), 14, color=(0.95, 0.97, 1.0))
    # edge rims so dark barrels separate from a dark set
    area("RimL", (0.08, 0.8), (-0.32, 0.38, 0.2), (0, 0, 0.12), 32)
    area("RimR", (0.08, 0.8), (0.32, 0.38, 0.2), (0, 0, 0.12), 32)
    area("Top", (0.5, 0.5), (0.05, -0.1, 0.75), (0, 0, 0.2), 10)
    # coloured glow on the backdrop, tinted per design
    glow = area("Glow", (0.9, 0.9), (0.0, 0.25, 0.08), (0, 1.2, 0.55), 55, shape="DISK")
    return glow


def world():
    w = bpy.data.worlds.new("World")
    bpy.context.scene.world = w
    try:
        w.use_nodes = True
    except Exception:
        pass
    nodes, links = w.node_tree.nodes, w.node_tree.links
    bg = next(n for n in nodes if n.type == "BACKGROUND")
    hdri = None
    studio = Path(bpy.utils.system_resource("DATAFILES", path="studiolights/world"))
    for name in ("studio.exr", "interior.exr", "city.exr"):
        if (studio / name).exists():
            hdri = studio / name
            break
    if hdri:
        env = nodes.new("ShaderNodeTexEnvironment")
        env.image = bpy.data.images.load(str(hdri))
        links.new(env.outputs["Color"], bg.inputs["Color"])
    bg.inputs["Strength"].default_value = 0.35
    # reflections only: the camera sees black, the set provides the backdrop
    lp = nodes.new("ShaderNodeLightPath")
    black = nodes.new("ShaderNodeBackground")
    black.inputs["Color"].default_value = (0, 0, 0, 1)
    mix = nodes.new("ShaderNodeMixShader")
    out = next(n for n in nodes if n.type == "OUTPUT_WORLD")
    links.new(lp.outputs["Is Camera Ray"], mix.inputs[0])
    links.new(bg.outputs[0], mix.inputs[1])
    links.new(black.outputs[0], mix.inputs[2])
    links.new(mix.outputs[0], out.inputs["Surface"])


def camera(loc, target, lens, fstop=None, focus=None):
    cam_data = bpy.data.cameras.new("Cam")
    cam_data.lens = lens
    cam_data.sensor_fit = "VERTICAL"
    cam_data.sensor_height = 24
    if fstop:
        cam_data.dof.use_dof = True
        cam_data.dof.aperture_fstop = fstop
        cam_data.dof.focus_distance = focus
    cam = bpy.data.objects.new("Cam", cam_data)
    bpy.context.collection.objects.link(cam)
    cam.location = loc
    cam.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    return cam


def setup_render(samples):
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = samples
    sc.cycles.use_adaptive_sampling = True
    sc.cycles.adaptive_threshold = 0.02
    sc.cycles.use_denoising = True
    try:
        sc.cycles.denoiser = "OPENIMAGEDENOISE"
    except Exception:
        pass
    sc.cycles.max_bounces = 8
    sc.cycles.transmission_bounces = 8
    sc.cycles.glossy_bounces = 4
    sc.cycles.diffuse_bounces = 2
    sc.cycles.caustics_reflective = False
    sc.cycles.caustics_refractive = False
    sc.cycles.blur_glossy = 0.5
    sc.render.use_persistent_data = True
    for vt in ("Khronos PBR Neutral", "AgX", "Standard"):
        try:
            sc.view_settings.view_transform = vt
            break
        except TypeError:
            continue
    sc.view_settings.exposure = 0.0
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGB"
    sc.render.film_transparent = False


def shoot(path, w, h, samples):
    sc = bpy.context.scene
    sc.render.resolution_x, sc.render.resolution_y = w, h
    sc.render.resolution_percentage = 100
    sc.cycles.samples = samples
    png = str(path) + ".png"
    sc.render.filepath = png
    t = time.time()
    bpy.ops.render.render(write_still=True)
    to_webp(png, str(path))
    print(f"  {Path(path).name}  {time.time() - t:.0f}s", flush=True)


def to_webp(png, out):
    # Blender's own WebP writer is used when present; otherwise keep the PNG for
    # the post step in scripts/finish_renders.py
    try:
        img = bpy.data.images.load(png)
        sc = bpy.context.scene
        fmt = sc.render.image_settings
        fmt.file_format = "WEBP"
        fmt.quality = 90
        img.save_render(out)
        fmt.file_format = "PNG"
        bpy.data.images.remove(img)
        os.remove(png)
    except Exception as e:
        print("  webp failed, kept png:", e)


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    only = shots = None
    test = "--test" in argv
    if "--only" in argv:
        only = argv[argv.index("--only") + 1].split(",")
    if "--shots" in argv:
        shots = argv[argv.index("--shots") + 1].split(",")
    shots = shots or ["hero", "detail", "spin", "lineup"]
    out = Path(os.environ.get("TINVO_TEST_OUT", OUT)) if test else OUT
    (out / "spin").mkdir(parents=True, exist_ok=True)
    scale = 0.5 if test else 1.0
    q = (lambda n: max(16, n // 4)) if test else (lambda n: n)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    setup_render(128)
    world()
    glow = build_set()
    pm, sm, im, lm, gm, tex = materials()
    rig = build_tumbler(pm, sm, im, lm, gm)

    hero_cam = camera((0, -1.05, 0.2), (0, 0, 0.128), 85)
    detail_cam = camera((-0.17, -0.33, 0.42), (0.004, 0, 0.19), 100, fstop=4.0, focus=0.4)
    sc = bpy.context.scene

    slugs = [s for s in DESIGNS if not only or s in only]
    for slug in slugs:
        wrap, u0, tone = DESIGNS[slug]
        img = bpy.data.images.load(str(SRC / wrap), check_existing=True)
        tex.image = img
        glow.data.color = hex_rgb(tone)[:3]
        front = -2 * math.pi * u0  # turn the logo to face the camera
        print(slug, flush=True)

        if "hero" in shots:
            rig.rotation_euler = (0, 0, front)
            sc.camera = hero_cam
            shoot(out / f"{slug}-hero.webp", int(1600 * scale), int(2000 * scale), q(160))
        if "detail" in shots:
            rig.rotation_euler = (0, 0, front + math.radians(35))
            sc.camera = detail_cam
            shoot(out / f"{slug}-detail.webp", int(1600 * scale), int(2000 * scale), q(160))
        if "spin" in shots:
            sc.camera = hero_cam
            frames = 6 if test else 24
            for i in range(frames):
                rig.rotation_euler = (0, 0, front + 2 * math.pi * i / frames)
                shoot(out / "spin" / f"{slug}-{i:02d}.webp", int(800 * scale), int(1000 * scale), q(48))

    if "lineup" in shots and not only:
        lineup(rig, tex, glow, out, scale, q)


def lineup(rig, tex, glow, out, scale, q):
    """All designs in a shallow arc, one barrel per design."""
    sc = bpy.context.scene
    rig.hide_render = True
    n = len(DESIGNS)
    for i, (slug, (wrap, u0, _)) in enumerate(DESIGNS.items()):
        copy = rig.copy()
        bpy.context.collection.objects.link(copy)
        copy.hide_render = False
        for child in rig.children:
            c = child.copy()
            if child.name.startswith("Barrel"):
                c.data = child.data.copy()
                m = child.active_material.copy()
                c.data.materials[0] = m
                t = next(nd for nd in m.node_tree.nodes if nd.type == "TEX_IMAGE")
                t.image = bpy.data.images.load(str(SRC / wrap), check_existing=True)
            c.parent = copy
            bpy.context.collection.objects.link(c)
        x = (i - (n - 1) / 2) * 0.105
        copy.location = (x, 0.06 * (x / 0.5) ** 2 * 6, 0)
        copy.rotation_euler = (0, 0, -2 * math.pi * u0 + math.atan2(x, 1.4))
    glow.data.color = (0.55, 0.5, 0.7)
    glow.data.energy = 120
    glow.data.size = 2.2
    cam = camera((0, -1.75, 0.26), (0, 0.05, 0.12), 50)
    sc.camera = cam
    shoot(out / "lineup.webp", int(2520 * scale), int(1080 * scale), q(160))


main()
