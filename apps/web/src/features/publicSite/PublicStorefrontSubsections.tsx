import {
  Star,
  UserRound,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  MessageCircle,
} from "lucide-react";
import {
  readString,
  readTestimonials,
  type VisibleStorefrontSection,
} from "./publicStorefrontTheme";
import type {
  PublicStorefrontData,
  PublicStorefrontSettingsData,
} from "./types";

export function AboutSection({
  data,
}: {
  data: PublicStorefrontData & { settings: PublicStorefrontSettingsData };
}) {
  const theme = data.settings.site.theme;
  const imageUrl = readString(theme.aboutImageUrl);
  return (
    <section className="border-b border-line bg-panel">
      <div className="public-storefront-shell grid gap-12 px-6 py-16 md:grid-cols-2 md:py-20 lg:py-24">
        <div className="flex min-w-0 flex-col justify-center">
          <p className="text-xs font-black uppercase tracking-[0.26em] text-accent-strong">
            Nossa História
          </p>
          <h2 className="mt-1.5 text-3xl font-extrabold tracking-tight md:text-4xl text-app-text uppercase">
            {readString(theme.aboutTitle) ?? data.settings.store.name}
          </h2>
          <p className="mt-6 whitespace-pre-wrap text-sm font-medium leading-relaxed text-muted">
            {readString(theme.aboutText) ??
              "Atendimento diferenciado, estoque selecionado e canais oficiais para garantir a melhor experiência na compra do seu veículo."}
          </p>

          {/* Trust points */}
          <div className="mt-8 grid gap-4 grid-cols-2">
            <div className="p-4 rounded border border-line bg-app">
              <span className="block text-lg font-extrabold text-accent">
                100%
              </span>
              <span className="block text-xs font-black uppercase text-muted tracking-wider mt-1">
                Laudo Aprovado
              </span>
            </div>
            <div className="p-4 rounded border border-line bg-app">
              <span className="block text-lg font-extrabold text-accent">
                Garantia
              </span>
              <span className="block text-xs font-black uppercase text-muted tracking-wider mt-1">
                Procedência
              </span>
            </div>
          </div>
        </div>

        {imageUrl ? (
          <div className="overflow-hidden rounded-lg border border-line bg-app shadow-lg aspect-[4/3]">
            <img
              alt=""
              className="size-full object-cover transition-transform duration-700 hover:scale-[1.02]"
              src={imageUrl}
            />
          </div>
        ) : (
          <div className="grid aspect-[4/3] place-items-center rounded-lg bg-app text-muted border border-line">
            <UserRound aria-hidden="true" className="size-10 text-muted/50" />
          </div>
        )}
      </div>
    </section>
  );
}

export function TestimonialsSection({
  theme,
}: {
  theme: Record<string, unknown>;
}) {
  const testimonials = readTestimonials(theme.testimonials);
  if (!testimonials.length) return null;
  return (
    <section className="border-b border-line bg-app">
      <div className="public-storefront-shell px-6 py-16 md:py-20 lg:py-24">
        <p className="text-xs font-black uppercase tracking-[0.26em] text-accent">
          DEPOIMENTOS
        </p>
        <h2 className="mt-1.5 text-3xl font-extrabold tracking-tight md:text-4xl text-app-text">
          O que dizem nossos clientes
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {testimonials.map((testimonial) => {
            const imageSrc = readString(testimonial.imageSrc);
            return (
              <article
                className="public-editorial-card rounded-lg p-6 transition-all duration-300 hover:-translate-y-1 hover:border-accent/30 hover:shadow-lg"
                key={testimonial.id}
              >
                <div className="flex gap-1 text-accent">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Star
                      key={i}
                      aria-hidden="true"
                      className="size-3.5 fill-current"
                    />
                  ))}
                </div>
                <p className="mt-4 text-xs font-semibold leading-relaxed text-app-text italic">
                  "{testimonial.quote}"
                </p>
                <div className="mt-4 flex items-center justify-between gap-4 border-t border-line/60 pt-4">
                  <div className="flex min-w-0 items-center gap-3">
                    {imageSrc ? (
                      <img
                        alt=""
                        className="size-12 shrink-0 rounded-full border border-line bg-app object-cover"
                        src={imageSrc}
                      />
                    ) : (
                      <span className="grid size-12 shrink-0 place-items-center rounded-full border border-line bg-app text-muted">
                        <UserRound aria-hidden="true" className="size-5" />
                      </span>
                    )}
                    <div className="min-w-0">
                      <strong className="block truncate text-xs font-bold text-app-text">
                        {testimonial.name}
                      </strong>
                      <span className="mt-0.5 block truncate text-xs font-semibold text-muted">
                        {testimonial.role}
                      </span>
                    </div>
                  </div>
                  <span className="shrink-0 rounded bg-accent-soft px-2 py-0.5 text-xs font-black uppercase tracking-widest text-accent/70">
                    Cliente Verificado
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export const proofItems = [
  {
    icon: CheckCircle2,
    key: "featured",
    label: "Procedência & Laudo Aprovado",
  },
  { icon: ShieldCheck, key: "trust", label: "Lojista Credenciado" },
  { icon: MessageCircle, key: "financing", label: "Financiamento Facilitado" },
];

export function BrandMark({
  logoUrl,
  photoUrl,
}: {
  logoUrl: string | null;
  photoUrl: string | null;
}) {
  const img = logoUrl ?? photoUrl;
  return img ? (
    <img
      alt=""
      className="size-10 shrink-0 rounded border border-line bg-panel object-cover shadow-sm"
      src={img}
    />
  ) : (
    <div className="flex size-10 shrink-0 items-center justify-center rounded bg-accent/10 text-accent border border-accent/20 shadow-sm">
      <Sparkles aria-hidden="true" className="size-4" />
    </div>
  );
}

export function createVisibleProofItems(
  sections: readonly VisibleStorefrontSection[],
) {
  const types = new Set(sections.map((s) => s.type));
  return proofItems.filter((item) => {
    if (item.key === "featured")
      return (
        types.has("featured") ||
        types.has("all_properties") ||
        types.has("search")
      );
    if (item.key === "financing") return types.has("contact");
    return true;
  });
}
