import Image from "next/image";
import { CoverPicker } from "@/components/sossego/cover-picker";
import { PillowSvg } from "@/components/sossego/pillow-svg";
import { PromoModal } from "@/components/sossego/promo-modal";
import { SiteHeader } from "@/components/sossego/site-header";

const packs = [
  {
    name: "Sossego Original",
    from: "R$ 139",
    price: "R$ 99",
    badge: "Mais amado",
    variant: "original" as const,
    fill: "#f2efe8",
  },
  {
    name: "Sossego Seda Mulberry",
    from: "R$ 259",
    price: "R$ 199",
    badge: "Toque seda",
    variant: "silk" as const,
    fill: "#e6d9c8",
  },
  {
    name: "Pack Soneca Completa",
    from: "R$ 249",
    price: "R$ 139",
    badge: "Kit",
    variant: "pack" as const,
    fill: "#e7ece8",
  },
];

const reviews = [
  {
    quote:
      "Estou no sexto mês e finalmente encontro uma posição sem dor no quadril. O Sossego segue o corpo — no sofá e na cama.",
    name: "Valéria",
    place: "Fortaleza, BR",
  },
  {
    quote:
      "Comprei para minha filha e ela dorme mais rápido. Surpresa boa. Já encomendei o meu.",
    name: "Nathalie",
    place: "Recife, BR",
  },
  {
    quote: "Parece dormir dentro de um casulo. Sem exagero.",
    name: "Elise",
    place: "Curitiba, BR",
  },
  {
    quote:
      "De lado, de costas, de bruços — acordo sem aquela tensão no pescoço. Meu marido pediu o segundo.",
    name: "Isabelle",
    place: "São Paulo, BR",
  },
  {
    quote:
      "Mudou meu sono. A promessa se sustenta. Agora até as crianças têm um.",
    name: "Carl",
    place: "Belo Horizonte, BR",
  },
  {
    quote:
      "Perfeito para ler no sofá. O único problema: todo mundo em casa quer o mesmo.",
    name: "Léa",
    place: "Salvador, BR",
  },
];

