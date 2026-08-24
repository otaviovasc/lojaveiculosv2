import { Car, ImageIcon, Loader2, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActionDialog } from "./CrmActionDialogFrame";
import type {
  CrmWhatsappSendVehicleInput,
  CrmVehicleOption,
  CrmVehicleQuery,
} from "./crmConversationTypes";

export type VehicleDialogSend = (
  input: Omit<CrmWhatsappSendVehicleInput, "cycleId">,
) => Promise<boolean>;

export type VehicleDialogLoader = (
  input?: CrmVehicleQuery,
) => Promise<readonly CrmVehicleOption[]>;

const blockedStatuses = new Set(["sold", "delivered", "inactive"]);

export function VehicleDialog({
  disabled,
  onClose,
  onLoadVehicles,
  onSend,
}: {
  disabled?: boolean;
  onClose: () => void;
  onLoadVehicles: VehicleDialogLoader;
  onSend: VehicleDialogSend;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [vehicles, setVehicles] = useState<readonly CrmVehicleOption[]>([]);
  const loadRef = useRef(onLoadVehicles);
  const filteredVehicles = useMemo(
    () => filterVehicles(vehicles, query),
    [query, vehicles],
  );
  const selectedVehicle =
    filteredVehicles.find((vehicle) => vehicle.unitId === selectedId) ??
    filteredVehicles[0] ??
    null;
  const cannotSend =
    disabled ||
    isSaving ||
    isLoading ||
    !selectedVehicle ||
    blockedStatuses.has(selectedVehicle.status);

  useEffect(() => {
    loadRef.current = onLoadVehicles;
  }, [onLoadVehicles]);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    void loadRef
      .current()
      .then((items) => {
        if (!active) return;
        setVehicles(items);
        setSelectedId(
          items.find((item) => !blockedStatuses.has(item.status))?.unitId ?? "",
        );
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <ActionDialog
      disabled={cannotSend}
      icon={<Car />}
      onClose={onClose}
      onSubmit={async () => {
        if (!selectedVehicle) return;
        setIsSaving(true);
        try {
          const accepted = await onSend({
            listingId: selectedVehicle.listingId,
            mediaLimit: 4,
            ...(selectedVehicle.mileageLabel
              ? { mileageLabel: selectedVehicle.mileageLabel }
              : {}),
            ...(selectedVehicle.priceLabel
              ? { priceLabel: selectedVehicle.priceLabel }
              : {}),
            ...(selectedVehicle.thumbnailUrl
              ? { thumbnailUrl: selectedVehicle.thumbnailUrl }
              : {}),
            title: selectedVehicle.title,
            ...(selectedVehicle.unitId
              ? { unitId: selectedVehicle.unitId }
              : {}),
            ...(selectedVehicle.yearLabel
              ? { year: selectedVehicle.yearLabel }
              : {}),
          });
          if (accepted) onClose();
        } finally {
          setIsSaving(false);
        }
      }}
      title="Enviar veículo"
    >
      <label className="crm-search-field">
        Buscar no estoque
        <span>
          <Search aria-hidden="true" />
          <input
            disabled={disabled || isSaving}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Modelo, placa, cor ou estoque"
            value={query}
          />
        </span>
      </label>

      {isLoading ? (
        <div className="crm-catalog-loading">
          <Loader2 className="crm-spin" />
          Carregando estoque...
        </div>
      ) : (
        <div className="crm-vehicle-picker">
          {filteredVehicles.map((vehicle) => (
            <VehicleOptionButton
              key={vehicle.unitId ?? vehicle.listingId}
              onSelect={setSelectedId}
              selected={vehicle.unitId === selectedId}
              vehicle={vehicle}
            />
          ))}
          {!filteredVehicles.length ? (
            <p className="crm-action-error">
              Nenhum veículo encontrado no estoque.
            </p>
          ) : null}
        </div>
      )}
    </ActionDialog>
  );
}

function VehicleOptionButton({
  onSelect,
  selected,
  vehicle,
}: {
  onSelect: (id: string) => void;
  selected: boolean;
  vehicle: CrmVehicleOption;
}) {
  const disabled = blockedStatuses.has(vehicle.status);
  const detail = [
    vehicle.priceLabel,
    vehicle.yearLabel,
    vehicle.mileageLabel,
  ].filter(Boolean);
  return (
    <button
      aria-pressed={selected}
      className="crm-vehicle-option cursor-pointer"
      disabled={disabled}
      onClick={() => onSelect(vehicle.unitId ?? vehicle.listingId)}
      type="button"
    >
      <span className="crm-vehicle-thumb">
        {vehicle.thumbnailUrl ? (
          <img alt="" src={vehicle.thumbnailUrl} />
        ) : (
          <ImageIcon aria-hidden="true" />
        )}
      </span>
      <span className="crm-vehicle-copy">
        <strong>{vehicle.title}</strong>
        <small>{detail.join(" · ") || "Veículo do estoque"}</small>
        <small>
          {[vehicle.plate, vehicle.stockNumber, vehicle.colorName]
            .filter(Boolean)
            .join(" · ") || "Sem placa cadastrada"}
        </small>
      </span>
      <span className="crm-vehicle-meta">
        <span data-status={vehicle.status}>{statusLabel(vehicle.status)}</span>
        <small>{vehicle.mediaCount} foto(s)</small>
      </span>
    </button>
  );
}

function filterVehicles(vehicles: readonly CrmVehicleOption[], query: string) {
  const needle = query.trim().toLocaleLowerCase("pt-BR");
  if (!needle) return vehicles;
  return vehicles.filter((vehicle) =>
    [
      vehicle.colorName,
      vehicle.mileageLabel,
      vehicle.plate,
      vehicle.priceLabel,
      vehicle.stockNumber,
      vehicle.title,
      vehicle.yearLabel,
    ]
      .filter(Boolean)
      .some((value) =>
        String(value).toLocaleLowerCase("pt-BR").includes(needle),
      ),
  );
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    acquired: "Comprado",
    available: "Disponível",
    delivered: "Entregue",
    inactive: "Inativo",
    in_preparation: "Preparação",
    reserved: "Reservado",
    sold: "Vendido",
  };
  return labels[status] ?? status;
}
