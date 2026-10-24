import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Announcement from "@/components/Announcement";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
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
    default: "TRINVO — Art you can carry",
    template: "%s · TRINVO",
  },
  description:
    "Art you can carry. Eight original designs, drawn in-house and printed full-wrap on one double-wall stainless barrel. Made in India.",
  openGraph: {
    title: "TRINVO — Art you can carry",
    description: "Art you can carry — eight original designs on one double-wall stainless barrel.",
    siteName: "TRINVO",
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
        <Nav />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
