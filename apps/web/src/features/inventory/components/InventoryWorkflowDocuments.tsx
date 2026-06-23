import { Printer } from "lucide-react";
import type { InventoryListingDetail } from "../model/types";
import {
  paymentMethods,
  type WorkflowForm,
} from "./InventoryWorkflowFormModel";
import {
  ContratoCompraVendaPrint,
  PrintWrapper,
  ReciboReservaPrint,
  ReciboVendaPrint,
} from "./InventoryPrintTemplates";
import {
  storeDataFromSettings,
  type InventoryStoreSettings,
} from "./InventoryPrintTypes";

export type WorkflowPrintKind = "reserva" | "venda" | "contrato";

export function InventoryWorkflowPrintActions({
  status,
  onPrint,
}: {
  status: InventoryListingDetail["listing"]["status"];
  onPrint: (kind: WorkflowPrintKind) => void;
}) {
  if (status !== "reserved" && status !== "sold") return null;

  return (
    <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-line">
      <span className="text-xs font-black text-app-text">
        Documentos & Contratos Disponíveis
      </span>
      <div className="flex flex-wrap gap-2">
        {status === "reserved" && (
          <PrintButton
            colorClass="text-warning"
            label="Imprimir Recibo de Reserva"
            onClick={() => onPrint("reserva")}
          />
        )}
        {status === "sold" && (
          <>
            <PrintButton
              colorClass="text-blue-500"
              label="Imprimir Recibo de Venda"
              onClick={() => onPrint("venda")}
            />
            <PrintButton
              colorClass="text-accent-strong"
              label="Imprimir Contrato"
              onClick={() => onPrint("contrato")}
            />
          </>
        )}
      </div>
    </div>
  );
}

export function InventoryWorkflowPrintPreview({
  activePrint,
  detail,
  form,
  onClose,
  primaryUnit,
  storeSettings,
}: {
  activePrint: WorkflowPrintKind;
  detail: InventoryListingDetail;
  form: WorkflowForm;
  onClose: () => void;
  primaryUnit: InventoryListingDetail["units"][number] | null;
  storeSettings: InventoryStoreSettings;
}) {
  const salePrice =
    parseWorkflowMoney(form.salePrice) ||
    (detail.listing.priceCents ? detail.listing.priceCents / 100 : 0);
  const signalAmount = parseWorkflowMoney(form.signalAmount) || 0;
  const paymentMethod =
    paymentMethods.find((method) => method[0] === form.paymentMethod)?.[1] ||
    "À Vista";
  const date = new Date().toLocaleDateString("pt-BR");

  return (
    <PrintWrapper title={printTitle(activePrint)} onClose={onClose}>
      {activePrint === "reserva" ? (
        <ReciboReservaPrint
          buyer={{
            name: form.buyerName || "Cliente",
            document: form.buyerDocument || "_____________________",
          }}
          sinalAmount={signalAmount}
          expiresAt={new Date(
            Date.now() + 5 * 24 * 60 * 60 * 1000,
          ).toLocaleDateString("pt-BR")}
          notes={form.reason || undefined}
          date={date}
          vehicle={vehiclePrintData(detail, primaryUnit)}
          store={storeDataFromSettings(storeSettings)}
        />
      ) : activePrint === "venda" ? (
        <ReciboVendaPrint
          buyer={buyerPrintData(form)}
          salePrice={salePrice}
          paymentMethod={paymentMethod}
          notes={form.reason || undefined}
          date={date}
          vehicle={vehiclePrintData(detail, primaryUnit)}
          store={storeDataFromSettings(storeSettings)}
        />
      ) : (
        <ContratoCompraVendaPrint
          buyer={buyerPrintData(form)}
          salePrice={salePrice}
          paymentMethod={paymentMethod}
          date={date}
          vehicle={vehiclePrintData(detail, primaryUnit)}
          store={storeDataFromSettings(storeSettings)}
        />
      )}
    </PrintWrapper>
  );
}

function PrintButton({
  colorClass,
  label,
  onClick,
}: {
  colorClass: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-app-elevated border border-line px-4 text-xs font-black text-app-text hover:bg-line/25 cursor-pointer"
    >
      <Printer className={`size-4 ${colorClass}`} />
      {label}
    </button>
  );
}

function buyerPrintData(form: WorkflowForm) {
  return {
    name: form.buyerName || "Cliente",
    cpf: form.buyerDocument || "_____________________",
    phone: form.buyerPhone || "_____________________",
    email: form.buyerEmail || "_____________________",
    address: form.buyerAddress || "_____________________",
  };
}

function vehiclePrintData(
  detail: InventoryListingDetail,
  primaryUnit: InventoryListingDetail["units"][number] | null,
) {
  return {
    title: detail.listing.title,
    brand: detail.listing.catalog?.brandName || "",
    model: detail.listing.catalog?.modelName || "",
    version: detail.listing.trimName || "",
    yearFabrication: detail.listing.manufactureYear || "",
    yearModel: detail.listing.modelYear || "",
    plate: detail.listing.plate || primaryUnit?.plate || "",
    chassi: primaryUnit?.vin || "",
    color: "",
  };
}

function parseWorkflowMoney(value: string) {
  return parseFloat(value.replace(/\./g, "").replace(",", "."));
}

function printTitle(kind: WorkflowPrintKind) {
  if (kind === "reserva") return "Recibo de Sinal e Reserva";
  if (kind === "venda") return "Recibo de Venda";
  return "Contrato de Compra e Venda";
}
