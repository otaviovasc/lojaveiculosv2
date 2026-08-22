import { Download, FileSearch, Trash2 } from "lucide-react";
import {
  FeatureRowAction,
  FeatureRowActions,
} from "../../components/ui/FeatureTable";
import type { WorkspaceDocument } from "./types";

export function DocumentWorkspaceRowActions({
  document,
  isBusy,
  onDelete,
  onDownload,
  onSelect,
}: {
  document: WorkspaceDocument;
  isBusy: boolean;
  onDelete: (document: WorkspaceDocument) => void;
  onDownload: (documentId: string) => Promise<void>;
  onSelect: (document: WorkspaceDocument) => void;
}) {
  return (
    <FeatureRowActions>
      <FeatureRowAction
        ariaLabel="Visualizar documento"
        icon={FileSearch}
        onClick={() => onSelect(document)}
        tooltip="Visualizar"
      />
      <FeatureRowAction
        ariaLabel="Baixar documento"
        disabled={isBusy}
        icon={Download}
        onClick={() => void onDownload(document.id)}
        tooltip="Baixar"
      />
      <FeatureRowAction
        ariaLabel="Excluir documento"
        disabled={isBusy || document.status === "voided"}
        icon={Trash2}
        onClick={() => onDelete(document)}
        tooltip="Excluir"
      />
    </FeatureRowActions>
  );
}
