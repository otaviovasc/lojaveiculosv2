import { Car } from "lucide-react";

export function SaleVehicleSnapshotCard({
  listingSnapshot,
}: {
  listingSnapshot: Record<string, unknown>;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line/40 bg-app-elevated/10 p-4">
      <h4 className="flex items-center gap-1.5 border-b border-line/35 pb-2 text-xs font-black uppercase tracking-wider text-app-text">
        <Car aria-hidden="true" className="size-4.5 text-accent" />
        <span>Dados do Veículo</span>
      </h4>
      <div className="flex items-center gap-3 rounded-xl border border-line/40 bg-app-elevated/30 p-2">
        <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line/50 bg-app-elevated">
          {listingSnapshot.primaryMediaUrl ? (
            <img
              alt={String(listingSnapshot.title || "Veículo")}
              className="size-full object-cover"
              src={String(listingSnapshot.primaryMediaUrl)}
            />
          ) : (
            <Car aria-hidden="true" className="size-6 text-muted/40" />
          )}
        </div>
        <div className="min-w-0">
          <h5 className="block truncate text-xs font-black uppercase tracking-wider text-app-text">
            {String(listingSnapshot.title || "Veículo não especificado")}
          </h5>
          {listingSnapshot.colorName ? (
            <span className="mt-0.5 block text-xs font-bold uppercase text-muted">
              Cor: {String(listingSnapshot.colorName)}
            </span>
          ) : null}
        </div>
      </div>
      <dl className="mt-1 grid grid-cols-2 gap-x-2 gap-y-3 text-xs font-bold">
        <SnapshotMeta
          label="Placa / Estoque"
          value={
            listingSnapshot.plate
              ? `PLACA: ${String(listingSnapshot.plate)}`
              : listingSnapshot.unitLabel
                ? `ESTOQUE: ${String(listingSnapshot.unitLabel)}`
                : null
          }
        />
        <SnapshotMeta
          label="Ano Fabricação/Modelo"
          value={
            listingSnapshot.manufactureYear || listingSnapshot.modelYear
              ? `${listingSnapshot.manufactureYear ?? "N/A"} / ${
                  listingSnapshot.modelYear ?? "N/A"
                }`
              : null
          }
        />
        <SnapshotMeta label="Chassi" value={listingSnapshot.chassi} truncate />
        <SnapshotMeta
          label="Renavam"
          value={listingSnapshot.renavam}
          truncate
        />
      </dl>
    </div>
  );
}

function SnapshotMeta({
  label,
  truncate = false,
  value,
}: {
  label: string;
  truncate?: boolean;
  value: unknown;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-bold uppercase text-muted">{label}</dt>
      <dd
        className={`mt-0.5 block text-app-text ${truncate ? "truncate" : ""}`}
        title={truncate && value ? String(value) : undefined}
      >
        {value ? String(value) : "Não preenchido"}
      </dd>
    </div>
  );
}
