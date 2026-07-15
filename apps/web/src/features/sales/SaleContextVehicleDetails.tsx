import { Car, Image as ImageIcon } from "lucide-react";
import BorderGlow from "../../components/ui/BorderGlow";
import type { SaleUnitOption } from "./saleContextOptions";

export function SaleContextVehicleDetails({
  formatCurrency,
  imageLoading,
  selectedUnitOption,
}: {
  formatCurrency: (cents: number | null | undefined) => string;
  imageLoading: boolean;
  selectedUnitOption: SaleUnitOption | undefined;
}) {
  if (!selectedUnitOption) {
    return (
      <div className="rounded-xl border border-dashed border-line p-6 text-center text-xs font-bold text-muted flex flex-col items-center justify-center gap-2">
        <Car className="size-7 text-muted/30" />
        <span>Nenhum veículo selecionado ainda.</span>
      </div>
    );
  }

  return (
    <BorderGlow
      borderRadius={16}
      className="sales-vehicle-card-glow w-full mt-2"
      colors={["var(--color-accent)", "var(--color-primary-contrast)"]}
      glowIntensity={0.6}
    >
      <div className="flex flex-col md:flex-row gap-5 p-5 bg-panel/75 rounded-2xl border border-line/40">
        <div className="relative w-full md:w-44 h-28 rounded-xl bg-app-elevated border border-line/50 overflow-hidden shrink-0 flex items-center justify-center">
          {imageLoading ? (
            <div className="absolute inset-0 bg-gradient-to-r from-line/20 to-line/50 animate-pulse flex items-center justify-center">
              <Car className="size-6 text-muted/40 animate-bounce" />
            </div>
          ) : selectedUnitOption.primaryMediaUrl ? (
            <img
              alt={selectedUnitOption.listingTitle}
              className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
              src={selectedUnitOption.primaryMediaUrl}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-muted/50 gap-1.5 p-3">
              <ImageIcon className="size-6 text-muted/30" />
              <span className="text-xs font-bold">Sem Foto</span>
            </div>
          )}
        </div>

        <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="col-span-2 md:col-span-3">
            <h4 className="text-sm font-black text-app-text tracking-wide leading-snug uppercase">
              {selectedUnitOption.listingTitle}
            </h4>
            <span className="text-xs font-black bg-accent-soft text-accent-strong px-2 py-0.5 rounded-md mt-1 inline-block uppercase">
              Placa/Estoque: {selectedUnitOption.unitLabel}
            </span>
          </div>

          <VehicleMeta label="Ano">
            {selectedUnitOption.manufactureYear || selectedUnitOption.modelYear
              ? `${selectedUnitOption.manufactureYear ?? "N/A"} / ${selectedUnitOption.modelYear ?? "N/A"}`
              : "Não informado"}
          </VehicleMeta>
          <VehicleMeta label="Quilometragem">
            {selectedUnitOption.mileageKm !== null
              ? `${selectedUnitOption.mileageKm.toLocaleString()} KM`
              : "Não informado"}
          </VehicleMeta>
          <VehicleMeta label="Cor">
            {selectedUnitOption.colorName || "Não informado"}
          </VehicleMeta>

          <div className="text-xs col-span-2 md:col-span-3 border-t border-line/30 pt-2 flex items-center justify-between">
            <span className="text-muted text-xs uppercase font-bold">
              Preço sugerido
            </span>
            <span className="text-accent-strong text-sm font-black">
              {formatCurrency(selectedUnitOption.priceCents) ||
                "Preço sob consulta"}
            </span>
          </div>
        </div>
      </div>
    </BorderGlow>
  );
}

function VehicleMeta({ children, label }: { children: string; label: string }) {
  return (
    <div className="text-xs">
      <span className="text-muted block text-xs uppercase font-bold">
        {label}
      </span>
      <span className="text-app-text font-black uppercase">{children}</span>
    </div>
  );
}
