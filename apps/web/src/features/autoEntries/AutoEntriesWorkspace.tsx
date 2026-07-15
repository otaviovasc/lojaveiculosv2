import { Bot, RefreshCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import {
  FeatureActionButton,
  FeaturePageShell,
} from "../../components/ui/FeatureLayout";
import {
  FeatureAlert,
  FeatureEmptyState,
  FeatureLoadingState,
} from "../../components/ui/FeatureStates";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import { useOptionalAccountSession } from "../account/accountSession";
import {
  loadSellerOptions,
  type SaleSellerOption,
} from "../sales/saleContextOptions";
import {
  createRuntimeAutoEntryRulesApi,
  type AutoEntryRulesApi,
} from "./apiClient";
import { AutoEntriesCommandBar } from "./AutoEntriesCommandBar";
import { AutoEntriesNotices } from "./AutoEntriesNotices";
import { AutoEntriesOverview } from "./AutoEntriesOverview";
import { AutoEntriesTabs } from "./AutoEntriesTabs";
import { AutoEntryDomainPanel } from "./AutoEntryDomainPanel";
import { AutoEntryRuleDialog } from "./AutoEntryRuleDialog";
import { AutoEntryRuleList } from "./AutoEntryRuleList";
import {
  readAutoEntryCapabilities,
  resolveAutoEntryCapabilities,
} from "./permissions";
import type {
  AutoEntryRule,
  AutoEntryRuleInput,
  AutoEntryWorkspaceTab,
} from "./types";
import { useAutoEntryRules } from "./useAutoEntryRules";

export function AutoEntriesWorkspace({
  api,
  grantedPermissions,
  sellerOptions,
}: {
  api?: AutoEntryRulesApi;
  grantedPermissions?: readonly string[];
  sellerOptions?: readonly SaleSellerOption[];
}) {
  const accountSession = useOptionalAccountSession();
  const resolvedApi = useMemo(
    () => api ?? createRuntimeAutoEntryRulesApi(),
    [api],
  );
  const capabilities = useMemo(
    () =>
      grantedPermissions === undefined
        ? readAutoEntryCapabilities(accountSession)
        : resolveAutoEntryCapabilities(grantedPermissions),
    [accountSession, grantedPermissions],
  );
  const workspace = useAutoEntryRules(resolvedApi);
  const [activeTab, setActiveTab] = useState<AutoEntryWorkspaceTab>(
    "vehicle_sale_closed",
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutoEntryRule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AutoEntryRule | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [sellers, setSellers] = useState<readonly SaleSellerOption[]>(
    sellerOptions ?? [],
  );
  const [sellerError, setSellerError] = useState<string | null>(null);
  useEffect(() => {
    if (sellerOptions !== undefined) {
      setSellers(sellerOptions);
      setSellerError(null);
      return;
    }
    if (!capabilities.canManage) {
      setSellers([]);
      setSellerError(null);
      return;
    }
    let active = true;
    void loadSellerOptions()
      .then((options) => {
        if (!active) return;
        setSellers(options);
        setSellerError(null);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setSellerError(
          formatApiErrorDisplay(
            error,
            "As regras continuam disponíveis, mas a lista de responsáveis não pôde ser carregada.",
          ),
        );
      });
    return () => {
      active = false;
    };
  }, [capabilities.canManage, sellerOptions]);

  const customRules = useMemo(
    () => workspace.rules.filter((rule) => !rule.family && !rule.ruleKey),
    [workspace.rules],
  );
  const openCreate = () => {
    if (!capabilities.canManage || activeTab !== "custom") return;
    setEditingRule(null);
    setIsDialogOpen(true);
  };
  const openEdit = (rule: AutoEntryRule) => {
    if (!capabilities.canManage) return;
    setEditingRule(rule);
    setIsDialogOpen(true);
  };
  const saveRule = async (input: AutoEntryRuleInput) => {
    await workspace.saveRule(editingRule?.id ?? null, input);
  };
  const confirmDelete = async () => {
    if (!deleteTarget || !capabilities.canManage) return;
    setDeleteError(null);
    try {
      await workspace.deleteRule(deleteTarget);
      setDeleteTarget(null);
    } catch (error) {
      setDeleteError(
        formatApiErrorDisplay(error, "Não foi possível excluir a regra."),
      );
    }
  };
  return (
    <FeaturePageShell mainClassName="auto-entries-shell">
      <AutoEntriesCommandBar
        activeTab={activeTab}
        canManage={capabilities.canManage}
        isLoading={workspace.loadState.kind === "loading"}
        onCreate={openCreate}
        onRefresh={() => void workspace.refresh()}
      />
      {workspace.loadState.kind === "ready" ? (
        <>
          <AutoEntriesOverview rules={workspace.rules} />
          <AutoEntriesTabs
            onChange={setActiveTab}
            rules={workspace.rules}
            value={activeTab}
          />
        </>
      ) : null}
      <AutoEntriesNotices
        activeSaleTab={activeTab === "vehicle_sale_closed"}
        canManage={capabilities.canManage}
        feedback={workspace.feedback}
        sellerError={sellerError}
      />
      {workspace.loadState.kind === "loading" ? (
        <FeatureLoadingState
          className="feature-empty"
          title="Carregando regras"
        />
      ) : workspace.loadState.kind === "error" ? (
        <>
          <FeatureAlert title="As regras não puderam ser carregadas">
            <p>{workspace.loadState.message}</p>
          </FeatureAlert>
          <FeatureEmptyState
            action={
              <FeatureActionButton
                icon={RefreshCcw}
                label="Tentar novamente"
                onClick={() => void workspace.refresh()}
              />
            }
            body="Nenhuma configuração estimada foi exibida. Atualize quando o financeiro estiver disponível."
            icon={Bot}
            title="Lançamentos indisponíveis"
          />
        </>
      ) : activeTab === "custom" ? (
        <AutoEntryRuleList
          canManage={capabilities.canManage}
          onCreate={openCreate}
          onDelete={(rule) => {
            setDeleteError(null);
            setDeleteTarget(rule);
          }}
          onEdit={openEdit}
          onToggle={(rule, active) =>
            void workspace.toggleRule(rule, active ? "active" : "inactive")
          }
          rules={customRules}
          sellers={sellers}
          workingKey={workspace.workingKey}
        />
      ) : (
        <AutoEntryDomainPanel
          canManage={capabilities.canManage}
          isSaving={workspace.workingKey === "domain"}
          onDelete={(rule) => {
            setDeleteError(null);
            setDeleteTarget(rule);
          }}
          onSave={async (mutations) => {
            try {
              await workspace.saveRules(mutations);
            } catch {
              /* The hook exposes the actionable API message. */
            }
          }}
          rules={workspace.rules}
          sellers={sellers}
          tab={activeTab}
        />
      )}
      {capabilities.canManage ? (
        <AutoEntryRuleDialog
          defaultEvent="vehicle_sale_closed"
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onSave={saveRule}
          rule={editingRule}
          sellers={sellers}
        />
      ) : null}
      <ConfirmDialog
        confirmLabel="Excluir regra"
        description="A exclusão é auditada e interrompe novos lançamentos desta regra. Os registros financeiros já criados permanecem intactos."
        {...(deleteError ? { error: deleteError } : {})}
        isLoading={Boolean(
          deleteTarget && workspace.workingKey === deleteTarget.id,
        )}
        isOpen={Boolean(deleteTarget)}
        loadingLabel="Excluindo…"
        onClose={() => {
          if (workspace.workingKey) return;
          setDeleteTarget(null);
          setDeleteError(null);
        }}
        onConfirm={confirmDelete}
        title={`Excluir ${deleteTarget?.name ?? "regra"}?`}
        variant="destructive"
      />
    </FeaturePageShell>
  );
}
