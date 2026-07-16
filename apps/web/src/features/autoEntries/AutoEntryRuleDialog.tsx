import { Bot, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import {
  FeatureDialog,
  FeatureDialogActions,
} from "../../components/ui/FeatureOverlay";
import { FeatureAlert } from "../../components/ui/FeatureStates";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import type { SaleSellerOption } from "../sales/saleContextOptions";
import {
  buildAutoEntryRuleInput,
  createAutoEntryDraft,
  validateAutoEntryDraft,
} from "./model";
import { AutoEntryRuleForm } from "./AutoEntryRuleForm";
import type {
  AutoEntryDraftErrors,
  AutoEntryEvent,
  AutoEntryRule,
  AutoEntryRuleDraft,
  AutoEntryRuleInput,
} from "./types";

export function AutoEntryRuleDialog({
  defaultEvent,
  isOpen,
  onClose,
  onSave,
  rule,
  sellers,
}: {
  defaultEvent: AutoEntryEvent;
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: AutoEntryRuleInput) => Promise<void>;
  rule: AutoEntryRule | null;
  sellers: readonly SaleSellerOption[];
}) {
  const initialDraft = useMemo(
    () => createAutoEntryDraft(defaultEvent, rule),
    [defaultEvent, rule],
  );
  const [draft, setDraft] = useState<AutoEntryRuleDraft>(initialDraft);
  const [errors, setErrors] = useState<AutoEntryDraftErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initialDraft);

  useEffect(() => {
    if (!isOpen) return;
    setDraft(initialDraft);
    setErrors({});
    setSubmitError(null);
    setConfirmDiscard(false);
  }, [initialDraft, isOpen]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isOpen || !dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty, isOpen]);

  const requestClose = () => {
    if (isSaving) return;
    if (dirty) {
      setConfirmDiscard(true);
      return;
    }
    onClose();
  };

  const submit = async () => {
    if (isSaving) return;
    const nextErrors = validateAutoEntryDraft(draft);
    setErrors(nextErrors);
    const input = buildAutoEntryRuleInput(draft);
    if (!input) return;
    setIsSaving(true);
    setSubmitError(null);
    try {
      await onSave(input);
      onClose();
    } catch (error) {
      setSubmitError(
        formatApiErrorDisplay(error, "Não foi possível salvar a regra."),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const updateDraft = (patch: Partial<AutoEntryRuleDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setErrors({});
    setSubmitError(null);
  };

  return (
    <>
      <FeatureDialog
        className="max-w-3xl"
        description="A origem, o cálculo e o momento serão registrados na trilha auditável do financeiro."
        footer={
          <FeatureDialogActions
            cancelDisabled={isSaving}
            confirmIcon={<Save aria-hidden="true" />}
            confirmLabel={rule ? "Salvar alterações" : "Criar regra"}
            isLoading={isSaving}
            loadingLabel="Salvando"
            onCancel={requestClose}
            onConfirm={() => void submit()}
          />
        }
        icon={<Bot aria-hidden="true" />}
        isOpen={isOpen}
        onClose={requestClose}
        title={rule ? "Editar regra automática" : "Nova regra automática"}
      >
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          {submitError ? <FeatureAlert>{submitError}</FeatureAlert> : null}
          <AutoEntryRuleForm
            draft={draft}
            errors={errors}
            onChange={updateDraft}
            sellers={sellers}
          />
          <button
            aria-hidden="true"
            className="hidden"
            disabled={isSaving}
            tabIndex={-1}
            type="submit"
          />
        </form>
      </FeatureDialog>
      <ConfirmDialog
        confirmLabel="Descartar alterações"
        description="As mudanças feitas nesta regra ainda não foram salvas."
        isOpen={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        onConfirm={() => {
          setConfirmDiscard(false);
          onClose();
        }}
        title="Descartar alterações?"
        variant="destructive"
      />
    </>
  );
}
