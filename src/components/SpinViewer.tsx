"use client";

import { useEffect, useRef, useState } from "react";
import type { Product } from "@/data/products";

/** Frames rendered per design by scripts/studio.py */
export const SPIN_FRAMES = 24;

const frameSrc = (slug: string, i: number) =>
  `/products/spin/${slug}-${String(i).padStart(2, "0")}.webp`;

/**
 * Drag-to-turn turntable built from rendered frames. Pointer drag, arrow keys
 * and the slider all move the same frame index, so it works by mouse, touch
 * and keyboard. Turns itself slowly once until the visitor takes over.
 */
export default function SpinViewer({
  product,
  className = "aspect-[4/5]",
}: {
  product: Product;
  className?: string;
}) {
  const [frame, setFrame] = useState(0);
  const [loaded, setLoaded] = useState(0);
  const [failed, setFailed] = useState(false);
  const [touched, setTouched] = useState(false);
  const drag = useRef<{ x: number; frame: number } | null>(null);
  const box = useRef<HTMLDivElement>(null);

  // preload every frame so dragging never shows a blank. Callers key this
  // component by design, so a new design starts from fresh state.
  useEffect(() => {
    for (let i = 0; i < SPIN_FRAMES; i++) {
      const img = new Image();
      img.onload = () => setLoaded((n) => n + 1);
      img.onerror = () => setFailed(true);
      img.src = frameSrc(product.slug, i);
    }
  }, [product.slug]);

  const ready = loaded >= SPIN_FRAMES && !failed;
  const poster = product.images[0];

  // one slow lap to show it turns, then stop
  useEffect(() => {
    if (!ready || touched) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setFrame(i % SPIN_FRAMES);
      if (i >= SPIN_FRAMES) window.clearInterval(id);
    }, 90);
    return () => window.clearInterval(id);
  }, [ready, touched]);

  const step = (n: number) => setFrame((f) => (f + n + SPIN_FRAMES) % SPIN_FRAMES);

  const onDown = (e: React.PointerEvent) => {
    if (!ready) return;
    setTouched(true);
    drag.current = { x: e.clientX, frame };
    (e.target as Element).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current || !box.current) return;
    // a full drag across the frame is one full turn
    const per = box.current.clientWidth / SPIN_FRAMES;
    const moved = Math.round((e.clientX - drag.current.x) / per);
    setFrame((((drag.current.frame - moved) % SPIN_FRAMES) + SPIN_FRAMES) % SPIN_FRAMES);
  };
  const onUp = () => {
    drag.current = null;
  };

  return (
    <div className={className}>
      <div
        ref={box}
        role="img"
        aria-label={`${product.name} tumbler, turned ${Math.round((frame / SPIN_FRAMES) * 360)} degrees`}
        tabIndex={0}
        onKeyDown={(e) => {
          const n = e.key === "ArrowLeft" ? 1 : e.key === "ArrowRight" ? -1 : 0;
          if (!n) return;
          e.preventDefault();
          setTouched(true);
          step(n);
        }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        className="relative h-full w-full cursor-grab touch-pan-y select-none overflow-hidden bg-[#050506] outline-none focus-visible:ring-1 focus-visible:ring-chalk active:cursor-grabbing"
      >
        {/* the studio still holds the frame until every turn frame has loaded,
            and stays if any frame is missing, so a gap never shows */}
        {!ready && poster && (
          // eslint-disable-next-line @next/next/no-img-element -- same file the gallery already loaded
          <img
            src={`/products/${poster.file}`}
            alt=""
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}

        {/* every frame stays mounted once loaded; only the current one shows */}
        {ready && Array.from({ length: SPIN_FRAMES }, (_, i) => (
          // eslint-disable-next-line @next/next/no-img-element -- frames are pre-sized renders, swapped every few ms
          <img
            key={i}
            src={frameSrc(product.slug, i)}
            alt=""
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ opacity: i === frame ? 1 : 0 }}
          />
        ))}

        {!ready && !failed && (
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-chalk/10">
            <div
              className="h-full bg-chalk/60 transition-[width]"
              style={{ width: `${(loaded / SPIN_FRAMES) * 100}%` }}
            />
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex items-center justify-center gap-3">
          <span className="label rounded-full border hairline bg-void/60 px-4 py-2 text-ash backdrop-blur">
            {ready ? "← Drag to turn · 360° →" : failed ? "360° view coming soon" : "Loading 360°…"}
          </span>
        </div>
      </div>
    </div>
  );
}
