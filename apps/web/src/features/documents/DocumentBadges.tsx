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
    <span className={`documents-origin-badge origin-${origin}`}>
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
    <span className={`documents-scope-badge scope-${scope}`}>
      <Icon aria-hidden="true" className="size-3.5" />
      {documentScopeLabel(document)}
    </span>
  );
}
