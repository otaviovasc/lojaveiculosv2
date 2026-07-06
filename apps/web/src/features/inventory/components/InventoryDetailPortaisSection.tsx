import { useState } from "react";
import { ExternalLink, Sparkles, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";

interface PortalIntegration {
  id: string;
  name: string;
  brandColor: string;
  status: "configured" | "unconfigured";
  active: boolean;
  updateTime?: string;
  externalUrl?: string;
}

type Props = {
  title: string;
  portalSlug: string;
  advertisedPrice: string;
};

export function InventoryDetailPortaisSection({
  title,
  portalSlug,
  advertisedPrice,
}: Props) {
  const [showConfig, setShowConfig] = useState(false);

  const portalPath = `/veiculo/${portalSlug}`;
  const defaultUrl = `https://loja.lojaveiculosv2.com.br${portalPath}`;

  const [integrations, setIntegrations] = useState<PortalIntegration[]>([
    {
      id: "portal_proprio",
      name: "Portal Próprio",
      brandColor: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      status: "configured",
      active: true,
      updateTime: "Sincronizado em tempo real",
      externalUrl: defaultUrl,
    },
    {
      id: "webmotors",
      name: "Webmotors",
      brandColor: "bg-red-500/10 text-red-500 border-red-500/20",
      status: "unconfigured",
      active: false,
    },
    {
      id: "icarros",
      name: "iCarros",
      brandColor: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      status: "unconfigured",
      active: false,
    },
    {
      id: "olx",
      name: "OLX",
      brandColor: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
      status: "unconfigured",
      active: false,
    },
    {
      id: "mercadolivre",
      name: "Mercado Livre",
      brandColor: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      status: "unconfigured",
      active: false,
    },
  ]);

  const handleTogglePortal = (id: string, checked: boolean) => {
    const portal = integrations.find((i) => i.id === id);
    if (!portal) return;

    if (portal.status === "unconfigured") {
      setShowConfig(true);
      return;
    }

    setIntegrations((prev) =>
      prev.map((i) => (i.id === id ? { ...i, active: checked } : i)),
    );
  };

  return (
    <div className="bg-panel border border-line rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-line pb-3 gap-2">
        <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
          <span>Portais de Publicação</span>
        </h3>
        <span className="text-xs font-black text-muted uppercase tracking-wider">
          Veículo: {title} • {advertisedPrice}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {integrations.map((portal) => {
          const isConfigured = portal.status === "configured";
          return (
            <div
              key={portal.id}
              className="relative rounded-2xl border border-line bg-app-elevated/20 p-4.5 flex flex-col justify-between gap-4 transition-all hover:bg-app-elevated/40"
            >
              <div className="flex items-center justify-between">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-black uppercase border ${portal.brandColor}`}
                >
                  {portal.name}
                </span>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={portal.active}
                    onChange={(e) =>
                      handleTogglePortal(portal.id, e.target.checked)
                    }
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4.5 bg-line peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-accent" />
                </label>
              </div>

              <div className="flex flex-col gap-1 text-xs">
                {isConfigured ? (
                  <>
                    <div className="flex items-center gap-1.5 text-emerald-500 font-bold">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span>Integração ativa</span>
                    </div>
                    {portal.updateTime ? (
                      <span className="text-muted font-semibold text-xs">
                        {portal.updateTime}
                      </span>
                    ) : null}
                    {portal.active && portal.externalUrl ? (
                      <a
                        href={portal.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-accent-strong hover:underline mt-1 font-bold"
                      >
                        <span>Visualizar anúncio</span>
                        <ExternalLink className="size-3" />
                      </a>
                    ) : null}
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5 text-muted font-bold">
                      <span className="h-1.5 w-1.5 rounded-full bg-muted" />
                      <span>Não integrado</span>
                    </div>
                    <p className="text-xs text-muted font-medium leading-relaxed">
                      Habilite este portal parceiro nas configurações gerais
                      para publicar seu estoque.
                    </p>
                  </>
                )}
              </div>

              {!isConfigured ? (
                <button
                  onClick={() => setShowConfig(true)}
                  className="w-full min-h-8 rounded-lg bg-accent/10 hover:bg-accent/20 border border-accent/20 text-accent-strong font-black text-xs cursor-pointer transition-all flex items-center justify-center"
                  type="button"
                >
                  Configurar integração
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      <Dialog open={showConfig} onOpenChange={setShowConfig}>
        <DialogContent className="max-w-sm bg-panel border border-line text-app-text rounded-xl p-6">
          <DialogHeader className="mb-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft/20 text-accent-strong border border-accent-soft/10 mb-2">
              <Sparkles className="size-6 animate-pulse" />
            </div>
            <DialogTitle className="text-center text-sm font-black uppercase tracking-wider">
              Integrações de Portais
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-muted font-bold mt-1">
              Divulgue seu estoque nos maiores portais do Brasil
              automaticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs leading-normal text-muted font-bold bg-app-elevated/40 border border-line/40 rounded-xl p-3.5">
            <p>
              A publicação automática nos portais parceiros (Webmotors, OLX,
              iCarros, etc.) requer a contratação dos planos nos portais
              correspondentes e a configuração de suas credenciais de integração
              (API Token, Código do Cliente, etc.).
            </p>
            <p className="text-accent-strong flex items-center gap-1.5 pt-1.5 border-t border-line/30">
              <Info className="size-3.5 shrink-0" />
              <span>
                Contate o administrador da loja para configurar as chaves de
                integração.
              </span>
            </p>
          </div>

          <DialogFooter className="mt-4 flex gap-2">
            <button
              onClick={() => setShowConfig(false)}
              className="min-h-9 w-full rounded-lg bg-accent text-inverse font-black text-xs hover:bg-accent-strong transition-all cursor-pointer flex items-center justify-center"
              type="button"
            >
              Entendido
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
