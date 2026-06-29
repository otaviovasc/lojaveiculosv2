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
  accent,
  config,
  page,
  preview,
  storeSlug,
}: {
  accent: string;
  config: StorefrontBuilderConfig;
  page: StorefrontCustomPage;
  preview: boolean;
  storeSlug?: string;
}) {
  const href = storeSlug ? `/${storeSlug}` : "/";
  const variant = page.pageChrome?.headerVariant ?? "minimal";
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
      style={
        variant === "solid" && page.pageChrome?.headerBgColor
          ? { backgroundColor: page.pageChrome.headerBgColor }
          : undefined
      }
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
          className="text-xs font-bold text-muted transition-opacity hover:opacity-75"
          href={href}
          style={
            page.pageChrome?.headerLinkColor
              ? { color: page.pageChrome.headerLinkColor }
              : { color: accent }
          }
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
  const textColor = page.pageChrome?.footerChromeTextColor ?? undefined;
  return (
    <footer
      className="relative z-10 border-t border-border/40 py-8 text-center text-sm text-muted"
      style={textColor ? { color: textColor } : undefined}
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
