import type { StoreData, VehicleData } from "./InventoryPrintTypes";
import {
  formatPrintCurrency,
  getPrintStoreName,
  getPrintVehicleName,
  PrintReceiptHeader,
  PrintSignatureSection,
  PrintVehicleDescription,
} from "./InventoryPrintReceiptParts";

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
  const storeName = getPrintStoreName(store);
  const vehicleName = getPrintVehicleName(vehicle);

  return (
    <div className="space-y-6">
      <PrintReceiptHeader
        store={store}
        storeName={storeName}
        title="Recibo de Sinal e Reserva de Veículo"
      />

      <div className="text-sm space-y-4">
        <p className="text-justify leading-relaxed">
          Recebemos de{" "}
          <span className="font-bold">{buyer.name || "COMPRADOR"}</span>,
          inscrito(a) sob o CPF/CNPJ n.{" "}
          {buyer.document || "______________________"}, a importância de{" "}
          <span className="font-bold text-base">
            {formatPrintCurrency(sinalAmount)}
          </span>{" "}
          a título de{" "}
          <span className="font-bold">sinal e garantia de reserva</span> para a
          futura aquisição do veículo abaixo caracterizado:
        </p>

        <PrintVehicleDescription
          heading="Descrição do Veículo"
          vehicle={vehicle}
          vehicleName={vehicleName}
        />

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

      <PrintSignatureSection
        buyerLabel="CLIENTE"
        buyerName={buyer.name}
        date={date}
        store={store}
        storeLabel="VENDEDOR / REPRESENTANTE"
        storeName={storeName}
      />
    </div>
  );
}
