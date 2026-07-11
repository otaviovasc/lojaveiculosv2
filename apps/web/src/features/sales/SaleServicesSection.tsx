import { useState } from "react";
import { Banknote } from "lucide-react";
import { FeatureSelect } from "../../components/ui/FeatureControls";
import { SaleField, SaleFormSection } from "./SaleWorkspaceForm";
import { SaleServicesPaymentsSection } from "./SaleServicesPaymentsSection";
import { SaleServicesTabs } from "./SaleServicesTabs";
import { formatCents, parseCurrency } from "./saleServicesFormat";
import { saleSourceOptions } from "./salesModel";
import { asSnapshotRecord } from "./salesSnapshot";
import type {
  ActiveServiceTab,
  ServiceChangeHandler,
  UpdateSale,
} from "./SaleServicesTypes";
import type { SaleRecord } from "./types";

export function ServicesSection({
  sale,
  update,
}: {
  sale: SaleRecord;
  update: UpdateSale;
}) {
  const [activeTab, setActiveTab] = useState<ActiveServiceTab>("financing");

  const insurance = asSnapshotRecord(sale.saleSourceSnapshot.insurance);
  const financing = asSnapshotRecord(sale.saleSourceSnapshot.financing);
  const commission = asSnapshotRecord(sale.saleSourceSnapshot.commission);
  const tradeIn = asSnapshotRecord(sale.saleSourceSnapshot.tradeIn);

  const handleServiceChange: ServiceChangeHandler = (
    serviceKey,
    field,
    value,
  ) => {
    update((draft) => {
      const currentService = asSnapshotRecord(
        draft.saleSourceSnapshot[serviceKey],
      );
      return {
        ...draft,
        saleSourceSnapshot: {
          ...draft.saleSourceSnapshot,
          [serviceKey]: {
            ...currentService,
            [field]: value,
          },
        },
      };
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <SaleFormSection
        icon={<Banknote className="size-4.5 text-accent" />}
        title="1. Preço e Origem Comercial"
      >
        <SaleField label="Preço da Venda">
          <input
            className="sales-input text-lg font-black text-accent-strong"
            inputMode="numeric"
            onChange={(event) =>
              update((draft) => ({
                ...draft,
                salePriceCents: parseCurrency(event.target.value),
              }))
            }
            placeholder="R$ 0,00"
            value={sale.salePriceCents ? formatCents(sale.salePriceCents) : ""}
          />
        </SaleField>

        <SaleField label="Origem Comercial">
          <FeatureSelect
            ariaLabel="Origem comercial"
            className="sales-input"
            onChange={(source) =>
              update((draft) => ({
                ...draft,
                saleSourceSnapshot: {
                  ...draft.saleSourceSnapshot,
                  source,
                },
              }))
            }
            options={saleSourceOptions}
            value={String(sale.saleSourceSnapshot.source ?? "lead")}
          />
        </SaleField>
      </SaleFormSection>

      <SaleServicesPaymentsSection sale={sale} update={update} />

      <SaleServicesTabs
        activeTab={activeTab}
        commission={commission}
        financing={financing}
        insurance={insurance}
        onChange={handleServiceChange}
        onTabChange={setActiveTab}
        sale={sale}
        tradeIn={tradeIn}
      />
    </div>
  );
}
