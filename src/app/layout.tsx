import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const sans = Figtree({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Brisa Sales AI",
  description: "CRM de vendas assistidas por IA para telecomunicações Brisanet",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${sans.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
