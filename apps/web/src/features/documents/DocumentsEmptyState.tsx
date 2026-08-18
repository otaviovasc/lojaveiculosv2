import {
  AlertTriangle,
  FileX,
  FolderOpen,
  RefreshCcw,
  UploadCloud,
} from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { FeatureActionButton } from "../../components/ui/FeatureLayout";
import { FeatureEmptyState } from "../../components/ui/FeatureStates";

export type DocumentsEmptyStateKind = "error" | "folder-empty" | "no-results";

const ICONS: Record<
  DocumentsEmptyStateKind,
  ComponentType<{ className?: string }>
> = {
  error: AlertTriangle,
  "folder-empty": FolderOpen,
  "no-results": FileX,
};

export function DocumentsEmptyState({
  action,
  className,
  ctaLabel,
  kind,
  message,
  onAction,
  title,
}: {
  action?: ReactNode;
  className?: string;
  ctaLabel?: string;
  kind: DocumentsEmptyStateKind;
  message: string;
  onAction?: () => void;
  title: string;
}) {
  const Icon = ICONS[kind];
  const ctaIcon =
    kind === "folder-empty"
      ? UploadCloud
      : kind === "error"
        ? RefreshCcw
        : undefined;

  const cta =
    onAction && ctaLabel ? (
      <FeatureActionButton
        {...(ctaIcon ? { icon: ctaIcon } : {})}
        label={ctaLabel}
        onClick={onAction}
        variant={kind === "no-results" ? "secondary" : "primary"}
      />
    ) : null;
  const actionNode =
    action || cta ? (
      <div className="flex items-center justify-center gap-2">
        {action ?? null}
        {cta}
      </div>
    ) : undefined;
  return (
    <FeatureEmptyState
      action={actionNode}
      body={message}
      className={
        className ? `w-full min-h-[380px] ${className}` : "w-full min-h-[380px]"
      }
      icon={Icon}
      title={title}
      tone={kind === "error" ? "warning" : "accent"}
    />
  );
}
