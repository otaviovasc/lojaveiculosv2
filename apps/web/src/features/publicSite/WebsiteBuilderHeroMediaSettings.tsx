import { CarFront, Image, Shuffle } from "lucide-react";
import {
  FeatureSegmentedControl,
  FeatureSelect,
} from "../../components/ui/FeatureControls";
import { StorefrontImagePicker } from "./StorefrontImagePicker";
import type {
  WebsiteBuilderConfig,
  WebsiteBuilderHeroMediaSource,
} from "./WebsiteBuilderTypes";

const bannerSlotCount = 3;

const heroMediaSourceOptions = [
  { icon: Shuffle, label: "Auto", value: "auto" },
  { icon: Image, label: "Banners", value: "banners" },
  { icon: CarFront, label: "Veiculos", value: "vehicles" },
] as const;

const heroMediaSelectOptions = heroMediaSourceOptions.map((option) => ({
  label: option.label,
  value: option.value,
}));

type UpdateConfig = <K extends keyof WebsiteBuilderConfig>(
  key: K,
  value: WebsiteBuilderConfig[K],
) => void;

export function WebsiteBuilderHeroMediaSettings({
  config,
  updateConfig,
}: {
  config: WebsiteBuilderConfig;
  updateConfig: UpdateConfig;
}) {
  const bannerUrls = normalizeBannerUrls(config.heroBannerUrls);

  const updateBanner = (index: number, value: string | null) => {
    const next = Array.from({ length: bannerSlotCount }, (_, slot) =>
      slot === index ? value : (bannerUrls[slot] ?? null),
    ).filter((url): url is string => Boolean(url));

    updateConfig("heroBannerUrls", next);
    updateConfig("heroImageUrl", next[0] ?? null);
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Origem da capa
        </span>
        <div className="hidden sm:block">
          <FeatureSegmentedControl<WebsiteBuilderHeroMediaSource>
            ariaLabel="Origem da capa"
            onChange={(value) => updateConfig("heroMediaSource", value)}
            options={heroMediaSourceOptions}
            value={config.heroMediaSource}
          />
        </div>
        <FeatureSelect<WebsiteBuilderHeroMediaSource>
          ariaLabel="Origem da capa"
          className="sm:hidden"
          onChange={(value) => updateConfig("heroMediaSource", value)}
          options={heroMediaSelectOptions}
          value={config.heroMediaSource}
        />
      </div>

      <div className="grid gap-4">
        {Array.from({ length: bannerSlotCount }, (_, index) => (
          <StorefrontImagePicker
            imageClassName="h-32 w-full rounded-lg"
            key={index}
            label={`Banner ${index + 1}`}
            onChange={(value) => updateBanner(index, value)}
            value={bannerUrls[index] ?? ""}
          />
        ))}
      </div>
    </div>
  );
}

function normalizeBannerUrls(value: readonly string[] | undefined) {
  return (value ?? []).filter((url) => url.trim()).slice(0, bannerSlotCount);
}
