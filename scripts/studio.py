"""
Photoreal studio renders of every TINVO design (Blender + Cycles).

    blender -b -P scripts/studio.py -- [--only slug,slug] [--shots hero,detail,spin,lineup] [--test]

Builds a measured 20 oz skinny tumbler (rounded base, steel lip, clear
press-on lid, brushed straw), wraps each print-ready design from
resized/With Logo/ around it and shoots it on a dark sweep:

  public/products/<slug>-hero.webp     front, logo to camera       (1080x1350)
  public/products/<slug>-detail.webp   lid and straw, from above   (1080x1350)
  public/products/spin/<slug>-NN.webp  24-frame turntable          (560x700)
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
SRC = ROOT / "resized"
OUT = ROOT / "public" / "products"

# slug -> (wrap file, logo centre u on the wrap, backdrop glow colour). These
# are the files Qikink prints from; the 3 foils don't tile, so their seam shows.
DESIGNS = {
    "aurora-gilt": ("With Logo/Golden Foil.png", 0.776, "#c9a24a"),
    "chroma-tide": ("With Logo/blue foil.png", 0.773, "#8fb4d0"),
    "opal-drift": ("With Logo/Pink Foil.png", 0.684, "#d29ae0"),
    "midnight-slate": ("With Logo/Navy Blue.png", 0.688, "#6f86c4"),
    "cloud-theory": ("With Logo/Sky Blue.png", 0.684, "#9cb8d4"),
    "pink-serenity": ("With Logo/Baby Pink.png", 0.688, "#da9191"),
    "solara": ("With Logo/Cream.png", 0.684, "#e8cf8a"),
    "mauve-mode": ("With Logo/Purple.png", 0.688, "#b07a96"),
    "cocoa-noir": ("With Logo/Voilet.png", 0.688, "#b08470"),
    "olive-dusk": ("With Logo/Brown.png", 0.684, "#a59a72"),
}

# --- barrel geometry, metres ---------------------------------------------
# Measured on a real Qikink-printed tumbler (Nov 2026): the barrel is white-coated
# and their press can't print the ends, so a white band shows under the lid
# (~4.5 mm) and at the base (~6 mm, including the rounded edge).
R = 0.0375  # outer radius (75 mm barrel)
PRINT_Z0 = 0.006  # print starts above the rounded base: white below
# the wrap is exactly one turn, so print height follows its aspect
PRINT_H = 2 * math.pi * R * 4000 / 4650
TOP_BAND = 0.0045  # white between the print and the lid
LID_OVERLAP = 0.001  # the lid's rim sits just over the top of the barrel
LIP_Z = PRINT_Z0 + PRINT_H + TOP_BAND + LID_OVERLAP
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
                # inset: the wrap files carry a light 1-2 px border
                u = 0.001 + u * 0.998
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
    tex.extension = "EXTEND"
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
    set_in(bsdf, "Base Color", (0.45, 0.45, 0.47, 1))  # reads dark through the smoky lid
    set_in(bsdf, "Metallic", 1.0)
    set_in(bsdf, "Roughness", 0.45)

    # the real lid is thin, crystal-clear plastic with a faint blue cast
    lm, nodes, links = node_mat("Lid")
    bsdf = principled(nodes)
    set_in(bsdf, "Base Color", (0.85, 0.89, 0.96, 1))
    set_in(bsdf, "Roughness", 0.03)
    set_in(bsdf, "IOR", 1.49)
    set_in(bsdf, "Transmission Weight", 1.0)

    # the slider's milky-white frosted tab
    gm, nodes, links = node_mat("Frost")
    bsdf = principled(nodes)
    set_in(bsdf, "Base Color", (0.95, 0.95, 0.95, 1))
    set_in(bsdf, "Roughness", 0.4)
    set_in(bsdf, "IOR", 1.49)
    set_in(bsdf, "Transmission Weight", 0.6)

    # the unprinted white coating: same gloss as the print
    cm, nodes, links = node_mat("Coat")
    bsdf = principled(nodes)
    set_in(bsdf, "Base Color", (0.86, 0.86, 0.85, 1))
    set_in(bsdf, "Roughness", 0.32)
    set_in(bsdf, "Coat Weight", 1.0)
    set_in(bsdf, "Coat Roughness", 0.07)
    set_in(bsdf, "Coat IOR", 1.5)
    set_in(bsdf, "Specular IOR Level", 0.5)
    return pm, sm, im, lm, gm, cm, tex


def build_tumbler(pm, sm, im, lm, gm, cm):
    # outer skin: steel disc under the base -> white base and band -> printed
    # wall -> white band -> white lip -> steel inner wall.  Materials: 0 print,
    # 1 steel, 2 inside steel, 3 white coat
    prof = [(0.0, 0.0012, 1), (0.011, 0.0011, 3), (R - 0.009, 0.0, 3)]
    prof += [(r, z, 3) for r, z in arc(R - 0.0045, 0.0045, 0.0045, -math.pi / 2, 0, 8)][1:]
    prof += [(R, PRINT_Z0, 0), (R, PRINT_Z0 + PRINT_H, 3), (R, LIP_Z - 0.0012, 3)]
    prof += [(r, z, 3) for r, z in arc(R - 0.0012, LIP_Z - 0.0012, 0.0012, 0, math.pi / 2, 4)][1:]
    prof += [(R - 0.0025, LIP_Z, 2), (R - 0.0028, LIP_Z - 0.004, 2), (R - 0.0028, 0.012, 2), (0.0, 0.012, 2)]
    body = lathe("Barrel", prof, [pm, sm, im, cm],
                 uv_v=lambda z: min(max((z - PRINT_Z0) / PRINT_H, 0.003), 0.997))

    # clear slide lid, copied off close-ups of the real one: a thin crystal-clear
    # moulded shell. A wide, flat rim (a hair wider than the barrel, ~6.5 mm
    # tall) sits on the lip; inside it a steep wall drops into a deep well whose
    # floor is 2 mm below the barrel's top, and carries on down as the plug.
    lz = LIP_Z
    t = 0.0012  # wall
    ro = R + 0.0013  # outside of the rim
    rwt, rw = ro - 0.0058, R - 0.0055  # well wall (inner face) at the top and at the floor
    zt, zf, zb = lz + 0.0055, lz - 0.002, lz - 0.009  # rim top, well floor, plug bottom
    lid_prof = [(0.0, zf, 0), (rw, zf, 0), (rwt, zt - 0.0012, 0), (rwt + 0.0003, zt - 0.0005, 0),
                (rwt + 0.001, zt - 0.0001, 0), (ro - 0.003, zt, 0)]
    lid_prof += [(r, z, 0) for r, z in arc(ro - 0.0015, zt - 0.0015, 0.0015, math.pi / 2, 0, 6)][1:]
    lid_prof += [(ro, lz - LID_OVERLAP, 0), (ro - t, lz - LID_OVERLAP, 0), (ro - t, zt - t - 0.0003, 0),
                 (ro - 0.0025, zt - t, 0), (rwt + t + 0.0004, zt - t, 0), (rwt + t, zt - t - 0.0005, 0),
                 (rw + t, zb, 0), (rw, zb, 0), (rw, zf - t, 0), (0.0, zf - t, 0)]
    # walked bottom-up like the barrel so the faces point outward
    lid = lathe("Lid", lid_prof[::-1], [lm])

    def prism(name, pts, z0, z1, mat, hole=None):
        """An outline (counter-clockwise, x/y) extruded from z0 to z1, optionally with a
        hole (same number of points), edges softened."""
        me = bpy.data.meshes.new(name)
        bm = bmesh.new()
        lo = [bm.verts.new((x, y, z0)) for x, y in pts]
        hi = [bm.verts.new((x, y, z1)) for x, y in pts]
        n = len(pts)
        if hole:
            hlo = [bm.verts.new((x, y, z0)) for x, y in hole]
            hhi = [bm.verts.new((x, y, z1)) for x, y in hole]
        else:
            bm.faces.new(lo[::-1])
            bm.faces.new(hi)
        for i in range(n):
            j = (i + 1) % n
            bm.faces.new((lo[i], lo[j], hi[j], hi[i])).smooth = True
            if hole:
                bm.faces.new((hi[i], hi[j], hhi[j], hhi[i]))
                bm.faces.new((lo[i], hlo[i], hlo[j], lo[j]))
                bm.faces.new((hlo[j], hlo[i], hhi[i], hhi[j])).smooth = True
        bm.to_mesh(me)
        bm.free()
        o = bpy.data.objects.new(name, me)
        bpy.context.collection.objects.link(o)
        me.materials.append(mat)
        bev = o.modifiers.new("Bevel", "BEVEL")
        bev.width, bev.segments, bev.limit_method = min(0.0004, (z1 - z0) / 3), 3, "ANGLE"
        return o

    def rounded(x0, x1, y0, y1, rc, n=8):
        cs = [(x1 - rc, y0 + rc, -90), (x1 - rc, y1 - rc, 0), (x0 + rc, y1 - rc, 90), (x0 + rc, y0 + rc, 180)]
        return [(cx + rc * math.cos(math.radians(a + 90 * i / n)), cy + rc * math.sin(math.radians(a + 90 * i / n)))
                for cx, cy, a in cs for i in range(n + 1)]

    # the slide, laid along +x with the straw end at the rim: a raised clear
    # track almost across the well; in it a clear sliding plate carrying a tall
    # clear body (narrow by the button, full width by the tab), a clear domed
    # button with a white dot at the inner end and the big milky grip tab, with
    # the drinking opening (and the straw) at the rim end
    e = 0.00005  # keep touching clear parts from sharing a face
    pz = zf + 0.001  # top of the sliding plate
    bz = pz + 0.0028  # top of the slide's body
    a, w = math.radians(145), math.radians(38)  # the pull tab: a flat lip out of the rim
    lip = [a - w + 2 * w * i / 24 for i in range(25)]
    flange = [((ro + 0.006 * (1 - ((u - a) / w) ** 2)) * math.cos(u), (ro + 0.006 * (1 - ((u - a) / w) ** 2)) * math.sin(u))
              for u in lip]
    flange += [((ro - 0.002) * math.cos(u), (ro - 0.002) * math.sin(u)) for u in lip[::-1]]
    parts = [
        prism("Track", rounded(-0.0285, 0.0285, -0.0095, 0.0095, 0.0094, 12), zf + e, zf + 0.002, lm,
              hole=rounded(-0.0274, 0.0274, -0.0084, 0.0084, 0.0083, 12)),
        prism("Plate", rounded(-0.0268, 0.0155, -0.0081, 0.0081, 0.008, 12), zf + e, pz, lm),
        prism("Body", [(-0.021, -0.0045), (-0.012, -0.0045), (-0.008, -0.0075), (0.004, -0.0075),
                       (0.004, 0.0075), (-0.008, 0.0075), (-0.012, 0.0045), (-0.021, 0.0045)], pz + e, bz, lm),
        prism("Tab", rounded(0.004, 0.0155, -0.0068, 0.0068, 0.0035), pz + e, bz + 0.0012, gm),
        prism("Grip1", rounded(0.0081, 0.0088, -0.0038, 0.0038, 0.00034, 4), bz + 0.0012, bz + 0.0015, gm),
        prism("Grip2", rounded(0.0107, 0.0114, -0.0038, 0.0038, 0.00034, 4), bz + 0.0012, bz + 0.0015, gm),
        prism("Button", rounded(-0.0271, -0.0199, -0.0036, 0.0036, 0.0035, 6), pz + e, bz + 0.0006, lm),
        prism("Dot", rounded(-0.0255, -0.0215, -0.002, 0.002, 0.0019, 6), bz + 0.0006, bz + 0.0011, gm),
        prism("PullTab", flange, zt - 0.0016, zt - 0.0002, lm),
    ]
    straw_x = 0.0205  # where the straw comes up through the opening

    # the rubber seal round the plug shows through the clear rim as a dark circle
    seal, nodes, links = node_mat("Seal")
    bsdf = principled(nodes)
    set_in(bsdf, "Base Color", (0.012, 0.016, 0.03, 1))
    set_in(bsdf, "Roughness", 0.4)
    bpy.ops.mesh.primitive_torus_add(major_radius=R - 0.0036, minor_radius=0.0007,
                                     major_segments=128, minor_segments=12, location=(0, 0, lz - 0.004))
    ring = bpy.context.active_object
    ring.name = "Seal"
    ring.data.materials.append(seal)
    for p in ring.data.polygons:
        p.use_smooth = True
    parts.append(ring)

    # brushed straw, tilted outward, up through the opening at the slide's rim end
    tilt = math.radians(7)
    base = Vector((straw_x - math.tan(tilt) * (zf - 0.02), 0.0, 0.02))
    length = 0.27
    bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=0.0031, depth=length)
    straw = bpy.context.active_object
    straw.name = "Straw"
    straw.rotation_euler = (0, tilt, 0)
    straw.location = base + Vector((math.sin(tilt), 0, math.cos(tilt))) * length / 2
    straw.data.materials.append(sm)
    for p in straw.data.polygons:
        p.use_smooth = True

    lid_reflectors([lid, *parts])

    rig = bpy.data.objects.new("Tumbler", None)
    bpy.context.collection.objects.link(rig)
    for o in (body, lid, straw, *parts):
        o.parent = rig
    return rig


def lid_reflectors(receivers):
    """Soft white cards only the lid can see. In a black studio clear plastic
    reflects nothing but black and reads as dark glass; the real lid, in a room,
    shines. Light linking keeps the cards off the barrel, straw and set."""
    coll = bpy.data.collections.new("LidOnly")
    for o in receivers:
        coll.objects.link(o)
    for name, size, loc, power in [("CardBack", (0.9, 0.35), (0, 0.45, 0.34), 1.6),
                                   ("CardTop", (0.6, 0.6), (0, -0.05, 0.62), 0.4)]:
        mat, nodes, links = node_mat(name)
        bsdf = principled(nodes)
        set_in(bsdf, "Base Color", (0, 0, 0, 1))
        set_in(bsdf, "Emission Color", (1, 1, 1, 1))
        set_in(bsdf, "Emission Strength", power)
        bpy.ops.mesh.primitive_plane_add(size=1, location=loc)
        c = bpy.context.active_object
        c.name = name
        c.scale = (size[0], size[1], 1)
        c.rotation_euler = (Vector((0, 0, LIP_Z)) - Vector(loc)).to_track_quat("Z", "Y").to_euler()
        c.data.materials.append(mat)
        c.visible_camera = c.visible_diffuse = c.visible_shadow = False
        c.light_linking.receiver_collection = coll


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
        obj.visible_camera = False  # lit by the fixtures, never looking at them
        bpy.context.collection.objects.link(obj)
        d = Vector(target) - Vector(loc)
        obj.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
        return obj

    # tall strip key: the long vertical highlight that sells a glossy cylinder
    area("Key", (0.18, 0.9), (-0.55, -0.42, 0.22), (0, 0, 0.12), 11)
    area("Fill", (1.2, 1.2), (0.9, -0.9, 0.35), (0, 0, 0.12), 2.5, color=(0.95, 0.97, 1.0))
    # edge rims so dark barrels separate from a dark set
    area("RimL", (0.08, 0.8), (-0.32, 0.38, 0.2), (0, 0, 0.12), 7)
    area("RimR", (0.08, 0.8), (0.32, 0.38, 0.2), (0, 0, 0.12), 7)
    area("Top", (0.5, 0.5), (0.05, -0.1, 0.75), (0, 0, 0.2), 1.5)
    # coloured glow on the backdrop, tinted per design
    glow = area("Glow", (0.9, 0.9), (0.0, 0.25, 0.08), (0, 1.2, 0.55), 14, shape="DISK")
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
    bg.inputs["Strength"].default_value = 0.12
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
    sc.cycles.adaptive_threshold = 0.03
    sc.cycles.use_denoising = True
    try:
        sc.cycles.denoiser = "OPENIMAGEDENOISE"
    except Exception:
        pass
    sc.cycles.max_bounces = 12
    sc.cycles.transmission_bounces = 12  # thin clear lid: light crosses several walls
    sc.cycles.glossy_bounces = 3
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
    pm, sm, im, lm, gm, cm, tex = materials()
    rig = build_tumbler(pm, sm, im, lm, gm, cm)

    hero_cam = camera((0, -1.3, 0.22), (0, 0, 0.15), 85)
    detail_cam = camera((-0.16, -0.7, 0.42), (0.004, 0, 0.165), 85, fstop=8.0, focus=0.76)
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
            shoot(out / f"{slug}-hero.webp", int(1080 * scale), int(1350 * scale), q(48))
        if "detail" in shots:
            rig.rotation_euler = (0, 0, front + math.radians(35))
            sc.camera = detail_cam
            shoot(out / f"{slug}-detail.webp", int(1080 * scale), int(1350 * scale), q(48))
        if "spin" in shots:
            sc.camera = hero_cam
            frames = 6 if test else 24
            for i in range(frames):
                rig.rotation_euler = (0, 0, front + 2 * math.pi * i / frames)
                shoot(out / "spin" / f"{slug}-{i:02d}.webp", int(560 * scale), int(700 * scale), q(12))

    if "mask" in shots:
        masks(rig, slugs, hero_cam, out, scale)
    if "lineup" in shots and not only:
        lineup(rig, tex, glow, out, scale, q)


def masks(rig, slugs, cam, out, scale):
    """The tumbler's silhouette for each hero shot (white on transparent, same camera
    and angle), so the website can layer text between the backdrop and the tumbler."""
    sc = bpy.context.scene
    keep = {rig, *rig.children}
    hidden = [o for o in sc.objects if o not in keep and not o.hide_render]
    for o in hidden:
        o.hide_render = True
    white = bpy.data.materials.new("MaskWhite")
    white.use_nodes = True
    nodes = white.node_tree.nodes
    nodes.clear()
    em = nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = (1, 1, 1, 1)
    outn = nodes.new("ShaderNodeOutputMaterial")
    white.node_tree.links.new(em.outputs[0], outn.inputs[0])
    vl = bpy.context.view_layer
    vl.material_override = white
    sc.render.film_transparent = True
    sc.cycles.use_denoising = False
    sc.camera = cam
    (out / "mask").mkdir(parents=True, exist_ok=True)
    for slug in slugs:
        wrap, u0, tone = DESIGNS[slug]
        rig.rotation_euler = (0, 0, -2 * math.pi * u0)
        sc.render.resolution_x, sc.render.resolution_y = int(540 * scale), int(675 * scale)
        sc.render.resolution_percentage = 100
        sc.cycles.samples = 16
        sc.render.image_settings.file_format = "PNG"
        sc.render.image_settings.color_mode = "RGBA"
        sc.render.filepath = str(out / "mask" / f"{slug}.png")
        bpy.ops.render.render(write_still=True)
        print(f"  mask/{slug}.png", flush=True)
    vl.material_override = None
    sc.cycles.use_denoising = True  # the line-up renders after the cut-outs
    sc.render.film_transparent = False
    for o in hidden:
        o.hide_render = False


def lineup(rig, tex, glow, out, scale, q):
    """All designs in a shallow arc, one barrel per design."""
    sc = bpy.context.scene
    # hiding an empty doesn't hide its children
    for o in (rig, *rig.children):
        o.hide_render = True
    n = len(DESIGNS)
    dist = 1.15
    lid_only = bpy.data.collections["LidOnly"]
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
            c.hide_render = False
            c.parent = copy
            bpy.context.collection.objects.link(c)
            if child.name in lid_only.objects:  # copies of the lid see the lid's reflector cards too
                lid_only.objects.link(c)
        x = (i - (n - 1) / 2) * 0.105
        copy.location = (x, 0.25 * x * x, 0)
        copy.rotation_euler = (0, 0, -2 * math.pi * u0 - math.atan2(x, dist))
    glow.data.color = (0.55, 0.5, 0.7)
    glow.data.energy = 45
    glow.data.size = 2.2
    cam = camera((0, -dist, 0.2), (0, 0.03, 0.11), 50)
    sc.camera = cam
    shoot(out / "lineup.webp", int(2520 * scale), int(1080 * scale), q(64))


main()
