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
    <main className="min-h-screen bg-app px-4 py-8 text-app-text">
      <section className="mx-auto flex min-h-[420px] w-full max-w-2xl flex-col items-center justify-center gap-4 text-center">
        <div className="flex size-12 items-center justify-center rounded-lg border border-line bg-panel text-accent">
          <LockKeyhole aria-hidden className="size-5" />
        </div>
        <div className="grid gap-2">
          <h1 className="text-2xl font-black tracking-normal">{title}</h1>
          <p className="max-w-xl text-sm font-semibold leading-6 text-muted">
            {description}
          </p>
        </div>
        {children ? <div className="mt-2">{children}</div> : null}
      </section>
    </main>
  );
}
