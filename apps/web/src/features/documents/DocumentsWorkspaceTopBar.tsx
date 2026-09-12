import {
  FolderOpen,
  LayoutGrid,
  PanelLeft,
  RefreshCcw,
  UploadCloud,
} from "lucide-react";
import type { DocumentsFolderKey } from "./documentDisplayModel";
import {
  FeatureActionButton,
  FeaturePageHeader,
} from "../../components/ui/FeatureLayout";

export function DocumentsWorkspaceTopBar({
  folderTitle,
  folderSubtitle,
  isRefreshing,
  isUploading,
  onOpenFolders,
  onRefresh,
  onToggleViewMode,
  onUpload,
  selectedKey,
  showUpload,
  unitLabel,
  uploadTitle,
  viewMode = "split",
}: {
  folderTitle: string;
  folderSubtitle: string;
  isRefreshing: boolean;
  isUploading: boolean;
  onOpenFolders: () => void;
  onRefresh: () => void;
  onToggleViewMode?: () => void;
  onUpload: () => void;
  selectedKey: DocumentsFolderKey;
  showUpload: boolean;
  unitLabel: string | null;
  uploadTitle: string;
  viewMode?: "grid" | "split";
}) {
  return (
    <FeaturePageHeader
      actions={
        <>
          {onToggleViewMode ? (
            <FeatureActionButton
              icon={viewMode === "grid" ? PanelLeft : LayoutGrid}
              label={viewMode === "grid" ? "Barra lateral" : "Grade de pastas"}
              onClick={onToggleViewMode}
            />
          ) : null}
          <FeatureActionButton
            className="documents-top-bar-action--mobile-only"
            icon={FolderOpen}
            label="Pastas"
            onClick={onOpenFolders}
          />
          <FeatureActionButton
            disabled={isRefreshing}
            icon={RefreshCcw}
            isBusy={isRefreshing}
            label="Atualizar"
            onClick={onRefresh}
          />
          {showUpload ? (
            <FeatureActionButton
              disabled={isUploading}
              icon={UploadCloud}
              label="Enviar documento"
              onClick={onUpload}
              title={uploadTitle}
              variant="primary"
            />
          ) : null}
        </>
      }
      actionsLabel="Ações do workspace"
      chip={
        unitLabel ? (
          <>
            <FolderOpen aria-hidden="true" className="size-3.5" />
            {unitLabel}
          </>
        ) : null
      }
      eyebrow="Documentos"
      hiddenStateValue={selectedKey}
      subtitle={folderSubtitle}
      title={folderTitle}
    />
  );
}
