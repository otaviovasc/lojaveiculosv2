import { RefreshCcw } from "lucide-react";
import type { StorefrontCustomizationStatus } from "./storefrontCustomizationTypes";

export function StorefrontLoadingState({
  status,
}: {
  status: StorefrontCustomizationStatus;
}) {
  return (
    <div className="website-builder-surface flex min-h-dvh items-center justify-center text-foreground">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-5 py-4 text-sm font-semibold text-muted-foreground shadow-sm">
        <RefreshCcw
          className={
            status.kind === "loading" ? "h-4 w-4 animate-spin" : "h-4 w-4"
          }
        />
        {status.kind === "error" ? status.message : "Carregando site"}
      </div>
    </div>
  );
}
