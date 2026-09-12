import {
  FeatureInput,
  FeatureSelect,
} from "../../components/ui/FeatureControls";
import {
  FeatureField,
  FeatureFieldGroup,
} from "../../components/ui/FeatureForms";
import { applyInputMask, formatBrazilianZipCode } from "../../lib/masks";
import type { SupportedApplicantField } from "./applicantPreflight";

export function SimulationApplicantProviderFields({
  domains,
  genderCode,
  genderInvalid,
  occupationCode,
  occupationInvalid,
  onGenderChange,
  onOccupationChange,
  onZipCodeChange,
  requiredFields,
  zipCode,
  zipCodeInvalid,
}: {
  domains: Record<string, { label: string; value: string }[]>;
  genderCode: string;
  genderInvalid: boolean;
  occupationCode: string;
  occupationInvalid: boolean;
  onGenderChange: (value: string) => void;
  onOccupationChange: (value: string) => void;
  onZipCodeChange: (value: string) => void;
  requiredFields: ReadonlySet<SupportedApplicantField>;
  zipCode: string;
  zipCodeInvalid: boolean;
}) {
  const needsGender = requiredFields.has("genderCode");
  const needsOccupation = requiredFields.has("occupationCode");
  const needsZipCode = requiredFields.has("zipCode");
  if (!needsGender && !needsOccupation && !needsZipCode) return null;

  return (
    <FeatureFieldGroup className="credere-form-fields">
      {needsGender ? (
        <FeatureField
          error={genderInvalid ? "Gênero é obrigatório" : undefined}
          label="Gênero"
        >
          <FeatureSelect
            ariaLabel="Gênero"
            className="credere-form-select"
            invalid={genderInvalid}
            onChange={onGenderChange}
            options={domains.gender ?? []}
            placeholder={
              domains.gender?.length
                ? "Selecione"
                : "Opções indisponíveis no Credere"
            }
            value={genderCode || undefined}
          />
        </FeatureField>
      ) : null}
      {needsOccupation ? (
        <FeatureField
          error={occupationInvalid ? "Ocupação é obrigatória" : undefined}
          label="Ocupação"
        >
          <FeatureSelect
            ariaLabel="Ocupação"
            className="credere-form-select"
            invalid={occupationInvalid}
            onChange={onOccupationChange}
            options={domains.occupation ?? []}
            placeholder={
              domains.occupation?.length
                ? "Selecione"
                : "Opções indisponíveis no Credere"
            }
            value={occupationCode || undefined}
          />
        </FeatureField>
      ) : null}
      {needsZipCode ? (
        <FeatureField
          error={zipCodeInvalid ? "CEP válido é obrigatório" : undefined}
          label="CEP residencial"
        >
          <FeatureInput
            autoComplete="postal-code"
            className="credere-form-input"
            data-invalid={zipCodeInvalid ? "true" : undefined}
            inputMode="numeric"
            onChange={(event) =>
              onZipCodeChange(
                applyInputMask(event.target, formatBrazilianZipCode),
              )
            }
            placeholder="00000-000"
            value={zipCode}
          />
        </FeatureField>
      ) : null}
    </FeatureFieldGroup>
  );
}
