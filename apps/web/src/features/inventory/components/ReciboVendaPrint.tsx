import type { DriverData, StoreData, VehicleData } from "./InventoryPrintTypes";

export function ReciboVendaPrint({
  buyer,
  vehicle,
  store,
  salePrice,
  notes,
  paymentMethod,
  date,
}: {
  buyer: DriverData;
  vehicle: VehicleData;
  store: StoreData;
  salePrice: number;
  notes?: string | undefined;
  paymentMethod?: string | undefined;
  date: string;
}) {
  const storeName = store.nome || "LOJA DE VEÍCULOS";
  const vehicleName = [vehicle.brand, vehicle.model, vehicle.version]
    .filter(Boolean)
    .join(" ");

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center border-b border-black pb-4 text-center">
        {store.logoUrl ? (
          <img
            src={store.logoUrl}
            alt={storeName}
            className="max-h-16 object-contain mb-3"
          />
        ) : null}
        <h1 className="text-xl font-bold uppercase tracking-wide">
          Recibo de Venda de Veículo
        </h1>
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

      <div className="text-sm space-y-4">
        <p className="text-justify leading-relaxed">
          Declaramos para os devidos fins que vendemos para{" "}
          <span className="font-bold">{buyer.name || "COMPRADOR"}</span>,
          inscrito(a) no CPF/CNPJ sob o n.{" "}
          {buyer.cpf || "______________________"}, residente no endereço{" "}
          {buyer.address || "______________________"}, o veículo abaixo descrito
          pela importância de{" "}
          <span className="font-bold text-base">
            {formatCurrency(salePrice)}
          </span>
          .
        </p>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
          <h3 className="font-bold border-b border-gray-300 pb-1 uppercase text-xs text-gray-700">
            Dados do Veículo Vendido
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
              <span className="font-bold">Chassi:</span>{" "}
              {vehicle.chassi || "N/A"}
            </p>
            <p>
              <span className="font-bold">Cor:</span> {vehicle.color || "N/A"}
            </p>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2 text-xs">
          <h3 className="font-bold border-b border-gray-300 pb-1 uppercase text-[10px] text-gray-700">
            Forma de Pagamento e Quitação
          </h3>
          <p>
            <span className="font-bold">Método:</span>{" "}
            {paymentMethod || "À Vista / Conforme Acordo"}
          </p>
          <p>
            <span className="font-bold">Valor Total:</span>{" "}
            {formatCurrency(salePrice)}
          </p>
        </div>

        <div className="space-y-2 text-xs text-justify pt-2">
          <p>
            O comprador declara receber o veículo nas condições mecânicas e de
            lataria em que se encontra, após vistoria e test-drive prévios.
          </p>
          <p>
            A transferência de propriedade do veículo deverá ser realizada
            perante o órgão de trânsito (DETRAN) no prazo legal de 30 (trinta)
            dias a contar desta data, sob pena de responsabilidade por multas e
            pontuação.
          </p>
        </div>

        {notes && (
          <div className="bg-gray-50 p-3 rounded border text-xs">
            <span className="font-bold block mb-1">
              Garantia / Observações extras:
            </span>
            <p className="italic">{notes}</p>
          </div>
        )}
      </div>

      <div className="pt-12 text-center text-xs space-y-8">
        <p>
          {store.cidade || "Cidade"}, {date}
        </p>
        <div className="flex justify-around gap-12 pt-4">
          <div className="w-1/2 flex flex-col items-center">
            <div className="w-full border-t border-black mb-1" />
            <p className="font-bold">{buyer.name || "Comprador"}</p>
            <p className="text-[10px]">COMPRADOR (CLIENTE)</p>
          </div>
          <div className="w-1/2 flex flex-col items-center">
            <div className="w-full border-t border-black mb-1" />
            <p className="font-bold">{storeName}</p>
            <p className="text-[10px]">VENDEDOR (LOJA)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
