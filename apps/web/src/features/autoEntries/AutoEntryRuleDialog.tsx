import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Button } from "../../components/ui/button";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
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

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
      <Dialog open={isOpen} onOpenChange={(open) => !open && requestClose()}>
        <DialogContent
          className="max-h-[calc(100vh-2rem)] max-w-3xl overflow-y-auto"
          padding="none"
          radius="3xl"
          surface="panel"
        >
          <form onSubmit={(event) => void submit(event)}>
            <div className="border-b border-line/50 px-6 py-5">
              <DialogHeader>
                <DialogTitle>
                  {rule ? "Editar regra automática" : "Nova regra automática"}
                </DialogTitle>
                <DialogDescription>
                  A origem, o cálculo e o momento serão registrados na trilha
                  auditável do financeiro.
                </DialogDescription>
              </DialogHeader>
            </div>
            <div className="px-6 py-5">
              {submitError ? <FeatureAlert>{submitError}</FeatureAlert> : null}
              <AutoEntryRuleForm
                draft={draft}
                errors={errors}
                onChange={updateDraft}
                sellers={sellers}
              />
            </div>
            <div className="border-t border-line/50 px-6 py-4">
              <DialogFooter>
                <Button
                  disabled={isSaving}
                  onClick={requestClose}
                  size="sm"
                  type="button"
                  variant="secondary"
                >
                  Cancelar
                </Button>
                <Button disabled={isSaving} size="sm" type="submit">
                  {isSaving
                    ? "Salvando…"
                    : rule
                      ? "Salvar alterações"
                      : "Criar regra"}
                </Button>
              </DialogFooter>
            </div>
          </form>
        </DialogContent>
      </Dialog>
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
