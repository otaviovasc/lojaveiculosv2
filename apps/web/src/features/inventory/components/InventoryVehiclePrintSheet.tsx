import type { InventoryListingDetail, InventoryUnit } from "../model/types";
import { formatPrice } from "./InventoryDetailWorkspaceMocks";
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
  const listing = detail.listing;
  const price = listing.priceCents
    ? formatPrice(listing.priceCents)
    : "Sob Consulta";
  const year = [listing.manufactureYear, listing.modelYear]
    .filter(Boolean)
    .join("/");
  const rows = [
    ["Ano", year || "Nao informado"],
    ["Quilometragem", specs.km],
    ["Cor", specs.color],
    ["Combustivel", specs.fuel],
    ["Cambio", specs.transmission],
    ["Carroceria", specs.bodyType],
    ["Motor", specs.engine],
    ["Portas", specs.doors],
    ["Placa", specs.plate],
    ["Estoque", primaryUnit?.stockNumber ?? "Nao informado"],
    ["Chassi / VIN", specs.vin],
  ];

  return (
    <PrintWrapper title="Ficha completa do veiculo" onClose={onClose}>
      <article className="flex min-h-[900px] flex-col gap-7">
        <header className="border-b border-black/20 pb-5">
          <p className="text-xs font-black uppercase tracking-[0.2em]">
            Loja Veiculos
          </p>
          <h1 className="mt-2 text-4xl font-black leading-tight">
            {listing.title}
          </h1>
          <div className="mt-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em]">
                Preco anunciado
              </p>
              <p className="text-5xl font-black leading-none">{price}</p>
            </div>
            <div className="text-right text-xs font-bold uppercase tracking-[0.16em]">
              <p>{specs.modality}</p>
              <p>{listing.status}</p>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-3">
          {rows.map(([label, value]) => (
            <div className="border border-black/15 p-3" key={label}>
              <p className="text-xs font-black uppercase tracking-[0.16em]">
                {label}
              </p>
              <p className="mt-1 text-lg font-black">{value}</p>
            </div>
          ))}
        </section>

        <section className="border-t border-black/20 pt-5">
          <p className="text-xs font-black uppercase tracking-[0.18em]">
            Descricao
          </p>
          <p className="mt-2 whitespace-pre-wrap text-base font-semibold leading-relaxed">
            {listing.description?.trim() ||
              "Veiculo disponivel em estoque. Consulte nossa equipe para condicoes de pagamento, financiamento e avaliacao de troca."}
          </p>
        </section>

        <footer className="mt-auto border-t border-black/20 pt-4 text-xs font-semibold uppercase tracking-[0.14em]">
          <p>Ficha para exposicao em loja e parabrisa do veiculo.</p>
          <p>Gerada em {new Date().toLocaleDateString("pt-BR")}.</p>
        </footer>
      </article>
    </PrintWrapper>
  );
}
