import {
  Camera,
  CheckCircle2,
  CircleAlert,
  FileText,
  Gauge,
  ImageIcon,
  Tag,
} from "lucide-react";
import type { ReactNode } from "react";
import { getVehicleColorLabel } from "@lojaveiculosv2/shared";
import type { InventoryListingDetail, InventoryUnit } from "../model/types";
import {
  formatFuelType,
  formatTransmission,
} from "./InventoryDetailFormatters";
import { formatPrice } from "./InventoryDetailWorkspaceMocks";

type Specs = {
  bodyType: string;
  color: string;
  doors: string;
  engine: string;
  fuel: string;
  km: string;
  modality: string;
  plate: string;
  transmission: string;
  vin: string;
};

export function InventoryDetailOverview({
  detail,
  primaryUnit,
  specs,
}: {
  detail: InventoryListingDetail;
  primaryUnit: InventoryUnit | null;
  specs: Specs;
}) {
  const listing = detail.listing;
  const publicPhotos = detail.media.filter(
    (item) =>
      item.kind === "photo" &&
      item.isPublic &&
      (!primaryUnit || item.unitId === primaryUnit.id),
  );
  const cover =
    publicPhotos[0] ?? detail.media.find((item) => item.kind === "photo");
  const readiness = createReadinessItems(detail, primaryUnit);
  const readyCount = readiness.filter((item) => item.done).length;
  const readinessPercent = Math.round((readyCount / readiness.length) * 100);
  const totalCosts = detail.costs.reduce(
    (sum, cost) => sum + cost.amountCents,
    0,
  );

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
      <div className="overflow-hidden rounded-2xl border border-line bg-panel shadow-sm">
        <div className="grid gap-0 md:grid-cols-[4fr_3fr] h-full">
          <div className="relative min-h-[280px] bg-app">
            {cover?.url ? (
              <img
                alt={cover.altText ?? listing.title}
                className="absolute inset-0 size-full object-cover"
                src={cover.url}
              />
            ) : (
              <div className="absolute inset-0 grid place-items-center bg-accent-soft text-accent">
                <ImageIcon className="size-14" />
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/72 to-transparent p-5 text-white">
              <span className="rounded bg-white/15 px-2 py-1 text-xs font-black uppercase tracking-[0.16em] backdrop-blur-sm">
                {statusLabel(listing.status)}
              </span>
              <h2 className="mt-3 text-2xl font-black leading-tight">
                {listing.title}
              </h2>
              <p className="mt-1 text-sm font-bold text-white/80">
                {yearLabel(listing.manufactureYear, listing.modelYear)} ·{" "}
                {formatFuelType(listing.fuelType)} ·{" "}
                {formatTransmission(listing.transmission)}
              </p>
            </div>
          </div>

          <div className="grid content-start gap-4 border-t border-line bg-app p-5 md:border-l md:border-t-0">
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-muted">
                Preço anunciado
              </span>
              <p className="mt-1 text-3xl font-black tracking-tight text-accent">
                {listing.priceCents
                  ? formatPrice(listing.priceCents)
                  : "Sob consulta"}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <OverviewMetric
                icon={<Gauge className="size-4" />}
                label="Km"
                value={listing.mileageKm?.toLocaleString("pt-BR") ?? "-"}
              />
              <OverviewMetric
                icon={<Tag className="size-4" />}
                label="Cor"
                value={
                  getVehicleColorLabel(primaryUnit?.colorName) ??
                  specs.color ??
                  "-"
                }
              />
              <OverviewMetric
                icon={<Camera className="size-4" />}
                label="Fotos"
                value={`${publicPhotos.length}`}
              />
              <OverviewMetric
                icon={<FileText className="size-4" />}
                label="Docs"
                value={detail.documents.length}
              />
            </div>
            <div className="rounded-xl border border-line bg-panel p-3">
              <span className="text-xs font-black uppercase tracking-widest text-muted">
                Custos registrados
              </span>
              <p className="mt-1 text-lg font-black text-app-text">
                {totalCosts ? formatPrice(totalCosts) : "Nenhum custo"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-panel p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-muted">
              Prontidão do anúncio
            </p>
            <h3 className="mt-1 text-xl font-black text-app-text">
              {readinessPercent}% completo
            </h3>
          </div>
          <div className="flex size-14 items-center justify-center rounded-full border border-accent/20 bg-accent-soft text-lg font-black text-accent">
            {readyCount}/{readiness.length}
          </div>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-app">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${readinessPercent}%` }}
          />
        </div>

        <div className="mt-4 grid gap-2">
          {readiness.map((item) => (
            <ReadinessRow key={item.label} {...item} />
          ))}
        </div>
      </div>
    </section>
  );
}

function OverviewMetric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-xl border border-line bg-panel p-3">
      <div className="flex items-center gap-2 text-muted">
        {icon}
        <span className="text-xs font-black uppercase tracking-wider">
          {label}
        </span>
      </div>
      <strong className="mt-1 block text-sm font-black text-app-text">
        {value}
      </strong>
    </div>
  );
}