export default function SossegoPage() {
  return (
    <>
      <div id="topo" className="ss-announcement">
        Frete Brasil a partir de R$ 120 · 30 noites de teste · Parcelamento sem juros
      </div>
      <SiteHeader />

      <main>
        <section className="ss-hero" aria-label="Destaque">
          <div className="ss-hero-media">
            <Image
              src="https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=2000&q=80"
              alt="Quarto sereno com cama arrumada e luz suave"
              fill
              priority
              sizes="100vw"
            />
            <div className="ss-hero-overlay" />
          </div>
          <div className="ss-hero-content">
            <p className="ss-brand-mark">sossego</p>
            <p className="ss-hero-copy">
              O travesseiro ergonômico que abraça o corpo inteiro — para dormir,
              ler e simplesmente desligar.
            </p>
            <div className="ss-cta-row">
              <a className="ss-btn ss-btn-primary" href="#packs">
                Descobrir packs
              </a>
              <a className="ss-btn ss-btn-ghost" href="#original">
                Ver o Original
              </a>
            </div>
          </div>
        </section>

        <section className="ss-section" id="packs">
          <div className="ss-section-head">
            <p className="ss-kicker">Coleção</p>
            <h2 className="ss-title">Nossos packs para descansar de verdade</h2>
            <p className="ss-lede">
              Do clássico ao toque seda. Escolha o ritmo da sua noite — ou monte
              o ritual completo.
            </p>
          </div>
          <div className="ss-product-grid">
            {packs.map((pack) => (
              <a key={pack.name} className="ss-product" href="#original">
                <div className="ss-product-media">
                  <span className="ss-badge">{pack.badge}</span>
                  <PillowSvg variant={pack.variant} fill={pack.fill} />
                </div>
                <div className="ss-product-meta">
                  <h3>{pack.name}</h3>
                  <div className="ss-price">
                    <s>{pack.from}</s>
                    <strong>a partir de {pack.price}</strong>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>

        <section className="ss-section" id="missao">
          <div className="ss-mission">
            <div className="ss-mission-visual" aria-hidden="true">
              <PillowSvg fill="#f3efe7" accent="#5f9e8f" />
            </div>
            <div className="ss-mission-copy">
              <p className="ss-kicker">Nossa missão</p>
              <h2 className="ss-title">Chega de almofada que some no meio da noite</h2>
              <p>
                Procurávamos o apoio que o mercado prometia e quase nunca
                entregava: pouco volume, pouco suporte, zero carinho pelo corpo.
                O Sossego Original nasceu desse desconforto — literalmente.
              </p>
              <p>
                Formato longo que acompanha coluna, joelhos e cabeça. Tamanho
                generoso para quem dorme de lado, de costas ou só quer um ninho
                no sofá. Menos tensão. Mais silêncio interno.
              </p>
            </div>
          </div>
        </section>

        <section className="ss-section" id="original">
          <div className="ss-mission">
            <div>
              <p className="ss-kicker">Produto estrela</p>
              <h2 className="ss-title">Sossego Original</h2>
              <div className="ss-price" style={{ marginBottom: "1rem" }}>
                <s>R$ 139</s>
                <strong>R$ 99</strong>
              </div>
              <ul className="ss-feature-list">
                <li>
                  <span>
                    <strong>Apoio completo:</strong> coluna, joelhos e cabeça no
                    mesmo abraço.
                  </span>
                </li>
                <li>
                  <span>
                    <strong>Manhãs mais leves:</strong> menos tensão muscular ao
                    acordar.
                  </span>
                </li>
                <li>
                  <span>
                    <strong>Capa removível:</strong> lava fácil, mantém o frescor.
                  </span>
                </li>
                <li>
                  <span>
                    <strong>Tecidos cuidados:</strong> toque macio, respirável e
                    feito para o dia a dia.
                  </span>
                </li>
              </ul>
              <div className="ss-cta-row" style={{ marginTop: "1.5rem" }}>
                <a className="ss-btn ss-btn-primary" href="#contato">
                  Quero o Original
                </a>
              </div>
            </div>
            <div className="ss-product-media" style={{ minHeight: "22rem" }}>
              <span className="ss-badge">30 noites de teste</span>
              <PillowSvg fill="#f7f4ee" accent="#3d7a6c" />
            </div>
          </div>
        </section>

        <section className="ss-comfort">
          <div className="ss-comfort-band">
            <Image
              src="https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1800&q=80"
              alt="Ambiente aconchegante com roupa de cama clara"
              fill
              sizes="100vw"
            />
            <div className="ss-comfort-overlay" />
            <div className="ss-comfort-copy">
              <h2>Oferecemos alívio, não só enchimento</h2>
              <p>
                Esqueça a dor por alguns minutos. Afunde no Sossego e deixe o
                corpo encontrar o ângulo certo — na soneca, no filme, na noite
                inteira.
              </p>
            </div>
          </div>
        </section>

        <section className="ss-section ss-reviews-wrap" id="reviews">
          <div className="ss-section-head">
            <p className="ss-kicker">Comunidade</p>
            <h2 className="ss-title">Já são milhares de noites mais calmas</h2>
          </div>
          <div className="ss-reviews-track" aria-label="Depoimentos">
            {[...reviews, ...reviews].map((review, index) => (
              <article className="ss-review" key={`${review.name}-${index}`}>
                <div className="ss-stars" aria-label="5 de 5">
                  ★★★★★
                </div>
                <p>“{review.quote}”</p>
                <footer>
                  {review.name}
                  <span>{review.place}</span>
                </footer>
              </article>
            ))}
          </div>
        </section>

        <section className="ss-section">
          <CoverPicker />
        </section>

        <section className="ss-section">
          <div className="ss-accessory">
            <div className="ss-accessory-media" aria-hidden="true">
              <PillowSvg variant="mask" />
            </div>
            <div>
              <p className="ss-kicker">Novo</p>
              <h2 className="ss-title">Sossego Mask — blackout total</h2>
              <div className="ss-price" style={{ margin: "0.6rem 0 1rem" }}>
                <strong>R$ 35</strong>
              </div>
              <p className="ss-lede">
                A máscara que some com a luz sem apertar as pálpebras. Ajuste
                infinito, tecido respirável, lavável na máquina.
              </p>
              <ul className="ss-feature-list">
                <li>
                  <span>100% de escurecimento para sono mais profundo</span>
                </li>
                <li>
                  <span>Sem pressão nos cílios</span>
                </li>
                <li>
                  <span>Inclui saquinho de viagem</span>
                </li>
              </ul>
              <div className="ss-cta-row" style={{ marginTop: "1.25rem" }}>
                <a className="ss-btn ss-btn-ink" href="#contato">
                  Adicionar máscara
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="ss-section ss-contact" id="contato">
          <p className="ss-kicker">Fale conosco</p>
          <h2 className="ss-title">Uma dúvida? A gente responde em até 1 dia útil</h2>
          <p className="ss-lede" style={{ margin: "0 auto 1rem" }}>
            Marina e Theo cuidam do atendimento com o mesmo cuidado que colocamos
            no enchimento.
          </p>
          <p>
            <a href="mailto:ola@sossego.store">ola@sossego.store</a>
            <br />
            (85) 4000-0000
          </p>
        </section>
      </main>

      <footer className="ss-footer">
        <span>© {new Date().getFullYear()} Sossego</span>
        <span>Feito para noites mais leves</span>
      </footer>

      <PromoModal />
    </>
  );
}
