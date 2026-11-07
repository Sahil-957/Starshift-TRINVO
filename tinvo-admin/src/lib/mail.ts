/**
 * Email through Gmail (an App Password, not the account password). Sends only
 * when SMTP_USER and SMTP_PASS are set, so dev and tests never send mail.
 * ponytail: Gmail allows ~500 messages a day; move to a domain sender
 * (e.g. orders@starshift.in via Resend) once volume or deliverability needs it.
 */
import nodemailer, { type Transporter } from "nodemailer";

let transport: Transporter | null = null;

export const mailEnabled = () => Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);

export async function sendMail(m: { to: string; subject: string; text: string; fromName?: string; replyTo?: string }) {
  if (!mailEnabled()) return false;
  transport ??= nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transport.sendMail({
    from: { name: m.fromName ?? "TINVO", address: process.env.SMTP_USER! },
    to: m.to,
    replyTo: m.replyTo,
    subject: m.subject,
    text: m.text,
  });
  return true;
}
