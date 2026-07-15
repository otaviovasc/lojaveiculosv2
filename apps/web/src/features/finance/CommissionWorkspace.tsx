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
import { CommissionSaleDetailsDialog } from "./CommissionSaleDetailsDialog";
import { CommissionReconciliationPanel } from "./CommissionReconciliationPanel";
import { CommissionSummaryCards } from "./CommissionSummaryCards";
import { FinanceEntryModal } from "./FinanceEntryModal";
import { CommissionRulesPanel } from "./FinanceCorePanels";
import { createFinanceApiOptions } from "./runtimeApi";
import {
  buildCommissionWorkspace,
  initialCommissionFilters,
  type CommissionSaleGroup,
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
import type {
  CommissionRule,
  CommissionWorkspaceSnapshot,
  FinanceEntry,
} from "./types";
import { useFinanceAccess } from "./useFinanceAccess";

export function CommissionWorkspace({ api }: { api?: FinanceApi }) {
  const {
    canCreate,
    canUpdate,
    sellerOptions: teamSellers,
  } = useFinanceAccess(Boolean(api));
  const [runtimeApi, setRuntimeApi] = useState<FinanceApi | null>(api ?? null);
  const [snapshot, setSnapshot] = useState<CommissionWorkspaceSnapshot>(
    emptyCommissionSnapshot,
  );
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
  const [saleDetails, setSaleDetails] = useState<{
    sale: CommissionSaleGroup;
    sellerName: string;
  } | null>(null);
  const sellerLabels = useMemo(
    () => new Map(teamSellers.map((seller) => [seller.id, seller.label])),
    [teamSellers],
  );
  const workspaceRange = useMemo(
    () => toWorkspaceRange(filters.from, filters.to),
    [filters.from, filters.to],
  );
  const workspace = useMemo(
    () => buildCommissionWorkspace(snapshot, filters, sellerLabels),
    [filters, sellerLabels, snapshot],
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
    if (!workspaceRange) {
      setIsLoading(false);
      setSnapshot(emptyCommissionSnapshot());
      return;
    }
    let isCurrentRequest = true;
    setIsLoading(true);
    void Promise.all([
      runtimeApi.getCommissionWorkspace(workspaceRange),
      runtimeApi.listCommissionRules(),
    ])
      .then(([nextSnapshot, nextRules]) => {
        if (!isCurrentRequest) return;
        setSnapshot(nextSnapshot);
        setRules(nextRules);
        setToast(null);
      })
      .catch((error) => {
        if (!isCurrentRequest) return;
        setSnapshot(emptyCommissionSnapshot());
        setToast({
          kind: "error",
          message: formatApiErrorDisplay(
            error,
            "Não foi possível carregar as comissões.",
          ),
          title: "Erro ao carregar",
        });
      })
      .finally(() => {
        if (isCurrentRequest) setIsLoading(false);
      });
    return () => {
      isCurrentRequest = false;
    };
  }, [refreshToken, runtimeApi, workspaceRange]);

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

  const paySellerEntries = async (paidAt: string) => {
    if (!runtimeApi || !paySeller) return;
    await payCommissionSeller(
      {
        api: runtimeApi,
        filters,
        onPaid: () => setPaySeller(null),
        refresh,
        seller: paySeller,
        setPayingSellerId,
        setToast,
      },
      paidAt,
    );
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
    <FeaturePageShell className="commission-workspace bg-app" variant="plain">
      <CommissionHeader
        canCreate={canCreate}
        onCreateBonus={() => {
          setBonusSeller(null);
          setShowBonus(true);
        }}
        onExport={() =>
          exportFinanceCsv(workspace.filteredEntries, "commission")
        }
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
      <CommissionReconciliationPanel issues={workspace.reconciliation} />
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
          onViewSale={(sale, sellerName) =>
            setSaleDetails({ sale, sellerName })
          }
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
          onConfirm={(paidAt) => void paySellerEntries(paidAt)}
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
      {saleDetails ? (
        <CommissionSaleDetailsDialog
          onClose={() => setSaleDetails(null)}
          saleGroup={saleDetails.sale}
          sellerName={saleDetails.sellerName}
        />
      ) : null}
    </FeaturePageShell>
  );
}

function emptyCommissionSnapshot(): CommissionWorkspaceSnapshot {
  return {
    adjustments: [],
    generatedAt: new Date(0).toISOString(),
    reconciliation: [],
    sales: [],
    sellerNames: {},
  };
}

function toWorkspaceRange(from: string, to: string) {
  const fromDate = new Date(`${from}T00:00:00`);
  const toDate = new Date(`${to}T23:59:59.999`);
  if (
    !from ||
    !to ||
    Number.isNaN(fromDate.getTime()) ||
    Number.isNaN(toDate.getTime()) ||
    fromDate > toDate
  ) {
    return null;
  }
  return {
    from: fromDate.toISOString(),
    to: toDate.toISOString(),
  };
}
