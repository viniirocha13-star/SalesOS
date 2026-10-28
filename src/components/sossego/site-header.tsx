"use client";

import { useEffect, useState } from "react";

const links = [
  { href: "#packs", label: "Packs" },
  { href: "#original", label: "Original" },
  { href: "#missao", label: "Missão" },
  { href: "#reviews", label: "Reviews" },
  { href: "#contato", label: "Contato" },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`ss-header${scrolled ? " is-scrolled" : ""}`}>
      <a className="ss-logo" href="#topo">
        sossego
      </a>
      <nav className="ss-nav" aria-label="Principal">
        {links.map((link) => (
          <a key={link.href} href={link.href}>
            {link.label}
          </a>
        ))}
      </nav>
      <div className="ss-header-actions">
        <a className="ss-btn ss-btn-ink" href="#original" style={{ minHeight: "2.5rem", padding: "0.45rem 1rem" }}>
          Comprar
        </a>
        <button type="button" className="ss-cart" aria-label="Carrinho">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M6 7h12l-1 12H7L6 7Z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
            <path
              d="M9 7a3 3 0 0 1 6 0"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </header>
  );
}
