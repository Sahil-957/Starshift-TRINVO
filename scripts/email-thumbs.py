"""
The small product pictures in order emails: a tall crop of each studio hero.

    python scripts/email-thumbs.py

Run after scripts/studio.py has re-rendered the heroes.
"""

from pathlib import Path

from PIL import Image

PRODUCTS = Path(__file__).resolve().parent.parent / "public" / "products"
BOX = (314, 140, 314 + 452, 140 + 1130)  # the tumbler, straw to base, in a 1080x1350 hero

for hero in sorted(PRODUCTS.glob("*-hero.webp")):
    slug = hero.name.removesuffix("-hero.webp")
    out = PRODUCTS / "email" / f"{slug}.jpg"
    Image.open(hero).convert("RGB").crop(BOX).resize((128, 320), Image.LANCZOS).save(out, quality=88)
    print(f"  email/{out.name}")
