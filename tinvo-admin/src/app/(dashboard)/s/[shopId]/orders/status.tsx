const tone: Record<string, string> = {
  pending_payment: "text-dim",
  paid: "text-bronze",
  in_production: "text-bronze",
  shipped: "text-chalk",
  delivered: "text-chalk",
  cancelled: "text-dim line-through",
  refunded: "text-rose",
  returned: "text-rose",
};

export const statusLabel = (s: string) => s.replace("_", " ");

export function StatusBadge({ status }: { status: string }) {
  return <span className={`label w-28 text-right ${tone[status] ?? "text-ash"}`}>{statusLabel(status)}</span>;
}
