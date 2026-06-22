import {
  ArrowRight,
  CheckCircle2,
  Crown,
  FileText,
  ShieldCheck,
} from "lucide-react";

type LockedAddonPanelProps = {
  kind: "crm" | "nfe";
};

const addonCopy = {
  crm: {
    accent: "green",
    icon: ShieldCheck,
    title: "CRM WhatsApp",
    subtitle: "Atendimento da equipe com conversas e historico por cliente.",
  },
  nfe: {
    accent: "blue",
    icon: FileText,
    title: "NF-e Spedy",
    subtitle: "Emissao fiscal com auditoria e configuracao guiada.",
  },
};

export function LockedAddonPanel({ kind }: LockedAddonPanelProps) {
  const copy = addonCopy[kind];
  const Icon = copy.icon;

  return (
    <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <div className="panel p-5 lg:p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className={`addon-icon addon-icon-${copy.accent}`}>
            <Icon aria-hidden="true" className="size-5" />
          </div>
          <div>
            <h2 className="text-xl font-black">{copy.title}</h2>
            <p className="text-sm font-semibold text-muted">{copy.subtitle}</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {[
            "Ativacao por perfil e modulo",
            "Historico completo de acoes",
            "Estados mobile sem sobreposicao",
            "Registros por loja, usuario e acao",
          ].map((item) => (
            <div className="flex gap-3 rounded-lg bg-app p-3" key={item}>
              <CheckCircle2
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-accent"
              />
              <p className="text-sm font-bold">{item}</p>
            </div>
          ))}
        </div>
      </div>

      <aside className="panel border-accent-strong p-5">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-accent">
              Add-on
            </p>
            <h3 className="text-2xl font-black">{copy.title}</h3>
          </div>
          <div className="flex size-11 items-center justify-center rounded-lg bg-accent text-white">
            <Crown aria-hidden="true" className="size-5" />
          </div>
        </div>

        <button className="primary-button w-full" type="button">
          <span>Configurar fluxo</span>
          <ArrowRight aria-hidden="true" className="size-4" />
        </button>
      </aside>
    </section>
  );
}
