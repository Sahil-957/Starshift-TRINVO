"""
Studio renders of every TINVO design, wrapped on the 20 oz skinny barrel.

Reads the print-ready wrap files (resized/With Logo/*.png), maps each one onto
a shaded cylinder with a clear lid and metal straw, and writes transparent
WebP stills to public/products/. Transparent so the site's own lit plate
(ProductFrame) supplies the backdrop.

    python scripts/render_tumblers.py

Needs Pillow and numpy. Re-run after changing a design file.
"""

from pathlib import Path
import math

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "resized" / "With Logo"
LIFESTYLE = ROOT / "resized" / "Mockups"
OUT = ROOT / "public" / "products"

# slug -> (wrap file, Qikink lifestyle mockup, logo centre u on the wrap)
DESIGNS = {
    "aurora-gilt": ("Golden Foil.png", "Aurora Gilt – TINVO Tumbler.jpg", 0.776),
    "chroma-tide": ("blue foil.png", "Chroma Tide – TINVO Tumbler.jpg", 0.773),
    "opal-drift": ("Pink Foil.png", "Opal Drift – TINVO Tumbler.jpg", 0.684),
    "midnight-slate": ("Navy Blue.png", "Midnight Slate – TINVO Tumbler.jpg", 0.688),
    "cloud-theory": ("Sky Blue.png", "Cloud Theory – TINVO Tumbler.jpg", 0.684),
    "pink-serenity": ("Baby Pink.png", "Pink Serenity – Pastel Pink TINVO Tumbler.jpg", 0.688),
    "solara": ("Cream.png", "Solara – TINVO Tumbler.jpg", 0.684),
    "mauve-mode": ("Purple.png", "Mauve Mode – TINVO Tumbler.jpg", 0.688),
    "cocoa-noir": ("Voilet.png", "Cocoa Noir – TINVO Tumbler.jpg", 0.688),
    "olive-dusk": ("Brown.png", "Olive Dusk – TINVO Tumbler.jpg", 0.684),
}

SS = 2  # supersampling factor
W, H = 1600, 2000  # final 4:5 frame


def smooth(edge0, edge1, x):
    t = np.clip((x - edge0) / (edge1 - edge0), 0, 1)
    return t * t * (3 - 2 * t)


def band(theta, centre, width):
    """Soft vertical highlight centred on an angle around the barrel."""
    return np.exp(-(((theta - centre) / width) ** 2))


