import { ImageUp } from "lucide-react";
import { useState } from "react";
import { getVehicleColorLabel } from "@lojaveiculosv2/shared";
import { formatApiErrorDisplay } from "../../../lib/apiErrors";
import type { InventoryApi } from "../api/apiClient";
import { InventoryDocumentList } from "./InventoryDocumentList";
import { InventoryMediaGrid } from "./InventoryMediaGrid";
import { InventoryUploadActions } from "./InventoryUploadActions";
import { InventoryPanel, InventorySelect } from "./InventoryFormParts";
import type { InventoryListingDetail } from "../model/types";
import type {
  InventoryMediaRun,
  InventoryMediaState,
} from "../model/mediaWorkspaceTypes";

export function InventoryMediaWorkspace({
  api,
  detail,
  initialUnitId,
  onUpdated,
}: {
  api: InventoryApi;
  detail: InventoryListingDetail;
  initialUnitId?: string | null;
  onUpdated: (detail: InventoryListingDetail) => void;
}) {
  const [state, setState] = useState<InventoryMediaState>({ kind: "idle" });
  const [selectedUnitId, setSelectedUnitId] = useState(() =>
    detail.units.some((unit) => unit.id === initialUnitId)
      ? (initialUnitId ?? "")
      : (detail.units[0]?.id ?? ""),
  );
  const currentUnitId = detail.units.some((unit) => unit.id === selectedUnitId)
    ? selectedUnitId
    : (detail.units[0]?.id ?? "");
  const selectedMedia = currentUnitId
    ? detail.media.filter((item) => item.unitId === currentUnitId)
    : detail.media;

  const run: InventoryMediaRun = async (label, action) => {
    setState({ kind: "busy", label });
    try {
      onUpdated(await action());
      setState({ kind: "idle" });
    } catch (error) {
      setState({
        kind: "error",
        message: formatApiErrorDisplay(
          error,
          "Não foi possível atualizar as mídias.",
        ),
      });
    }
  };

  return (
    <InventoryPanel
      icon={<ImageUp className="size-5" />}
      title="Mídia e documentos"
    >
      <div className="grid gap-4">
        <UnitMediaSelect
          detail={detail}
          onChange={setSelectedUnitId}
          value={currentUnitId}
        />
        <MediaReadiness media={selectedMedia} />
        <InventoryUploadActions
          api={api}
          detail={detail}
          media={selectedMedia}
          run={run}
          unitId={currentUnitId}
        />
        <InventoryMediaGrid
          api={api}
          media={selectedMedia}
          run={run}
          unitId={currentUnitId}
        />
        <InventoryDocumentList detail={detail} />
        <WorkspaceStatus state={state} />
      </div>
    </InventoryPanel>
  );
}

function UnitMediaSelect({
  detail,
  onChange,
  value,
}: {
  detail: InventoryListingDetail;
  onChange: (unitId: string) => void;
  value: string;
}) {
  if (detail.units.length <= 1) return null;

  return (
    <InventorySelect
      ariaLabel="Unidade da galeria"
      onChange={onChange}
      options={detail.units.map((unit, index) => ({
        label:
          [getVehicleColorLabel(unit.colorName), unit.plate, unit.stockNumber]
            .filter(Boolean)
            .join(" · ") || `Unidade ${index + 1}`,
        value: unit.id,
      }))}
      value={value}
    />
  );
}

function MediaReadiness({ media }: { media: InventoryListingDetail["media"] }) {
  const publicPhotos = media.filter(
    (item) => item.kind === "photo" && item.isPublic,
  );
  const hiddenItems = media.filter((item) => !item.isPublic).length;
  const cover = publicPhotos.at(0);

  return (
    <div className="grid gap-2 rounded-lg border border-line bg-app p-3 text-sm font-black text-muted sm:grid-cols-3">
      <StatusTile label="Capa" value={cover ? "Pronta" : "Pendente"} />
      <StatusTile label="Fotos públicas" value={publicPhotos.length} />
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
    <p className="text-sm font-bold text-muted">Auditoria de mídia ativa.</p>
  );
}
