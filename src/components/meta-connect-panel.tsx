"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, AlertTriangle, RefreshCw, Unplug, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  canManage: boolean;
  connection: {
    status: string;
    businessName?: string | null;
    businessId?: string | null;
    tokenSource?: string | null;
    lastSyncedAt?: string | null;
    lastError?: string | null;
    tokenValid: boolean;
    tokenExpiresAt?: string | null;
  };
  wabas: { id: string; wabaId: string; name: string | null; subscribedApp: boolean }[];
  phones: {
    id: string;
    displayPhoneNumber: string;
    verifiedName: string | null;
    status: string;
    qualityRating: string | null;
    messagingLimitTier: string | null;
    isDefault: boolean;
  }[];
  embeddedSignup: { appId: string; configId: string; configured: boolean };
};

const STATUS_PT: Record<string, string> = {
  NOT_CONNECTED: "Não conectado",
  CONNECTING: "Conectando",
  CONNECTED: "Conectado",
  ACTION_REQUIRED: "Requer ação",
  TOKEN_EXPIRED: "Token expirado",
  ERROR: "Erro",
};

declare global {
  interface Window {
    FB?: {
      init: (opts: Record<string, unknown>) => void;
      login: (
        cb: (response: {
          authResponse?: { code?: string; accessToken?: string };
          status?: string;
        }) => void,
        opts: Record<string, unknown>,
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

export function MetaConnectPanel({ canManage, connection, wabas, phones, embeddedSignup }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [manualToken, setManualToken] = useState("");
  const [manualWaba, setManualWaba] = useState("");
  const [sdkReady, setSdkReady] = useState(false);
  const [pin, setPin] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [selectedPhone, setSelectedPhone] = useState(phones[0]?.id ?? "");
  const connected = connection.status === "CONNECTED";

  useEffect(() => {
    if (!embeddedSignup.configured || !embeddedSignup.appId) return;
    window.fbAsyncInit = () => {
      window.FB?.init({
        appId: embeddedSignup.appId,
        autoLogAppEvents: true,
        xfbml: true,
        version: "v21.0",
      });
      setSdkReady(true);
    };
    if (document.getElementById("facebook-jssdk")) {
      setSdkReady(Boolean(window.FB));
      return;
    }
    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.src = "https://connect.facebook.net/pt_BR/sdk.js";
    script.async = true;
    document.body.appendChild(script);
  }, [embeddedSignup.appId, embeddedSignup.configured]);

  async function call(path: string, body?: unknown, label = "acao") {
    setBusy(label);
    setError("");
    setMessage("");
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Falha na operação.");
        return;
      }
      setMessage(data.message ?? "Atualizado com sucesso.");
      router.refresh();
    } catch {
      setError("Falha de rede.");
    } finally {
      setBusy(null);
    }
  }

  function startEmbeddedSignup() {
    if (!embeddedSignup.configured) {
      setError(
        "Embedded Signup ainda não configurado (META_APP_ID / META_CONFIG_ID). Use conexão manual ou peça ao administrador da plataforma.",
      );
      return;
    }
    if (!window.FB || !sdkReady) {
      setError("SDK da Meta ainda carregando. Aguarde alguns segundos e tente de novo.");
      return;
    }
    setBusy("embedded");
    setError("");
    window.FB.login(
      (response) => {
        const code = response.authResponse?.code;
        if (!code) {
          setBusy(null);
          setError("Autorização cancelada ou sem código. Tente novamente ou use o token manual.");
          return;
        }
        void call(
          "/api/meta/connect",
          { mode: "embedded", code },
          "embedded",
        );
      },
      {
        config_id: embeddedSignup.configId,
        response_type: "code",
        override_default_response_type: true,
        extras: { setup: {}, featureType: "", sessionInfoVersion: "3" },
      },
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "flex size-11 items-center justify-center rounded-xl",
                connected ? "bg-[#e8f8f0] text-[#148a52]" : "bg-amber-50 text-amber-700",
              )}
            >
              {connected ? <CircleCheck className="size-5" /> : <AlertTriangle className="size-5" />}
            </span>
            <div>
              <h2 className="text-[15px] font-semibold">Status da conexão</h2>
              <p className="mt-0.5 text-sm text-slate-500">
                {STATUS_PT[connection.status] ?? connection.status}
                {connection.businessName ? ` · ${connection.businessName}` : ""}
              </p>
              <p className="mt-1 text-[12px] text-slate-400">
                Token: {connection.tokenValid ? "válido (criptografado no vault)" : "ausente ou inválido"}
                {connection.lastSyncedAt
                  ? ` · sync ${new Date(connection.lastSyncedAt).toLocaleString("pt-BR")}`
                  : ""}
                {embeddedSignup.configured
                  ? sdkReady
                    ? " · SDK Meta pronto"
                    : " · carregando SDK…"
                  : " · Embedded Signup pendente de config"}
              </p>
              {connection.lastError && (
                <p className="mt-2 text-sm text-red-600">{connection.lastError}</p>
              )}
            </div>
          </div>
          {canManage && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy !== null}
                onClick={startEmbeddedSignup}
                className="inline-flex h-9 items-center rounded-xl bg-[#1fad6c] px-3 text-sm font-semibold text-white hover:bg-[#18965c] disabled:opacity-60"
              >
                Conectar Meta
              </button>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void call("/api/meta/sync", undefined, "sync")}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-sm font-medium hover:bg-slate-50 disabled:opacity-60"
              >
                <RefreshCw className={cn("size-3.5", busy === "sync" && "animate-spin")} />
                Sincronizar
              </button>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void call("/api/meta/diagnose", undefined, "diag")}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-sm font-medium hover:bg-slate-50"
              >
                <Stethoscope className="size-3.5" />
                Diagnosticar
              </button>
              {connected && (
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void call("/api/meta/disconnect", undefined, "disc")}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-red-200 px-3 text-sm font-medium text-red-700 hover:bg-red-50"
                >
                  <Unplug className="size-3.5" />
                  Desconectar
                </button>
              )}
            </div>
          )}
        </div>
        {message && <p className="mt-4 text-sm text-[#148a52]">{message}</p>}
        {error && (
          <p role="alert" className="mt-4 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-[15px] font-semibold">WhatsApp Business Accounts</h2>
        {wabas.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">Nenhuma WABA sincronizada ainda.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {wabas.map((w) => (
              <li key={w.id} className="flex justify-between gap-3 py-2.5 text-sm">
                <span className="font-medium">{w.name ?? w.wabaId}</span>
                <span className="text-slate-400">{w.subscribedApp ? "App inscrito" : "App pendente"}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-[15px] font-semibold">Números</h2>
        {phones.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">Nenhum número. Conecte a Meta e sincronize.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {phones.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="font-medium">
                    {p.displayPhoneNumber}
                    {p.isDefault && (
                      <span className="ml-2 rounded-full bg-[#e8f8f0] px-1.5 py-0.5 text-[10px] font-semibold text-[#148a52]">
                        PADRÃO
                      </span>
                    )}
                  </p>
                  <p className="text-[12px] text-slate-400">
                    {p.verifiedName ?? "—"} · {p.status} · qualidade {p.qualityRating ?? "—"} · limite{" "}
                    {p.messagingLimitTier ?? "—"}
                  </p>
                </div>
                {canManage && !p.isDefault && (
                  <button
                    type="button"
                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                    onClick={() => void call("/api/phone-numbers/default", { phoneNumberId: p.id }, "def")}
                  >
                    Usar como padrão
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {canManage && phones.length > 0 && (
          <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-4">
            <p className="text-sm font-medium">Registrar / verificar número</p>
            <p className="text-[12px] text-slate-500">
              Fluxo guiado no painel — sem Postman. Envie o código, confirme e registre com PIN de 6 dígitos.
            </p>
            <select
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
              value={selectedPhone}
              onChange={(e) => setSelectedPhone(e.target.value)}
            >
              {phones.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.displayPhoneNumber} · {p.status}
                </option>
              ))}
            </select>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy !== null}
                className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium"
                onClick={() =>
                  void call(
                    "/api/phone-numbers/register",
                    { phoneNumberId: selectedPhone, action: "request_code", method: "SMS" },
                    "code",
                  )
                }
              >
                Enviar código
              </button>
              <input
                className="h-9 w-28 rounded-xl border border-slate-200 px-2 text-sm"
                placeholder="Código"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value)}
              />
              <button
                type="button"
                disabled={busy !== null || !verifyCode}
                className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium disabled:opacity-50"
                onClick={() =>
                  void call(
                    "/api/phone-numbers/register",
                    { phoneNumberId: selectedPhone, action: "verify_code", code: verifyCode },
                    "verify",
                  )
                }
              >
                Confirmar
              </button>
              <input
                className="h-9 w-28 rounded-xl border border-slate-200 px-2 text-sm"
                placeholder="PIN 6 dígitos"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                maxLength={6}
              />
              <button
                type="button"
                disabled={busy !== null || pin.length !== 6}
                className="h-9 rounded-xl bg-slate-900 px-3 text-sm font-medium text-white disabled:opacity-50"
                onClick={() =>
                  void call(
                    "/api/phone-numbers/register",
                    { phoneNumberId: selectedPhone, action: "register", pin },
                    "reg",
                  )
                }
              >
                Registrar
              </button>
            </div>
          </div>
        )}
      </div>

      {canManage && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
          <h2 className="text-[15px] font-semibold">Conexão manual (fallback)</h2>
          <p className="mt-1 text-sm text-slate-500">
            Use só se o Embedded Signup não estiver disponível. O token é criptografado e nunca volta ao browser.
          </p>
          <div className="mt-3 space-y-2">
            <input
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
              placeholder="Access token permanente da Meta"
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              type="password"
              autoComplete="off"
            />
            <input
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
              placeholder="WABA ID (opcional — sync descobre se omitido)"
              value={manualWaba}
              onChange={(e) => setManualWaba(e.target.value)}
            />
            <button
              type="button"
              disabled={!manualToken || busy !== null}
              onClick={() =>
                void call(
                  "/api/meta/connect",
                  { mode: "manual", accessToken: manualToken, wabaId: manualWaba || undefined },
                  "manual",
                )
              }
              className="h-10 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              Salvar token criptografado e sincronizar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
