import {
  Car,
  Check,
  CheckCircle2,
  FileText,
  Lock,
  MessageCircle,
  Receipt,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import AnimatedContent from "../../components/ui/AnimatedContent";
import { LandingAuthActions } from "./LandingAuthActions";
import {
  MemphisCrosshair,
  MemphisDotMatrix,
  MemphisPlusGrid,
} from "./LandingMemphisGraphics";

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
            <LandingAuthActions primaryLabel="Conhecer a plataforma" />
          </div>
        </AnimatedContent>

        {/* Linear/Raycast-Style Clean Architectural Grid without Nested Cards */}
        <div className="mt-16 grid divide-y divide-line/80 border-y border-line/80 md:grid-cols-2 md:divide-x md:divide-y-0 lg:grid-cols-3">
          {/* Feature 1: Estoque */}
          <div className="relative flex flex-col justify-between p-6 sm:p-8 lg:p-10">
            <span className="absolute top-3 right-3 font-mono text-xs text-muted">
              +
            </span>
            <div>
              <Car className="size-6 text-red-500" />
              <h3 className="mt-6 font-display text-xl font-bold uppercase tracking-wide text-app-text">
                Estoque
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Cadastro completo com ficha FIPE, laudo, fotos e sincronização
                simultânea com Webmotors, OLX, Mercado Livre e iCarros.
              </p>
            </div>
            <div className="mt-8 border-t border-line/60 pt-4 text-xs font-mono text-muted">
              <p>+ Sincronização automática em toda a rede</p>
            </div>
          </div>

          {/* Feature 2: CRM WhatsApp */}
          <div className="relative flex flex-col justify-between p-6 sm:p-8 lg:p-10">
            <span className="absolute top-3 right-3 font-mono text-xs text-muted">
              +
            </span>
            <div>
              <MessageCircle className="size-6 text-red-500" />
              <h3 className="mt-6 font-display text-xl font-bold uppercase tracking-wide text-app-text">
                CRM WhatsApp
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Distribuição inteligente de leads para o vendedor da vez,
                esteira Kanban e campanhas automáticas de recompra.
              </p>
            </div>
            <div className="mt-8 border-t border-line/60 pt-4 text-xs font-mono text-muted">
              <p>+ Rodízio de vendedores com resposta &lt; 1 min</p>
            </div>
          </div>

          {/* Feature 3: NFe e NFSe */}
          <div className="relative flex flex-col justify-between p-6 sm:p-8 lg:p-10">
            <span className="absolute top-3 right-3 font-mono text-xs text-muted">
              +
            </span>
            <div>
              <FileText className="size-6 text-red-500" />
              <h3 className="mt-6 font-display text-xl font-bold uppercase tracking-wide text-app-text">
                NFe e NFSe
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Notas fiscais de entrada, venda e consignação emitidas no
                fechamento da venda com cálculo tributário automático.
              </p>
            </div>
            <div className="mt-8 border-t border-line/60 pt-4 text-xs font-mono text-muted">
              <p>+ Emissão oficial autorizada pela SEFAZ</p>
            </div>
          </div>
        </div>

        {/* Bottom 2-Column Row for Financeiro and Auditoria */}
        <div className="grid divide-y divide-line/80 border-b border-line/80 md:grid-cols-2 md:divide-x md:divide-y-0">
          {/* Feature 4: Financeiro */}
          <div className="relative flex flex-col justify-between p-6 sm:p-8 lg:p-10">
            <span className="absolute top-3 right-3 font-mono text-xs text-muted">
              +
            </span>
            <div>
              <Wallet className="size-6 text-red-500" />
              <h3 className="mt-6 font-display text-xl font-bold uppercase tracking-wide text-app-text">
                Financeiro & DRE
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Controle de custos de aquisição, despesas de pátio e cálculo
                automatizado de comissões por vendedor.
              </p>
            </div>
            <div className="mt-8 border-t border-line/60 pt-4 text-xs font-mono text-muted">
              <p>+ Lucro líquido real calculado por placa e chassi</p>
            </div>
          </div>

          {/* Feature 5: Auditoria e permissões */}
          <div className="relative flex flex-col justify-between p-6 sm:p-8 lg:p-10">
            <span className="absolute top-3 right-3 font-mono text-xs text-muted">
              +
            </span>
            <div>
              <ShieldCheck className="size-6 text-red-500" />
              <h3 className="mt-6 font-display text-xl font-bold uppercase tracking-wide text-app-text">
                Auditoria e permissões
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Acessos restritos por perfil comercial: oculte margens de compra
                e registre cada ação operacional no pátio.
              </p>
            </div>
            <div className="mt-8 border-t border-line/60 pt-4 text-xs font-mono text-muted">
              <p>+ Segurança total de dados confidenciais da loja</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
