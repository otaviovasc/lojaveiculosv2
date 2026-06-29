import type {
  StorefrontBuilderBackground,
  StorefrontBuilderConfig,
  StorefrontCustomPage,
} from "@lojaveiculosv2/shared";

export function createPageBackgroundStyle(
  pageBackground: StorefrontBuilderBackground,
  fallback: string,
) {
  if (pageBackground.type === "gradient") {
    return { background: createGradient(pageBackground) ?? fallback };
  }
  if (pageBackground.type === "solid") {
    return { background: pageBackground.solidColor ?? fallback };
  }
  return { background: fallback };
}

export function PageBackgroundLayer({
  background,
}: {
  background: StorefrontBuilderBackground;
}) {
  if (background.type === "image" && background.imageUrl) {
    return (
      <div
        aria-hidden="true"
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${background.imageUrl})` }}
      >
        {background.overlay?.enabled ? (
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: background.overlay.color,
              opacity: (background.overlay.opacity ?? 50) / 100,
            }}
          />
        ) : null}
      </div>
    );
  }

  if (background.type === "video" && background.videoUrl) {
    return (
      <video
        aria-hidden="true"
        autoPlay={background.videoAutoplay !== false}
        className="fixed inset-0 z-0 size-full object-cover"
        loop={background.videoLoop !== false}
        muted={background.videoMuted !== false}
      >
        <source src={background.videoUrl} />
      </video>
    );
  }

  return null;
}

export function PageChromeHeader({
  config,
  page,
  preview,
  storeSlug,
}: {
  config: StorefrontBuilderConfig;
  page: StorefrontCustomPage;
  preview: boolean;
  storeSlug?: string;
}) {
  const href = storeSlug ? `/${storeSlug}` : "/";
  const variant = page.pageChrome?.headerVariant ?? "minimal";
  const headerTextColor = textColorForBackground(
    variant === "solid" ? page.pageChrome?.headerBgColor : null,
  );
  const headerStyle =
    variant === "solid" && page.pageChrome?.headerBgColor
      ? {
          backgroundColor: page.pageChrome.headerBgColor,
          ...(headerTextColor ? { color: headerTextColor } : {}),
        }
      : undefined;
  const headerLinkColor = chooseReadableHeaderLinkColor({
    background: variant === "solid" ? page.pageChrome?.headerBgColor : null,
    fallback: headerTextColor,
    preferred: page.pageChrome?.headerLinkColor,
  });
  return (
    <header
      className={[
        preview
          ? "sticky top-0 z-40 flex w-full items-center justify-between border-b px-4 py-3"
          : "fixed left-0 right-0 top-0 z-40 flex w-full items-center justify-between border-b px-4 py-3",
        variant === "glass"
          ? "border-border/50 bg-background/90 backdrop-blur-xl"
          : variant === "solid"
            ? "border-border/50 bg-background"
            : "border-border/40 bg-background/80 backdrop-blur-md",
      ].join(" ")}
      style={headerStyle}
    >
      <a
        className="flex min-w-0 items-center gap-2 transition-opacity hover:opacity-70"
        href={href}
      >
        {config.logoUrl ? (
          <img
            alt={config.storeName}
            className="h-7 w-auto object-contain"
            src={config.logoUrl}
          />
        ) : (
          <strong className="truncate text-sm font-black">
            {config.storeName}
          </strong>
        )}
      </a>
      {page.pageChrome?.showSiteLink !== false ? (
        <a
          className="text-xs font-bold transition-opacity hover:opacity-75"
          href={href}
          style={headerLinkColor ? { color: headerLinkColor } : undefined}
        >
          Voltar ao site
        </a>
      ) : null}
    </header>
  );
}

export function PageChromeFooter({
  config,
  page,
  storeSlug,
}: {
  config: StorefrontBuilderConfig;
  page: StorefrontCustomPage;
  storeSlug?: string;
}) {
  const href = storeSlug ? `/${storeSlug}` : "/";
  const textColor =
    page.pageChrome?.footerChromeTextColor ??
    textColorForBackground(
      page.pageBackground?.type === "solid"
        ? page.pageBackground.solidColor
        : (page.backgroundColor ?? config.backgroundColor),
    ) ??
    undefined;
  return (
    <footer
      className="relative z-10 border-t border-border/40 py-8 text-center text-sm text-app-text"
      style={{ color: textColor }}
    >
      <a className="transition-opacity hover:opacity-80" href={href}>
        {new Date().getFullYear()} {config.storeName || page.slug}
      </a>
      {page.pageChrome?.footerExtraLine ? (
        <p className="mt-2 text-xs">{page.pageChrome.footerExtraLine}</p>
      ) : null}
    </footer>
  );
}

function createGradient(background: StorefrontBuilderBackground) {
  if (!background.gradient?.stops?.length) return null;
  const stops = background.gradient.stops
    .map((stop) => `${stop.color} ${stop.position}%`)
    .join(", ");
  if (background.gradient.type === "radial") {
    return `radial-gradient(${stops})`;
  }
  return `linear-gradient(${background.gradient.angle ?? 180}deg, ${stops})`;
}

function textColorForBackground(color: string | null | undefined) {
  if (!color?.startsWith("#")) return null;
  const rgb = parseHexColor(color);
  if (!rgb) return null;
  const luminance =
    (0.299 * rgb.red + 0.587 * rgb.green + 0.114 * rgb.blue) / 255;
  return luminance > 0.55 ? "black" : "white";
}

function chooseReadableHeaderLinkColor({
  background,
  fallback,
  preferred,
}: {
  background: string | null | undefined;
  fallback: string | null;
  preferred: string | null | undefined;
}) {
  if (!preferred) return fallback;
  if (!background) return preferred;
  const ratio = contrastRatio(preferred, background);
  return ratio && ratio >= 4.5 ? preferred : fallback;
}

function contrastRatio(foreground: string, background: string) {
  const foregroundRgb = parseHexColor(foreground);
  const backgroundRgb = parseHexColor(background);
  if (!foregroundRgb || !backgroundRgb) return null;
  const foregroundLuminance = relativeLuminance(foregroundRgb);
  const backgroundLuminance = relativeLuminance(backgroundRgb);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

function relativeLuminance({
  blue,
  green,
  red,
}: {
  blue: number;
  green: number;
  red: number;
}) {
  const channel = (value: number) => {
    const channel = value / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  };
  const r = channel(red);
  const g = channel(green);
  const b = channel(blue);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function parseHexColor(color: string | null | undefined) {
  if (!color?.startsWith("#")) return null;
  const hex = color.slice(1);
  const normalized =
    hex.length === 3
      ? hex
          .split("")
          .map((part) => part + part)
          .join("")
      : hex;
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return null;
  return {
    blue: Number.parseInt(normalized.slice(4, 6), 16),
    green: Number.parseInt(normalized.slice(2, 4), 16),
    red: Number.parseInt(normalized.slice(0, 2), 16),
  };
}