def render(wrap: Image.Image, u0: float, turn: float = 0.0) -> Image.Image:
    """One barrel, front-lit. `turn` rotates the barrel, in fractions of a turn."""
    cw, ch = W * SS, H * SS
    cx = cw / 2
    r = 0.145 * cw  # barrel is 29% of frame width; leaves room for the straw
    tex = np.asarray(wrap.convert("RGB")).astype(np.float32) / 255
    th_, tw_ = tex.shape[:2]
    # skinny barrel, ~2.9:1. The wrap file carries overlap bleed, so one turn
    # covers slightly less than its full width; scaling by `circ` keeps the
    # print's own aspect (the logo stays round).
    body_h = 5.8 * r
    circ = 2 * math.pi * r / body_h * th_ / tw_
    e = 0.10 * r  # rim ellipse: camera sits slightly above the barrel
    lid_h = 0.05 * body_h
    yb = 0.92 * ch
    yt = yb - body_h

    img = np.zeros((ch, cw, 4), np.float32)

    # --- shadow on the ground -------------------------------------------
    shadow = Image.new("L", (cw, ch), 0)
    d = ImageDraw.Draw(shadow)
    d.ellipse([cx - r * 1.55, yb - e * 1.4, cx + r * 1.55, yb + e * 2.6], fill=70)
    shadow = shadow.filter(ImageFilter.GaussianBlur(r * 0.35))
    contact = Image.new("L", (cw, ch), 0)
    d = ImageDraw.Draw(contact)
    d.ellipse([cx - r * 1.02, yb - e * 0.6, cx + r * 1.02, yb + e * 1.5], fill=190)
    contact = contact.filter(ImageFilter.GaussianBlur(r * 0.06))
    sh = np.maximum(np.asarray(shadow), np.asarray(contact)).astype(np.float32) / 255
    img[..., 3] = sh

    # --- printed body ----------------------------------------------------
    xs = np.arange(cw) + 0.5
    xn = (xs - cx) / r
    cols = np.abs(xn) < 1
    xn_c = xn[cols]
    theta = np.arcsin(xn_c)
    lip = e * np.sqrt(1 - xn_c**2)
    ys = np.arange(ch)[:, None] + 0.5
    top = yt + lip
    bot = yb + lip
    v = (ys - top) / (bot - top)
    inside = (v >= 0) & (v < 1)

    u = (u0 + (turn + theta / (2 * math.pi)) * circ) % 1
    tx = np.clip((u * tw_).astype(int), 0, tw_ - 1)
    ty = np.clip((v * th_).astype(int), 0, th_ - 1)
    col = tex[ty, tx[None, :]]

    nz = np.cos(theta)
    key = -0.62  # key light angle, screen left
    diffuse = 0.42 + 0.58 * np.clip(np.cos(theta - key), 0, 1)
    falloff = 0.55 + 0.45 * nz**0.6
    shade = (diffuse * falloff)[None, :]
    # base is a touch darker; ambient occlusion where it meets the ground
    shade = shade * (1 - 0.08 * v) * (1 - 0.35 * smooth(0.965, 1.0, v))
    col = col * shade[..., None]

    # gloss coat: a tall key highlight and a faint kicker on the far edge
    spec = 0.42 * band(theta, -0.52, 0.16) + 0.10 * band(theta, -0.30, 0.45)
    kick = 0.16 * band(theta, 1.05, 0.12)
    gloss = (spec + kick)[None, :] * (1 - 0.25 * v)
    col = 1 - (1 - col) * (1 - gloss[..., None])  # screen blend

    # thin steel edge where the print stops under the lid
    rim = smooth(0.0, 0.012, v) * (1 - smooth(0.012, 0.022, v))
    steel = (0.78 + 0.2 * band(theta, -0.52, 0.2))[None, :, None]
    col = col * (1 - rim[..., None]) + steel * rim[..., None]

    region = img[:, cols]
    region[..., :3] = np.where(inside[..., None], col, region[..., :3])
    region[..., 3] = np.where(inside, 1.0, region[..., 3])
    img[:, cols] = region

    out = Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8), "RGBA")
    draw_lid(out, cx, yt, r, e, lid_h)
    return out.resize((W, H), Image.LANCZOS)


