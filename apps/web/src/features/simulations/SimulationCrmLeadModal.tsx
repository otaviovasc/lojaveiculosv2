import { useState } from "react";
import { Check, Phone, UserRound, Users } from "lucide-react";
import { FeatureDialog } from "../../components/ui/FeatureOverlay";
import {
  FeatureEmptyState,
  FeatureLoadingState,
} from "../../components/ui/FeatureStates";
import { FeatureSearchField } from "../../components/ui/FeatureControls";
import type { ProductCrmLead } from "../crm/productCrmTypes";

export function SimulationCrmLeadModal({
  isOpen,
  items,
  onClose,
  onSelect,
  selectedId,
  status,
}: {
  isOpen: boolean;
  items: readonly ProductCrmLead[];
  onClose: () => void;
  onSelect: (item: ProductCrmLead) => void;
  selectedId?: string | undefined;
  status: "error" | "loading" | "ready";
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = items.filter((item) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    return [item.buyerName, item.buyerPhone, item.buyerEmail, item.vehicleTitle]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(query));
  });

  return (
    <FeatureDialog
      className="feature-dialog--large max-w-3xl"
      description="Escolha um lead do CRM para preencher automaticamente os dados do proponente."
      icon={<Users className="size-5 text-accent" />}
      isOpen={isOpen}
      onClose={onClose}
      title="Selecionar lead do CRM"
    >
      <div className="grid gap-4">
        <FeatureSearchField
          autoFocus
          label="Buscar lead do CRM"
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por nome, telefone, e-mail ou veículo de interesse..."
          value={searchQuery}
        />

        {status === "loading" ? (
          <FeatureLoadingState density="compact" title="Carregando leads..." />
        ) : status === "error" ? (
          <FeatureEmptyState
            body="Não foi possível carregar os leads no momento. Você ainda pode preencher um novo proponente."
            icon={Users}
            title="Leads indisponíveis"
          />
        ) : filteredItems.length === 0 ? (
          <FeatureEmptyState
            body={
              searchQuery
                ? `Nenhum lead encontrado para "${searchQuery}". Tente outros termos.`
                : "Nenhum lead disponível no CRM da loja."
            }
            icon={Users}
            title="Nenhum lead encontrado"
          />
        ) : (
          <div className="max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid gap-2.5">
              {filteredItems.map((item) => {
                const selected = item.id === selectedId;
                return (
                  <button
                    className="group flex w-full items-center justify-between gap-3 rounded-2xl border border-line bg-panel p-3.5 text-left transition-colors hover:border-accent/50"
                    data-selected={selected || undefined}
                    key={item.id}
                    onClick={() => {
                      onSelect(item);
                      onClose();
                    }}
                    type="button"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-strong">
                        <UserRound className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <h4 className="truncate text-sm font-black text-app-text group-hover:text-accent">
                          {item.buyerName ?? "Lead sem nome"}
                        </h4>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 truncate text-xs font-medium text-muted">
                          {item.buyerPhone ? (
                            <span className="inline-flex items-center gap-1">
                              <Phone className="size-3" />
                              {item.buyerPhone}
                            </span>
                          ) : null}
                          {item.vehicleTitle ? (
                            <span>{item.vehicleTitle}</span>
                          ) : null}
                          {!item.buyerPhone && !item.vehicleTitle
                            ? "Sem dados de contato"
                            : null}
                        </p>
                      </div>
                    </div>
                    <span
                      className={
                        selected
                          ? "inline-flex shrink-0 items-center gap-1 rounded-xl bg-accent px-2.5 py-1 text-xs font-bold text-accent-foreground transition-colors"
                          : "inline-flex shrink-0 items-center gap-1 rounded-xl bg-accent-soft px-2.5 py-1 text-xs font-bold text-accent-strong transition-colors group-hover:bg-accent group-hover:text-accent-foreground"
                      }
                    >
                      <Check className="size-3.5" />
                      <span>{selected ? "Selecionado" : "Selecionar"}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </FeatureDialog>
  );
}
