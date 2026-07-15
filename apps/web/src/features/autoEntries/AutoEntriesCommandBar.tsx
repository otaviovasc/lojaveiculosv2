import { Bot, Plus, RefreshCcw } from "lucide-react";
import {
  FeatureActionButton,
  FeaturePageHeader,
} from "../../components/ui/FeatureLayout";
import type { AutoEntryWorkspaceTab } from "./types";

export function AutoEntriesCommandBar({
  activeTab,
  canManage,
  isLoading,
  onCreate,
  onRefresh,
}: {
  activeTab: AutoEntryWorkspaceTab;
  canManage: boolean;
  isLoading: boolean;
  onCreate: () => void;
  onRefresh: () => void;
}) {
  return (
    <FeaturePageHeader
      actions={
        <>
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
        </>
      }
      description={
        <span className="text-muted">
          Gerenciamento de regras para lançamentos automáticos de receitas,
          despesas e comissões.
        </span>
      }
      eyebrow={
        <>
          Central de regras
          <span aria-hidden="true">·</span>
          Financeiro
        </>
      }
      title="Lançamentos automáticos"
    />
  );
}
