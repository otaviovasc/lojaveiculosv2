import type { ReactNode } from "react";
import { LockKeyhole } from "lucide-react";

export function PermissionRestrictedPanel({
  children,
  description = "Essa área exige uma permissão adicional na sua loja.",
  title = "Acesso restrito",
}: {
  children?: ReactNode;
  description?: string;
  title?: string;
}) {
  return (
    <main className="content-frame min-h-screen bg-app text-app-text">
      <section className="feature-empty-state mx-auto flex min-h-[420px] w-full max-w-2xl flex-col items-center justify-center gap-4 text-center">
        <span aria-hidden="true" className="feature-empty-state__watermark" />
        <span className="feature-empty-state__chip">
          <LockKeyhole aria-hidden className="size-7" />
        </span>
        <div className="grid gap-2">
          <h1 className="feature-empty-state__title text-2xl">{title}</h1>
          <p className="max-w-xl text-sm font-semibold leading-6 text-muted">
            {description}
          </p>
        </div>
        {children ? <div className="mt-2">{children}</div> : null}
      </section>
    </main>
  );
}
