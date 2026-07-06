import {
  ContratoCompraVendaPrint,
  PrintWrapper,
  ReciboReservaPrint,
  ReciboVendaPrint,
} from "./InventoryPrintTemplates";
import { contractTemplates } from "./DocumentosContratosModel";
import type { ContractPreviewData } from "./DocumentosContratosData";

export function DocumentosContratosPreview({
  data,
  onClose,
}: {
  data: ContractPreviewData;
  onClose: () => void;
}) {
  const title =
    contractTemplates.find((template) => template.id === data.templateId)
      ?.name ?? "Contrato";

  return (
    <PrintWrapper title={title} onClose={onClose}>
      {data.templateId === "reservation_receipt" ? (
        <ReciboReservaPrint
          buyer={{ name: data.buyer.name, document: data.buyer.cpf }}
          date={data.date}
          expiresAt={data.expiresAt}
          notes={data.notes}
          sinalAmount={data.signalAmount}
          store={data.store}
          vehicle={data.vehicle}
        />
      ) : data.templateId === "sale_receipt" ? (
        <ReciboVendaPrint
          buyer={data.buyer}
          date={data.date}
          notes={data.notes}
          paymentMethod={data.paymentMethod}
          salePrice={data.salePrice}
          store={data.store}
          vehicle={data.vehicle}
        />
      ) : (
        <ContratoCompraVendaPrint
          buyer={data.buyer}
          date={data.date}
          paymentMethod={data.paymentMethod}
          salePrice={data.salePrice}
          store={data.store}
          vehicle={data.vehicle}
        />
      )}
    </PrintWrapper>
  );
}
