import {
  AlertTriangle,
  FileX,
  FolderOpen,
  RefreshCcw,
  UploadCloud,
} from "lucide-react";
import type { ComponentType, ReactNode } from "react";
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
  ctaLabel,
  kind,
  message,
  onAction,
  title,
}: {
  action?: ReactNode;
  ctaLabel?: string;
  kind: DocumentsEmptyStateKind;
  message: string;
  onAction?: () => void;
  title: string;
}) {
  const Icon = ICONS[kind];
  const cta =
    onAction && ctaLabel ? (
      <button
        className="documents-empty-state-cta"
        onClick={onAction}
        type="button"
      >
        {kind === "folder-empty" ? (
          <UploadCloud aria-hidden="true" className="size-4" />
        ) : kind === "error" ? (
          <RefreshCcw aria-hidden="true" className="size-4" />
        ) : null}
        <span>{ctaLabel}</span>
      </button>
    ) : null;
  const actionNode =
    action || cta ? (
      <>
        {action ?? null}
        {cta}
      </>
    ) : undefined;
  return (
    <div className="documents-empty-state" data-kind={kind}>
      <FeatureEmptyState
        action={actionNode}
        body={message}
        icon={Icon}
        title={title}
      />
    </div>
  );
}
