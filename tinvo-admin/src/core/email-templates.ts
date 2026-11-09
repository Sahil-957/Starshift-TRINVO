/**
 * Email designs. Table layout + inline styles: the only HTML that Gmail, Outlook
 * and Apple Mail all render the same. Light body (dark mode clients re-colour
 * dark emails badly), TINVO-dark header. Every value from a customer is escaped.
 * Each template also returns a plain-text version.
 */
export type EmailItem = { slug: string; title: string; quantity: number; lineTotal: string };
export type Email = { subject: string; html: string; text: string };

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const ink = "#111114";
const muted = "#6b6f76";
const line = "#e7e8e4";

function layout(o: { preheader: string; eyebrow: string; body: string; footer: string; accent?: string }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(o.eyebrow)}</title></head>
<body style="margin:0;padding:0;background:#f2f2ee;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(o.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f2ee;"><tr><td align="center" style="padding:28px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;font-family:${font};color:${ink};">
<tr><td style="background:#08080a;padding:26px 32px;border-bottom:3px solid ${o.accent ?? "#c08a4e"};">
<div style="font-size:22px;letter-spacing:8px;font-weight:700;color:#e2fff4;">TINVO</div>
<div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#a9bbb4;margin-top:6px;">${esc(o.eyebrow)}</div>
</td></tr>
<tr><td style="padding:32px;">${o.body}</td></tr>
<tr><td style="padding:22px 32px;background:#fafaf7;border-top:1px solid ${line};font-size:12px;line-height:1.6;color:${muted};">${o.footer}</td></tr>
</table></td></tr></table></body></html>`;
}

const h1 = (t: string) => `<h1 style="margin:0 0 10px;font-size:24px;line-height:1.25;font-weight:700;color:${ink};">${t}</h1>`;
const p = (t: string) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3b3e44;">${t}</p>`;
const button = (href: string, label: string, bg = "#08080a") =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px;"><tr><td style="background:${bg};border-radius:8px;"><a href="${esc(href)}" style="display:inline-block;padding:14px 26px;font-size:14px;font-weight:600;letter-spacing:.5px;color:#ffffff;text-decoration:none;">${esc(label)} &rarr;</a></td></tr></table>`;
const label = (t: string) =>
  `<div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:${muted};margin:0 0 10px;">${t}</div>`;

