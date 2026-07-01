import { useEffect, useState, useMemo } from "react";
import {
  Globe,
  Copy,
  ExternalLink,
  Pencil,
  Trash2,
  Sparkles,
  Check,
  RefreshCcw,
} from "lucide-react";
import type { InventoryListingDetail, InventoryUnit } from "../model/types";
import {
  createRuntimeSettingsApi,
  createRuntimeStorefrontPagesApi,
} from "../../publicSite/storefrontRuntimeApis";
import type { StorefrontCustomPage } from "@lojaveiculosv2/shared";
import { buildCustomPagePublicPath } from "../../publicSite/customPageUtils";
import {
  createVitrineComponents,
  createVitrinePageSlug,
} from "./VitrineTabComponentsHelper";

type Specs = {
  bodyType: string;
  color: string;
  doors: string;
  engine: string;
  fuel: string;
  km: string;
  modality: string;
  plate: string;
  transmission: string;
  vin: string;
};

export function InventoryDetailVitrineTab({
  detail,
  primaryUnit,
  specs,
}: {
  detail: InventoryListingDetail;
  primaryUnit: InventoryUnit | null;
  specs: Specs;
}) {
  const listing = detail.listing;
  const targetSlug = useMemo(
    () => createVitrinePageSlug(listing),
    [listing.id, listing.title],
  );

  const pagesApi = useMemo(() => createRuntimeStorefrontPagesApi(), []);
  const settingsApi = useMemo(() => createRuntimeSettingsApi(), []);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storeSlug, setStoreSlug] = useState("demo");
  const [storeName, setStoreName] = useState("Loja Demo");
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [activePage, setActivePage] = useState<StorefrontCustomPage | null>(
    null,
  );
  const [copied, setCopied] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [settings, pages] = await Promise.all([
        settingsApi.getStoreSettings(),
        pagesApi.listPages(),
      ]);
      setStoreSlug(settings.identity.publicSlug);
      setStoreName(
        settings.identity.tradingName ||
          settings.identity.legalName ||
          "Loja Demo",
      );
      setWhatsappPhone(settings.profile.whatsappPhone || "");

      const foundPage = pages.find((p) => p.slug === targetSlug);
      setActivePage(foundPage ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [targetSlug]);

  // Derived public Url
  const publicUrl = useMemo(() => {
    if (!activePage) return "";
    const path = buildCustomPagePublicPath(activePage, storeSlug);
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://loja.lojaveiculosv2.com.br";
    return `${origin}${path}`;
  }, [activePage, storeSlug]);

  const handleCopyLink = () => {
    void navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreate = async () => {
    setIsBusy(true);
    setError(null);
    try {
      // 1. Create custom page
      const createdPage = await pagesApi.createPage({
        title: `${listing.title} - Oferta Exclusiva`,
        slug: targetSlug,
        description: `Página comercial para o veículo ${listing.title}. Confira fotos, ficha técnica e fale diretamente com a equipe.`,
      });

      // 2. Generate page components using helper
      const components = createVitrineComponents({
        detail,
        primaryUnit,
        specs,
        storeName,
        storeSlug,
        whatsappPhone,
      });

      // 3. Save components & make public
      const updatedPage = await pagesApi.updatePage(createdPage.id, {
        components,
        visible: true,
      });

      setActivePage(updatedPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsBusy(false);
    }
  };

  const handleTogglePublish = async (checked: boolean) => {
    if (!activePage) return;
    setIsBusy(true);
    setError(null);
    try {
      const updated = await pagesApi.updatePage(activePage.id, {
        visible: checked,
      });
      setActivePage(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsBusy(false);
    }
  };

  const handleRemove = async () => {
    if (!activePage) return;
    setIsBusy(true);
    setError(null);
    try {
      await pagesApi.deletePage(activePage.id);
      setActivePage(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsBusy(false);
    }
  };

  const handleEdit = () => {
    window.location.hash = "/custom-pages";
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-muted gap-3 min-h-[300px]">
        <RefreshCcw className="size-6 animate-spin text-accent" />
        <span className="text-xs font-black uppercase tracking-wider">
          Carregando Vitrine...
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto text-app-text">
      {error && (
        <div className="bg-danger/10 border border-danger/25 text-danger rounded-xl p-4 text-xs font-bold leading-relaxed">
          {error}
        </div>
      )}

      {activePage ? (
        <div className="bg-panel border border-line rounded-2xl p-5 flex flex-col gap-6 shadow-sm">
          {/* Top Row Controls */}
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  disabled={isBusy}
                  checked={activePage.visible}
                  onChange={(e) => void handleTogglePublish(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-8 h-4.5 bg-line peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-accent" />
              </label>
              <span
                className={
                  "text-[10px] font-black px-2.5 py-0.5 rounded-full border " +
                  (activePage.visible
                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/25"
                    : "bg-muted/10 text-muted border-line")
                }
              >
                {activePage.visible ? "Publicada" : "Rascunho"}
              </span>
            </div>
            <button
              onClick={() => void handleRemove()}
              disabled={isBusy}
              className="text-xs font-black text-danger hover:text-danger-strong flex items-center gap-1 cursor-pointer disabled:opacity-50"
              type="button"
            >
              <Trash2 className="size-3.5" />
              <span>Remover Vitrine</span>
            </button>
          </div>

          {/* URL Block */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted">
              URL pública da Vitrine
            </span>
            <div className="flex items-center justify-between min-h-10 rounded-xl border border-line bg-app/30 px-3.5 font-bold text-xs">
              <span className="text-app-text truncate mr-2 select-all">
                {publicUrl}
              </span>
              <Globe className="size-4 text-muted shrink-0" />
            </div>
          </div>

          {/* Actions Row */}
          <div className="flex flex-wrap gap-2.5 items-center justify-between border-t border-line/45 pt-4 mt-2">
            <div className="flex gap-2">
              <button
                onClick={handleCopyLink}
                disabled={isBusy}
                className="min-h-9 rounded-lg border border-line px-3.5 text-xs font-black hover:bg-line/25 transition-all text-app-text cursor-pointer flex items-center gap-1.5"
                type="button"
              >
                {copied ? (
                  <Check className="size-3.5 text-emerald-500" />
                ) : (
                  <Copy className="size-3.5" />
                )}
                <span>{copied ? "Copiado!" : "Copiar link"}</span>
              </button>
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="min-h-9 rounded-lg border border-line px-3.5 text-xs font-black hover:bg-line/25 transition-all text-app-text cursor-pointer flex items-center gap-1.5 decoration-transparent"
              >
                <ExternalLink className="size-3.5" />
                <span>Abrir</span>
              </a>
            </div>
            <button
              onClick={handleEdit}
              disabled={isBusy}
              className="min-h-9 rounded-lg bg-accent text-inverse font-black text-xs hover:bg-accent-strong transition-all cursor-pointer px-4 flex items-center gap-1.5"
              type="button"
            >
              <Pencil className="size-3.5" />
              <span>Editar no Editor</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-panel border border-line rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-4 py-16 shadow-sm">
          <div className="size-12 rounded-full bg-accent-soft text-accent flex items-center justify-center border border-accent-soft/20 animate-pulse">
            <Sparkles className="size-6" />
          </div>
          <div>
            <h3 className="text-base font-black text-app-text">
              Página de Vitrine Premium
            </h3>
            <p className="text-xs text-muted font-bold max-w-sm mt-1 mx-auto leading-relaxed">
              Gere uma página de alta conversão dedicada a este veículo. Ideal
              para tráfego pago ou para compartilhar uma ficha técnica
              interativa com clientes.
            </p>
          </div>
          <button
            onClick={() => void handleCreate()}
            disabled={isBusy}
            className="mt-2 min-h-10 rounded-lg bg-accent text-inverse font-black text-xs hover:bg-accent-strong transition-all cursor-pointer px-6 flex items-center justify-center gap-1.5 disabled:opacity-50"
            type="button"
          >
            <Sparkles className="size-4" />
            <span>{isBusy ? "Criando..." : "Criar Vitrine Customizada"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
