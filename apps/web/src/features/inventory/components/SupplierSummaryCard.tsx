import type { VehicleSupplier, VehicleSupplierKind } from "../model/types";

type Props = {
  supplier: VehicleSupplier;
  onEdit: () => void;
};

export function SupplierSummaryCard({ supplier, onEdit }: Props) {
  const getKindLabel = (kind: VehicleSupplierKind) => {
    switch (kind) {
      case "lead":
        return "Lead / troca";
      case "person":
        return "Pessoa física";
      case "company":
        return "Empresa";
      case "provider":
        return "Provedor";
      case "partner":
        return "Parceiro";
      case "auction":
        return "Leilão";
      case "other":
        return "Outro";
    }
  };

  return (
    <div className="rounded-xl border border-line bg-panel/40 p-4 grid gap-3 text-xs">
      <div className="flex items-center justify-between border-b border-line/30 pb-2">
        <div className="font-bold text-sm text-app-text">
          {supplier.displayName}
        </div>
        <span className="rounded-full bg-accent-soft/20 text-accent-strong border border-accent-soft/10 px-2.5 py-0.5 text-xs font-black uppercase">
          {getKindLabel(supplier.kind)}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {supplier.documentNumber ? (
          <div>
            <span className="block text-xs uppercase font-black tracking-wider text-muted">
              Documento
            </span>
            <span className="font-bold text-app-text">
              {supplier.documentNumber}
            </span>
          </div>
        ) : null}
        {supplier.phone ? (
          <div>
            <span className="block text-xs uppercase font-black tracking-wider text-muted">
              Telefone
            </span>
            <span className="font-bold text-app-text">{supplier.phone}</span>
          </div>
        ) : null}
        {supplier.email ? (
          <div className="col-span-2">
            <span className="block text-xs uppercase font-black tracking-wider text-muted">
              E-mail
            </span>
            <span className="font-bold text-app-text">{supplier.email}</span>
          </div>
        ) : null}
        {supplier.provider || supplier.externalProviderId ? (
          <div className="col-span-2 grid grid-cols-2 gap-2 border-t border-line/30 pt-2 mt-1">
            {supplier.provider ? (
              <div>
                <span className="block text-xs uppercase font-black tracking-wider text-muted">
                  Provedor
                </span>
                <span className="font-bold text-app-text">
                  {supplier.provider}
                </span>
              </div>
            ) : null}
            {supplier.externalProviderId ? (
              <div>
                <span className="block text-xs uppercase font-black tracking-wider text-muted">
                  Cód. Externo
                </span>
                <span className="font-bold text-app-text">
                  {supplier.externalProviderId}
                </span>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="flex justify-end mt-2 pt-2 border-t border-line/30">
        <button
          onClick={onEdit}
          className="text-accent-strong hover:text-accent-strong-hover text-xs font-black flex items-center gap-1 cursor-pointer transition-all"
          type="button"
        >
          Editar cadastro
        </button>
      </div>
    </div>
  );
}
