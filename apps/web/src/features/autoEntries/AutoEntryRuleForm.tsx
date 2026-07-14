import {
  FeatureInput,
  FeatureSelect,
} from "../../components/ui/FeatureControls";
import {
  FeatureField,
  FeatureFieldGroup,
  FeatureFormSection,
} from "../../components/ui/FeatureForms";
import type { SaleSellerOption } from "../sales/saleContextOptions";
import {
  autoEntryEventOptions,
  autoEntryOutputOptions,
  basisForEvent,
} from "./model";
import {
  AutoEntryCalculationSection,
  AutoEntryExecutionSection,
} from "./AutoEntryRuleFormSections";
import type { AutoEntryDraftErrors, AutoEntryRuleDraft } from "./types";

export function AutoEntryRuleForm({
  draft,
  errors,
  onChange,
  sellers,
}: {
  draft: AutoEntryRuleDraft;
  errors: AutoEntryDraftErrors;
  onChange: (patch: Partial<AutoEntryRuleDraft>) => void;
  sellers: readonly SaleSellerOption[];
}) {
  const outputOptions = autoEntryOutputOptions.map((option) => ({
    ...option,
    disabled:
      draft.event === "vehicle_sale_closed" && option.value !== "commission",
  }));

  return (
    <div className="grid gap-6">
      <FeatureFormSection
        description="O evento define a origem auditável que pode disparar esta regra."
        title="Identificação"
      >
        <FeatureFieldGroup>
          <FeatureField error={errors.name} label="Nome da regra">
            <FeatureInput
              aria-invalid={Boolean(errors.name)}
              autoFocus
              maxLength={191}
              onChange={(event) => onChange({ name: event.target.value })}
              placeholder="Ex.: Comissão do vendedor"
              value={draft.name}
            />
          </FeatureField>
          <FeatureField label="Evento de origem">
            <FeatureSelect
              ariaLabel="Evento de origem"
              onChange={(event) =>
                onChange({
                  category:
                    event === "vehicle_sale_closed" && !draft.category.trim()
                      ? "Comissão de venda"
                      : draft.category,
                  calculationBasis: basisForEvent(event),
                  event,
                  outputType:
                    event === "vehicle_sale_closed"
                      ? "commission"
                      : draft.outputType,
                })
              }
              options={autoEntryEventOptions}
              value={draft.event}
            />
          </FeatureField>
        </FeatureFieldGroup>
        <div className="mt-3">
          <FeatureFieldGroup>
            <FeatureField error={errors.outputType} label="Tipo de lançamento">
              <FeatureSelect
                ariaLabel="Tipo de lançamento"
                onChange={(outputType) => onChange({ outputType })}
                options={outputOptions}
                value={draft.outputType}
              />
            </FeatureField>
            <FeatureField error={errors.category} label="Categoria">
              <FeatureInput
                aria-invalid={Boolean(errors.category)}
                maxLength={120}
                onChange={(event) => onChange({ category: event.target.value })}
                placeholder="Ex.: Comissão de venda"
                value={draft.category}
              />
            </FeatureField>
          </FeatureFieldGroup>
        </div>
      </FeatureFormSection>

      <AutoEntryCalculationSection
        draft={draft}
        errors={errors}
        onChange={onChange}
      />
      <AutoEntryExecutionSection
        draft={draft}
        errors={errors}
        onChange={onChange}
        sellers={sellers}
      />
    </div>
  );
}
