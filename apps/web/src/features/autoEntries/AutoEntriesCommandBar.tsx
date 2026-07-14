import { Bot, Plus, RefreshCcw } from "lucide-react";
import {
  FeatureActionButton,
  FeatureToolbar,
} from "../../components/ui/FeatureLayout";
import type { AutoEntryWorkspaceTab } from "./types";

export function AutoEntriesCommandBar({
  activeTab,
  canManage,
  isLoading,
  onCreate,
  onRefresh,
  ruleCount,
}: {
  activeTab: AutoEntryWorkspaceTab;
  canManage: boolean;
  isLoading: boolean;
  onCreate: () => void;
  onRefresh: () => void;
  ruleCount: number;
}) {
  return (
    <FeatureToolbar className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-accent/20 bg-accent-soft text-accent-strong">
          <Bot aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="eyebrow">Financeiro · regras auditáveis</p>
          <h1 className="text-xl font-black text-app-text sm:text-2xl">
            Lançamentos automáticos
          </h1>
          <p className="mt-1 text-sm font-bold text-muted">
            {ruleCount}{" "}
            {ruleCount === 1 ? "regra configurada" : "regras configuradas"}
          </p>
        </div>
      </div>
      <div
        aria-label="Ações dos lançamentos automáticos"
        className="flex flex-wrap items-center justify-end gap-2"
        role="toolbar"
      >
        <FeatureActionButton
          icon={RefreshCcw}
          isBusy={isLoading}
          label="Atualizar regras"
          onClick={onRefresh}
        />
        {canManage && activeTab === "custom" ? (
          <FeatureActionButton
            icon={Plus}
            label="Nova regra"
            onClick={onCreate}
            variant="primary"
          />
        ) : null}
      </div>
    </FeatureToolbar>
  );
}
