import { useEffect, useMemo, useState } from "react";
import { FeaturePageShell } from "../../components/ui/FeatureLayout";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import { createFinanceApi, type FinanceApi } from "./apiClient";
import { cancelCommission, CommissionToast } from "./CommissionActions";
import {
  BonusCommissionDialog,
  ConfirmCommissionPayDialog,
  type BonusDraft,
} from "./CommissionDialogs";
import { CommissionEmptyState, CommissionHeader } from "./CommissionHeader";
import { CommissionFiltersPanel } from "./CommissionFiltersPanel";
import { CommissionSellerList } from "./CommissionSellerList";
import { CommissionSummaryCards } from "./CommissionSummaryCards";
import { hydrateEntrySellerNames } from "./commissionEntryMeta";
import { FinanceEntryModal } from "./FinanceEntryModal";
import { CommissionRulesPanel } from "./FinanceCorePanels";
import { createFinanceApiOptions } from "./runtimeApi";
import {
  buildCommissionWorkspace,
  initialCommissionFilters,
  type CommissionSellerGroup,
} from "./commissionWorkspaceModel";
import {
  createCommissionBonus,
  payCommissionSeller,
  selectedCommissionBonusSellerId,
  updateCommissionDraft,
} from "./commissionWorkspaceActions";
import { CommissionAccessNotice } from "./FinanceModuleFeedback";
import { exportFinanceCsv } from "./financeBillsActions";
import { type FinanceEntryDraft, type FinanceToast } from "./financeBillsModel";
import type { CommissionRule, FinanceEntry } from "./types";
import { useFinanceAccess } from "./useFinanceAccess";

