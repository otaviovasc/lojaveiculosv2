import type { StoreData, VehicleData } from "./InventoryPrintTypes";

export function ReciboReservaPrint({
  buyer,
  vehicle,
  store,
  sinalAmount,
  notes,
  expiresAt,
  date,
}: {
  buyer: { name: string; document: string };
  vehicle: VehicleData;
  store: StoreData;
  sinalAmount: number;
  notes?: string | undefined;
  expiresAt?: string | undefined;
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
          Recibo de Sinal e Reserva de Veículo
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
          Recebemos de{" "}
          <span className="font-bold">{buyer.name || "COMPRADOR"}</span>,
          inscrito(a) sob o CPF/CNPJ n.{" "}
          {buyer.document || "______________________"}, a importância de{" "}
          <span className="font-bold text-base">
            {formatCurrency(sinalAmount)}
          </span>{" "}
          a título de{" "}
          <span className="font-bold">sinal e garantia de reserva</span> para a
          futura aquisição do veículo abaixo caracterizado:
        </p>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
          <h3 className="font-bold border-b border-gray-300 pb-1 uppercase text-xs text-gray-700">
            Descrição do Veículo
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

        <div className="space-y-3 text-xs text-justify pt-2">
          <h3 className="font-bold uppercase text-xs">Condições da Reserva:</h3>
          <p>
            1. O veículo permanecerá reservado e retirado de venda até a data
            limite de{" "}
            <span className="font-bold">
              {expiresAt || "__________________"}
            </span>
            , período em que o cliente deverá complementar o pagamento total ou
            providenciar o financiamento.
          </p>
          <p>
            2. Nos termos do artigo 420 do Código Civil, em caso de
            arrependimento ou desistência por parte do{" "}
            <span className="font-bold">COMPRADOR</span>, este perderá o valor
            total dado como sinal em favor da vendedora. Caso a desistência
            parta da <span className="font-bold">VENDEDORA</span>, esta deverá
            restituir o sinal em dobro.
          </p>
        </div>

        {notes && (
          <div className="bg-gray-50 p-3 rounded border text-xs">
            <span className="font-bold block mb-1">
              Observações Internas / Acordos Extras:
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
            <p className="text-[10px]">CLIENTE</p>
          </div>
          <div className="w-1/2 flex flex-col items-center">
            <div className="w-full border-t border-black mb-1" />
            <p className="font-bold">{storeName}</p>
            <p className="text-[10px]">VENDEDOR / REPRESENTANTE</p>
          </div>
        </div>
      </div>
    </div>
  );
}
