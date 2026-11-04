import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Announcement from "@/components/Announcement";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { checkoutEnabled } from "@/lib/admin-api";
import "./globals.css";

const sans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "TINVO — Make every sip your style",
    template: "%s · TINVO",
  },
  description:
    "Make every sip your style. Ten TINVO designs, from liquid-foil prints to solid colours, printed full-wrap on a 20 oz double-wall 304 stainless tumbler with a splash-proof lid and metal straw. Made in India.",
  openGraph: {
    title: "TINVO — Make every sip your style",
    description: "Ten designs on one 20 oz double-wall stainless tumbler. Not just another tumbler.",
    siteName: "TINVO",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-void">
        <Announcement />
        <Nav checkout={checkoutEnabled} />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
