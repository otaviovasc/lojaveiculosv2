import { BadgeDollarSign, ExternalLink, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CrmSelect } from "./CrmFormControls";
import { CrmActionDialogShell } from "./CrmActionDialogFrame";
import { readCrmChannelLabel } from "./crmConnectionStatus";
import { formatCycleName } from "./crmConversationModel";
import type { CrmConversationCycle } from "./crmConversationTypes";
import {
  loadSaleContextOptions,
  type SaleUnitOption,
} from "../sales/saleContextOptions";

type UnitOptionsState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; units: readonly SaleUnitOption[] };

export function CrmSaleStartDialog({
  assignableMembers,
  disabled = false,
  onClose,
  onConcludeInstead,
  cycle,
}: {
  assignableMembers: Array<{ id: number; name: string }>;
  disabled?: boolean;
  onClose: () => void;
  onConcludeInstead: () => void;
  cycle: CrmConversationCycle;
}) {
  const [optionsState, setOptionsState] = useState<UnitOptionsState>({
    kind: "loading",
  });
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadSaleContextOptions()
      .then((result) => {
        if (cancelled) return;
        if (result.kind === "error" && result.options.units.length === 0) {
          setOptionsState({ kind: "error", message: result.message });
          return;
        }
        setOptionsState({ kind: "ready", units: result.options.units });
      })
      .catch(() => {
        if (cancelled) return;
        setOptionsState({
          kind: "error",
          message: "Não foi possível carregar os veículos disponíveis.",
        });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const units = optionsState.kind === "ready" ? optionsState.units : [];
  const preselectedUnit = useMemo(
    () => findCycleUnit(units, cycle),
    [units, cycle],
  );
  const effectiveUnitId = selectedUnitId || preselectedUnit?.id || "";
  const selectedUnit =
    units.find((unit) => unit.id === effectiveUnitId) ?? null;

  const owner =
    cycle.assignedMember?.name ??
    assignableMembers.find(
      (member) => String(member.id) === String(cycle.assignedUserId),
    )?.name ??
    "Sem responsável";

  const validationError =
    optionsState.kind === "ready" && units.length === 0
      ? "Nenhum veículo disponível no estoque."
      : !selectedUnit
        ? "Selecione o veículo da venda."
        : null;

  const startSale = () => {
    setAttempted(true);
    if (!selectedUnit) return;
    navigateToSale(cycle, selectedUnit);
  };

  return (
    <CrmActionDialogShell
      onClose={onClose}
      panelClassName="crm-conclusion-panel"
      title="Iniciar venda"
    >
      <header>
        <span>
          <BadgeDollarSign aria-hidden="true" />
        </span>
        <div>
          <h2>Iniciar venda</h2>
          <p>
            Confirme o veículo e abra a venda com o contexto desta conversa.
          </p>
        </div>
        <button
          aria-label="Fechar"
          className="crm-icon-action"
          disabled={disabled}
          onClick={onClose}
          type="button"
        >
          <X />
        </button>
      </header>

      <div className="crm-action-fields">
        <dl className="crm-conclusion-context">
          <ContextItem label="Lead / cliente" value={formatCycleName(cycle)} />
          <ContextItem label="Responsável" value={owner} />
          <ContextItem
            label="Canal"
            value={readCrmChannelLabel(cycle.channel)}
          />
        </dl>

        {optionsState.kind === "loading" ? (
          <p className="crm-conclusion-error" role="status">
            Carregando veículos disponíveis...
          </p>
        ) : optionsState.kind === "error" ? (
          <p className="crm-conclusion-error" role="alert">
            {optionsState.message}
          </p>
        ) : (
          <label>
            Veículo da venda
            <CrmSelect
              ariaLabel="Veículo da venda"
              className="crm-select"
              disabled={disabled || units.length === 0}
              onChange={(value) => {
                setSelectedUnitId(value);
                setAttempted(false);
              }}
              options={[
                {
                  label:
                    units.length === 0
                      ? "Nenhum veículo disponível"
                      : "Selecione o veículo",
                  value: "",
                },
                ...units.map((unit) => ({
                  label: unit.detail
                    ? `${unit.listingTitle} · ${unit.detail}`
                    : unit.label,
                  value: unit.id,
                })),
              ]}
              value={effectiveUnitId}
            />
          </label>
        )}
        {attempted && validationError ? (
          <p className="crm-conclusion-error" role="alert">
            {validationError}
          </p>
        ) : null}
      </div>

      <footer className="crm-conclusion-footer">
        <button
          className="crm-action crm-action-muted cursor-pointer"
          disabled={disabled}
          onClick={onConcludeInstead}
          type="button"
        >
          Encerrar sem venda
        </button>
        <span className="crm-conclusion-footer-actions">
          <button
            className="crm-action crm-action-muted"
            disabled={disabled}
            onClick={onClose}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="crm-action"
            disabled={disabled || optionsState.kind !== "ready"}
            onClick={startSale}
            type="button"
          >
            Iniciar venda
            <ExternalLink aria-hidden="true" className="size-4" />
          </button>
        </span>
      </footer>
    </CrmActionDialogShell>
  );
}

function ContextItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function findCycleUnit(
  units: readonly SaleUnitOption[],
  cycle: CrmConversationCycle,
) {
  const metadata = cycle.metadata ?? {};
  const unitId = readMetadataString(metadata, "unitId");
  if (unitId) {
    const match = units.find((unit) => unit.id === unitId);
    if (match) return match;
  }
  const listingId = readMetadataString(metadata, "listingId");
  if (listingId) {
    const match = units.find((unit) => unit.listingId === listingId);
    if (match) return match;
  }
  return undefined;
}

function navigateToSale(cycle: CrmConversationCycle, unit: SaleUnitOption) {
  const params = new URLSearchParams();
  if (cycle.leadId) params.set("leadId", cycle.leadId);
  if (cycle.customerDisplayName)
    params.set("customerDisplayName", cycle.customerDisplayName);
  if (cycle.customerPhone) params.set("customerPhone", cycle.customerPhone);
  if (cycle.assignedUserId) params.set("sellerUserId", cycle.assignedUserId);
  params.set("listingId", unit.listingId);
  params.set("unitId", unit.id);
  params.set("listingTitle", unit.listingTitle);
  window.location.hash = `/sales?${params.toString()}`;
}

function readMetadataString(
  metadata: Record<string, unknown>,
  ...keys: string[]
) {
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}
