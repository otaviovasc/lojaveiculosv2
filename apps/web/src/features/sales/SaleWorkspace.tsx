import { useCallback, useEffect, useRef, useState } from "react";
import type { InventoryApi } from "../inventory/api/apiClient";
import { SaleCancelDialog } from "./SaleCancelDialog";
import { SaleRevertDialog } from "./SaleRevertDialog";
import { SaleWorkspaceStepContent } from "./SaleWorkspaceStepContent";
import { SaleWorkspaceReadOnlyNotice } from "./SaleWorkspaceReadOnlyNotice";
import {
  SaleWorkspaceHeader,
  SaleWorkspaceEmptyState,
  SaleWorkspaceMessage,
  SaleWorkspaceNavigation,
} from "./SaleWorkspaceChrome";
import { StickySaleSummary } from "./SaleSummaryPanel";
import { canPersistSaleWorkspaceEdits, saleMissingFields } from "./salesModel";
import {
  clearSaleAutosaveTimer,
  createSaleSaveState,
  isSaleDraftSaved,
  resetSaleSaveState,
  saleSaveErrorMessage,
  saveSaleDraft,
  serializeSaleDraft,
} from "./saleWorkspacePersistence";
import {
  emptySaleContextOptions,
  type CreateSaleLeadInput,
  type SaleContextOptions,
  type SaleLeadOption,
} from "./saleContextOptions";
import type { SaleRecord } from "./types";

