import { providerLabels } from "./marketplaceLabels";
import type { MarketplaceProvider } from "./types";

const providerBrands: Record<
  MarketplaceProvider,
  { height: number; logoSrc: string; tagline: string; width: number }
> = {
  mercado_livre: {
    height: 126,
    logoSrc: "/images/integrationslogos/mercadolivre.png",
    tagline: "Anúncios no ecossistema Mercado Livre",
    width: 500,
  },
  olx: {
    height: 514,
    logoSrc: "/images/integrationslogos/olx.png",
    tagline: "Classificados para compra e venda de veículos",
    width: 970,
  },
};

export function MarketplaceProviderBrand({
  provider,
}: {
  provider: MarketplaceProvider;
}) {
  const brand = providerBrands[provider];
  const label = providerLabels[provider];

  return (
    <div className="marketplace-brand">
      <span className="marketplace-brand__logo-frame">
        <img
          alt={`Logo ${label}`}
          height={brand.height}
          src={brand.logoSrc}
          width={brand.width}
        />
      </span>
      <span className="marketplace-brand__copy">
        <h3>{label}</h3>
        <span>{brand.tagline}</span>
      </span>
    </div>
  );
}
