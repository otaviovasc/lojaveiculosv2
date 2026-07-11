import type { StoreData, VehicleData } from "./InventoryPrintTypes";

export function formatPrintCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(value);
}

export function getPrintStoreName(store: StoreData) {
  return store.nome || "LOJA DE VEÍCULOS";
}

export function getPrintVehicleName(vehicle: VehicleData) {
  return [vehicle.brand, vehicle.model, vehicle.version]
    .filter(Boolean)
    .join(" ");
}

export function PrintReceiptHeader({
  store,
  storeName,
  title,
}: {
  store: StoreData;
  storeName: string;
  title: string;
}) {
  return (
    <div className="flex flex-col items-center border-b border-black pb-4 text-center">
      {store.logoUrl ? (
        <img
          src={store.logoUrl}
          alt={storeName}
          className="max-h-16 object-contain mb-3"
        />
      ) : null}
      <h1 className="text-xl font-bold uppercase tracking-wide">{title}</h1>
      <div className="text-xs mt-2 space-y-0.5">
        <p className="font-bold">{storeName}</p>
        {store.endereco && <p>{store.endereco}</p>}
        <p>
          {[
            store.cnpj && `CNPJ: ${store.cnpj}`,
            store.telefone && `Tel: ${store.telefone}`,
          ]
            .filter(Boolean)
            .join(" | ")}
        </p>
      </div>
    </div>
  );
}

export function PrintVehicleDescription({
  heading,
  vehicle,
  vehicleName,
}: {
  heading: string;
  vehicle: VehicleData;
  vehicleName: string;
}) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
      <h3 className="font-bold border-b border-gray-300 pb-1 uppercase text-xs text-gray-700">
        {heading}
      </h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <p>
          <span className="font-bold">Veículo:</span>{" "}
          {vehicleName || vehicle.title}
        </p>
        <p>
          <span className="font-bold">Placa:</span>{" "}
          {vehicle.plate || "________"}
        </p>
        <p>
          <span className="font-bold">Ano:</span>{" "}
          {vehicle.yearFabrication || "----"}/{vehicle.yearModel || "----"}
        </p>
        <p>
          <span className="font-bold">KM:</span> {vehicle.km || "0"}
        </p>
        <p>
          <span className="font-bold">Chassi:</span> {vehicle.chassi || "N/A"}
        </p>
        <p>
          <span className="font-bold">Cor:</span> {vehicle.color || "N/A"}
        </p>
      </div>
    </div>
  );
}

export function PrintSignatureSection({
  buyerLabel,
  buyerName,
  date,
  store,
  storeLabel,
  storeName,
}: {
  buyerLabel: string;
  buyerName: string;
  date: string;
  store: StoreData;
  storeLabel: string;
  storeName: string;
}) {
  return (
    <div className="pt-12 text-center text-xs space-y-8">
      <p>
        {store.cidade || "Cidade"}, {date}
      </p>
      <div className="flex justify-around gap-12 pt-4">
        <div className="w-1/2 flex flex-col items-center">
          <div className="w-full border-t border-black mb-1" />
          <p className="font-bold">{buyerName || "Comprador"}</p>
          <p className="text-xs">{buyerLabel}</p>
        </div>
        <div className="w-1/2 flex flex-col items-center">
          <div className="w-full border-t border-black mb-1" />
          <p className="font-bold">{storeName}</p>
          <p className="text-xs">{storeLabel}</p>
        </div>
      </div>
    </div>
  );
}
