import type { DriverData, StoreData, VehicleData } from "./InventoryPrintTypes";
import {
  formatPrintCurrency,
  getPrintStoreName,
  getPrintVehicleName,
  PrintReceiptHeader,
  PrintSignatureSection,
  PrintVehicleDescription,
} from "./InventoryPrintReceiptParts";

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
  const storeName = getPrintStoreName(store);
  const vehicleName = getPrintVehicleName(vehicle);

  return (
    <div className="space-y-6">
      <PrintReceiptHeader
        store={store}
        storeName={storeName}
        title="Recibo de Venda de Veículo"
      />

      <div className="text-sm space-y-4">
        <p className="text-justify leading-relaxed">
          Declaramos para os devidos fins que vendemos para{" "}
          <span className="font-bold">{buyer.name || "COMPRADOR"}</span>,
          inscrito(a) no CPF/CNPJ sob o n.{" "}
          {buyer.cpf || "______________________"}, residente no endereço{" "}
          {buyer.address || "______________________"}, o veículo abaixo descrito
          pela importância de{" "}
          <span className="font-bold text-base">
            {formatPrintCurrency(salePrice)}
          </span>
          .
        </p>

        <PrintVehicleDescription
          heading="Dados do Veículo Vendido"
          vehicle={vehicle}
          vehicleName={vehicleName}
        />

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2 text-xs">
          <h3 className="font-bold border-b border-gray-300 pb-1 uppercase text-xs text-gray-700">
            Forma de Pagamento e Quitação
          </h3>
          <p>
            <span className="font-bold">Método:</span>{" "}
            {paymentMethod || "À Vista / Conforme Acordo"}
          </p>
          <p>
            <span className="font-bold">Valor Total:</span>{" "}
            {formatPrintCurrency(salePrice)}
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

      <PrintSignatureSection
        buyerLabel="COMPRADOR (CLIENTE)"
        buyerName={buyer.name}
        date={date}
        store={store}
        storeLabel="VENDEDOR (LOJA)"
        storeName={storeName}
      />
    </div>
  );
}
