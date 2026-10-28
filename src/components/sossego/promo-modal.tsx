"use client";

import { FormEvent, useEffect, useState } from "react";

export function PromoModal() {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);

  function dismiss() {
    try {
      window.sessionStorage.setItem("sossego-promo-dismissed", "1");
    } catch {
      // ignore storage failures
    }
    setOpen(false);
  }

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem("sossego-promo-dismissed") === "1") {
        return;
      }
    } catch {
      // ignore storage failures
    }
    const timer = window.setTimeout(() => setOpen(true), 700);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDone(true);
  }

  return (
    <div className="ss-modal-backdrop" role="presentation" onClick={dismiss}>
      <div
        className="ss-modal-shell"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ss-promo-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="ss-modal-close"
          aria-label="Fechar"
          onClick={dismiss}
        >
          ×
        </button>
        <div className="ss-modal">
          <div className="ss-modal-body">
            {done ? (
              <>
                <h2 id="ss-promo-title">Seu código chegou</h2>
                <p>
                  Use <strong>SOSSEGO10</strong> na primeira compra. Bom descanso —
                  de verdade.
                </p>
                <button type="button" className="ss-btn ss-btn-primary" onClick={dismiss}>
                  Continuar navegando
                </button>
              </>
            ) : (
              <>
                <h2 id="ss-promo-title">Desbloqueie 10% na primeira noite</h2>
                <p>
                  Entre com seu e-mail e receba um convite para testar o Sossego
                  Original com frete calmo e troca fácil.
                </p>
                <form onSubmit={onSubmit}>
                  <label className="sr-only" htmlFor="ss-email">
                    E-mail
                  </label>
                  <input
                    id="ss-email"
                    name="email"
                    type="email"
                    required
                    placeholder="seu@email.com"
                    autoComplete="email"
                  />
                  <button type="submit" className="ss-btn ss-btn-primary">
                    Quero meu desconto
                  </button>
                </form>
                <button type="button" className="ss-modal-dismiss" onClick={dismiss}>
                  Agora não
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
