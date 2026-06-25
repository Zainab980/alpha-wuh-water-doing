import { textVariants } from "@govtech-bb/react";
import type { Metadata } from "next";
import { figtree } from "@/lib/fonts";
import "./globals.css";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";

export const metadata: Metadata = {
  title: {
    template: "%s | alpha.gov.bb",
    default: "Wuh Water Doing? — Barbados water outages near you",
  },
  description:
    "See current Barbados Water Authority outages and planned shut-offs on a map. Pick your area to find out if your water is affected and when it should be back.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html className="bg-blue-100" lang="en">
      <body
        className={`${figtree.variable} ${textVariants({ size: "body" })} grid min-h-screen grid-rows-[auto_1fr_auto] bg-white-00 font-sans antialiased`}
      >
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
