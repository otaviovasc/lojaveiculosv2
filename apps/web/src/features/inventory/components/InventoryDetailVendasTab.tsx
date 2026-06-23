import { useState } from "react";
import {
  Handshake,
  Plus,
  DollarSign,
  CheckCircle2,
  Clock,
  ExternalLink,
} from "lucide-react";

interface Negociacao {
  id: string;
  date: string;
  clientName: string;
  modality: string;
  value: number;
  status: "Em Andamento" | "Aprovado" | "Cancelado";
}

export function InventoryDetailVendasTab() {
  const [negociacoes, setNegociacoes] = useState<Negociacao[]>([]);

  const formatBRL = (cents: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  };

  const handleCreateNegociacao = () => {
    const mock: Negociacao = {
      id: "neg-" + Date.now(),
      date: new Date().toLocaleDateString("pt-BR"),
      clientName: "Luiz Inácio da Silva",
      modality: "Venda Direta (À Vista)",
      value: 15000000, // R$ 150.000
      status: "Em Andamento",
    };
    setNegociacoes((prev) => [...prev, mock]);
  };

  const handleRegisterVenda = () => {
    const mock: Negociacao = {
      id: "neg-" + Date.now(),
      date: new Date().toLocaleDateString("pt-BR"),
      clientName: "Arthur Lira",
      modality: "Financiamento BV",
      value: 14800000, // R$ 148.000
      status: "Aprovado",
    };
    setNegociacoes((prev) => [...prev, mock]);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-none text-app-text">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-line pb-4">
        <div>
          <h2 className="text-lg font-black text-app-text flex items-center gap-2">
            <Handshake className="size-5 text-accent shrink-0" />
            <span>Negociações</span>
          </h2>
          <p className="text-xs text-muted font-bold mt-0.5">
            Negociações e vendas vinculadas a este veículo
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleCreateNegociacao}
            className="min-h-9 rounded-lg border border-line px-3.5 text-xs font-black hover:bg-line/25 transition-all text-app-text cursor-pointer flex items-center gap-1.5"
            type="button"
          >
            <Plus className="size-3.5" />
            <span>Nova Negociação</span>
          </button>
          <button
            onClick={handleRegisterVenda}
            className="min-h-9 rounded-lg bg-accent text-inverse font-black text-xs hover:bg-accent-strong transition-all cursor-pointer px-4 flex items-center gap-1.5"
            type="button"
          >
            <DollarSign className="size-3.5" />
            <span>Registrar Venda</span>
          </button>
        </div>
      </div>

      {/* Main Card / List Table Area */}
      <div className="bg-panel border border-line rounded-2xl p-5 flex flex-col gap-4">
        {negociacoes.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-bold">
              <thead>
                <tr className="border-b border-line text-muted uppercase text-[9px] tracking-wider">
                  <th className="py-2">Data</th>
                  <th className="py-2">Cliente</th>
                  <th className="py-2">Modalidade</th>
                  <th className="py-2">Valor</th>
                  <th className="py-2">Status</th>
                  <th className="py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {negociacoes.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-line/30 hover:bg-app/10 transition-colors"
                  >
                    <td className="py-3 text-muted">{item.date}</td>
                    <td className="py-3 text-app-text font-black">
                      {item.clientName}
                    </td>
                    <td className="py-3 text-muted">{item.modality}</td>
                    <td className="py-3 font-black text-app-text">
                      {formatBRL(item.value)}
                    </td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1">
                        {item.status === "Aprovado" ? (
                          <CheckCircle2 className="size-3 text-emerald-500" />
                        ) : (
                          <Clock className="size-3 text-amber-500 animate-pulse" />
                        )}
                        <span
                          className={
                            item.status === "Aprovado"
                              ? "text-emerald-500 font-bold"
                              : "text-amber-500 font-bold"
                          }
                        >
                          {item.status}
                        </span>
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        className="p-1 rounded bg-transparent hover:bg-line/25 text-muted hover:text-accent cursor-pointer transition-all"
                        title="Detalhes da negociação"
                        type="button"
                      >
                        <ExternalLink className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center flex flex-col items-center justify-center bg-app/10 border border-line border-dashed rounded-xl gap-3">
            <div className="size-10 rounded-full bg-line/25 text-muted flex items-center justify-center">
              <Handshake className="size-5" />
            </div>
            <div>
              <p className="text-xs font-black text-app-text">
                Nenhuma negociação vinculada
              </p>
              <p className="text-[10px] text-muted font-bold mt-1">
                Inicie uma negociação ou registre uma venda direta para este
                veículo.
              </p>
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleCreateNegociacao}
                className="min-h-8 rounded-lg bg-accent/15 border border-accent/25 text-accent-strong font-black text-xs hover:bg-accent/25 cursor-pointer px-4 flex items-center gap-1.5"
                type="button"
              >
                <Plus className="size-3.5" />
                <span>Nova Negociação</span>
              </button>
              <button
                onClick={handleRegisterVenda}
                className="min-h-8 rounded-lg bg-accent text-inverse font-black text-xs hover:bg-accent-strong transition-all cursor-pointer px-4 flex items-center gap-1.5"
                type="button"
              >
                <DollarSign className="size-3.5" />
                <span>Registrar Venda</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
