# WhatsApp Cloud API

Fluxo:

```
Meta → GET/POST /api/whatsapp/webhook
  → valida token / HMAC SHA-256 (x-hub-signature-256 + META_APP_SECRET)
  → persiste WhatsAppInboundEvent (chave providerEventId / wamid)
  → enqueue PROCESS_INBOUND_WHATSAPP_MESSAGE
  → 200 rápido

Worker:
  PROCESS_INBOUND → Lead/Customer/Conversation + Message inbound
  GENERATE_AI_RESPONSE (debounce MESSAGE_BUFFER_MS, 3–6s)
  SEND_WHATSAPP_MESSAGE
```

## Configurar Meta (passo a passo)

1. Crie um app em [developers.facebook.com](https://developers.facebook.com/) com produto **WhatsApp**.
2. Copie **Phone number ID**, **WhatsApp Business Account ID**, **App Secret** e um **permanent access token**.
3. Defina um Verify Token (texto livre) e coloque no `.env` como `META_VERIFY_TOKEN` (e o mesmo valor em `WHATSAPP_VERIFY_TOKEN`).
4. Preencha:

```
WHATSAPP_PROVIDER=meta
META_APP_ID=
META_APP_SECRET=
META_VERIFY_TOKEN=
META_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_BUSINESS_ACCOUNT_ID=
```

5. Publique o webhook: `https://SEU_DOMINIO/api/whatsapp/webhook`
   - Em desenvolvimento use um tunnel (`ngrok http 43147` ou Cloudflare Tunnel) apontando para o mesmo path.
   - Callback verification: GET usa `hub.mode=subscribe` + `hub.verify_token`.
   - Assine o campo `messages`.
6. Suba **dois processos**:

```
npm run start    # WEB
npm run worker   # WORKER
```

7. Em Administração → Integrações, clique **Testar conexão**. O token nunca aparece na tela.
8. Envie um “Oi” do celular para o número Business. A conversa deve nascer no Inbox.

Idempotência: o mesmo `wamid` não cria Message nem job de novo.

Janela 24h: `WhatsAppPolicyService` / `WHATSAPP_SESSION_WINDOW_HOURS`.
