import { ImageUp } from "lucide-react";
import { useState, type ReactNode } from "react";
import { getVehicleColorLabel } from "@lojaveiculosv2/shared";
import { formatApiErrorDisplay } from "../../../lib/apiErrors";
import type { InventoryApi } from "../api/apiClient";
import { InventoryDocumentList } from "./InventoryDocumentList";
import { InventoryMediaGrid } from "./InventoryMediaGrid";
import { InventoryUploadActions } from "./InventoryUploadActions";
import { InventoryPanel, InventorySelect } from "./InventoryFormParts";
import { InternalPhotosZone } from "./InternalPhotosZone";
import type { InventoryListingDetail } from "../model/types";
import type {
  InventoryMediaRun,
  InventoryMediaState,
} from "../model/mediaWorkspaceTypes";
import { uploadInventoryFile } from "../model/mediaWorkspaceTypes";

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
  const galleryMedia = selectedMedia.filter(
    (item) => item.kind === "photo" || item.kind === "video",
  );
  const internalMedia = selectedMedia.filter(
    (item) => item.kind === "document_preview",
  );

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

  const handleUploadInternalRecord = async (file: File) => {
    if (!currentUnitId) {
      throw new Error("Selecione uma unidade para anexar registro interno.");
    }
    const upload = await api.requestMediaUpload(currentUnitId, {
      file,
      kind: "document_preview",
    });
    await uploadInventoryFile(file, upload);
    const mediaRecord = await api.createMedia(currentUnitId, {
      altText: file.name,
      displayOrder: selectedMedia.length,
      kind: "document_preview",
      storageKey: upload.storageKey,
    });
    return api.updateMedia(currentUnitId, mediaRecord.mediaId, {
      isPublic: false,
    });
  };

  const uploadInternalRecord = (file: File) => {
    void run("Anexando registro interno", () =>
      handleUploadInternalRecord(file),
    );
  };

  return (
    <InventoryPanel
      icon={<ImageUp className="size-5" />}
      title="Fotos, vídeos e documentos"
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
        <MediaSection
          description="Fotos e vídeos usados na vitrine pública e nos anúncios."
          title="Galeria pública"
        >
          <InventoryMediaGrid
            api={api}
            media={galleryMedia}
            run={run}
            unitId={currentUnitId}
          />
        </MediaSection>
        <MediaSection
          description="Laudos, fotos de reparo e arquivos que não entram na vitrine."
          title="Registros internos"
        >
          <InternalPhotosZone
            internalPhotos={internalMedia}
            onUploadInternal={uploadInternalRecord}
          />
        </MediaSection>
        <MediaSection
          description="Documentos operacionais vinculados à unidade."
          title="Documentos"
        >
          <InventoryDocumentList detail={detail} unitId={currentUnitId} />
        </MediaSection>
        <WorkspaceStatus state={state} />
      </div>
    </InventoryPanel>
  );
}

function MediaSection({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <section className="grid gap-3 rounded-xl border border-line bg-app/35 p-3">
      <div>
        <h4 className="text-xs font-black uppercase tracking-wider text-app-text">
          {title}
        </h4>
        <p className="mt-1 text-xs font-bold text-muted">{description}</p>
      </div>
      {children}
    </section>
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