export function SaleWorkspace({
  contextMessage = null,
  contextOptions = emptySaleContextOptions,
  inventoryApi = null,
  onCancel,
  onClose,
  onCreateLead,
  onReserve,
  onRevert,
  onSave,
  sale,
  onBack,
}: {
  contextMessage?: string | null;
  contextOptions?: SaleContextOptions;
  inventoryApi?: InventoryApi | null;
  onCancel: (sale: SaleRecord, reason: string) => Promise<SaleRecord | void>;
  onClose: (sale: SaleRecord) => Promise<SaleRecord | void>;
  onCreateLead?: (input: CreateSaleLeadInput) => Promise<SaleLeadOption>;
  onReserve: (sale: SaleRecord) => Promise<SaleRecord | void>;
  onRevert: (sale: SaleRecord, reason: string) => Promise<SaleRecord | void>;
  onSave: (sale: SaleRecord) => Promise<SaleRecord>;
  sale: SaleRecord | null;
  onBack?: () => void;
}) {
  const [draft, setDraft] = useState<SaleRecord | null>(sale);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isRevertDialogOpen, setIsRevertDialogOpen] = useState(false);
  const autosaveTimerRef = useRef<number | undefined>(undefined);
  const draftRef = useRef<SaleRecord | null>(sale);
  const saveStateRef = useRef(createSaleSaveState(sale));

  useEffect(() => {
    const previousDraftId = draftRef.current?.id;
    const previousStatus = draftRef.current?.status;
    const previousRevision = draftRef.current?.revision;

    const isDifferentSale = sale?.id !== previousDraftId;
    const isStatusChanged = sale?.status !== previousStatus;
    const isRevisionChanged = sale?.revision !== previousRevision;

    if (isDifferentSale || isStatusChanged || isRevisionChanged) {
      setDraft(sale);
      draftRef.current = sale;
      resetSaleSaveState(saveStateRef.current, sale);
      if (isDifferentSale) {
        setCurrentStep(sale?.status === "closed" ? 3 : 0);
      } else if (sale?.status === "closed" && previousStatus !== "closed") {
        setCurrentStep(3);
      }
      return;
    }

    if (sale) {
      saveStateRef.current.lastResult = sale;
      saveStateRef.current.saved = serializeSaleDraft(sale);
      const currentDraft = draftRef.current;
      if (
        !currentDraft ||
        serializeSaleDraft(currentDraft) === saveStateRef.current.saved
      ) {
        setDraft(sale);
        draftRef.current = sale;
      }
    }
  }, [sale]);

  const persistDraft = useCallback(
    async (saleToSave: SaleRecord | null) => {
      if (!saleToSave || !canPersistSaleWorkspaceEdits(saleToSave)) {
        return saleToSave;
      }
      clearSaleAutosaveTimer(autosaveTimerRef);
      const result = await saveSaleDraft(
        saveStateRef.current,
        saleToSave,
        onSave,
      );
      if (result.submitted) {
        const currentDraft = draftRef.current;
        if (
          currentDraft &&
          serializeSaleDraft(currentDraft) === result.submitted
        ) {
          setDraft(result.sale);
          draftRef.current = result.sale;
        }
      }
      return result.sale;
    },
    [onSave],
  );

  useEffect(() => {
    if (!draft || !canPersistSaleWorkspaceEdits(draft)) return;
    if (isSaleDraftSaved(saveStateRef.current, draft)) return;
    setIsSaving(true);
    clearSaleAutosaveTimer(autosaveTimerRef);
    autosaveTimerRef.current = window.setTimeout(() => {
      const latestDraft = draftRef.current ?? draft;
      void persistDraft(latestDraft)
        .then(() => {
          setMessage("Rascunho salvo automaticamente");
        })
        .catch((error) => setMessage(saleSaveErrorMessage(error)))
        .finally(() => {
          autosaveTimerRef.current = undefined;
          setIsSaving(false);
        });
    }, 650);
    return () => clearSaleAutosaveTimer(autosaveTimerRef);
  }, [draft, persistDraft]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (message) {
      timer = setTimeout(() => setMessage(null), 3000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [message]);

  const update = (updater: (sale: SaleRecord) => SaleRecord) => {
    setDraft((current) => {
      if (!current || !canPersistSaleWorkspaceEdits(current)) return current;
      const next = updater(current);
      draftRef.current = next;
      return next;
    });
  };

  const handleBack = async () => {
    if (!onBack) return;
    clearSaleAutosaveTimer(autosaveTimerRef);
    setIsSaving(true);
    try {
      await persistDraft(draftRef.current);
      onBack();
    } catch (error) {
      setMessage(saleSaveErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  if (!draft) {
    return (
      <SaleWorkspaceEmptyState
        {...(onBack ? { onBack: () => void handleBack() } : {})}
      />
    );
  }

  const runTransition = async (
    action: (sale: SaleRecord) => Promise<SaleRecord | void>,
  ) => {
    clearSaleAutosaveTimer(autosaveTimerRef);
    setIsSaving(true);
    try {
      const saved = await persistDraft(draftRef.current ?? draft);
      if (!saved) return;
      const transitioned = await action(saved);
      resetSaleSaveState(saveStateRef.current, transitioned ?? saved);
      setMessage("Status da venda atualizado");
    } catch (error) {
      setMessage(saleSaveErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const cancelSale = (reason: string) => {
    void runTransition(async (saleToCancel) => {
      const cancelled = await onCancel(saleToCancel, reason);
      setIsCancelDialogOpen(false);
      return cancelled;
    });
  };

  const revertSale = (reason: string) => {
    void runTransition(async (saleToRevert) => {
      const correction = await onRevert(saleToRevert, reason);
      setIsRevertDialogOpen(false);
      return correction;
    });
  };

  const isCloseReady = saleMissingFields(draft, "close").length === 0;
  const isReserveReady = saleMissingFields(draft, "reserve").length === 0;
  const canClose =
    isCloseReady && (draft.status === "draft" || draft.status === "pending");
  const canReserve = isReserveReady && draft.status === "draft";

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] items-start">
      <div className="flex flex-col gap-4">
        <SaleWorkspaceHeader
          currentStep={currentStep}
          isSaving={isSaving}
          onStepChange={setCurrentStep}
          sale={draft}
          {...(onBack ? { onBack: () => void handleBack() } : {})}
        />
        <SaleWorkspaceMessage message={message} />
        <SaleWorkspaceReadOnlyNotice sale={draft} />

        <SaleWorkspaceStepContent
          canClose={canClose}
          contextMessage={contextMessage}
          contextOptions={contextOptions}
          currentStep={currentStep}
          inventoryApi={inventoryApi}
          isSaving={isSaving}
          onClose={() => void runTransition(onClose)}
          sale={draft}
          update={update}
          {...(onBack
            ? {
                onBack: () => {
                  void handleBack();
                },
              }
            : {})}
          {...(onCreateLead ? { onCreateLead } : {})}
        />

        <SaleWorkspaceNavigation
          canClose={canClose}
          canReserve={canReserve}
          currentStep={currentStep}
          isSaving={isSaving}
          onBack={() => setCurrentStep((step) => step - 1)}
          onClose={() => void runTransition(onClose)}
          onFinish={() => void handleBack()}
          onNext={() => setCurrentStep((step) => step + 1)}
          onReserve={() => void runTransition(onReserve)}
          sale={draft}
        />
      </div>

      <StickySaleSummary
        isSaving={isSaving}
        onCancel={() => setIsCancelDialogOpen(true)}
        onClose={() => void runTransition(onClose)}
        onReserve={() => void runTransition(onReserve)}
        onRevert={() => setIsRevertDialogOpen(true)}
        sale={draft}
      />
      <SaleCancelDialog
        isOpen={isCancelDialogOpen}
        isSaving={isSaving}
        onClose={() => setIsCancelDialogOpen(false)}
        onConfirm={cancelSale}
        status={draft.status}
      />
      <SaleRevertDialog
        isOpen={isRevertDialogOpen}
        isSaving={isSaving}
        onClose={() => setIsRevertDialogOpen(false)}
        onConfirm={revertSale}
      />
    </section>
  );
}
