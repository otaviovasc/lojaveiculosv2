import type { InventoryListingDetail, InventoryUnit } from "../model/types";
import { useOptionalAccountSession } from "../../account/accountSession";
import type { SessionBootstrap } from "../../account/apiClient";
import { readRuntimeStoreSlug } from "../../account/currentStore";
import { formatPrice } from "./InventoryDetailWorkspaceMocks";
import { statusLabel } from "./InventoryDetailFormatters";
import { PrintWrapper } from "./InventoryPrintWrapper";

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

export function InventoryVehiclePrintSheet({
  detail,
  onClose,
  primaryUnit,
  specs,
}: {
  detail: InventoryListingDetail;
  onClose: () => void;
  primaryUnit: InventoryUnit | null;
  specs: Specs;
}) {
  const accountSession = useOptionalAccountSession();
  const listing = detail.listing;
  const storeName = resolveStoreName(accountSession);
  const price = listing.priceCents
    ? formatPrice(listing.priceCents)
    : "Sob Consulta";
  const year = [listing.manufactureYear, listing.modelYear]
    .filter(Boolean)
    .join("/");
  const rows = [
    ["Ano", year || "Não informado"],
    ["Quilometragem", specs.km],
    ["Cor", specs.color],
    ["Combustível", specs.fuel],
    ["Câmbio", specs.transmission],
    ["Carroceria", specs.bodyType],
    ["Motor", specs.engine],
    ["Portas", specs.doors],
    ["Placa", specs.plate],
    ["Estoque", primaryUnit?.stockNumber ?? "Não informado"],
    ["Chassi / VIN", specs.vin],
  ];

  return (
    <PrintWrapper title="Ficha completa do veículo" onClose={onClose}>
      <article
        aria-label="Ficha completa do veículo"
        className="flex min-h-[900px] min-w-0 flex-col gap-6 sm:gap-7"
        data-testid="inventory-print-sheet"
      >
        <header className="border-b border-black/20 pb-5">
          <p className="text-xs font-black uppercase tracking-[0.2em]">
            {storeName}
          </p>
          <h1 className="mt-2 break-words text-3xl font-black leading-tight sm:text-4xl print:text-4xl">
            {listing.title}
          </h1>
          <div className="mt-5 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between print:flex-row print:items-end print:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.18em]">
                Preço anunciado
              </p>
              <p className="break-words text-3xl font-black leading-none sm:text-5xl print:text-5xl">
                {price}
              </p>
            </div>
            <div className="min-w-0 break-words text-left text-xs font-bold uppercase tracking-[0.16em] sm:text-right print:text-right">
              <p className="[overflow-wrap:anywhere]">{specs.modality}</p>
              <p>{statusLabel(listing.status)}</p>
            </div>
          </div>
        </header>

        <section
          aria-label="Especificações do veículo"
          className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 print:grid-cols-2"
        >
          {rows.map(([label, value]) => (
            <div className="min-w-0 border border-black/15 p-3" key={label}>
              <p className="text-xs font-black uppercase tracking-[0.16em]">
                {label}
              </p>
              <p className="mt-1 break-words text-lg font-black [overflow-wrap:anywhere]">
                {value}
              </p>
            </div>
          ))}
        </section>

        <section className="border-t border-black/20 pt-5">
          <p className="text-xs font-black uppercase tracking-[0.18em]">
            Descrição
          </p>
          <p className="mt-2 whitespace-pre-wrap break-words text-base font-semibold leading-relaxed [overflow-wrap:anywhere]">
            {listing.description?.trim() ||
              "Veículo disponível em estoque. Consulte nossa equipe para condições de pagamento, financiamento e avaliação de troca."}
          </p>
        </section>

        <footer className="mt-auto border-t border-black/20 pt-4 text-xs font-semibold uppercase tracking-[0.14em]">
          <p>Ficha para exposição em loja e para-brisa do veículo.</p>
          <p>Gerada em {new Date().toLocaleDateString("pt-BR")}.</p>
        </footer>
      </article>
    </PrintWrapper>
  );
}

function resolveStoreName(session: SessionBootstrap | null) {
  if (!session) return "Loja de veículos";
  const selectedSlug = readRuntimeStoreSlug(
    undefined,
    session.user.clerkUserId,
  );
  const selectedStore = session.stores.find(
    (store) =>
      store.status === "active" &&
      selectedSlug !== undefined &&
      store.storeSlug === selectedSlug,
  );
  return (
    selectedStore?.storeName.trim() ||
    session.defaultStore?.storeName.trim() ||
    session.stores
      .find((store) => store.status === "active")
      ?.storeName.trim() ||
    "Loja de veículos"
  );
}
