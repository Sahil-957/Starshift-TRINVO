import { auth } from "@/auth";
import { shopRoleFor } from "@/core/access";
import { ordersForExport } from "@/core/orders";
import { getShop } from "@/core/settings";
import { STATES } from "@/lib/india";

/**
 * Paid orders as a CSV spreadsheet (opens in Excel / Google Sheets), for
 * accounts and GST. Same access rule as the orders page.
 */
export async function GET(req: Request, ctx: RouteContext<"/s/[shopId]/orders/export">) {
  const { shopId } = await ctx.params;
  const session = await auth();
  if (!session?.user?.id || !(await shopRoleFor(session.user.id, shopId))) {
    return new Response("Not found", { status: 404 });
  }
  const days = Math.min(Math.max(Number(new URL(req.url).searchParams.get("days")) || 30, 1), 3650);
  const [shop, rows] = await Promise.all([getShop(shopId), ordersForExport(shopId, days)]);

  const rupees = (m: number) => (m / 100).toFixed(2);
  const header = [
    "Order", "Paid on", "Status", "Customer", "Email", "Phone", "Address", "City", "State", "PIN",
    "Items", "Subtotal", "Shipping", "Tax", "Total", "Tax type", "PayU payment ID", "Qikink order", "Courier", "AWB",
  ];
  const lines = rows.map((o) => {
    const a = o.shippingAddress;
    return [
      o.number,
      o.paidAt?.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) ?? "",
      o.status,
      o.customerName,
      o.email,
      o.phone,
      [a.line1, a.line2].filter(Boolean).join(", "),
      a.city,
      STATES[a.state] ?? a.state,
      a.pin,
      o.items.map((i) => `${i.title} x${i.quantity}`).join("; "),
      rupees(o.subtotalMinor),
      rupees(o.shippingMinor),
      rupees(o.taxMinor),
      rupees(o.totalMinor),
      o.taxTreatment === "intra" ? "CGST+SGST" : o.taxTreatment === "inter" ? "IGST" : "",
      o.paymentGatewayId ?? "",
      o.supplierOrderId ?? "",
      o.courier ?? "",
      o.awb ?? "",
    ];
  });

  // quote every cell; neutralise values a spreadsheet would run as a formula
  const cell = (v: string) => `"${(/^[=+\-@\t\r]/.test(v) ? `'${v}` : v).replace(/"/g, '""')}"`;
  const csv = "﻿" + [header, ...lines].map((r) => r.map((v) => cell(String(v))).join(",")).join("\r\n");
  const name = `${shop.slug}-orders-last-${days}-days.csv`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
