# Segurança e LGPD

- RBAC no servidor (`can()`); role do JWT não autoriza sozinha sem checagem
- Webhook Meta verificado; rate limit
- Logs via `maskForLog` / sem PII completa
- CPF não em listagens; telefone mascarado sem `view_sensitive_data`
- Secrets só em env; `.env` gitignored
- Documentos futuros: storage privado / URL assinada (S3 vars no example)
- Consent + RetentionPolicy já no schema
