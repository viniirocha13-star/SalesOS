import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Figtree } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const sans = Figtree({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PLIM AUTOMAÇÃO",
  description: "PLIM PROMOS — automação de afiliados sobre Sales OS",
  manifest: "/manifest.webmanifest",
  themeColor: "#7C3AED",
  appleWebApp: { capable: true, title: "PLIM" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${sans.variable} h-full antialiased`}>
      <head>
        <link rel="apple-touch-icon" href="/icons/plim-192.png" />
      </head>
      <body className="min-h-full font-sans">
        <Providers>{children}</Providers>
        <script src="/sw-register.js" defer />
      </body>
    </html>
  );
}
