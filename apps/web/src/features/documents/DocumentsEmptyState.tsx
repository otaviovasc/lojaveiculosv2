import {
  AlertTriangle,
  FileX,
  FolderOpen,
  RefreshCcw,
  UploadCloud,
} from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { EmptyCatalog } from "../inventory/components/InventoryListingCardGrid";

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
  return (
    <div className="documents-empty-state" data-kind={kind}>
      <EmptyCatalog body={message} title={title} />
      <div className="documents-empty-state-icon" aria-hidden>
        <Icon className="size-6" />
      </div>
      {action ?? null}
      {onAction && ctaLabel ? (
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
      ) : null}
    </div>
  );
}