function itemsTable(items: EmailItem[], imageBase: string | null) {
  const rows = items
    .map(
      (i) => `<tr>
${
        imageBase
          ? `<td width="56" style="padding:12px 14px 12px 0;border-bottom:1px solid ${line};vertical-align:middle;"><img src="${esc(`${imageBase}/products/email/${i.slug}.jpg`)}" width="44" height="110" alt="" style="display:block;border-radius:6px;background:#08080a;"></td>`
          : ""
      }
<td style="padding:12px 0;border-bottom:1px solid ${line};font-size:15px;vertical-align:middle;"><div style="font-weight:600;">${esc(i.title)}</div><div style="color:${muted};font-size:13px;margin-top:3px;">20 oz tumbler &middot; Qty ${i.quantity}</div></td>
<td align="right" style="padding:12px 0;border-bottom:1px solid ${line};font-size:15px;white-space:nowrap;vertical-align:middle;">${esc(i.lineTotal)}</td>
</tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;">${rows}</table>`;
}

const totalRow = (k: string, v: string, strong = false) =>
  `<tr><td style="padding:5px 0;font-size:${strong ? 16 : 14}px;color:${strong ? ink : muted};font-weight:${strong ? 700 : 400};">${k}</td><td align="right" style="padding:5px 0;font-size:${strong ? 16 : 14}px;font-weight:${strong ? 700 : 400};">${esc(v)}</td></tr>`;

function steps(current: 0 | 1 | 2) {
  const all = [
    ["Printed for you", "Your design is printed on the tumbler after you order."],
    ["Shipped", "We email you the courier and tracking link."],
    ["Delivered", "Track it all the way to your door with the link."],
  ];
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 0;">${all
    .map(
      ([t, d], i) => `<tr>
<td width="30" style="vertical-align:top;padding:6px 0;"><div style="width:20px;height:20px;border-radius:10px;background:${i <= current ? "#08080a" : "#ffffff"};border:2px solid ${i <= current ? "#08080a" : "#cfd1cc"};color:#ffffff;font-size:11px;line-height:20px;text-align:center;">${i < current ? "&#10003;" : ""}</div></td>
<td style="padding:6px 0 10px;"><div style="font-size:14px;font-weight:600;color:${i <= current ? ink : muted};">${t}</div><div style="font-size:13px;color:${muted};margin-top:2px;">${d}</div></td>
</tr>`,
    )
    .join("")}</table>`;
}

const customerFooter = (shop: string, domain: string | null) =>
  `Questions about your order? Just reply to this email.<br>${esc(shop)} &middot; Printed to order in India${
    domain ? ` &middot; <a href="https://${esc(domain)}" style="color:${muted};">${esc(domain)}</a>` : ""
  }`;

// ─── customers ───────────────────────────────────────────────────────────────

export function orderConfirmed(o: {
  shop: string;
  domain: string | null;
  firstName: string;
  number: string;
  items: EmailItem[];
  subtotal: string;
  shipping: string;
  total: string;
  address: string;
  trackUrl: string | null;
}): Email {
  const base = o.domain ? `https://${o.domain}` : null;
  const html = layout({
    preheader: `Order ${o.number} is confirmed. We'll email you tracking when it ships.`,
    eyebrow: "Order confirmed",
    body: `${h1(`Thank you, ${esc(o.firstName)}!`)}
${p(`Your order <strong>${esc(o.number)}</strong> is paid and confirmed. Here's what you got:`)}
${itemsTable(o.items, base)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:10px 0 0;">
${totalRow("Subtotal", o.subtotal)}${totalRow("Shipping", o.shipping)}${totalRow("Total paid", o.total, true)}
</table>
<div style="font-size:12px;color:${muted};margin-top:4px;">Prices include GST.</div>
${o.trackUrl ? button(o.trackUrl, "Track your order") : ""}
<div style="margin-top:26px;">${label("What happens next")}${steps(0)}</div>
<div style="margin-top:22px;padding:16px 18px;background:#fafaf7;border:1px solid ${line};border-radius:10px;">${label("Shipping to")}<div style="font-size:14px;line-height:1.55;">${esc(o.address)}</div></div>`,
    footer: customerFooter(o.shop, o.domain),
  });
  const text = `Thank you, ${o.firstName}!\n\nYour ${o.shop} order ${o.number} is paid and confirmed.\n\n${o.items
    .map((i) => `  ${i.title} x ${i.quantity}   ${i.lineTotal}`)
    .join("\n")}\n\nSubtotal: ${o.subtotal}\nShipping: ${o.shipping}\nTotal paid: ${o.total} (GST included)\n\nShipping to: ${o.address}\n\nYour tumbler is printed for you, then shipped. We'll email you the tracking link when it's on its way.${
    o.trackUrl ? `\n\nTrack your order: ${o.trackUrl}` : ""
  }\n\nQuestions? Just reply to this email.\n— ${o.shop}`;
  return { subject: `Your ${o.shop} order ${o.number} is confirmed`, html, text };
}

/** Account emails: confirm-your-email and reset-your-password, one button each. */
export function accountLink(o: {
  shop: string;
  domain: string | null;
  subject: string;
  title: string;
  intro: string;
  button: string;
  url: string;
  note: string;
}): Email {
  const html = layout({
    preheader: o.intro,
    eyebrow: "Your account",
    body: `${h1(esc(o.title))}
${p(esc(o.intro))}
${button(o.url, o.button)}
<p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:${muted};word-break:break-all;">Or paste this into your browser: ${esc(o.url)}</p>
${p(`<span style="font-size:13px;color:${muted};">${esc(o.note)}</span>`)}`,
    footer: customerFooter(o.shop, o.domain),
  });
  const text = `${o.title}\n\n${o.intro}\n\n${o.url}\n\n${o.note}\n— ${o.shop}`;
  return { subject: o.subject, html, text };
}

/** "Email me my orders": every order on an email address, each with its tracking link. */
export function orderList(o: {
  shop: string;
  domain: string | null;
  orders: { number: string; date: string; status: string; total: string; url: string | null }[];
}): Email {
  const rows = o.orders
    .map(
      (r) => `<tr><td style="padding:12px 0;border-bottom:1px solid ${line};font-size:14px;"><strong>${esc(r.number)}</strong><br><span style="color:${muted};">${esc(r.date)} &middot; ${esc(r.status)} &middot; ${esc(r.total)}</span></td>
<td align="right" style="padding:12px 0;border-bottom:1px solid ${line};font-size:14px;">${r.url ? `<a href="${esc(r.url)}" style="color:${ink};font-weight:600;">Track &rarr;</a>` : ""}</td></tr>`,
    )
    .join("");
  const html = layout({
    preheader: `Your ${o.orders.length} ${o.shop} order${o.orders.length === 1 ? "" : "s"}, with tracking links.`,
    eyebrow: "Your orders",
    body: `${h1("Your orders")}
${p("You asked for a list of your orders. Tap any one to see where it is.")}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
${p(`<span style="font-size:13px;color:${muted};">Didn't ask for this? You can ignore it; nothing has changed.</span>`)}`,
    footer: customerFooter(o.shop, o.domain),
  });
  const text = `Your ${o.shop} orders:\n\n${o.orders
    .map((r) => `${r.number} · ${r.date} · ${r.status} · ${r.total}${r.url ? `\n  ${r.url}` : ""}`)
    .join("\n\n")}\n\nDidn't ask for this? You can ignore it.\n— ${o.shop}`;
  return { subject: `Your ${o.shop} orders`, html, text };
}

export function orderShipped(o: {
  shop: string;
  domain: string | null;
  firstName: string;
  number: string;
  items: EmailItem[];
  courier: string | null;
  awb: string | null;
  trackUrl: string | null;
}): Email {
  const base = o.domain ? `https://${o.domain}` : null;
  const html = layout({
    preheader: `Order ${o.number} is on its way${o.courier ? ` with ${o.courier}` : ""}.`,
    eyebrow: "Shipped",
    body: `${h1(`It's on its way, ${esc(o.firstName)}!`)}
${p(`Your order <strong>${esc(o.number)}</strong> has left the print studio and is with the courier.`)}
${
  o.courier || o.awb
    ? `<div style="margin:6px 0 4px;padding:16px 18px;background:#fafaf7;border:1px solid ${line};border-radius:10px;font-size:14px;line-height:1.7;">${
        o.courier ? `Courier: <strong>${esc(o.courier)}</strong><br>` : ""
      }${o.awb ? `Tracking number (AWB): <strong>${esc(o.awb)}</strong>` : ""}</div>`
    : ""
}
${o.trackUrl ? button(o.trackUrl, "Track your parcel") : ""}
<div style="margin-top:22px;">${itemsTable(o.items, base)}</div>
<div style="margin-top:22px;">${label("Progress")}${steps(1)}</div>`,
    footer: customerFooter(o.shop, o.domain),
  });
  const text = `It's on its way, ${o.firstName}!\n\nYour ${o.shop} order ${o.number} has shipped.${o.courier ? `\nCourier: ${o.courier}` : ""}${
    o.awb ? `\nTracking number (AWB): ${o.awb}` : ""
  }${o.trackUrl ? `\n\nTrack it: ${o.trackUrl}` : ""}\n\nQuestions? Just reply to this email.\n— ${o.shop}`;
  return { subject: `Your ${o.shop} order ${o.number} has shipped`, html, text };
}

// ─── owner alerts ────────────────────────────────────────────────────────────

const ownerFooter = (shop: string) => `${esc(shop)} admin alert &middot; sent by your store`;

export function ownerNewOrder(o: {
  shop: string;
  domain: string | null;
  number: string;
  total: string;
  items: EmailItem[];
  customer: string;
  contact: string;
  address: string;
  adminUrl: string | null;
}): Email {
  const html = layout({
    preheader: `${o.number} · ${o.total} · ${o.items.map((i) => `${i.title} ×${i.quantity}`).join(", ")}`,
    eyebrow: "New order",
    accent: "#3fae7a",
    body: `<div style="font-size:13px;color:${muted};">${esc(o.shop)}</div>
<div style="font-size:30px;font-weight:700;margin:4px 0 2px;">${esc(o.total)}</div>
<div style="font-size:15px;color:#3b3e44;">Order <strong>${esc(o.number)}</strong> &middot; paid</div>
${itemsTable(o.items, o.domain ? `https://${o.domain}` : null)}
<div style="margin-top:16px;font-size:14px;line-height:1.7;"><strong>${esc(o.customer)}</strong><br><span style="color:${muted};">${esc(o.contact)}</span><br>${esc(o.address)}</div>
${o.adminUrl ? button(o.adminUrl, "Open in admin") : ""}`,
    footer: ownerFooter(o.shop),
  });
  const text = `New paid order on ${o.shop}\n\n${o.number} · ${o.total}\n${o.items
    .map((i) => `  ${i.title} x ${i.quantity}   ${i.lineTotal}`)
    .join("\n")}\n\n${o.customer}\n${o.contact}\n${o.address}${o.adminUrl ? `\n\n${o.adminUrl}` : ""}`;
  return { subject: `New order ${o.number} · ${o.total}`, html, text };
}

export function ownerAlert(o: { shop: string; title: string; detail: string; what: string; adminUrl: string | null }): Email {
  const html = layout({
    preheader: o.detail,
    eyebrow: "Action needed",
    accent: "#d0507a",
    body: `${h1(esc(o.title))}
<div style="margin:6px 0 16px;padding:14px 16px;background:#fdf1f4;border:1px solid #f3c9d6;border-radius:10px;font-size:14px;line-height:1.55;color:#7a1f3d;">${esc(o.detail)}</div>
${p(esc(o.what))}
${o.adminUrl ? button(o.adminUrl, "Open in admin", "#b23a62") : ""}`,
    footer: ownerFooter(o.shop),
  });
  const text = `${o.title}\n\n${o.detail}\n\n${o.what}${o.adminUrl ? `\n\n${o.adminUrl}` : ""}`;
  return { subject: `${o.shop}: ${o.title}`, html, text };
}
