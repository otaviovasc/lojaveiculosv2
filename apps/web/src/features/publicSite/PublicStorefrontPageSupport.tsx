import type { ReactNode } from "react";
import type { PublicStorefrontSnapshot } from "./state";

export function applyPublicStorefrontMetadata(
  data: PublicStorefrontSnapshot["data"],
) {
  if (!data) return;
  const title = data.settings.site.seoTitle ?? data.settings.store.name;
  const description =
    data.settings.site.seoDescription ??
    `Estoque de veiculos da ${data.settings.store.name}.`;
  const canonicalUrl = `https://${data.settings.store.publicUrl}`;
  const previousTitle = document.title;
  const descriptionMeta = upsertMeta("description");
  const robotsMeta = upsertMeta("robots");
  const canonical = upsertCanonical();
  const previousDescription = descriptionMeta.getAttribute("content");
  const previousRobots = robotsMeta.getAttribute("content");
  const previousCanonical = canonical.getAttribute("href");

  document.title = title;
  descriptionMeta.setAttribute("content", description);
  robotsMeta.setAttribute("content", "index,follow");
  canonical.setAttribute("href", canonicalUrl);

  return () => {
    document.title = previousTitle;
    restoreAttribute(descriptionMeta, "content", previousDescription);
    restoreAttribute(robotsMeta, "content", previousRobots);
    restoreAttribute(canonical, "href", previousCanonical);
  };
}

export function StorefrontStateFrame({
  action,
  icon,
  title,
}: {
  action?: ReactNode;
  icon: ReactNode;
  title: string;
}) {
  return (
    <main className="mx-auto flex min-h-[32rem] w-full max-w-7xl items-center justify-center px-4 py-6 lg:px-6 lg:py-8">
      <section className="w-full max-w-md rounded-lg border border-line bg-panel p-6 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-accent-soft text-accent">
          {icon}
        </div>
        <h2 className="mt-4 text-xl font-black">{title}</h2>
        {action}
      </section>
    </main>
  );
}

function upsertMeta(name: string) {
  const current = document.querySelector<HTMLMetaElement>(
    `meta[name="${name}"]`,
  );
  if (current) return current;
  const meta = document.createElement("meta");
  meta.setAttribute("name", name);
  document.head.appendChild(meta);
  return meta;
}

function upsertCanonical() {
  const current = document.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]',
  );
  if (current) return current;
  const link = document.createElement("link");
  link.setAttribute("rel", "canonical");
  document.head.appendChild(link);
  return link;
}

function restoreAttribute(
  element: HTMLElement,
  name: string,
  previousValue: string | null,
) {
  if (previousValue === null) element.removeAttribute(name);
  else element.setAttribute(name, previousValue);
}
