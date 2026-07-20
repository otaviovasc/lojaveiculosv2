import type { ReactNode } from "react";
import { RefreshCcw } from "lucide-react";
import {
  StatusPage,
  type StatusPageTone,
} from "../../components/ui/StatusPage";
import type { PublicStorefrontSnapshot } from "./state";

export function applyPublicStorefrontMetadata(
  data: PublicStorefrontSnapshot["data"],
) {
  if (!data) return;
  const title = data.settings.site.seoTitle ?? data.settings.store.name;
  const description =
    data.settings.site.seoDescription ??
    `Estoque de veículos da ${data.settings.store.name}.`;
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
  body,
  illustration,
  title,
  tone = "accent",
}: {
  action?: ReactNode;
  body: ReactNode;
  illustration?: ReactNode;
  title: string;
  tone?: StatusPageTone;
}) {
  return (
    <main className="mx-auto flex min-h-[32rem] w-full max-w-7xl items-center justify-center px-4 py-6 lg:px-6 lg:py-8">
      <StatusPage
        body={body}
        illustration={illustration}
        layout="fill"
        primaryAction={action}
        title={title}
        tone={tone}
      />
    </main>
  );
}

export function StorefrontLoadingFrame({ title }: { title: string }) {
  return (
    <main className="mx-auto flex min-h-[32rem] w-full max-w-7xl items-center justify-center px-4 py-6 lg:px-6 lg:py-8">
      <section
        aria-busy="true"
        aria-live="polite"
        className="flex w-full max-w-md flex-col items-center gap-3 rounded-2xl border border-line bg-panel p-8 text-center text-muted shadow-md"
        role="status"
      >
        <RefreshCcw aria-hidden="true" className="size-6 animate-spin" />
        <strong className="text-base font-black text-foreground">
          {title}
        </strong>
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
