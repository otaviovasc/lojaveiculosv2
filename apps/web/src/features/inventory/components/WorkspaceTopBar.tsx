import {
  ArrowLeft,
  DollarSign,
  ExternalLink,
  MapPin,
  Printer,
  Trash2,
} from "lucide-react";

export type WorkspaceTopBarAction =
  "delete" | "print" | "sell" | "transfer" | "view-public-listing";

export function WorkspaceTopBar({
  canTransferStores,
  publicListingUrl,
  onBack,
  onAction,
  plate,
  title,
}: {
  canTransferStores: boolean;
  publicListingUrl: string | null;
  onBack: () => void;
  onAction: (action: WorkspaceTopBarAction) => void;
  plate: string;
  title: string;
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line pb-5">
      <div className="flex items-center gap-3.5 min-w-0">
        <button
          onClick={onBack}
          className="p-2.5 rounded-xl bg-app-elevated border border-line hover:bg-accent-soft hover:text-accent-strong transition-all cursor-pointer"
          title="Voltar ao estoque"
          type="button"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-black leading-tight break-words">
            {title}
          </h1>
          <p className="text-xs font-bold text-muted flex items-center gap-2 mt-0.5">
            <span className="bg-app-elevated border border-line px-2 py-0.5 rounded uppercase tracking-wider">
              {plate}
            </span>
          </p>
        </div>
      </div>

      {/* Main Actions Panel */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => onAction("print")}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-app-elevated border border-line px-4 text-xs font-black text-app-text hover:bg-line/25 transition-all cursor-pointer"
          type="button"
        >
          <Printer className="size-3.5 text-muted" />
          <span>Imprimir</span>
        </button>
        {canTransferStores ? (
          <button
            onClick={() => onAction("transfer")}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-app-elevated border border-line px-4 text-xs font-black text-app-text hover:bg-line/25 transition-all cursor-pointer"
            type="button"
          >
            <MapPin className="size-3.5 text-muted" />
            <span>Transferir</span>
          </button>
        ) : null}
        <button
          onClick={() => onAction("delete")}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-app-elevated border border-line px-4 text-xs font-black text-app-text hover:bg-line/25 transition-all cursor-pointer"
          type="button"
        >
          <Trash2 className="size-3.5 text-danger" />
          <span>Excluir</span>
        </button>
        <button
          disabled={!publicListingUrl}
          onClick={() => onAction("view-public-listing")}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-app-elevated border border-line px-4 text-xs font-black text-app-text hover:bg-line/25 transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-55"
          title={
            publicListingUrl
              ? "Abrir anuncio publico"
              : "Publique o veiculo para gerar o anuncio publico"
          }
          type="button"
        >
          <ExternalLink className="size-3.5 text-accent" />
          <span>Ver anúncio</span>
        </button>
        <button
          onClick={() => onAction("sell")}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-accent px-4 text-xs font-black text-inverse hover:bg-accent-strong transition-all cursor-pointer"
          type="button"
        >
          <DollarSign className="size-3.5" />
          <span>Vender</span>
        </button>
      </div>
    </div>
  );
}
