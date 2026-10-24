import type { Product } from "@/data/products";

/** The three colours a design is drawn around. */
export default function Swatches({
  palette,
  size = "sm",
}: {
  palette: Product["palette"];
  size?: "sm" | "lg";
}) {
  const box = size === "lg" ? "h-5 w-5" : "h-2.5 w-2.5";
  return (
    <span className="flex items-center gap-1.5" aria-hidden="true">
      {palette.map((hex) => (
        <span
          key={hex}
          className={`${box} rounded-full ring-1 ring-chalk/15`}
          style={{ backgroundColor: hex }}
        />
      ))}
    </span>
  );
}
