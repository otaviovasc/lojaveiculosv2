import type { LucideIcon } from "lucide-react";

export function PageBuilderPreviewEmptyState({
  icon: Icon,
  text,
  title,
}: {
  icon: LucideIcon;
  text: string;
  title: string;
}) {
  return (
    <section className="public-storefront-shell px-4 py-10 md:px-6">
      <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-line bg-panel p-8 text-center">
        <div>
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Icon aria-hidden="true" className="size-5" />
          </span>
          <h3 className="mt-4 text-base font-black text-app-text">{title}</h3>
          <p className="mt-2 max-w-sm text-sm font-semibold text-muted">
            {text}
          </p>
        </div>
      </div>
    </section>
  );
}
