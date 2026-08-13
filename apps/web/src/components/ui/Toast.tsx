import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ToastTone = "danger" | "info" | "success" | "warning";

export type ToastProps = {
  children?: ReactNode;
  className?: string;
  icon?: ReactNode;
  onDismiss?: () => void;
  priority?: "assertive" | "polite";
  title: ReactNode;
  tone?: ToastTone;
};

const toneClasses: Record<ToastTone, string> = {
  danger: "border-danger/40 text-danger",
  info: "border-info/40 text-info",
  success: "border-success/40 text-success-strong",
  warning: "border-warning/40 text-warning-strong",
};

export function Toast({
  children,
  className,
  icon,
  onDismiss,
  priority = "polite",
  title,
  tone = "info",
}: ToastProps) {
  return (
    <aside
      aria-atomic="true"
      aria-live={priority}
      className={cn(
        "fixed z-[90] grid w-[min(24rem,calc(100vw-2rem))] grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2.5 rounded-2xl border bg-panel p-3 text-sm shadow-xl transition-[opacity,transform] duration-200 motion-reduce:transition-none",
        "[inset-block-start:max(1rem,env(safe-area-inset-top))] [inset-inline-end:max(1rem,env(safe-area-inset-right))]",
        toneClasses[tone],
        className,
      )}
      data-tone={tone}
      data-ui="toast"
      role={priority === "assertive" ? "alert" : "status"}
    >
      {icon ? (
        <span aria-hidden="true" className="mt-0.5 [&>svg]:size-4">
          {icon}
        </span>
      ) : (
        <span aria-hidden="true" />
      )}
      <span className="grid min-w-0 gap-0.5">
        <strong className="font-bold leading-snug">{title}</strong>
        {children ? (
          <span className="text-xs leading-snug text-muted">{children}</span>
        ) : null}
      </span>
      {onDismiss ? (
        <button
          aria-label="Fechar notificação"
          className="-m-1 inline-flex size-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-app hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
          onClick={onDismiss}
          title="Fechar notificação"
          type="button"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      ) : (
        <span aria-hidden="true" />
      )}
    </aside>
  );
}
