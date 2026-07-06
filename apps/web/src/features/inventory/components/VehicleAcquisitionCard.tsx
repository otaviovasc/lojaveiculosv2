import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Truck } from "lucide-react";
import type { CustomSelectOption } from "../../../components/ui/CustomSelect";
import type { InventoryApi } from "../api/apiClient";
import type {
  InventoryUnit,
  VehicleSupplier,
  VehicleSupplierKind,
} from "../model/types";
import { InventoryPanel } from "./InventoryFormParts";
import {
  cleanAcquisitionDraft,
  cleanSupplierDraft,
  emptyAcquisitionDraft,
  emptySupplierDraft,
  fromAcquisition,
  fromSupplier,
  type AcquisitionDraft,
  type SupplierDraft,
  upsertSupplier,
} from "./VehicleAcquisitionCardModel";
import { VehicleAcquisitionSourcePanel } from "./VehicleAcquisitionSourcePanel";
import { VehicleAcquisitionSupplierPanel } from "./VehicleAcquisitionSupplierPanel";

type Props = {
  api: InventoryApi;
  listingId: string;
  unit: InventoryUnit | null;
};

export function VehicleAcquisitionCard({ api, unit }: Props) {
  const [acquisitionDraft, setAcquisitionDraft] = useState<AcquisitionDraft>(
    emptyAcquisitionDraft,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [supplierDraft, setSupplierDraft] =
    useState<SupplierDraft>(emptySupplierDraft);
  const [suppliers, setSuppliers] = useState<readonly VehicleSupplier[]>([]);

  const supplierOptions = useMemo<CustomSelectOption[]>(() => {
    const supplierRows = suppliers.map((supplier) => ({
      label: supplier.displayName,
      value: supplier.id,
    }));
    return [{ label: "Novo fornecedor", value: "" }, ...supplierRows];
  }, [suppliers]);

  useEffect(() => {
    let cancelled = false;
    const unitId = unit?.id ?? null;
    setIsLoading(true);
    setMessage(null);
    const acquisitionPromise = unitId
      ? api.getVehicleUnitAcquisition(unitId)
      : Promise.resolve(null);
    Promise.all([api.listVehicleSuppliers({ limit: 80 }), acquisitionPromise])
      .then(([supplierList, acquisition]) => {
        if (cancelled) return;
        setSuppliers(supplierList);
        setAcquisitionDraft(fromAcquisition(acquisition));
        const supplier =
          supplierList.find((item) => item.id === acquisition?.supplierId) ??
          null;
        setSelectedSupplierId(supplier?.id ?? "");
        setSupplierDraft(
          supplier ? fromSupplier(supplier) : emptySupplierDraft,
        );
      })
      .catch(() => {
        if (!cancelled) setMessage("Não foi possível carregar a aquisição.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api, unit?.id]);

  const updateSupplierDraft = (
    field: keyof SupplierDraft,
    value: string | VehicleSupplierKind,
  ) => {
    setSupplierDraft((current) => ({
      ...current,
      [field]: value === "" ? null : value,
    }));
  };

  const selectSupplier = (supplierId: string) => {
    const supplier = suppliers.find((item) => item.id === supplierId);
    setSelectedSupplierId(supplierId);
    setSupplierDraft(supplier ? fromSupplier(supplier) : emptySupplierDraft);
    setAcquisitionDraft((current) => ({
      ...current,
      supplierId: supplierId || null,
    }));
  };

  const saveSupplier = async () => {
    const displayName = supplierDraft.displayName.trim();
    if (!displayName) {
      setMessage("Informe o nome do fornecedor.");
      return;
    }
    setIsSaving(true);
    try {
      const payload = cleanSupplierDraft({ ...supplierDraft, displayName });
      const supplier = selectedSupplierId
        ? await api.updateVehicleSupplier(selectedSupplierId, payload)
        : await api.createVehicleSupplier(payload);
      setSuppliers((current) => upsertSupplier(current, supplier));
      setSelectedSupplierId(supplier.id);
      setSupplierDraft(fromSupplier(supplier));
      setAcquisitionDraft((current) => ({
        ...current,
        supplierId: supplier.id,
      }));
      setMessage("Fornecedor salvo.");
    } catch {
      setMessage("Não foi possível salvar o fornecedor.");
    } finally {
      setIsSaving(false);
    }
  };

  const archiveSupplier = async () => {
    if (!selectedSupplierId) return;
    if (acquisitionDraft.supplierId === selectedSupplierId) {
      setMessage("Desvincule o fornecedor da aquisição antes de arquivar.");
      return;
    }
    setIsSaving(true);
    try {
      await api.archiveVehicleSupplier(selectedSupplierId);
      setSuppliers((current) =>
        current.filter((supplier) => supplier.id !== selectedSupplierId),
      );
      setSelectedSupplierId("");
      setSupplierDraft(emptySupplierDraft);
      setMessage("Fornecedor arquivado.");
    } catch {
      setMessage("Não foi possível arquivar o fornecedor.");
    } finally {
      setIsSaving(false);
    }
  };

  const saveAcquisition = async () => {
    if (!unit) return;
    setIsSaving(true);
    try {
      const acquisition = await api.upsertVehicleUnitAcquisition(
        unit.id,
        cleanAcquisitionDraft(acquisitionDraft),
      );
      setAcquisitionDraft(fromAcquisition(acquisition));
      setSelectedSupplierId(acquisition.supplierId ?? selectedSupplierId);
      setMessage("Origem de aquisição salva.");
    } catch {
      setMessage("Não foi possível salvar a origem de aquisição.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!unit) {
    return (
      <InventoryPanel
        icon={<Truck className="size-5" />}
        title="Origem e Fornecedor de Aquisição"
      >
        <p className="text-xs font-bold text-muted">
          Adicione uma unidade ao veículo para cadastrar origem e fornecedor.
        </p>
      </InventoryPanel>
    );
  }

  return (
    <InventoryPanel
      icon={
        isLoading ? (
          <RefreshCw className="size-5 animate-spin" />
        ) : (
          <Truck className="size-5" />
        )
      }
      title="Origem e Fornecedor de Aquisição"
    >
      <div className="grid gap-4">
        {message ? (
          <div className="rounded-xl border border-line bg-app px-3 py-2 text-xs font-bold text-muted">
            {message}
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-4 lg:gap-0">
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-muted mb-4 flex items-center gap-1.5 border-b border-line/30 pb-2">
              <span>Fornecedor</span>
            </h4>
            <VehicleAcquisitionSupplierPanel
              isSaving={isSaving}
              onArchive={() => void archiveSupplier()}
              onSave={() => void saveSupplier()}
              onSelectSupplier={selectSupplier}
              onUpdateSupplierDraft={updateSupplierDraft}
              selectedSupplierId={selectedSupplierId}
              supplierDraft={supplierDraft}
              supplierOptions={supplierOptions}
            />
          </div>

          {/* Centered line dividers */}
          <div className="hidden lg:block w-px bg-line/60 self-stretch my-2 mx-8" />
          <div className="block lg:hidden h-px bg-line/60 w-full my-6" />

          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-muted mb-4 flex items-center gap-1.5 border-b border-line/30 pb-2">
              <span>Origem e Valores</span>
            </h4>
            <VehicleAcquisitionSourcePanel
              acquisitionDraft={acquisitionDraft}
              isSaving={isSaving}
              onSave={() => void saveAcquisition()}
              setAcquisitionDraft={setAcquisitionDraft}
            />
          </div>
        </div>
      </div>
    </InventoryPanel>
  );
}
