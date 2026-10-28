"use client";

import { useState } from "react";
import { PillowSvg } from "@/components/sossego/pillow-svg";

const covers = [
  { id: "nevoa", label: "Névoa", color: "#e8eef2" },
  { id: "areia", label: "Areia", color: "#d8c4a8" },
  { id: "musgo", label: "Musgo", color: "#5f9e8f" },
  { id: "noite", label: "Noite", color: "#2a3f4a" },
];

export function CoverPicker() {
  const [active, setActive] = useState(covers[0]);

  return (
    <div className="ss-covers">
      <div>
        <p className="ss-kicker">Capas avulsas</p>
        <h2 className="ss-title">Troque o look sem trocar o conforto</h2>
        <p className="ss-lede">
          Capas 100% algodão, hipoalergênicas e fáceis de lavar. Escolha a cor
          que combina com o seu quarto — e com o seu humor.
        </p>
        <div className="ss-swatches" role="listbox" aria-label="Cores de capa">
          {covers.map((cover) => (
            <button
              key={cover.id}
              type="button"
              className={`ss-swatch${active.id === cover.id ? " is-active" : ""}`}
              style={{ background: cover.color }}
              aria-label={cover.label}
              aria-selected={active.id === cover.id}
              onClick={() => setActive(cover)}
            />
          ))}
        </div>
        <p style={{ marginTop: "0.9rem", color: "var(--ss-ink-soft)" }}>
          Selecionado: <strong>{active.label}</strong>
        </p>
      </div>
      <div className="ss-product-media" aria-hidden="true" style={{ minHeight: "18rem" }}>
        <PillowSvg fill={active.color} accent="#3d7a6c" />
      </div>
    </div>
  );
}
