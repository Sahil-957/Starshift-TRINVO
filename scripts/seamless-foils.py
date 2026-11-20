"""
Make the 3 liquid-foil print files wrap round the barrel without a seam.

    python scripts/seamless-foils.py

Qikink wraps the 4650 px wide artwork round the barrel, so column 0 meets
column 4649 at the back. On the foil designs those two ends are different
parts of the swirl, which prints as a hard vertical line. Here a strip of the
same foil from elsewhere in the file (never the logo) is laid over the join and
faded into each end: colour over a wide zone, swirl shapes over a medium one,
fine highlights over a narrow one, so there's neither a line nor ghosting.
Only the ~33 mm either side of the join changes; the logo and the rest of the
artwork stay pixel-identical.

Writes resized/Seamless for Qikink/<name>.png (same size and DPI) to upload
to Qikink in place of the originals in resized/With Logo/.

Not in use: the live foil designs keep their seam (Nov 2026). Kept so new
non-tiling designs can be made seamless before they go on Qikink; edit FILES.
"""

from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent / "resized"
SRC, OUT = ROOT / "With Logo", ROOT / "Seamless for Qikink"
FILES = ["Golden Foil.png", "blue foil.png", "Pink Foil.png"]

EDGE = 400  # px from the join to the middle of each fade
FADES = [(60, 500), (8, 220), (0, 90)]  # (blur radius of the band's lower bound, fade width)
REACH = EDGE + FADES[0][1] // 2  # px either side of the join that change
LOGO_X = (3100, 3950)  # columns holding the TINVO mark in every file: the bridge never comes from here


def bands(img):
    """Split into low / mid / high frequency layers that sum back to the image."""
    layers, prev = [], np.asarray(img, np.float32)
    for r, _ in FADES[:-1]:
        low = np.asarray(img.filter(ImageFilter.GaussianBlur(r)), np.float32)
        layers.append(low)
    lows = layers + [np.asarray(img, np.float32)]
    return [lows[0]] + [lows[i] - lows[i - 1] for i in range(1, len(lows))]


def ramp(u, width):
    """1 inside the bridge, 0 outside, a smoothstep across each fade."""
    t = np.clip((EDGE + width / 2 - np.abs(u)) / width, 0, 1)
    return t * t * (3 - 2 * t)


def seamless(im):
    w, h = im.size
    a = np.asarray(im)
    c = w // 2
    rolled = np.roll(a, c, axis=1)  # the join is now at column c

    # pick the bridge whose colours best match both ends where they fade
    small = lambda x: np.asarray(Image.fromarray(x).resize((w // 10, h // 10)).filter(ImageFilter.GaussianBlur(3)), np.float32)
    ref = small(rolled)
    u = np.r_[-REACH:-EDGE // 2, EDGE // 2:REACH] // 10
    best = None
    for s in range(REACH + 100, LOGO_X[0] - REACH, 25):  # bridge centre in original columns
        cand = small(np.roll(a, c - s, axis=1))
        cost = ((ref[:, c // 10 + u] - cand[:, c // 10 + u]) ** 2).mean()
        if best is None or cost < best[0]:
            best = (cost, s)
    s = best[1]
    bridge = np.roll(a, c - s, axis=1)

    # blend band by band in a window round the join
    x0, x1 = c - REACH - 200, c + REACH + 200
    la = bands(Image.fromarray(rolled[:, x0:x1]))
    lb = bands(Image.fromarray(bridge[:, x0:x1]))
    uu = np.arange(x0, x1) - c + 0.5
    out = sum(p * (1 - ramp(uu, fw))[None, :, None] + q * ramp(uu, fw)[None, :, None] for p, q, (_, fw) in zip(la, lb, FADES))
    result = rolled.copy()
    result[:, x0:x1] = np.clip(np.rint(out), 0, 255).astype(np.uint8)
    return np.roll(result, -c, axis=1), s


if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    for name in FILES:
        im = Image.open(SRC / name).convert("RGB")
        a = np.asarray(im)
        new, s = seamless(im)
        w = a.shape[1]
        changed = np.nonzero((new != a).any(axis=(0, 2)))[0]
        moved = changed[(changed > REACH) & (changed < w - REACH)]
        assert not moved.size, f"{name}: columns {moved.min()}-{moved.max()} changed outside the join"
        assert (new[:, LOGO_X[0]:LOGO_X[1]] == a[:, LOGO_X[0]:LOGO_X[1]]).all(), f"{name}: logo area changed"
        jump = lambda x: np.abs(x[:, 0].astype(int) - x[:, -1].astype(int)).mean()
        Image.fromarray(new).save(OUT / name, dpi=im.info.get("dpi", (500, 500)))
        print(f"  {name}: bridge from column {s}, join jump {jump(a):.1f} -> {jump(new):.1f}")
