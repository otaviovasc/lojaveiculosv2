import { CarFront, FolderArchive, Link2, Minus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { InventorySelect } from "../inventory/components/InventoryFormParts";
import {
  documentScopeLabel,
  documentVehicleInfo,
  type DocumentVehicleOption,
} from "./documentDisplayModel";
import type {
  DocumentLinkTarget,
  UpdateDocumentInput,
  WorkspaceDocument,
} from "./types";

type LinkOption = {
  description: string;
  icon: "store" | "vehicle";
  label: string;
  targetId?: string;
  targetType: DocumentLinkTarget;
  value: string;
};

export function DocumentManageLinksDialog({
  document,
  isBusy,
  onClose,
  onSave,
  vehicleOptions,
}: {
  document: WorkspaceDocument | null;
  isBusy: boolean;
  onClose: () => void;
  onSave: (
    document: WorkspaceDocument,
    input: UpdateDocumentInput,
  ) => Promise<WorkspaceDocument | null>;
  vehicleOptions: readonly DocumentVehicleOption[];
}) {
  const currentValue = document ? linkValue(document) : "store";
  const [selectedValue, setSelectedValue] = useState(currentValue);

  useEffect(() => {
    setSelectedValue(currentValue);
  }, [currentValue]);

  const options = useMemo(
    () => (document ? buildLinkOptions(document, vehicleOptions) : []),
    [document, vehicleOptions],
  );

  if (!document) return null;
  const vehicle = documentVehicleInfo(document);
  const selectedOption =
    options.find((option) => option.value === selectedValue) ?? options[0];
  const isVoided = document.status === "voided";
  const hasChanged = selectedValue !== currentValue;

  const submit = async () => {
    if (!selectedOption || !hasChanged || isVoided) return;
    const updated = await onSave(
      document,
      linkInput(selectedOption, document.context.linkRole),
    );
    if (updated) onClose();
  };

  return (
    <div className="documents-modal-backdrop" onClick={onClose}>
      <section
        aria-label="Gerenciar vínculos do documento"
        className="documents-links-dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="documents-upload-header">
          <div>
            <strong>Gerenciar vínculos</strong>
            <span>{document.title}</span>
          </div>
          <button
            aria-label="Fechar"
            className="documents-icon-button"
            onClick={onClose}
            title="Fechar"
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </header>

        <section className="documents-current-links">
          <strong>Escopo atual</strong>
          <article>
            {vehicle ? (
              <CarFront aria-hidden="true" className="size-4" />
            ) : (
              <FolderArchive aria-hidden="true" className="size-4" />
            )}
            <div>
              <span>{documentScopeLabel(document)}</span>
              <p>
                {vehicle
                  ? [vehicle.plate, vehicle.label, vehicle.vin]
                      .filter(Boolean)
                      .join(" · ")
                  : "Geral"}
              </p>
            </div>
            <button
              aria-label="Mover documento para Geral"
              className="documents-icon-button"
              disabled={!vehicle || isBusy || isVoided}
              onClick={() => setSelectedValue("store")}
              title="Mover documento para Geral"
              type="button"
            >
              <Minus aria-hidden="true" className="size-4" />
            </button>
          </article>
        </section>

        <label className="documents-filter-field documents-link-target-field">
          <span>Novo vínculo principal</span>
          <InventorySelect
            ariaLabel="Novo vínculo principal"
            disabled={isBusy || isVoided}
            onChange={setSelectedValue}
            options={options.map((option) => ({
              label: option.label,
              value: option.value,
            }))}
            value={selectedValue}
          />
        </label>

        {selectedOption ? <LinkPreview option={selectedOption} /> : null}
        {isVoided ? (
          <p className="documents-upload-status">
            Documentos cancelados mantêm o vínculo histórico original.
          </p>
        ) : null}

        <footer className="documents-upload-actions">
          <button onClick={onClose} type="button">
            Cancelar
          </button>
          <button
            disabled={isBusy || isVoided || !hasChanged}
            onClick={() => void submit()}
            type="button"
          >
            <Link2 aria-hidden="true" className="size-4" />
            {isBusy ? "Salvando..." : "Salvar vínculos"}
          </button>
        </footer>
      </section>
    </div>
  );
}

function LinkPreview({ option }: { option: LinkOption }) {
  return (
    <section className="documents-link-preview">
      {option.icon === "vehicle" ? (
        <CarFront aria-hidden="true" className="size-4" />
      ) : (
        <FolderArchive aria-hidden="true" className="size-4" />
      )}
      <div>
        <strong>{option.label}</strong>
        <p>{option.description}</p>
      </div>
    </section>
  );
}

function buildLinkOptions(
  document: WorkspaceDocument,
  vehicleOptions: readonly DocumentVehicleOption[],
): LinkOption[] {
  const options: LinkOption[] = [
    {
      description: "Documento compartilhado no acervo geral da loja.",
      icon: "store",
      label: "Geral da loja",
      targetType: "store",
      value: "store",
    },
    ...vehicleOptions.map((vehicle) => ({
      description:
        [vehicle.plate, vehicle.stockNumber, vehicle.vin]
          .filter(Boolean)
          .join(" · ") || "Unidade do estoque",
      icon: "vehicle" as const,
      label: vehicle.plate
        ? `${vehicle.plate} - ${vehicle.label}`
        : vehicle.label,
      targetId: vehicle.id,
      targetType: "vehicle_unit" as const,
      value: `vehicle_unit:${vehicle.id}`,
    })),
  ];
  const current = linkValue(document);
  if (!options.some((option) => option.value === current)) {
    const vehicle = documentVehicleInfo(document);
    options.push({
      description: vehicle
        ? [vehicle.plate, vehicle.label, vehicle.vin]
            .filter(Boolean)
            .join(" · ")
        : documentScopeLabel(document),
      icon: vehicle ? "vehicle" : "store",
      label: `Vínculo atual: ${vehicle?.label ?? documentScopeLabel(document)}`,
      targetId: document.context.targetId,
      targetType: document.context.targetType,
      value: current,
    });
  }
  return options;
}

function linkValue(document: WorkspaceDocument) {
  return document.context.targetType === "store"
    ? "store"
    : `${document.context.targetType}:${document.context.targetId}`;
}

function linkInput(
  option: LinkOption,
  currentLinkRole: string,
): UpdateDocumentInput {
  if (option.targetType === "store") {
    return { linkRole: currentLinkRole || "primary", targetType: "store" };
  }
  if (
    option.targetType !== "vehicle_listing" &&
    option.targetType !== "vehicle_unit"
  ) {
    throw new Error("Document link target type is not editable.");
  }
  if (!option.targetId) {
    throw new Error("Document link target id is required.");
  }
  return {
    linkRole: currentLinkRole || "primary",
    targetId: option.targetId,
    targetType: option.targetType,
  };
}
