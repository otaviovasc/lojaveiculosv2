import { useEffect, useState } from "react";
import { AlertTriangle, Archive, Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import {
  formatBrazilianDocument,
  formatBrazilianPhone,
} from "../../../lib/masks";
import type { VehicleSupplier, VehicleSupplierKind } from "../model/types";
import {
  InventoryField,
  InventoryInput,
  InventorySelect,
} from "./InventoryFormParts";
import { IconButton, TextField } from "./VehicleAcquisitionCardParts";
import {
  supplierKindOptions,
  emptySupplierDraft,
  fromSupplier,
  type SupplierDraft,
} from "./VehicleAcquisitionCardModel";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  supplier: VehicleSupplier | null;
  onSave: (draft: SupplierDraft) => Promise<void>;
  onArchive?: () => Promise<void>;
  isSaving: boolean;
};

export function VehicleAcquisitionSupplierModal({
  isOpen,
  onClose,
  supplier,
  onSave,
  onArchive,
  isSaving,
}: Props) {
  const [draft, setDraft] = useState<SupplierDraft>(emptySupplierDraft);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const initialDraft = supplier
        ? fromSupplier(supplier)
        : emptySupplierDraft;
      setDraft({
        ...initialDraft,
        documentNumber: formatBrazilianDocument(
          initialDraft.documentNumber ?? "",
        ),
        phone: formatBrazilianPhone(initialDraft.phone ?? ""),
      });
      setError(null);
    }
  }, [isOpen, supplier]);

  const updateDraft = (
    field: keyof SupplierDraft,
    value: string | VehicleSupplierKind,
  ) => {
    setDraft((current) => ({
      ...current,
      [field]: value === "" ? null : value,
    }));
  };

  const handleSave = async () => {
    if (!draft.displayName.trim()) {
      setError("Informe o nome do fornecedor.");
      return;
    }
    try {
      setError(null);
      await onSave(draft);
      onClose();
    } catch (e) {
      setError("Erro ao salvar o fornecedor.");
    }
  };

  const showIntegrationFields =
    draft.kind === "provider" || draft.kind === "partner";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md" radius="xl" surface="panel">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-base font-black uppercase tracking-wider">
            {supplier ? "Editar Fornecedor" : "Cadastrar Fornecedor"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted font-bold">
            {supplier
              ? "Modificar dados do fornecedor existente."
              : "Cadastre um novo fornecedor para vincular a aquisições."}
          </DialogDescription>
        </DialogHeader>

        {supplier ? (
          <div className="flex gap-2 items-start bg-warning/10 border border-warning/30 text-warning text-xs font-bold rounded-lg p-2.5 mb-4">
            <AlertTriangle className="size-4 shrink-0 mt-0.5" />
            <span>
              Atenção: Este fornecedor pode estar vinculado a outros veículos.
              Alterações serão aplicadas globalmente.
            </span>
          </div>
        ) : null}

        {error ? (
          <div className="bg-accent-soft/20 border border-accent-soft text-accent-strong text-xs font-bold rounded-lg p-2.5 mb-4">
            {error}
          </div>
        ) : null}

        <div className="grid gap-3 mb-6">
          <InventoryField label="Nome" required>
            <InventoryInput
              disabled={isSaving}
              onChange={(event) =>
                updateDraft("displayName", event.target.value)
              }
              value={draft.displayName}
              placeholder="Ex: Auto Avaliar, João da Silva"
            />
          </InventoryField>

          <div className="grid gap-3 grid-cols-2">
            <InventoryField label="Tipo">
              <InventorySelect
                disabled={isSaving}
                onChange={(value) => updateDraft("kind", value)}
                options={supplierKindOptions}
                value={draft.kind}
              />
            </InventoryField>
            <TextField
              autoComplete="off"
              disabled={isSaving}
              inputMode="numeric"
              label="Documento (CPF/CNPJ)"
              maxLength={18}
              onChange={(value) =>
                updateDraft("documentNumber", formatBrazilianDocument(value))
              }
              placeholder="000.000.000-00"
              value={draft.documentNumber}
            />
          </div>

          <div className="grid gap-3 grid-cols-2">
            <TextField
              autoComplete="tel"
              disabled={isSaving}
              inputMode="tel"
              label="Telefone"
              maxLength={15}
              onChange={(value) =>
                updateDraft("phone", formatBrazilianPhone(value))
              }
              placeholder="(11) 98765-4321"
              type="tel"
              value={draft.phone}
            />
            <TextField
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              disabled={isSaving}
              inputMode="email"
              label="E-mail"
              onChange={(value) => updateDraft("email", value)}
              placeholder="fornecedor@exemplo.com"
              spellCheck={false}
              type="email"
              value={draft.email}
            />
          </div>

          {showIntegrationFields ? (
            <div className="grid gap-3 grid-cols-2 pt-2 border-t border-line/30">
              <TextField
                disabled={isSaving}
                label="Provedor"
                onChange={(value) => updateDraft("provider", value)}
                value={draft.provider}
              />
              <TextField
                disabled={isSaving}
                label="Código externo"
                onChange={(value) => updateDraft("externalProviderId", value)}
                value={draft.externalProviderId}
              />
            </div>
          ) : null}
        </div>

        <DialogFooter className="flex gap-2 justify-between">
          <div>
            {supplier && onArchive ? (
              <IconButton
                disabled={isSaving}
                icon={<Archive className="size-3.5" />}
                label="Arquivar"
                onClick={() => {
                  void (async () => {
                    if (onArchive) {
                      try {
                        setError(null);
                        await onArchive();
                        onClose();
                      } catch (e) {
                        setError("Não foi possível arquivar o fornecedor.");
                      }
                    }
                  })();
                }}
              />
            ) : null}
          </div>
          <div className="flex gap-2">
            <button
              className="min-h-9 rounded-lg px-4 text-xs font-black border border-line text-app-text hover:bg-line/25 transition-all cursor-pointer"
              onClick={onClose}
              type="button"
              disabled={isSaving}
            >
              Cancelar
            </button>
            <IconButton
              disabled={isSaving}
              icon={<Save className="size-3.5" />}
              label="Salvar"
              onClick={() => void handleSave()}
              variant="primary"
            />
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
