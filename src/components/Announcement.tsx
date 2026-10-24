const notes = [
  { text: "Original in-house designs", color: "var(--color-plum)" },
  { text: "Free shipping over ₹1,999", color: "var(--color-cobalt)" },
  { text: "Made in India", color: "var(--color-jade)" },
  { text: "Double-wall stainless", color: "var(--color-bronze)" },
];

/** Hairline ticker above the header. Track is doubled so the loop is seamless. */
export default function Announcement() {
  const track = [...notes, ...notes];

  return (
    <div className="relative z-50 overflow-hidden border-b hairline bg-void py-2.5">
      <div className="flex w-max animate-drift gap-12 pr-12">
        {track.map((note, i) => (
          <span
            key={i}
            className="label flex shrink-0 items-center gap-4 whitespace-nowrap text-dim"
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: note.color }}
            />
            {note.text}
          </span>
        ))}
      </div>
    </div>
  );
}
