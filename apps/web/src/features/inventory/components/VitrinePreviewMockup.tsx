import type { StoreSettingsSnapshot } from "../../settings/types";
import type { InventoryListing, InventoryMedia } from "../model/types";
import { formatPrice } from "./InventoryDetailWorkspaceMocks";
import { Smartphone } from "lucide-react";

export type Specs = {
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

type Props = {
  settings: StoreSettingsSnapshot | null;
  listing: InventoryListing;
  specs: Specs;
  vitrinePhotos: readonly InventoryMedia[];
  storeName: string;
};

type VitrineTheme = {
  accentColor?: unknown;
  fonts?: unknown;
  logoUrl?: unknown;
};

export function VitrinePreviewMockup({
  settings,
  listing,
  specs,
  vitrinePhotos,
  storeName,
}: Props) {
  const theme = (settings?.publicSite.theme || {}) as VitrineTheme;
  const accent =
    typeof theme.accentColor === "string"
      ? theme.accentColor
      : ["#", "C9A84C"].join("");
  const logoUrl =
    settings?.profile.logoImageUrl ||
    (typeof theme.logoUrl === "string" ? theme.logoUrl : undefined);
  const coverUrl = vitrinePhotos[0]?.url || "";
  const bodyFont =
    isThemeFonts(theme.fonts) && typeof theme.fonts.body === "string"
      ? theme.fonts.body
      : "Inter, sans-serif";

  return (
    <div className="flex flex-col gap-2.5 w-full">
      <div className="flex items-center gap-1.5 text-xs font-black uppercase text-muted tracking-wider justify-center lg:justify-start">
        <Smartphone className="size-3.5" />
        <span>Pré-visualização da Vitrine</span>
      </div>

      <div
        className="border border-line rounded-2xl overflow-hidden shadow-lg flex flex-col bg-app max-w-xs mx-auto w-full transition-all duration-300 hover:border-line-strong"
        style={{
          fontFamily: bodyFont,
        }}
      >
        {/* Miniature Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-panel border-b border-line">
          <div className="flex items-center gap-2">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={storeName}
                className="h-4 object-contain max-w-[120px]"
              />
            ) : (
              <span className="text-xs font-black uppercase tracking-wider text-app-text">
                {storeName}
              </span>
            )}
          </div>
          <span
            className="text-xs font-bold px-2.5 py-0.5 rounded-full text-white cursor-pointer select-none"
            style={{ backgroundColor: accent }}
          >
            Falar Conosco
          </span>
        </div>

        {/* Miniature Hero */}
        <div className="relative h-48 bg-slate-950 flex items-end">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={listing.title}
              className="absolute inset-0 w-full h-full object-cover opacity-70"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-950 flex items-center justify-center text-xs text-muted">
              Sem foto de capa
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none" />
          <div className="relative p-4.5 w-full text-white flex flex-col gap-1.5">
            <span
              className="text-xs font-black uppercase tracking-widest self-start px-2 py-0.5 rounded text-white"
              style={{ backgroundColor: accent }}
            >
              {specs.modality} · {listing.manufactureYear || ""}/
              {listing.modelYear || ""}
            </span>
            <h4 className="text-xs font-black truncate leading-tight">
              {listing.title}
            </h4>
            <span className="text-xs font-black opacity-90">
              Preço:{" "}
              {listing.priceCents
                ? formatPrice(listing.priceCents)
                : "Sob Consulta"}
            </span>
          </div>
        </div>

        {/* Specs Section */}
        <div className="p-4 bg-panel flex flex-col gap-2.5">
          <span className="text-xs font-black uppercase text-muted tracking-widest">
            Ficha Técnica
          </span>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs font-bold text-app-text">
            <div className="flex justify-between border-b border-line/30 pb-1">
              <span className="text-muted">Cor</span>
              <span className="truncate max-w-[80px]">
                {specs.color || "-"}
              </span>
            </div>
            <div className="flex justify-between border-b border-line/30 pb-1">
              <span className="text-muted">Km</span>
              <span>{specs.km || "-"}</span>
            </div>
            <div className="flex justify-between border-b border-line/30 pb-1">
              <span className="text-muted">Combustível</span>
              <span>{specs.fuel || "-"}</span>
            </div>
            <div className="flex justify-between border-b border-line/30 pb-1">
              <span className="text-muted">Câmbio</span>
              <span className="truncate max-w-[80px]">
                {specs.transmission || "-"}
              </span>
            </div>
          </div>
        </div>

        {/* Gallery Strip */}
        {vitrinePhotos.length > 0 && (
          <div className="p-4 bg-app/40 border-t border-line/50 flex flex-col gap-2">
            <span className="text-xs font-black uppercase text-muted tracking-widest">
              Galeria ({vitrinePhotos.length})
            </span>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {vitrinePhotos.slice(0, 5).map((photo, i) => (
                <img
                  key={photo.id || i}
                  src={photo.url}
                  alt="Miniatura"
                  className="w-12 h-10 object-cover rounded border border-line/45 shrink-0"
                />
              ))}
            </div>
          </div>
        )}

        {/* CTA Button Banner */}
        <div className="p-4 bg-panel border-t border-line/50 text-center flex flex-col gap-2">
          <span className="text-xs text-muted font-bold leading-normal">
            Gostou deste veículo?
          </span>
          <div
            className="w-full py-2 rounded-lg text-white text-xs font-black select-none flex items-center justify-center gap-1.5 shadow-sm"
            style={{ backgroundColor: accent }}
          >
            <span>Falar no WhatsApp</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function isThemeFonts(value: unknown): value is { body?: unknown } {
  return typeof value === "object" && value !== null;
}