def draw_lid(out: Image.Image, cx, yt, r, e, lid_h):
    """Clear push-on lid with the reusable metal straw through it."""
    cw, ch = out.size
    lr = r * 1.02
    le = e * 1.02
    y1 = yt + e * 0.4  # lid skirt bottom sits just over the steel edge
    y0 = y1 - lid_h

    # metal straw first, so the clear lid sits over its lower end
    straw = Image.new("RGBA", (cw, ch))
    sx, sy = cx + r * 0.3, y0 + le * 0.15
    length, sw = r * 1.3, r * 0.12
    ang = math.radians(9)
    tx, ty = sx + math.sin(ang) * length, sy - math.cos(ang) * length
    steps = 24
    d = ImageDraw.Draw(straw)
    for i in range(steps):
        # draw from the shadowed side to the lit side
        f = i / (steps - 1)
        o = (f - 0.5) * sw
        lum = 0.45 + 0.5 * math.exp(-(((f - 0.32) / 0.18) ** 2)) - 0.2 * f
        c = int(255 * min(1, lum))
        d.line(
            [(sx + o * math.cos(ang), sy + o * math.sin(ang)),
             (tx + o * math.cos(ang), ty + o * math.sin(ang))],
            fill=(c, c, int(c * 1.02) if c < 250 else 255, 255),
            width=max(2, int(sw / steps * 1.6)),
        )
    # cut the straw's top square to its own axis
    d.ellipse([tx - sw / 2, ty - sw * 0.18, tx + sw / 2, ty + sw * 0.18], fill=(70, 72, 76, 255))
    out.alpha_composite(straw)

    lid = Image.new("RGBA", (cw, ch))
    d = ImageDraw.Draw(lid)
    # skirt: clear polypropylene, mostly read through its highlights
    d.rectangle([cx - lr, y0, cx + lr, y1], fill=(200, 208, 216, 70))
    d.ellipse([cx - lr, y1 - le, cx + lr, y1 + le], fill=(200, 208, 216, 70))
    # top face
    d.ellipse([cx - lr, y0 - le, cx + lr, y0 + le], fill=(226, 232, 238, 95))
    d.ellipse([cx - lr * 0.84, y0 - le * 0.84, cx + lr * 0.84, y0 + le * 0.84],
              outline=(235, 240, 245, 150), width=max(2, int(r * 0.014)))
    # sip opening
    d.ellipse([cx - lr * 0.5, y0 - le * 0.6, cx - lr * 0.2, y0 - le * 0.2],
              fill=(40, 44, 50, 150))

    a = np.asarray(lid).astype(np.float32)
    xs = (np.arange(cw) + 0.5 - cx) / lr
    th = np.arcsin(np.clip(xs, -1, 1))
    hl = 0.55 * band(th, -0.55, 0.14) + 0.25 * band(th, 1.0, 0.1)
    edge = 0.35 * smooth(0.82, 1.0, np.abs(xs))  # clear plastic reads darker at its edges
    mask = a[..., 3] > 0
    a[..., :3] = np.where(mask[..., None],
                          a[..., :3] * (1 - edge)[None, :, None] + 255 * hl[None, :, None], a[..., :3])
    a[..., 3] = np.where(mask, np.clip(a[..., 3] + 255 * (hl + edge)[None, :] * 0.6, 0, 240), 0)
    out.alpha_composite(Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), "RGBA"))


def lineup(slugs, wraps):
    """Wide group shot for the manifesto backdrop (21:9)."""
    w, h = 3150, 1350
    sheet = Image.new("RGBA", (w, h))
    n = len(slugs)
    for i, slug in enumerate(slugs):
        shot = render(wraps[slug][0], wraps[slug][1], turn=0.04 * (i - n // 2))
        shot = shot.resize((int(shot.width * h / shot.height * 1.05), int(h * 1.05)), Image.LANCZOS)
        x = int(w / 2 + (i - (n - 1) / 2) * w * 0.15 - shot.width / 2)
        sheet.alpha_composite(shot, (x, int(-h * 0.02)))
    return sheet


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    wraps = {}
    for slug, (wrap_file, life_file, u0) in DESIGNS.items():
        wrap = Image.open(SRC / wrap_file).convert("RGB")
        wrap.thumbnail((2790, 2400), Image.LANCZOS)  # ample for a 1600px frame
        wraps[slug] = (wrap, u0)

        render(wrap, u0).save(OUT / f"{slug}-front.webp", quality=88, method=6)
        render(wrap, u0, turn=-0.1).save(OUT / f"{slug}-angle.webp", quality=88, method=6)
        Image.open(LIFESTYLE / life_file).convert("RGB").save(
            OUT / f"{slug}-lifestyle.webp", quality=90, method=6)
        print("rendered", slug)

    lineup(["midnight-slate", "opal-drift", "aurora-gilt", "chroma-tide", "solara"], wraps).save(
        OUT / "lineup.webp", quality=86, method=6)
    print("rendered lineup")


if __name__ == "__main__":
    main()
