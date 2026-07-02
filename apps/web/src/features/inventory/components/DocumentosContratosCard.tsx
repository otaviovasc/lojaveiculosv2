import { useState } from "react";
import {
  FileText,
  ExternalLink,
  Plus,
  ChevronRight,
  Sparkles,
} from "lucide-react";

interface Contract {
  id: string;
  title: string;
  status: "Assinado" | "Pendente" | "Minuta";
  date: string;
}

interface Template {
  id: string;
  name: string;
  scope: string;
}

export function DocumentosContratosCard() {
  const [contracts, setContracts] = useState<Contract[]>([
    {
      id: "c1",
      title: "Contrato de Compra e Venda - Civic 2020",
      status: "Assinado",
      date: "12/06/2026",
    },
    {
      id: "c2",
      title: "Termo de Transferência e Responsabilidade",
      status: "Pendente",
      date: "15/06/2026",
    },
  ]);

  const [templates] = useState<Template[]>([
    { id: "t1", name: "Compra e Venda Padrão", scope: "Nacional" },
    { id: "t2", name: "Recibo de Sinal e Reserva", scope: "Geral" },
    { id: "t3", name: "Termo de Test Drive Autorizado", scope: "Local" },
  ]);

  const handleCreateContract = (templateName: string) => {
    const newContract: Contract = {
      id: "contract-" + Date.now(),
      title: `Contrato de ${templateName} (Gerado)`,
      status: "Minuta",
      date: new Date().toLocaleDateString("pt-BR"),
    };
    setContracts((prev) => [...prev, newContract]);
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* 1. Contratos do Veículo */}
      <div className="bg-panel border border-line rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black uppercase tracking-wider">
              Contratos do Veículo
            </h3>
            <span className="bg-accent-soft text-accent-strong text-xs font-black px-2 py-0.5 rounded-full select-none">
              {contracts.length}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          {contracts.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between p-3 rounded-xl border border-line bg-app/30 hover:bg-app/50 transition-colors text-xs font-bold"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="size-4 text-accent shrink-0" />
                <div className="flex flex-col leading-tight min-w-0">
                  <span className="text-app-text font-black truncate">
                    {c.title}
                  </span>
                  <span className="text-xs text-muted font-bold mt-0.5">
                    {c.date}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span
                  className={
                    "text-xs font-black px-2 py-0.5 rounded-full border " +
                    (c.status === "Assinado"
                      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/25"
                      : c.status === "Pendente"
                        ? "bg-amber-500/10 text-amber-500 border-amber-500/25"
                        : "bg-blue-500/10 text-blue-500 border-blue-500/25")
                  }
                >
                  {c.status}
                </span>
                <button
                  className="p-1 rounded bg-transparent hover:bg-line/25 text-muted hover:text-accent cursor-pointer transition-all"
                  title="Abrir contrato"
                  type="button"
                >
                  <ExternalLink className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Gerar Contrato */}
      <div className="bg-panel border border-line rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <h3 className="text-sm font-black uppercase tracking-wider">
            Gerar Contrato
          </h3>
          <button
            className="text-xs font-black text-accent hover:underline uppercase tracking-wider cursor-pointer"
            type="button"
          >
            Avançado
          </button>
        </div>

        <p className="text-xs text-muted font-bold leading-relaxed bg-app/30 border border-line p-3 rounded-xl">
          Os contratos serão auto-preenchidos usando as informações deste
          veículo, da loja e do cliente vinculado.
        </p>

        <div className="flex flex-col gap-2">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => handleCreateContract(t.name)}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-line bg-app/20 hover:bg-app/40 hover:border-accent/40 transition-all text-left text-xs font-bold cursor-pointer group"
              type="button"
            >
              <div className="flex items-center gap-2.5">
                <div className="size-6 rounded-full bg-accent-soft text-accent flex items-center justify-center border border-accent-soft/20 group-hover:scale-105 transition-transform">
                  <Plus className="size-3.5" />
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-app-text font-black">{t.name}</span>
                  <span className="text-xs text-muted font-black uppercase tracking-wider mt-0.5">
                    {t.scope}
                  </span>
                </div>
              </div>
              <ChevronRight className="size-4 text-muted group-hover:text-accent transition-colors" />
            </button>
          ))}
        </div>

        <button
          className="mt-1 text-center text-xs font-black text-muted hover:text-accent transition-colors uppercase tracking-wider block border-t border-line/45 pt-3.5 cursor-pointer"
          type="button"
        >
          Visualizar todos os modelos disponíveis
        </button>
      </div>
    </div>
  );
}
