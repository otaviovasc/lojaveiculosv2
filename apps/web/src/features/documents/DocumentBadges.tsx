import {
  Bot,
  CarFront,
  FolderArchive,
  Layers3,
  UploadCloud,
} from "lucide-react";
import type { ComponentType } from "react";
import {
  documentOrigin,
  documentScope,
  documentScopeLabel,
} from "./documentDisplayModel";
import { documentOriginLabel } from "./documentDisplayModel";
import type { WorkspaceDocument } from "./types";

export function DocumentOriginBadge({
  document,
}: {
  document: WorkspaceDocument;
}) {
  const origin = documentOrigin(document);
  const Icon = origin === "manual" ? UploadCloud : Bot;
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-black uppercase tracking-wider " +
        (origin === "manual"
          ? "bg-pink-500/10 text-pink-500 border border-pink-500/20"
          : "bg-violet-500/10 text-violet-500 border border-violet-500/20")
      }
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {documentOriginLabel(document)}
    </span>
  );
}

export function DocumentScopeBadge({
  document,
}: {
  document: WorkspaceDocument;
}) {
  const scope = documentScope(document);
  const Icon: ComponentType<{ className?: string }> =
    scope === "multiple_vehicles"
      ? Layers3
      : scope === "vehicle"
        ? CarFront
        : FolderArchive;
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-black uppercase tracking-wider " +
        (scope === "vehicle" || scope === "multiple_vehicles"
          ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
          : "bg-panel text-muted border border-line")
      }
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {documentScopeLabel(document)}
    </span>
  );
}
