"""
Paints the unprinted white bands onto Qikink's lifestyle mockups.

Qikink's press can't print the ends of the barrel, so every real tumbler has a
white band under the lid (~4.5 mm) and at the base (~6 mm). Their mockups show
the print edge to edge. All ten mockups share one scene, so the barrel's
outline is measured once: its sides from where the designs differ, its top
(under the lid) and bottom (on the table) from the cream design, fitted as the
ellipses a cylinder's ends make. The white takes its light from the cream
design, so it shades round the barrel like the print does.

    python scripts/lifestyle-bands.py [out_dir]

Reads public/products/originals/<slug>-lifestyle.webp (Qikink's untouched
files, copied there on first run) and writes public/products/<slug>-lifestyle.webp.
"""

import shutil
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PRODUCTS = ROOT / "public" / "products"
ORIGINALS = PRODUCTS / "originals"
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else PRODUCTS

SLUGS = ["aurora-gilt", "chroma-tide", "opal-drift", "midnight-slate", "cloud-theory",
         "pink-serenity", "solara", "mauve-mode", "cocoa-noir", "olive-dusk"]

BARREL_MM = 75.0
TOP_MM, BOTTOM_MM = 4.5, 6.0
WHITE = np.array([248.0, 247.0, 243.0])


def load(slug):
    return np.asarray(Image.open(ORIGINALS / f"{slug}-lifestyle.webp").convert("RGB")).astype(float)


def fit_ellipse(xs, ys, cx, a):
    """y = c + k * sqrt(1 - ((x - cx) / a)^2), least squares."""
    s = np.sqrt(np.clip(1 - ((xs - cx) / a) ** 2, 0, 1))
    k, c = np.polyfit(s, ys, 1)
    return lambda x: c + k * np.sqrt(np.clip(1 - ((x - cx) / a) ** 2, 0, 1))


def main():
    ORIGINALS.mkdir(exist_ok=True)
    for s in SLUGS:  # keep Qikink's originals so a re-run never paints twice
        if not (ORIGINALS / f"{s}-lifestyle.webp").exists():
            shutil.copy(PRODUCTS / f"{s}-lifestyle.webp", ORIGINALS / f"{s}-lifestyle.webp")

    imgs = {s: load(s) for s in SLUGS}
    h, w, _ = imgs["solara"].shape

    # sides: wherever the ten prints differ is barrel. The camera looks down, so
    # the barrel narrows a little towards the table: fit each side as a line in y
    var = (np.stack(list(imgs.values())).std(0).sum(2) > 25).astype(float)
    # each side is where the barrel's printed columns start, row by row
    rows_fit = np.arange(300, 780)
    left = [np.where(var[y])[0].min() for y in rows_fit]
    right = [np.where(var[y])[0].max() for y in rows_fit]
    lk, lc = np.polyfit(rows_fit, left, 1)
    rk, rc = np.polyfit(rows_fit, right, 1)
    side_l = lambda y: lk * y + lc  # noqa: E731
    side_r = lambda y: rk * y + rc  # noqa: E731
    x0, x1 = side_l(270), side_r(270)
    cx, a = (x0 + x1) / 2, (x1 - x0) / 2 + 0.5
    px_mm = (x1 - x0 + 1) / BARREL_MM

    # top and bottom: the cream barrel is R > G; the mint set and bluish lid aren't
    ref = imgs["solara"]
    r, g, b = ref[..., 0], ref[..., 1], ref[..., 2]
    barrel = (r > g + 2) & (r > b + 15) & (r > 150)
    cols = np.arange(int(cx - a * 0.8), int(cx + a * 0.8))
    tops, bots = [], []
    for x in cols:
        ys = np.where(barrel[200:880, x])[0] + 200
        tops.append(ys.min())
        bots.append(ys.max() + 0.5)
    top = fit_ellipse(cols, np.array(tops, float), cx, a)
    bx0, bx1 = side_l(805), side_r(805)
    bot = fit_ellipse(cols, np.array(bots, float), (bx0 + bx1) / 2, (bx1 - bx0) / 2 + 0.5)

    yy, xx = np.mgrid[0:h, 0:w].astype(float)
    t, bt = top(xx), bot(xx)
    inside_x = np.clip(np.minimum(xx - side_l(yy) + 1, side_r(yy) + 1 - xx), 0, 1)
    band_top = np.clip(yy - (t - 0.5), 0, 1) * np.clip(t + TOP_MM * px_mm - yy, 0, 1)
    band_bot = np.clip(yy - (bt - BOTTOM_MM * px_mm), 0, 1) * np.clip(bt - yy, 0, 1)
    alpha = np.clip(band_top + band_bot, 0, 1) * inside_x

    # light on the barrel, from the cream print: scaled, not clipped, so the
    # white rounds off into shadow at the sides like the real thing
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    mid = lum[int(h * 0.5):int(h * 0.7), int(cx - a * 0.5):int(cx + a * 0.5)]
    shade = np.clip(lum / np.percentile(mid, 98), 0, 1.0)
    # outside the cream barrel (its darkest rim) borrow the column's light from mid-height
    col_light = np.median(lum[int(h * 0.45):int(h * 0.75)], axis=0) / np.percentile(mid, 98)
    shade = np.where(barrel, shade, np.clip(col_light, 0, 1)[None, :] * 0.92)
    white = shade[..., None] * WHITE

    OUT.mkdir(parents=True, exist_ok=True)
    for s in SLUGS:
        out = imgs[s] * (1 - alpha[..., None]) + white * alpha[..., None]
        Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(OUT / f"{s}-lifestyle.webp", quality=90)
        print(f"  {s}-lifestyle.webp")
    print(f"barrel x {x0}-{x1}, {px_mm:.2f} px/mm, bands {TOP_MM * px_mm:.1f}px / {BOTTOM_MM * px_mm:.1f}px")


main()
