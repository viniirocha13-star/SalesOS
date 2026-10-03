/**
 * Links oficiais exibidos ao usuário sempre que uma etapa depende de ação externa
 * (Meta, pagamento, infraestrutura). Centralizados para manter a interface e a
 * documentação consistentes. Nenhum preço ou regra comercial é copiado daqui para o código.
 */
export type HelpLink = { label: string; href: string; hint?: string };

export const HELP_LINKS = {
  metaApps: {
    label: "Painel de apps da Meta",
    href: "https://developers.facebook.com/apps/",
    hint: "Onde o dono da plataforma cria o app e obtém META_APP_ID e META_APP_SECRET.",
  },
  cloudApiGetStarted: {
    label: "Primeiros passos — WhatsApp Cloud API",
    href: "https://developers.facebook.com/docs/whatsapp/cloud-api/get-started",
  },
  embeddedSignup: {
    label: "Embedded Signup (cadastro incorporado)",
    href: "https://developers.facebook.com/docs/whatsapp/embedded-signup",
    hint: "Gera o META_CONFIG_ID usado pelo botão “Conectar Meta”.",
  },
  techProvider: {
    label: "Programa de Tech Providers / Solution Partners",
    href: "https://developers.facebook.com/docs/whatsapp/solution-providers",
    hint: "Necessário para administrar ativos de outras empresas.",
  },
  businessVerification: {
    label: "Verificação da empresa no Business Manager",
    href: "https://www.facebook.com/business/help/2058515294227817",
  },
  businessManager: {
    label: "Meta Business Manager",
    href: "https://business.facebook.com/",
  },
  paymentMethod: {
    label: "Adicionar forma de pagamento (cobrança da Meta)",
    href: "https://www.facebook.com/business/help/488291839463771",
  },
  systemUserToken: {
    label: "Token de usuário do sistema (conexão manual)",
    href: "https://developers.facebook.com/docs/whatsapp/business-management-api/get-started",
  },
  phoneRegistration: {
    label: "Registrar número (register / PIN)",
    href: "https://developers.facebook.com/docs/whatsapp/cloud-api/reference/registration",
  },
  phoneVerification: {
    label: "Verificar número (request_code / verify_code)",
    href: "https://developers.facebook.com/docs/whatsapp/cloud-api/reference/phone-numbers",
  },
  webhooks: {
    label: "Configurar webhooks da Cloud API",
    href: "https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks",
  },
  templates: {
    label: "Templates de mensagem (Business Management API)",
    href: "https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates",
  },
  templateCategories: {
    label: "Diretrizes de categoria: Marketing, Utilidade e Autenticação",
    href: "https://developers.facebook.com/docs/whatsapp/updates-to-pricing/new-template-guidelines",
  },
  pricingDocs: {
    label: "Preços por mercado e categoria (documentação)",
    href: "https://developers.facebook.com/docs/whatsapp/pricing",
  },
  pricingSite: {
    label: "Tabela comercial de preços da plataforma",
    href: "https://business.whatsapp.com/products/platform-pricing",
  },
  messagingLimits: {
    label: "Limites de envio e qualidade do número",
    href: "https://developers.facebook.com/docs/whatsapp/messaging-limits",
  },
  errorCodes: {
    label: "Códigos de erro da Cloud API",
    href: "https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes",
  },
  optIn: {
    label: "Regras de opt-in (consentimento)",
    href: "https://developers.facebook.com/docs/whatsapp/overview/getting-opt-in",
  },
  businessPolicy: {
    label: "Política comercial do WhatsApp",
    href: "https://business.whatsapp.com/policy",
  },
  n8n: { label: "Documentação do n8n (automações opcionais)", href: "https://docs.n8n.io/" },
  sentry: {
    label: "Sentry para Next.js",
    href: "https://docs.sentry.io/platforms/javascript/guides/nextjs/",
  },
  railway: { label: "Railway (deploy)", href: "https://docs.railway.com/" },
  stripe: { label: "Stripe", href: "https://docs.stripe.com/" },
  mercadoPago: { label: "Mercado Pago Developers", href: "https://www.mercadopago.com.br/developers" },
  lgpdLaw: {
    label: "LGPD — Lei 13.709/2018",
    href: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm",
  },
  anpd: { label: "ANPD", href: "https://www.gov.br/anpd/pt-br" },
} as const satisfies Record<string, HelpLink>;

export type HelpLinkKey = keyof typeof HELP_LINKS;

/** Links sugeridos para cada verificação do diagnóstico que falhar. */
export const DIAGNOSTIC_HELP: Record<string, HelpLinkKey[]> = {
  meta_connected: ["embeddedSignup", "systemUserToken"],
  token_valid: ["systemUserToken", "embeddedSignup"],
  waba: ["businessManager", "cloudApiGetStarted"],
  phone: ["phoneRegistration", "phoneVerification"],
  webhook: ["webhooks"],
  live_sync: ["errorCodes", "businessVerification"],
  billing: ["paymentMethod"],
  template: ["templates", "templateCategories"],
};

export function helpLinks(keys: readonly HelpLinkKey[]): HelpLink[] {
  return keys.map((k) => HELP_LINKS[k]);
}
