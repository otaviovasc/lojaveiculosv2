import { useState } from "react";
import {
  Sparkles,
  RefreshCw,
  Clock,
  User,
  Calendar,
  Filter,
  Database,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { InventoryListingDetail } from "../model/types";
import { formatPrice } from "./InventoryDetailWorkspaceMocks";

interface TimelineEvent {
  id: string;
  title: string;
  timestamp: string;
  icon: string;
}

interface AuditEntry {
  id: string;
  date: string;
  user: string;
  action: string;
  details: string;
}

export function InventoryDetailHistoricoTab({
  detail,
}: {
  detail: InventoryListingDetail;
}) {
  const vehicleName = detail.listing.title;
  const advertisedPrice = detail.listing.priceCents
    ? formatPrice(detail.listing.priceCents)
    : "preço sob consulta";
  const [isIaExpanded, setIsIaExpanded] = useState(true);
  const [userFilter, setUserFilter] = useState("Todos");
  const [typeFilter, setTypeFilter] = useState("Todos");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const timelineEvents: TimelineEvent[] = [
    {
      id: "e1",
      title: "Veículo cadastrado no sistema",
      timestamp: "11/06/2026 14:20",
      icon: "create",
    },
    {
      id: "e2",
      title: "Custo Higienização adicionado",
      timestamp: "12/06/2026 09:15",
      icon: "cost",
    },
    {
      id: "e3",
      title: "Ficha de Anúncio Comercial criada",
      timestamp: "15/06/2026 16:45",
      icon: "anuncio",
    },
  ];

  const auditEntries: AuditEntry[] = [
    {
      id: "a1",
      date: "11/06/2026 14:20",
      user: "Carlos Cunha",
      action: "Cadastro",
      details: `Entrada do veículo ${vehicleName} cadastrada`,
    },
    {
      id: "a2",
      date: "12/06/2026 09:15",
      user: "Ana Paula",
      action: "Custo",
      details: "Adicionado custo Higienização de R$ 350,00",
    },
    {
      id: "a3",
      date: "15/06/2026 16:45",
      user: "Carlos Cunha",
      action: "Anúncio",
      details: "Anúncio configurado e publicado no portal",
    },
  ];

  const filteredAudits = auditEntries.filter((item) => {
    const matchUser = userFilter === "Todos" || item.user === userFilter;
    const matchType = typeFilter === "Todos" || item.action === typeFilter;
    return matchUser && matchType;
  });

  return (
    <div className="flex flex-col gap-8 w-full max-w-none text-app-text">
      {/* Left Card: Insights IA */}
      <div className="bg-panel border border-line rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex justify-between items-center border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-accent shrink-0" />
            <h3 className="text-sm font-black uppercase tracking-wider">
              Insights IA
            </h3>
            <span className="bg-amber-500/10 text-amber-500 border border-amber-500/25 text-xs font-black px-2 py-0.5 rounded-full select-none">
              Médio 58%
            </span>
          </div>
          <button
            className="p-1 rounded bg-transparent hover:bg-line/25 text-muted hover:text-accent cursor-pointer transition-all"
            type="button"
          >
            <RefreshCw className="size-3.5 animate-none" />
          </button>
        </div>

        <div className="text-xs font-bold leading-relaxed text-muted">
          <p>
            Veículo de alta liquidez na praça. O giro médio estimado para
            modelos similares a {vehicleName} nesta cor e ano é de 15 dias.
          </p>

          {isIaExpanded && (
            <div className="flex flex-col gap-4 mt-4 pt-4 border-t border-line/45">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-app-text mb-1">
                  Próximos Passos
                </h4>
                <ul className="list-disc pl-4 flex flex-col gap-1">
                  <li>Concluir reparos de pintura acusados no laudo Dekra</li>
                  <li>
                    Solicitar documentação pendente com antigo proprietário
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-app-text mb-1">
                  Análise de Mercado
                </h4>
                <p>
                  Modelos similares estão precificados próximos de{" "}
                  {advertisedPrice} na região. Revise a margem antes de negociar
                  a proposta final.
                </p>
              </div>

              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-app-text mb-1 flex items-center gap-1">
                  <AlertTriangle className="size-3.5 text-amber-500 shrink-0" />
                  <span>Riscos Identificados</span>
                </h4>
                <p>
                  Pendência de IPVA de cota proporcional não regularizada pode
                  travar a transferência.
                </p>
              </div>

              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-app-text mb-1">
                  Sugestões de Mitigação
                </h4>
                <p>
                  Descontar valor do IPVA pendente do saldo a pagar ao
                  fornecedor.
                </p>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => setIsIaExpanded(!isIaExpanded)}
          className="self-center mt-2 flex items-center gap-1 text-xs font-black text-accent hover:underline uppercase tracking-wider cursor-pointer"
          type="button"
        >
          {isIaExpanded ? (
            <>
              <span>Ver menos</span>
              <ChevronUp className="size-3.5" />
            </>
          ) : (
            <>
              <span>Ver mais</span>
              <ChevronDown className="size-3.5" />
            </>
          )}
        </button>
      </div>

      {/* Right Card: Timeline */}
      <div className="bg-panel border border-line rounded-2xl p-5 flex flex-col gap-4">
        <div className="border-b border-line pb-3">
          <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="size-4 text-muted shrink-0" />
            <span>Linha do Tempo</span>
          </h3>
        </div>

        <div className="flex flex-col gap-4 relative pl-4 border-l border-line/60">
          {timelineEvents.map((event) => (
            <div
              key={event.id}
              className="relative flex flex-col gap-0.5 text-xs font-bold"
            >
              <span className="absolute -left-[21px] top-1 size-2.5 rounded-full bg-accent border border-panel shrink-0" />
              <span className="text-app-text font-black">{event.title}</span>
              <span className="text-xs text-muted font-bold mt-0.5">
                {event.timestamp}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Section: Trilho de auditoria */}
      <div className="bg-panel border border-line rounded-2xl p-5 flex flex-col gap-4">
        <div className="border-b border-line pb-3">
          <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-1.5">
            <Database className="size-4 text-muted shrink-0" />
            <span>Trilho de Auditoria</span>
          </h3>
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs font-bold">
          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wider text-muted">
              Operador
            </span>
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="min-h-8 bg-app border border-line rounded-lg px-2 text-xs font-bold outline-none"
            >
              <option value="Todos">Todos</option>
              <option value="Carlos Cunha">Carlos Cunha</option>
              <option value="Ana Paula">Ana Paula</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wider text-muted">
              Ação
            </span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="min-h-8 bg-app border border-line rounded-lg px-2 text-xs font-bold outline-none"
            >
              <option value="Todos">Todos</option>
              <option value="Cadastro">Cadastro</option>
              <option value="Custo">Custo</option>
              <option value="Anúncio">Anúncio</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wider text-muted">
              Data Inicial
            </span>
            <input
              inputMode="numeric"
              placeholder="dd/mm/aaaa"
              type="text"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="min-h-8 bg-app border border-line rounded-lg px-2 text-xs font-bold outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wider text-muted">
              Data Final
            </span>
            <input
              inputMode="numeric"
              placeholder="dd/mm/aaaa"
              type="text"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="min-h-8 bg-app border border-line rounded-lg px-2 text-xs font-bold outline-none"
            />
          </div>
        </div>

        {/* Audit Log Table Area */}
        {filteredAudits.length > 0 ? (
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left text-xs font-bold">
              <thead>
                <tr className="border-b border-line text-muted uppercase text-xs tracking-wider">
                  <th className="py-2">Data / Hora</th>
                  <th className="py-2">Operador</th>
                  <th className="py-2">Ação</th>
                  <th className="py-2">Detalhes da Alteração</th>
                </tr>
              </thead>
              <tbody>
                {filteredAudits.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-line/30 hover:bg-app/10 transition-colors"
                  >
                    <td className="py-3 text-muted">{item.date}</td>
                    <td className="py-3 text-app-text font-black flex items-center gap-1.5">
                      <div className="size-5 rounded-full bg-accent-soft text-accent text-xs font-black flex items-center justify-center">
                        <User className="size-2.5" />
                      </div>
                      <span>{item.user}</span>
                    </td>
                    <td className="py-3">
                      <span className="bg-app-elevated border border-line text-muted text-xs font-black px-2 py-0.5 rounded">
                        {item.action}
                      </span>
                    </td>
                    <td className="py-3 text-muted font-bold">
                      {item.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-xs font-bold text-muted border border-line border-dashed rounded-xl mt-2">
            Nenhuma alteração registrada com estes filtros.
          </div>
        )}
      </div>
    </div>
  );
}
