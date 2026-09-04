import {
  Car,
  FileText,
  Landmark,
  MessageCircle,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import AnimatedContent from "../../components/ui/AnimatedContent";
import { LandingAuthActions } from "./LandingAuthActions";
import { MemphisPlusGrid } from "./LandingMemphisGraphics";

const features = [
  {
    step: "01",
    title: "Estoque",
    description:
      "Cadastro rápido com ficha FIPE, fotos em alta e sincronização automática nos maiores portais do Brasil.",
    tag: "Sincronização em tempo real",
    icon: Car,
  },
  {
    step: "02",
    title: "CRM WhatsApp",
    description:
      "Rodízio inteligente de leads para o vendedor da vez, funil de atendimento e pós-venda conectado.",
    tag: "Resposta ágil e histórico de conversas",
    icon: MessageCircle,
  },
  {
    step: "03",
    title: "Financiamento Multi-Banco",
    description:
      "Simulação e aprovação de crédito ágil com acesso direto às principais financeiras e bancos parceiros.",
    tag: "Múltiplas propostas em segundos",
    icon: Landmark,
  },
  {
    step: "04",
    title: "NFe e NFSe",
    description:
      "Notas fiscais de entrada, venda e consignação emitidas direto no fechamento com cálculo tributário automático.",
    tag: "Emissão oficial em 1 clique",
    icon: FileText,
  },
  {
    step: "05",
    title: "Financeiro & DRE",
    description:
      "Controle de custos de compra, despesas de oficina e cálculo automático de comissões por vendedor.",
    tag: "Lucro real calculado por placa",
    icon: Wallet,
  },
  {
    step: "06",
    title: "Auditoria e permissões",
    description:
      "Acessos restritos por papel: oculte margens de compra e registre cada ação operacional no sistema.",
    tag: "Segurança e rastreamento completo",
    icon: ShieldCheck,
  },
] as const;

export function FeatureSection() {
  return (
    <section
      className="relative px-5 py-24 sm:px-8 sm:py-32 lg:px-10 overflow-hidden"
      id="funcionalidades"
    >
      {/* Memphis Texture Accents */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-10 top-12 select-none opacity-20 hidden md:block"
      >
        <MemphisPlusGrid cols={4} rows={3} className="text-muted" />
      </div>

      <div className="mx-auto max-w-7xl">
        {/* Section Header */}
        <AnimatedContent>
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-red-500 font-bold">
                  ⌖
                </span>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-red-500">
                  Plataforma
                </p>
              </div>
              <h2 className="mt-3 font-display text-3xl font-extrabold uppercase tracking-tight text-app-text sm:text-5xl">
                Tudo o que a loja usa no dia a dia.
              </h2>
            </div>
            <LandingAuthActions primaryLabel="Conhecer o ERP" />
          </div>
        </AnimatedContent>

        {/* 3x2 Architectural Grid */}
        <div className="mt-16 grid divide-y divide-line/80 border-y border-line/80 md:grid-cols-2 md:divide-x md:divide-y-0 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <div
                key={feature.title}
                className="group relative flex flex-col justify-between overflow-hidden p-6 sm:p-8 lg:p-10 transition-colors duration-300 hover:bg-panel/40"
              >
                {/* Red Laser Accent on Top Edge */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-red-600 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                />

                {/* Ambient Corner Glow on Hover */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-16 -right-16 size-40 rounded-full bg-red-600/10 blur-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                />

                {/* Integrated Large Background Watermark Icon */}
                <Icon
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-6 -right-6 size-36 text-muted/10 stroke-[0.8] select-none transition-all duration-500 group-hover:scale-105 group-hover:text-red-500/15 group-hover:-translate-y-1"
                />

                {/* Corner Markers */}
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-muted/50 transition-colors duration-300 group-hover:text-red-500">
                    {feature.step}
                  </span>
                  <span className="font-mono text-xs text-muted/40 transition-colors duration-300 group-hover:text-red-500">
                    +
                  </span>
                </div>

                {/* Feature Content */}
                <div className="relative z-10 mt-6">
                  <Icon className="size-6 text-red-500 transition-transform duration-300 group-hover:scale-110" />

                  <h3 className="mt-6 font-display text-xl font-bold uppercase tracking-wide text-app-text transition-colors duration-200 group-hover:text-white dark:group-hover:text-white">
                    {feature.title}
                  </h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-muted text-pretty">
                    {feature.description}
                  </p>
                </div>

                {/* Footer Status with Slide-In Arrow */}
                <div className="relative z-10 mt-8 flex items-center justify-between border-t border-line/60 pt-4 text-xs font-mono text-muted transition-colors duration-300 group-hover:border-line-strong">
                  <p className="transition-colors duration-200 group-hover:text-app-text">
                    + {feature.tag}
                  </p>
                  <span
                    aria-hidden="true"
                    className="text-red-500 opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 font-bold"
                  >
                    →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
