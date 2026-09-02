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

        {/* 3x2 Architectural Grid with Integrated Background Watermark Icons */}
        <div className="mt-16 grid divide-y divide-line/80 border-y border-line/80 md:grid-cols-2 md:divide-x md:divide-y-0 lg:grid-cols-3">
          {/* Feature 1: Estoque */}
          <div className="group relative flex flex-col justify-between overflow-hidden p-6 sm:p-8 lg:p-10 transition-colors hover:bg-panel/30">
            {/* Integrated Large Background Watermark Icon */}
            <Car
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-6 -right-6 size-36 text-muted/10 stroke-[0.8] select-none transition-all duration-500 group-hover:scale-110 group-hover:text-red-500/15"
            />
            <span className="absolute top-3 right-3 font-mono text-xs text-muted">
              +
            </span>
            <div className="relative z-10">
              <Car className="size-6 text-red-500" />
              <h3 className="mt-6 font-display text-xl font-bold uppercase tracking-wide text-app-text">
                Estoque
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Cadastro rápido com ficha FIPE, fotos em alta e sincronização
                automática nos maiores portais do Brasil.
              </p>
            </div>
            <div className="relative z-10 mt-8 border-t border-line/60 pt-4 text-xs font-mono text-muted">
              <p>+ Sincronização em tempo real</p>
            </div>
          </div>

          {/* Feature 2: CRM WhatsApp */}
          <div className="group relative flex flex-col justify-between overflow-hidden p-6 sm:p-8 lg:p-10 transition-colors hover:bg-panel/30">
            {/* Integrated Large Background Watermark Icon */}
            <MessageCircle
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-6 -right-6 size-36 text-muted/10 stroke-[0.8] select-none transition-all duration-500 group-hover:scale-110 group-hover:text-red-500/15"
            />
            <span className="absolute top-3 right-3 font-mono text-xs text-muted">
              +
            </span>
            <div className="relative z-10">
              <MessageCircle className="size-6 text-red-500" />
              <h3 className="mt-6 font-display text-xl font-bold uppercase tracking-wide text-app-text">
                CRM WhatsApp
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Rodízio inteligente de leads para o vendedor da vez, funil de
                atendimento e pós-venda conectado.
              </p>
            </div>
            <div className="relative z-10 mt-8 border-t border-line/60 pt-4 text-xs font-mono text-muted">
              <p>+ Resposta ágil e histórico de conversas</p>
            </div>
          </div>

          {/* Feature 3: Financiamento Multi-Banco */}
          <div className="group relative flex flex-col justify-between overflow-hidden p-6 sm:p-8 lg:p-10 transition-colors hover:bg-panel/30">
            {/* Integrated Large Background Watermark Icon */}
            <Landmark
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-6 -right-6 size-36 text-muted/10 stroke-[0.8] select-none transition-all duration-500 group-hover:scale-110 group-hover:text-red-500/15"
            />
            <span className="absolute top-3 right-3 font-mono text-xs text-muted">
              +
            </span>
            <div className="relative z-10">
              <Landmark className="size-6 text-red-500" />
              <h3 className="mt-6 font-display text-xl font-bold uppercase tracking-wide text-app-text">
                Financiamento Multi-Banco
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Simulação e aprovação de crédito ágil com acesso direto às
                principais financeiras e bancos parceiros.
              </p>
            </div>
            <div className="relative z-10 mt-8 border-t border-line/60 pt-4 text-xs font-mono text-muted">
              <p>+ Múltiplas propostas em segundos</p>
            </div>
          </div>
        </div>

        {/* Row 2 */}
        <div className="grid divide-y divide-line/80 border-b border-line/80 md:grid-cols-2 md:divide-x md:divide-y-0 lg:grid-cols-3">
          {/* Feature 4: NFe e NFSe */}
          <div className="group relative flex flex-col justify-between overflow-hidden p-6 sm:p-8 lg:p-10 transition-colors hover:bg-panel/30">
            {/* Integrated Large Background Watermark Icon */}
            <FileText
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-6 -right-6 size-36 text-muted/10 stroke-[0.8] select-none transition-all duration-500 group-hover:scale-110 group-hover:text-red-500/15"
            />
            <span className="absolute top-3 right-3 font-mono text-xs text-muted">
              +
            </span>
            <div className="relative z-10">
              <FileText className="size-6 text-red-500" />
              <h3 className="mt-6 font-display text-xl font-bold uppercase tracking-wide text-app-text">
                NFe e NFSe
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Notas fiscais de entrada, venda e consignação emitidas direto no
                fechamento com cálculo tributário automático.
              </p>
            </div>
            <div className="relative z-10 mt-8 border-t border-line/60 pt-4 text-xs font-mono text-muted">
              <p>+ Emissão oficial em 1 clique</p>
            </div>
          </div>

          {/* Feature 5: Financeiro */}
          <div className="group relative flex flex-col justify-between overflow-hidden p-6 sm:p-8 lg:p-10 transition-colors hover:bg-panel/30">
            {/* Integrated Large Background Watermark Icon */}
            <Wallet
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-6 -right-6 size-36 text-muted/10 stroke-[0.8] select-none transition-all duration-500 group-hover:scale-110 group-hover:text-red-500/15"
            />
            <span className="absolute top-3 right-3 font-mono text-xs text-muted">
              +
            </span>
            <div className="relative z-10">
              <Wallet className="size-6 text-red-500" />
              <h3 className="mt-6 font-display text-xl font-bold uppercase tracking-wide text-app-text">
                Financeiro & DRE
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Controle de custos de compra, despesas de oficina e cálculo
                automático de comissões por vendedor.
              </p>
            </div>
            <div className="relative z-10 mt-8 border-t border-line/60 pt-4 text-xs font-mono text-muted">
              <p>+ Lucro real calculado por placa</p>
            </div>
          </div>

          {/* Feature 6: Auditoria e permissões */}
          <div className="group relative flex flex-col justify-between overflow-hidden p-6 sm:p-8 lg:p-10 transition-colors hover:bg-panel/30">
            {/* Integrated Large Background Watermark Icon */}
            <ShieldCheck
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-6 -right-6 size-36 text-muted/10 stroke-[0.8] select-none transition-all duration-500 group-hover:scale-110 group-hover:text-red-500/15"
            />
            <span className="absolute top-3 right-3 font-mono text-xs text-muted">
              +
            </span>
            <div className="relative z-10">
              <ShieldCheck className="size-6 text-red-500" />
              <h3 className="mt-6 font-display text-xl font-bold uppercase tracking-wide text-app-text">
                Auditoria e permissões
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Acessos restritos por papel: oculte margens de compra e registre
                cada ação operacional no sistema.
              </p>
            </div>
            <div className="relative z-10 mt-8 border-t border-line/60 pt-4 text-xs font-mono text-muted">
              <p>+ Segurança e rastreamento completo</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
