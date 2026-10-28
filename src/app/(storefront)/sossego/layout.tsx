import type { Metadata } from "next";
import { Figtree, Syne } from "next/font/google";
import "./sossego.css";

const display = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  weight: ["600", "700", "800"],
});

const body = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
});

export const metadata: Metadata = {
  title: "Sossego | Almofadas ergonômicas para o corpo descansar",
  description:
    "O Sossego Original abraça suas curvas, alivia tensões e transforma a soneca em ritual. 30 noites para testar.",
};

export default function SossegoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${display.variable} ${body.variable} sossego-root`}>
      {children}
    </div>
  );
}
