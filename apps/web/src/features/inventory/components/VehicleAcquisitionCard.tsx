import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Save, Truck } from "lucide-react";
import type { CustomSelectOption } from "../../../components/ui/CustomSelect";
import type { InventoryApi } from "../api/apiClient";
import type {
  InventoryUnit,
  VehicleSupplier,
  VehicleSupplierKind,
} from "../model/types";
import {
  InventoryField,
  InventoryPanel,
  InventorySelect,
} from "./InventoryFormParts";
import {
  cleanAcquisitionDraft,
  cleanSupplierDraft,
  emptyAcquisitionDraft,
  fromAcquisition,
  type AcquisitionDraft,
  type SupplierDraft,
  upsertSupplier,
} from "./VehicleAcquisitionCardModel";
import { VehicleAcquisitionSourcePanel } from "./VehicleAcquisitionSourcePanel";
import { VehicleAcquisitionSupplierModal } from "./VehicleAcquisitionSupplierModal";
import { IconButton } from "./VehicleAcquisitionCardParts";
import { SupplierSummaryCard } from "./SupplierSummaryCard";

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
  const [isSavingSupplier, setIsSavingSupplier] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [suppliers, setSuppliers] = useState<readonly VehicleSupplier[]>([]);

  const supplierOptions = useMemo<CustomSelectOption[]>(() => {
    const supplierRows = suppliers.map((supplier) => ({
      label: supplier.displayName,
      value: supplier.id,
    }));
    return [{ label: "Selecionar fornecedor...", value: "" }, ...supplierRows];
  }, [suppliers]);

  const selectedSupplier = useMemo(() => {
    return suppliers.find((s) => s.id === selectedSupplierId) ?? null;
  }, [suppliers, selectedSupplierId]);

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

  const selectSupplier = (supplierId: string) => {
    setSelectedSupplierId(supplierId);
    setAcquisitionDraft((current) => ({
      ...current,
      supplierId: supplierId || null,
    }));
  };

  const handleSaveSupplier = async (draft: SupplierDraft) => {
    setIsSavingSupplier(true);
    try {
      const payload = cleanSupplierDraft(draft);
      const supplier = selectedSupplierId
        ? await api.updateVehicleSupplier(selectedSupplierId, payload)
        : await api.createVehicleSupplier(payload);
      setSuppliers((current) => upsertSupplier(current, supplier));
      setSelectedSupplierId(supplier.id);
      setAcquisitionDraft((current) => ({
        ...current,
        supplierId: supplier.id,
      }));
      setMessage("Fornecedor salvo com sucesso.");
    } catch {
      throw new Error("Erro ao salvar fornecedor.");
    } finally {
      setIsSavingSupplier(false);
    }
  };

  const handleArchiveSupplier = async () => {
    if (!selectedSupplierId) return;
    if (acquisitionDraft.supplierId === selectedSupplierId) {
      setMessage("Desvincule o fornecedor da aquisição antes de arquivar.");
      return;
    }
    setIsSavingSupplier(true);
    try {
      await api.archiveVehicleSupplier(selectedSupplierId);
      setSuppliers((current) =>
        current.filter((supplier) => supplier.id !== selectedSupplierId),
      );
      setSelectedSupplierId("");
      setAcquisitionDraft((current) => ({
        ...current,
        supplierId: null,
      }));
      setMessage("Fornecedor arquivado com sucesso.");
    } catch {
      throw new Error("Erro ao arquivar fornecedor.");
    } finally {
      setIsSavingSupplier(false);
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
      setMessage("Dados de aquisição salvos com sucesso.");
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
            <div className="grid gap-3">
              <InventoryField label="Selecionar Fornecedor">
                <InventorySelect
                  onChange={selectSupplier}
                  options={supplierOptions}
                  value={selectedSupplierId}
                />
              </InventoryField>

              {selectedSupplier ? (
                <SupplierSummaryCard
                  supplier={selectedSupplier}
                  onEdit={() => setIsModalOpen(true)}
                />
              ) : (
                <div className="rounded-xl border border-line border-dashed bg-panel/10 p-6 flex flex-col items-center justify-center text-center gap-3">
                  <span className="text-xs text-muted font-bold">
                    Nenhum fornecedor selecionado.
                  </span>
                  <button
                    onClick={() => {
                      setSelectedSupplierId("");
                      setIsModalOpen(true);
                    }}
                    className="min-h-9 rounded-lg px-4 text-xs font-black border border-line text-app-text hover:bg-line/25 transition-all cursor-pointer flex items-center gap-1.5"
                    type="button"
                  >
                    <span>Cadastrar Novo Fornecedor</span>
                  </button>
                </div>
              )}
            </div>
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
              setAcquisitionDraft={setAcquisitionDraft}
            />
          </div>
        </div>

        <div className="flex justify-end border-t border-line/30 pt-4 mt-2">
          <IconButton
            disabled={isSaving || isLoading}
            icon={<Save className="size-3.5" />}
            label="Salvar alterações"
            onClick={() => void saveAcquisition()}
            variant="primary"
          />
        </div>
      </div>

      <VehicleAcquisitionSupplierModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        supplier={selectedSupplier}
        onSave={handleSaveSupplier}
        onArchive={handleArchiveSupplier}
        isSaving={isSavingSupplier}
      />
    </InventoryPanel>
  );
}
