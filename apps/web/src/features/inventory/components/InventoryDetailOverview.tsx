import {
  Camera,
  CarFront,
  CheckCircle2,
  CircleAlert,
  DollarSign,
  FileText,
  Gauge,
  Landmark,
  PencilLine,
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
import { FeatureActionButton } from "../../../components/ui/FeatureLayout";
import { ImageWithFallback } from "../../../components/ui/ImageWithFallback";
import { StatusPill } from "./InventoryListingBadges";
import {
  getInventoryDisplayStatus,
  getInventoryVehicleSubtitle,
  getInventoryVehicleTitle,
} from "../model/listCatalogModel";

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
  onEditVehicle,
  onSell,
  onSimulate,
  primaryUnit,
  specs,
}: {
  detail: InventoryListingDetail;
  onEditVehicle: () => void;
  onSell?: () => void;
  onSimulate?: () => void;
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

  const vehicleTitle = getInventoryVehicleTitle(listing);
  const vehicleSubtitle = getInventoryVehicleSubtitle(listing, listing.catalog);

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
      {/* Vehicle Hero Card */}
      <div className="overflow-hidden rounded-2xl border border-line bg-panel shadow-sm">
        <div className="grid gap-0 md:grid-cols-[4fr_3fr] h-full">
          {/* Photo Cover with Contrast Scrim */}
          <div className="relative min-h-[280px] bg-app-elevated flex items-center justify-center overflow-hidden">
            {cover?.url ? (
              <ImageWithFallback
                alt={cover.altText ?? listing.title}
                className="absolute inset-0 size-full object-cover"
                fallback={
                  <div className="flex flex-col items-center justify-center gap-2 text-muted">
                    <CarFront className="size-12" />
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Fotos em breve
                    </span>
                  </div>
                }
                src={cover.url}
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 text-muted">
                <CarFront className="size-12" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Fotos em breve
                </span>
              </div>
            )}

            {/* Top scrim for status pill */}
            <div className="absolute top-3 left-3 z-10">
              <StatusPill
                status={getInventoryDisplayStatus({ listing, primaryUnit })}
              />
            </div>

            {/* Bottom Scrim for Title */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-5 text-white">
              <h2 className="text-xl md:text-2xl font-black leading-tight text-white drop-shadow-sm">
                {vehicleTitle}
              </h2>
              <p className="mt-0.5 text-xs font-semibold text-white/90">
                {vehicleSubtitle}
              </p>
              <p className="mt-1.5 text-xs font-medium text-white/70">
                {yearLabel(listing.manufactureYear, listing.modelYear)} ·{" "}
                {formatFuelType(listing.fuelType)} ·{" "}
                {formatTransmission(listing.transmission)}
              </p>
            </div>
          </div>

          {/* Pricing and Key Specs Panel */}
          <div className="grid content-between gap-4 border-t border-line bg-panel p-5 md:border-l md:border-t-0">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-muted">
                  Preço anunciado
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {onSimulate ? (
                    <FeatureActionButton
                      icon={Landmark}
                      label="Simular financiamento"
                      onClick={onSimulate}
                    >
                      Simular
                    </FeatureActionButton>
                  ) : null}
                  {onSell ? (
                    <FeatureActionButton
                      icon={DollarSign}
                      label="Iniciar venda"
                      onClick={onSell}
                    >
                      Vender
                    </FeatureActionButton>
                  ) : null}
                  <FeatureActionButton
                    icon={PencilLine}
                    label="Editar veículo"
                    onClick={onEditVehicle}
                  >
                    Editar
                  </FeatureActionButton>
                </div>
              </div>
              <p className="mt-1 text-2xl md:text-3xl font-black tracking-tight text-accent">
                {listing.priceCents
                  ? formatPrice(listing.priceCents)
                  : "Sob consulta"}
              </p>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-2 gap-2">
              <OverviewMetric
                icon={<Gauge className="size-4 text-accent" />}
                label="Km"
                value={listing.mileageKm?.toLocaleString("pt-BR") ?? "-"}
              />
              <OverviewMetric
                icon={<Tag className="size-4 text-accent" />}
                label="Cor"
                value={
                  getVehicleColorLabel(primaryUnit?.colorName) ??
                  specs.color ??
                  "-"
                }
              />
              <OverviewMetric
                icon={<Camera className="size-4 text-accent" />}
                label="Fotos"
                value={`${publicPhotos.length}`}
              />
              <OverviewMetric
                icon={<FileText className="size-4 text-accent" />}
                label="Docs"
                value={detail.documents.length}
              />
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-line/60 pt-3">
              <span className="text-xs font-black uppercase tracking-wider text-muted">
                Custos registrados
              </span>
              <span className="text-base font-black text-app-text">
                {totalCosts ? formatPrice(totalCosts) : "Nenhum custo"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Readiness / Quality Checklist Card */}
      <div className="rounded-2xl border border-line bg-panel p-5 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-muted">
                Prontidão do anúncio
              </p>
              <h3 className="mt-1 text-xl font-black text-app-text">
                {readinessPercent}% completo
              </h3>
            </div>
            <div className="flex h-9 items-center justify-center rounded-xl border border-accent/20 bg-accent-soft px-3 text-xs font-black text-accent-strong">
              {readyCount} de {readiness.length} itens
            </div>
          </div>

          <div className="mt-3.5 h-2 overflow-hidden rounded-full bg-app-elevated">
            <div
              className="h-full rounded-full bg-accent transition-all duration-300"
              style={{ width: `${readinessPercent}%` }}
            />
          </div>

          <div className="mt-4 divide-y divide-line/40 border-t border-line/40">
            {readiness.map((item) => (
              <ReadinessRow key={item.label} {...item} />
            ))}
          </div>
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
    <div className="rounded-xl border border-line/60 bg-app-elevated/40 p-2.5 transition-colors hover:border-line-strong">
      <div className="flex items-center gap-1.5 text-muted">
        {icon}
        <span className="text-xs font-bold uppercase tracking-wider">
          {label}
        </span>
      </div>
      <strong className="mt-1 block text-sm font-black text-app-text truncate">
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
    <div className="flex items-center justify-between gap-3 px-1 py-2 text-xs">
      <div className="flex min-w-0 items-center gap-2">
        <Icon
          className={
            "size-4 shrink-0 " + (done ? "text-emerald-500" : "text-amber-500")
          }
        />
        <span className="truncate font-bold text-app-text">{label}</span>
      </div>
      <span className="text-right font-medium text-muted">{value}</span>
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
