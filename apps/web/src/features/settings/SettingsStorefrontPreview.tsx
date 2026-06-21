import {
  CarFront,
  Eye,
  MessageCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { createStorefrontTheme } from "../publicSite/storefrontTemplates";
import type { StoreSettingsSnapshot } from "./types";

export function SettingsStorefrontPreview({
  draft,
}: {
  draft: StoreSettingsSnapshot;
}) {
  const templateKey =
    draft.publicSite.layoutKey === "showroom" ? "showroom" : "classic";
  const theme = createStorefrontTheme(draft.publicSite.theme, templateKey);
  return (
    <div className="storefront-preview" data-template={templateKey}>
      <div className="storefront-preview-hero">
        {templateKey === "showroom" ? <PreviewMedia draft={draft} /> : null}
        <div>
          <span className="storefront-preview-badge">
            <Sparkles aria-hidden="true" className="size-4" />
            {theme.badgeLabel}
          </span>
          <h4 className="storefront-preview-title">{theme.headline}</h4>
          <p className="storefront-preview-copy">
            {draft.publicSite.seoDescription ||
              "Estoque revisado, atendimento direto e propostas pelo WhatsApp."}
          </p>
          <span className="storefront-preview-cta">
            <MessageCircle aria-hidden="true" className="size-4" />
            {theme.ctaLabel}
          </span>
        </div>
      </div>
      <div className="storefront-preview-stock">
        {previewVehicles.map((vehicle) => (
          <article className="storefront-preview-card" key={vehicle.title}>
            <div className="storefront-preview-thumb">
              <CarFront aria-hidden="true" className="size-7" />
            </div>
            <div>
              <strong>{vehicle.title}</strong>
              <p className="storefront-preview-meta">{vehicle.meta}</p>
              <p className="storefront-preview-price">{vehicle.price}</p>
            </div>
          </article>
        ))}
      </div>
      {theme.sections.includes("trust") ? (
        <div className="storefront-preview-proof">
          <span className="storefront-preview-chip">
            <ShieldCheck aria-hidden="true" className="size-4" />
            Loja verificada
          </span>
          <span className="storefront-preview-chip">
            <Eye aria-hidden="true" className="size-4" />
            Fotos e dados conferidos
          </span>
        </div>
      ) : null}
    </div>
  );
}

function PreviewMedia({ draft }: { draft: StoreSettingsSnapshot }) {
  return (
    <div className="storefront-preview-media">
      {draft.publicSite.heroImageUrl ? (
        <img alt="" src={draft.publicSite.heroImageUrl} />
      ) : (
        <CarFront aria-hidden="true" className="size-12" />
      )}
    </div>
  );
}

const previewVehicles = [
  { meta: "2023 | 32.000 km", price: "R$ 126.900", title: "Fiat Toro Volcano" },
  { meta: "2022 | 41.000 km", price: "R$ 98.700", title: "Jeep Renegade" },
];
