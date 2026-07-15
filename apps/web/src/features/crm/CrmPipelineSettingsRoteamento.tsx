import { useState } from "react";
import { Plus, Trash2, Waypoints } from "lucide-react";
import { FeatureField } from "../../components/ui/FeatureForms";
import {
  FeatureDialog,
  FeatureDialogActions,
} from "../../components/ui/FeatureOverlay";
import { FeatureAlert } from "../../components/ui/FeatureStates";
import { CrmSelect } from "./CrmFormControls";
import { sourceLabels } from "./crmPipelineConfig";
import type { Pipeline, RoutingRule } from "./crmPipelineStorage";

type Props = {
  pipeline: Pipeline;
  onUpdate: (updated: Pipeline) => void;
};

export function CrmPipelineSettingsRoteamento({ pipeline, onUpdate }: Props) {
  const [rules, setRules] = useState<RoutingRule[]>(pipeline.routingRules);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [selectedOrigin, setSelectedOrigin] = useState("public_site");
  const [selectedStore, setSelectedStore] = useState("all");

  const saveRules = (next: RoutingRule[]) => {
    setRules(next);
    onUpdate({ ...pipeline, routingRules: next });
  };

  const handleAddRule = () => {
    if (rules.some((r) => r.origin === selectedOrigin)) {
      setRouteError(
        "Já existe uma regra de roteamento para esta origem neste pipeline.",
      );
      return;
    }
    const newRule: RoutingRule = {
      id: `rule_${Date.now()}`,
      origin: selectedOrigin,
      storeId: selectedStore,
    };
    saveRules([...rules, newRule]);
    setRouteError(null);
    setIsModalOpen(false);
  };

  const handleDeleteRule = (id: string) => {
    saveRules(rules.filter((r) => r.id !== id));
  };

  return (
    <div className="flex flex-col gap-6 select-none text-app-text">
      {/* Title Header with inline "+ Nova regra" button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-app-text">Roteamento</h2>
          <p className="text-xs font-bold text-muted mt-0.5 max-w-xl leading-relaxed">
            Defina quais leads entram automaticamente em{" "}
            <strong className="text-app-text">{pipeline.name}</strong>. Leads
            sem regra correspondente vão para o pipeline padrão.
          </p>
        </div>
        <button
          className="inline-flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-blue-start px-4 text-xs font-bold text-inverse transition-opacity hover:opacity-90"
          onClick={() => {
            setRouteError(null);
            setIsModalOpen(true);
          }}
          type="button"
        >
          <Plus className="size-3.5" />
          <span>Nova regra</span>
        </button>
      </div>

      {/* Rules list or empty state */}
      {rules.length === 0 ? (
        <div className="border border-dashed border-line rounded-xl p-12 flex flex-col items-center justify-center text-center gap-4 bg-panel/10">
          <div className="size-14 rounded-full bg-line/20 border border-line flex items-center justify-center text-muted">
            <Waypoints className="size-7" />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-bold text-app-text">
              Nenhuma regra de roteamento
            </h3>
            <p className="text-xs font-bold text-muted max-w-sm leading-relaxed">
              Sem regras, este pipeline só recebe leads movidos manualmente.
              Adicione regras para que leads de origens específicas entrem aqui
              automaticamente.
            </p>
          </div>
          <button
            className="mt-2 inline-flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-blue-start px-4 text-xs font-bold text-inverse transition-opacity hover:opacity-90"
            onClick={() => {
              setRouteError(null);
              setIsModalOpen(true);
            }}
            type="button"
          >
            <Plus className="size-3.5" />
            <span>Adicionar primeira regra</span>
          </button>
        </div>
      ) : (
        <div className="border border-line/20 bg-panel/30 rounded-xl overflow-hidden mt-2">
          {/* Table Header */}
          <div className="grid grid-cols-[140px_1fr_50px] items-center px-5 py-3 border-b border-line/15 text-xs font-black uppercase tracking-wider text-muted">
            <span>Origem</span>
            <span>Loja</span>
            <span className="text-right"></span>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-line/10">
            {rules.map((rule) => {
              const originLabel =
                sourceLabels[rule.origin as keyof typeof sourceLabels] ||
                rule.origin;
              const storeLabel =
                rule.storeId === "all" ? "Todas as lojas" : rule.storeId;

              return (
                <div
                  className="grid grid-cols-[140px_1fr_50px] items-center px-5 py-3 text-xs font-bold"
                  key={rule.id}
                >
                  {/* Origin Badges */}
                  <div className="flex">
                    <span className="px-2.5 py-1 rounded bg-line/20 border border-line/35 text-xs tracking-wide font-black text-app-text">
                      {originLabel}
                    </span>
                  </div>

                  {/* Store Name */}
                  <span className="text-muted/90 font-medium">
                    {storeLabel}
                  </span>

                  {/* Actions */}
                  <div className="flex justify-end">
                    <button
                      className="cursor-pointer rounded p-1.5 text-muted transition-colors hover:bg-danger/10 hover:text-danger-soft-foreground"
                      onClick={() => handleDeleteRule(rule.id)}
                      type="button"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <FeatureDialog
        className="max-w-md"
        footer={
          <FeatureDialogActions
            confirmLabel="Salvar"
            onCancel={() => setIsModalOpen(false)}
            onConfirm={handleAddRule}
          />
        }
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nova regra de roteamento"
      >
        <div className="flex flex-col gap-4">
          <FeatureField label="Origem do Lead">
            <CrmSelect
              onChange={(value) => {
                setSelectedOrigin(value);
                setRouteError(null);
              }}
              options={Object.entries(sourceLabels).map(([value, label]) => ({
                label,
                value,
              }))}
              value={selectedOrigin}
            />
          </FeatureField>

          <FeatureField
            hint="Restringe a regra a uma loja específica do time."
            label="Loja (opcional)"
          >
            <CrmSelect
              onChange={setSelectedStore}
              options={[
                { label: "Todas as lojas", value: "all" },
                { label: "DMS multimarcas", value: "DMS multimarcas" },
                { label: "Matriz", value: "matriz" },
                { label: "Filial Norte", value: "filial" },
              ]}
              value={selectedStore}
            />
          </FeatureField>
          {routeError ? (
            <FeatureAlert tone="danger">{routeError}</FeatureAlert>
          ) : null}
        </div>
      </FeatureDialog>
    </div>
  );
}
