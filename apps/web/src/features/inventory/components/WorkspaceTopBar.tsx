import {
  ArrowLeft,
  DollarSign,
  ExternalLink,
  Landmark,
  MapPin,
  Printer,
  Trash2,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { MercosulPlateBadge } from "./InventoryListingBadges";

export type WorkspaceTopBarAction =
  "delete" | "print" | "sell" | "simulate" | "transfer" | "view-public-listing";

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
  const hasValidPlate = Boolean(plate && plate.trim() !== "" && plate !== "-");

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line pb-5">
      <div className="flex items-center gap-3.5 min-w-0">
        <Button
          aria-label="Voltar ao estoque"
          onClick={onBack}
          size="icon-sm"
          variant="outline"
          title="Voltar ao estoque"
          type="button"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-black leading-tight break-words text-app-text">
            {title}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            {hasValidPlate ? (
              <MercosulPlateBadge plate={plate} />
            ) : (
              <span className="rounded-md border border-line bg-app-elevated px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-muted">
                Sem placa
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Actions Panel */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={() => onAction("print")}
          size="sm"
          variant="outline"
          type="button"
        >
          <Printer className="size-3.5 mr-1 text-muted" />
          <span>Imprimir</span>
        </Button>

        {canTransferStores ? (
          <Button
            onClick={() => onAction("transfer")}
            size="sm"
            variant="outline"
            type="button"
          >
            <MapPin className="size-3.5 mr-1 text-muted" />
            <span>Transferir</span>
          </Button>
        ) : null}

        <Button
          onClick={() => onAction("delete")}
          size="sm"
          variant="outline"
          type="button"
        >
          <Trash2 className="size-3.5 mr-1 text-danger" />
          <span>Excluir</span>
        </Button>

        <Button
          disabled={!publicListingUrl}
          onClick={() => onAction("view-public-listing")}
          size="sm"
          variant="outline"
          title={
            publicListingUrl
              ? "Abrir anúncio público"
              : "Publique o veículo para gerar o anúncio público"
          }
          type="button"
        >
          <ExternalLink className="size-3.5 mr-1 text-accent" />
          <span>Ver anúncio</span>
        </Button>

        <Button
          onClick={() => onAction("simulate")}
          size="sm"
          title="Simular financiamento com bancos integrados via Credere"
          type="button"
          variant="outline"
        >
          <Landmark className="size-3.5 mr-1 text-accent" />
          <span>Simular</span>
        </Button>

        <Button
          onClick={() => onAction("sell")}
          size="sm"
          title="Iniciar venda deste veículo"
          type="button"
          variant="default"
        >
          <DollarSign className="size-3.5 mr-1" />
          <span>Vender</span>
        </Button>
      </div>
    </div>
  );
}
