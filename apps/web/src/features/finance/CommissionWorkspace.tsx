import { useEffect, useMemo, useState } from "react";
import { FeaturePageShell } from "../../components/ui/FeatureLayout";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import { createFinanceApi, type FinanceApi } from "./apiClient";
import {
  cancelCommission,
  CommissionToast,
  toBonusEntryDraft,
} from "./CommissionActions";
import {
  BonusCommissionDialog,
  ConfirmCommissionPayDialog,
  type BonusDraft,
} from "./CommissionDialogs";
import { CommissionEmptyState, CommissionHeader } from "./CommissionHeader";
import { CommissionFiltersPanel } from "./CommissionFiltersPanel";
import { CommissionSellerList } from "./CommissionSellerList";
import { CommissionSummaryCards } from "./CommissionSummaryCards";
import { FinanceEntryModal } from "./FinanceEntryModal";
import { CommissionRulesPanel } from "./FinanceCorePanels";
import { createFinanceApiOptions } from "./runtimeApi";
import {
  buildCommissionWorkspace,
  initialCommissionFilters,
  pendingSellerEntries,
  type CommissionSellerGroup,
} from "./commissionWorkspaceModel";
import { exportFinanceCsv, updateEntryFromDraft } from "./financeBillsActions";
import {
  toEntryInput,
  type FinanceEntryDraft,
  type FinanceToast,
} from "./financeBillsModel";
import type { CommissionRule, FinanceEntry } from "./types";

export function CommissionWorkspace({ api }: { api?: FinanceApi }) {
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
  const workspace = useMemo(
    () => buildCommissionWorkspace(entries, filters),
    [entries, filters],
  );
  const hasFilters =
    filters.period !== "thisMonth" ||
    filters.origin !== "all" ||
    Boolean(filters.sellerId) ||
    filters.status !== "all";
  const selectedBonusSellerId = bonusSeller
    ? bonusSeller.sellerId === "unassigned"
      ? ""
      : bonusSeller.sellerId
    : null;

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
            "Nao foi possivel carregar as comissoes.",
          ),
          title: "Erro ao carregar",
        });
      })
      .finally(() => setIsLoading(false));
  }, [refreshToken, runtimeApi]);

  const refresh = () => setRefreshToken((current) => current + 1);

  const createBonus = async (draft: BonusDraft) => {
    if (!runtimeApi) return;
    setSavingBonus(true);
    try {
      await runtimeApi.createEntryFlow({
        ...toEntryInput(toBonusEntryDraft(draft)),
        metadata: {
          notes: draft.notes.trim(),
          origin: "manual_bonus",
          source: "commissions_slice",
        },
      });
      setToast({ kind: "success", title: "Bonus salvo", message: draft.name });
      setBonusSeller(null);
      setShowBonus(false);
      refresh();
    } catch (error) {
      setToast({
        kind: "error",
        message: formatApiErrorDisplay(
          error,
          "Nao foi possivel salvar o bonus.",
        ),
        title: "Erro ao salvar bonus",
      });
    } finally {
      setSavingBonus(false);
    }
  };

  const paySellerEntries = async () => {
    if (!runtimeApi || !paySeller) return;
    const entriesToPay = pendingSellerEntries(paySeller, filters);
    setPayingSellerId(paySeller.sellerId);
    try {
      await Promise.all(
        entriesToPay.map((entry) => runtimeApi.payEntry(entry.id)),
      );
      setToast({
        kind: "success",
        message: `${entriesToPay.length} lancamento(s) pagos`,
        title: "Comissoes pagas",
      });
      setPaySeller(null);
      refresh();
    } catch (error) {
      setToast({
        kind: "error",
        message: formatApiErrorDisplay(
          error,
          "Nao foi possivel pagar as comissoes.",
        ),
        title: "Erro ao pagar",
      });
    } finally {
      setPayingSellerId(null);
    }
  };

  const submitDraft = async (draft: FinanceEntryDraft) => {
    if (!runtimeApi || !modalEntry) return;
    await updateEntryFromDraft(runtimeApi, modalEntry, draft);
    setToast({ kind: "success", title: "Comissao salva", message: draft.name });
    setIsModalOpen(false);
    setModalEntry(null);
    refresh();
  };

  return (
    <FeaturePageShell variant="plain">
      <CommissionHeader
        onCreateBonus={() => {
          setBonusSeller(null);
          setShowBonus(true);
        }}
        onExport={() =>
          exportFinanceCsv(workspace.filteredEntries, "commission")
        }
        summary={workspace.summary}
      />
      <CommissionSummaryCards summary={workspace.summary} />
      <CommissionFiltersPanel
        filters={filters}
        hasFilters={hasFilters}
        onChange={setFilters}
        onClear={() => setFilters(initialCommissionFilters())}
        originOptions={workspace.originOptions}
        sellerOptions={workspace.sellerOptions}
      />
      {toast ? <CommissionToast toast={toast} /> : null}
      {workspace.sellers.length ? (
        <CommissionSellerList
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
        items={rules}
        onCreate={(input) =>
          void runtimeApi?.createCommissionRule(input).then(refresh)
        }
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
      {showBonus ? (
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
          sellerOptions={workspace.sellerOptions}
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