export function CommissionWorkspace({ api }: { api?: FinanceApi }) {
  const {
    canCreate,
    canUpdate,
    sellerOptions: teamSellers,
  } = useFinanceAccess(Boolean(api));
  const [runtimeApi, setRuntimeApi] = useState<FinanceApi | null>(api ?? null);
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [filters, setFilters] = useState(initialCommissionFilters);
  const [toast, setToast] = useState<FinanceToast | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [payingSellerId, setPayingSellerId] = useState<string | null>(null);
  const [paySeller, setPaySeller] = useState<CommissionSellerGroup | null>(
    null,
  );
  const [showBonus, setShowBonus] = useState(false);
  const [bonusSeller, setBonusSeller] = useState<CommissionSellerGroup | null>(
    null,
  );
  const [savingBonus, setSavingBonus] = useState(false);
  const [modalEntry, setModalEntry] = useState<FinanceEntry | null>(null);
  const [cancelTarget, setCancelTarget] = useState<FinanceEntry | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const visibleEntries = useMemo(
    () => hydrateEntrySellerNames(entries, teamSellers),
    [entries, teamSellers],
  );
  const workspace = useMemo(
    () => buildCommissionWorkspace(visibleEntries, filters),
    [filters, visibleEntries],
  );
  const sellerOptions = useMemo(() => {
    const options = new Map(
      workspace.sellerOptions.map((seller) => [seller.value, seller]),
    );
    for (const seller of teamSellers) {
      options.set(seller.id, { label: seller.label, value: seller.id });
    }
    return [...options.values()];
  }, [teamSellers, workspace.sellerOptions]);
  const hasFilters =
    filters.period !== "thisMonth" ||
    filters.origin !== "all" ||
    Boolean(filters.sellerId) ||
    filters.status !== "all";
  const selectedBonusSellerId = selectedCommissionBonusSellerId(bonusSeller);

  useEffect(() => {
    if (api) {
      setRuntimeApi(api);
      return;
    }
    void createFinanceApiOptions().then((options) => {
      setRuntimeApi(createFinanceApi(options));
    });
  }, [api]);

  useEffect(() => {
    if (!runtimeApi) return;
    setIsLoading(true);
    void Promise.all([
      runtimeApi.listAllEntries("commission"),
      runtimeApi.listCommissionRules(),
    ])
      .then(([nextEntries, nextRules]) => {
        setEntries(nextEntries);
        setRules(nextRules);
        setToast(null);
      })
      .catch((error) => {
        setEntries([]);
        setToast({
          kind: "error",
          message: formatApiErrorDisplay(
            error,
            "Não foi possível carregar as comissões.",
          ),
          title: "Erro ao carregar",
        });
      })
      .finally(() => setIsLoading(false));
  }, [refreshToken, runtimeApi]);

  const refresh = () => setRefreshToken((current) => current + 1);

  const createBonus = async (draft: BonusDraft) => {
    if (!runtimeApi) return;
    await createCommissionBonus(
      {
        api: runtimeApi,
        onSaved: () => {
          setBonusSeller(null);
          setShowBonus(false);
        },
        refresh,
        setSaving: setSavingBonus,
        setToast,
      },
      draft,
    );
  };

  const paySellerEntries = async () => {
    if (!runtimeApi || !paySeller) return;
    await payCommissionSeller({
      api: runtimeApi,
      filters,
      onPaid: () => setPaySeller(null),
      refresh,
      seller: paySeller,
      setPayingSellerId,
      setToast,
    });
  };

  const submitDraft = async (draft: FinanceEntryDraft) => {
    if (!runtimeApi || !modalEntry) return;
    await updateCommissionDraft(
      {
        api: runtimeApi,
        entry: modalEntry,
        onSaved: () => {
          setIsModalOpen(false);
          setModalEntry(null);
        },
        refresh,
        setToast,
      },
      draft,
    );
  };

  return (
    <FeaturePageShell variant="plain">
      <CommissionHeader
        canCreate={canCreate}
        onCreateBonus={() => {
          setBonusSeller(null);
          setShowBonus(true);
        }}
        onExport={() =>
          exportFinanceCsv(workspace.filteredEntries, "commission")
        }
        summary={workspace.summary}
      />
      <CommissionAccessNotice canManage={canCreate || canUpdate} />
      <CommissionSummaryCards summary={workspace.summary} />
      <CommissionFiltersPanel
        filters={filters}
        hasFilters={hasFilters}
        onChange={setFilters}
        onClear={() => setFilters(initialCommissionFilters())}
        originOptions={workspace.originOptions}
        sellerOptions={sellerOptions}
      />
      {toast ? <CommissionToast toast={toast} /> : null}
      {workspace.sellers.length ? (
        <CommissionSellerList
          canCreate={canCreate}
          canUpdate={canUpdate}
          filters={filters}
          isPayingSellerId={payingSellerId}
          onCancel={setCancelTarget}
          onEdit={(entry) => {
            setModalEntry(entry);
            setIsModalOpen(true);
          }}
          onOpenBonus={(seller) => {
            setBonusSeller(seller);
            setShowBonus(true);
          }}
          onOpenPay={setPaySeller}
          sellers={workspace.sellers}
        />
      ) : (
        <CommissionEmptyState hasFilters={hasFilters} isLoading={isLoading} />
      )}
      <CommissionRulesPanel
        canCreate={canCreate}
        items={rules}
        onCreate={async (input) => {
          if (!runtimeApi) throw new Error("Finance API unavailable");
          await runtimeApi.createCommissionRule(input);
          refresh();
        }}
      />
      {paySeller ? (
        <ConfirmCommissionPayDialog
          filters={filters}
          isLoading={payingSellerId === paySeller.sellerId}
          onCancel={() => setPaySeller(null)}
          onConfirm={() => void paySellerEntries()}
          seller={paySeller}
        />
      ) : null}
      {showBonus && canCreate ? (
        <BonusCommissionDialog
          defaultDueAt={filters.to}
          isLoading={savingBonus}
          onCancel={() => {
            setBonusSeller(null);
            setShowBonus(false);
          }}
          onConfirm={(draft) => void createBonus(draft)}
          {...(selectedBonusSellerId !== null
            ? { selectedSellerId: selectedBonusSellerId }
            : {})}
          sellerOptions={sellerOptions}
        />
      ) : null}
      <FinanceEntryModal
        activeType="commission"
        entry={modalEntry}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setModalEntry(null);
        }}
        onSubmit={submitDraft}
        sellerOptions={teamSellers}
      />
      <ConfirmDialog
        confirmLabel="Cancelar comissão"
        isOpen={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        onConfirm={async () => {
          if (!cancelTarget) return;
          await cancelCommission(cancelTarget, runtimeApi, setToast, refresh);
          setCancelTarget(null);
        }}
        title="Cancelar comissão?"
        variant="destructive"
        {...(cancelTarget
          ? {
              description: `A comissão "${cancelTarget.name}" ficará cancelada e preservada para auditoria.`,
            }
          : {})}
      />
    </FeaturePageShell>
  );
}
