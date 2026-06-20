import { ImageUp } from "lucide-react";
import { useState } from "react";
import type { InventoryApi } from "../api/apiClient";
import { InventoryDocumentList } from "./InventoryDocumentList";
import { InventoryMediaGrid } from "./InventoryMediaGrid";
import { InventoryUploadActions } from "./InventoryUploadActions";
import { InventoryPanel } from "./InventoryFormParts";
import type { InventoryListingDetail } from "../model/types";
import type {
  InventoryMediaRun,
  InventoryMediaState,
} from "../model/mediaWorkspaceTypes";

export function InventoryMediaWorkspace({
  api,
  detail,
  onUpdated,
}: {
  api: InventoryApi;
  detail: InventoryListingDetail;
  onUpdated: (detail: InventoryListingDetail) => void;
}) {
  const [state, setState] = useState<InventoryMediaState>({ kind: "idle" });

  const run: InventoryMediaRun = async (label, action) => {
    setState({ kind: "busy", label });
    try {
      onUpdated(await action());
      setState({ kind: "idle" });
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return (
    <InventoryPanel
      icon={<ImageUp className="size-5" />}
      title="Midia e documentos"
    >
      <div className="grid gap-4">
        <MediaReadiness detail={detail} />
        <InventoryUploadActions api={api} detail={detail} run={run} />
        <InventoryMediaGrid api={api} detail={detail} run={run} />
        <InventoryDocumentList detail={detail} />
        <WorkspaceStatus state={state} />
      </div>
    </InventoryPanel>
  );
}

function MediaReadiness({ detail }: { detail: InventoryListingDetail }) {
  const publicPhotos = detail.media.filter(
    (item) => item.kind === "photo" && item.isPublic,
  );
  const hiddenItems = detail.media.filter((item) => !item.isPublic).length;
  const cover = publicPhotos.at(0);

  return (
    <div className="grid gap-2 rounded-lg border border-line bg-app p-3 text-sm font-black text-muted sm:grid-cols-3">
      <StatusTile label="Capa" value={cover ? "Pronta" : "Pendente"} />
      <StatusTile label="Fotos publicas" value={publicPhotos.length} />
      <StatusTile label="Ocultos" value={hiddenItems} />
    </div>
  );
}

function StatusTile({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-md bg-panel p-3">
      <span className="block text-xs uppercase tracking-widest">{label}</span>
      <strong className="block text-app-text">{value}</strong>
    </div>
  );
}

function WorkspaceStatus({ state }: { state: InventoryMediaState }) {
  if (state.kind === "busy") {
    return <p className="text-sm font-black text-muted">{state.label}.</p>;
  }
  if (state.kind === "error") {
    return <p className="text-sm font-black text-danger">{state.message}</p>;
  }
  return (
    <p className="text-sm font-bold text-muted">Auditoria de midia ativa.</p>
  );
}
