# TRINVO

Storefront for TRINVO — original designs on premium tumblers.

Next.js (App Router) · TypeScript · Tailwind CSS v4. No other runtime dependencies.

```bash
npm run dev        # http://localhost:3000
npm run lint
npm run typecheck
npm run build
```

TRINVO sells its own original artwork printed full-wrap on one stainless
barrel. Customer personalisation is deliberately **not** part of this build —
nothing in the UI offers it, and `src/data/products.ts` treats each entry as a
finished design rather than a configurable blank.

## Adding product photography

Every design frame renders a labelled empty plate until a photo exists. To fill one:

1. Drop the file into `public/products/` — e.g. `public/products/monolith.jpg`
2. Set `image` on that product in `src/data/products.ts`:
   ```ts
   { slug: "monolith", /* ... */ image: "monolith.jpg" }
   ```

The two editorial stills are set the same way, via `siteImages` at the bottom of
that file:

| Key | Where it appears | Crop | Minimum |
| --- | --- | --- | --- |
| `hero` | Full-bleed opening frame | 16:9 landscape | 2400px wide |
| `manifesto` | Behind the "Why one barrel" quote | 21:9 landscape | 2400px wide |
| per-design `image` | Cards, product pages, configurator | 4:5 portrait | 1600px tall |

Shoot on a dark ground — the whole site is near-black and each frame adds its
own split lighting and vignette on top.

## Colour

The theme is near-black with colour carried entirely by the designs themselves
plus five section accents (`bronze`, `cobalt`, `jade`, `plum`, `rose`, defined
in `src/app/globals.css`). Each design in `src/data/products.ts` owns four
colour fields:

| Field | Drives |
| --- | --- |
| `tone` | The key light behind that design in every frame |
| `accent` | Its index number, hover bar, chips and result CTA |
| `palette` | The three swatches shown on cards and the product page |

Every frame also gets a cold counter-light from the opposite corner, so warm
designs sit against a cool edge and vice versa. Change `--rim` on a section to
retune that.

## Where things live

| Path | What |
| --- | --- |
| `src/app/page.tsx` | Homepage — composes the sections below |
| `src/app/layout.tsx` | Shared shell: ticker, nav, footer, fonts |
| `src/components/` | Reusable sections and UI pieces |
| `src/components/ProductFrame.tsx` | The dark plate + key light every product sits in |
| `src/data/products.ts` | Single source of truth for the catalogue and reviews |
| `src/lib/quiz.ts` | Configurator questions and scoring |
| `public/trinvo-wordmark.svg` | Horizontal wordmark (brand mint — dark grounds only) |
| `public/trinvo-lockup.svg` | Stacked mark + wordmark, used in the footer |
| `public/trinvo-mark.svg` | Symbol only; also the site icon via `src/app/icon.svg` |

## Before launch

- Design names, prices, capacities and palettes in `src/data/products.ts` are
  placeholders — swap them for the real artwork.
- `reviews` in the same file is empty on purpose; the Reviews section renders
  an honest empty state until it holds verified orders.
- The newsletter form is front-end only — no list provider is connected.
- Contact addresses in `src/app/contact/page.tsx` are placeholders.

Not built yet (deliberately): database, admin, cart, checkout, payments,
Qikink integration, customer personalisation.