function ReadinessRow({
  done,
  label,
  value,
}: {
  done: boolean;
  label: string;
  value: string;
}) {
  const Icon = done ? CheckCircle2 : CircleAlert;
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-app px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2">
        <Icon
          className={
            "size-4 shrink-0 " + (done ? "text-emerald-500" : "text-warning")
          }
        />
        <span className="truncate text-sm font-black text-app-text">
          {label}
        </span>
      </div>
      <span className="text-right text-xs font-bold text-muted">{value}</span>
    </div>
  );
}

function createReadinessItems(
  detail: InventoryListingDetail,
  primaryUnit: InventoryUnit | null,
) {
  const listing = detail.listing;
  const publicPhotos = detail.media.filter(
    (item) =>
      item.kind === "photo" &&
      item.isPublic &&
      (!primaryUnit || item.unitId === primaryUnit.id),
  );
  const hasSpecs = Boolean(
    listing.modelYear &&
    listing.manufactureYear &&
    listing.mileageKm !== null &&
    listing.fuelType &&
    listing.transmission,
  );
  const completedChecklistCount = detail.checklists.filter(
    (checklist) => checklist.status === "passed",
  ).length;

  return [
    {
      done: publicPhotos.length >= 4,
      label: "Galeria pública",
      value: `${publicPhotos.length}/4 fotos`,
    },
    {
      done: Boolean(listing.priceCents),
      label: "Preço",
      value: listing.priceCents ? "Definido" : "Pendente",
    },
    {
      done: Boolean(listing.description?.trim()),
      label: "Descrição",
      value: listing.description?.trim() ? "Publicável" : "Pendente",
    },
    {
      done: hasSpecs,
      label: "Ficha técnica",
      value: hasSpecs ? "Completa" : "Revisar",
    },
    {
      done: Boolean(primaryUnit && primaryUnit.status !== "inactive"),
      label: "Unidade",
      value: primaryUnit ? unitStatusLabel(primaryUnit.status) : "Sem unidade",
    },
    {
      done: completedChecklistCount > 0,
      label: "Checklist",
      value: `${completedChecklistCount}/${detail.checklists.length}`,
    },
  ];
}

function statusLabel(status: InventoryListingDetail["listing"]["status"]) {
  const labels: Record<InventoryListingDetail["listing"]["status"], string> = {
    archived: "Arquivado",
    draft: "Rascunho",
    in_preparation: "Preparação",
    published: "Publicado",
    sold_out: "Vendido",
    unpublished: "Fora da vitrine",
  };
  return labels[status] ?? status;
}

function unitStatusLabel(status: InventoryUnit["status"]) {
  const labels: Record<InventoryUnit["status"], string> = {
    acquired: "Adquirido",
    available: "Disponível",
    delivered: "Entregue",
    inactive: "Inativo",
    in_preparation: "Preparação",
    reserved: "Reservado",
    sold: "Vendido",
  };
  return labels[status] ?? status;
}

function yearLabel(manufactureYear: number | null, modelYear: number | null) {
  if (manufactureYear && modelYear) return `${manufactureYear}/${modelYear}`;
  return String(modelYear ?? manufactureYear ?? "-");
}
