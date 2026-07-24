import { Car } from "lucide-react";
import {
  FeatureInput,
  FeatureSelect,
} from "../../components/ui/FeatureControls";
import {
  FeatureField,
  FeatureFieldGroup,
  FeatureFormSection,
} from "../../components/ui/FeatureForms";
import type { IssueFiscalTaxForm } from "./fiscalIssueModel";
import type { VehicleNfeVehicle } from "./types";

const fuelTypeOptions = [
  { label: "Combustível", value: "" },
  { label: "Gasolina", value: "gasolina" },
  { label: "Etanol", value: "etanol" },
  { label: "Flex", value: "flex" },
  { label: "Diesel", value: "diesel" },
  { label: "GNV", value: "gnv" },
  { label: "Híbrido", value: "hibrido" },
  { label: "Elétrico", value: "eletrico" },
];

const conditionOptions = [
  { label: "Usado", value: "used" },
  { label: "Novo", value: "new" },
];

const originOptions = [
  { label: "0 - Nacional", value: "0" },
  { label: "1 - Estrangeira (importação direta)", value: "1" },
  { label: "2 - Estrangeira (mercado interno)", value: "2" },
  { label: "3 - Nacional (+40% importado)", value: "3" },
  { label: "4 - Nacional (processos básicos)", value: "4" },
  { label: "5 - Nacional (≤40% importado)", value: "5" },
  { label: "6 - Estrangeira (sem similar)", value: "6" },
  { label: "7 - Estrangeira (mercado interno, sem similar)", value: "7" },
  { label: "8 - Nacional (+70% importado)", value: "8" },
];

export function FiscalVehicleFields({
  errors = {},
  fiscal,
  onFiscalChange,
  onVehicleChange,
  vehicle,
}: {
  errors?: Record<string, string>;
  fiscal: IssueFiscalTaxForm;
  onFiscalChange: (patch: Partial<IssueFiscalTaxForm>) => void;
  onVehicleChange: (patch: Partial<VehicleNfeVehicle>) => void;
  vehicle: VehicleNfeVehicle;
}) {
  return (
    <>
      <FeatureFormSection
        description="Dados do veículo enviados ao provedor fiscal no grupo específico de veículo da NF-e."
        title={
          <span className="inline-flex items-center gap-1.5">
            <Car aria-hidden="true" className="size-4" />
            Veículo da nota
          </span>
        }
      >
        <FeatureFieldGroup>
          <FeatureField error={errors.vehicle} label="Código do veículo">
            <FeatureInput
              aria-label="Código do veículo"
              onChange={(event) => onVehicleChange({ id: event.target.value })}
              placeholder="Estoque ou anúncio"
              value={vehicle.id ?? ""}
            />
          </FeatureField>
          <FeatureField label="Marca">
            <FeatureInput
              aria-label="Marca do veículo"
              onChange={(event) =>
                onVehicleChange({ brand: event.target.value })
              }
              value={vehicle.brand ?? ""}
            />
          </FeatureField>
          <FeatureField label="Modelo">
            <FeatureInput
              aria-label="Modelo do veículo"
              onChange={(event) =>
                onVehicleChange({ model: event.target.value })
              }
              value={vehicle.model ?? ""}
            />
          </FeatureField>
          <FeatureField label="Versão">
            <FeatureInput
              aria-label="Versão do veículo"
              onChange={(event) =>
                onVehicleChange({ version: event.target.value })
              }
              value={vehicle.version ?? ""}
            />
          </FeatureField>
          <FeatureField label="Chassi">
            <FeatureInput
              aria-label="Chassi"
              maxLength={17}
              onChange={(event) =>
                onVehicleChange({ chassis: event.target.value.toUpperCase() })
              }
              value={vehicle.chassis ?? ""}
            />
          </FeatureField>
          <FeatureField label="Placa">
            <FeatureInput
              aria-label="Placa"
              maxLength={8}
              onChange={(event) =>
                onVehicleChange({ plate: event.target.value.toUpperCase() })
              }
              value={vehicle.plate ?? ""}
            />
          </FeatureField>
          <FeatureField
            hint="O estoque V2 ainda não guarda o Renavam; confira antes de emitir."
            label="Renavam"
          >
            <FeatureInput
              aria-label="Renavam"
              inputMode="numeric"
              onChange={(event) =>
                onVehicleChange({
                  renavam: event.target.value.replace(/\D/g, ""),
                })
              }
              value={vehicle.renavam ?? ""}
            />
          </FeatureField>
          <FeatureField label="Cor">
            <FeatureInput
              aria-label="Cor do veículo"
              onChange={(event) =>
                onVehicleChange({ color: event.target.value })
              }
              value={vehicle.color ?? ""}
            />
          </FeatureField>
          <FeatureField label="Combustível">
            <FeatureSelect
              ariaLabel="Combustível"
              onChange={(value) => onVehicleChange({ fuelType: value })}
              options={fuelTypeOptions}
              value={vehicle.fuelType ?? ""}
            />
          </FeatureField>
          <FeatureField label="Número do motor">
            <FeatureInput
              aria-label="Número do motor"
              onChange={(event) =>
                onVehicleChange({ engineNumber: event.target.value })
              }
              value={vehicle.engineNumber ?? ""}
            />
          </FeatureField>
          <FeatureField label="Potência (cv)">
            <FeatureInput
              aria-label="Potência"
              onChange={(event) =>
                onVehicleChange({ power: event.target.value })
              }
              value={vehicle.power ?? ""}
            />
          </FeatureField>
          <FeatureField label="Cilindrada">
            <FeatureInput
              aria-label="Cilindrada"
              onChange={(event) =>
                onVehicleChange({ cylinderCapacity: event.target.value })
              }
              value={vehicle.cylinderCapacity ?? ""}
            />
          </FeatureField>
          <FeatureField label="Peso líquido (kg)">
            <FeatureInput
              aria-label="Peso líquido"
              inputMode="numeric"
              onChange={(event) =>
                onVehicleChange({ netWeight: event.target.value })
              }
              value={String(vehicle.netWeight ?? "")}
            />
          </FeatureField>
          <FeatureField label="Peso bruto (kg)">
            <FeatureInput
              aria-label="Peso bruto"
              inputMode="numeric"
              onChange={(event) =>
                onVehicleChange({ grossWeight: event.target.value })
              }
              value={String(vehicle.grossWeight ?? "")}
            />
          </FeatureField>
          <FeatureField label="Ano modelo">
            <FeatureInput
              aria-label="Ano modelo"
              inputMode="numeric"
              maxLength={4}
              onChange={(event) =>
                onVehicleChange({
                  modelYear: event.target.value.replace(/\D/g, ""),
                })
              }
              value={String(vehicle.modelYear ?? "")}
            />
          </FeatureField>
          <FeatureField label="Ano fabricação">
            <FeatureInput
              aria-label="Ano fabricação"
              inputMode="numeric"
              maxLength={4}
              onChange={(event) =>
                onVehicleChange({
                  manufactureYear: event.target.value.replace(/\D/g, ""),
                })
              }
              value={String(vehicle.manufactureYear ?? "")}
            />
          </FeatureField>
          <FeatureField label="Condição">
            <FeatureSelect
              ariaLabel="Condição do veículo"
              onChange={(value) => onVehicleChange({ condition: value })}
              options={conditionOptions}
              value={vehicle.condition ?? "used"}
            />
          </FeatureField>
          <FeatureField label="Hodômetro (km)">
            <FeatureInput
              aria-label="Hodômetro"
              inputMode="numeric"
              onChange={(event) =>
                onVehicleChange({
                  odometer: event.target.value.replace(/\D/g, ""),
                })
              }
              value={String(vehicle.odometer ?? "")}
            />
          </FeatureField>
        </FeatureFieldGroup>
      </FeatureFormSection>

      <FeatureFormSection
        description="Tributos do item principal da nota. O CST ou o CSOSN é obrigatório conforme o regime da loja."
        title="Tributação do veículo"
      >
        <FeatureFieldGroup>
          <FeatureField label="CFOP">
            <FeatureInput
              aria-label="CFOP"
              inputMode="numeric"
              maxLength={4}
              onChange={(event) =>
                onFiscalChange({ cfop: event.target.value.replace(/\D/g, "") })
              }
              value={fiscal.cfop}
            />
          </FeatureField>
          <FeatureField label="NCM">
            <FeatureInput
              aria-label="NCM"
              inputMode="numeric"
              maxLength={8}
              onChange={(event) =>
                onFiscalChange({ ncm: event.target.value.replace(/\D/g, "") })
              }
              value={fiscal.ncm}
            />
          </FeatureField>
          <FeatureField label="Origem da mercadoria">
            <FeatureSelect
              ariaLabel="Origem da mercadoria"
              onChange={(value) => onFiscalChange({ origin: value })}
              options={originOptions}
              value={fiscal.origin}
            />
          </FeatureField>
          <FeatureField label="CST (ICMS)">
            <FeatureInput
              aria-label="CST"
              inputMode="numeric"
              maxLength={3}
              onChange={(event) =>
                onFiscalChange({ cst: event.target.value.replace(/\D/g, "") })
              }
              placeholder="Deixe vazio se usar CSOSN"
              value={fiscal.cst}
            />
          </FeatureField>
          <FeatureField label="CSOSN (Simples Nacional)">
            <FeatureInput
              aria-label="CSOSN"
              inputMode="numeric"
              maxLength={3}
              onChange={(event) =>
                onFiscalChange({ csosn: event.target.value.replace(/\D/g, "") })
              }
              value={fiscal.csosn}
            />
          </FeatureField>
          <FeatureField label="ICMS (%)">
            <FeatureInput
              aria-label="Alíquota de ICMS"
              inputMode="decimal"
              onChange={(event) =>
                onFiscalChange({ icmsRate: event.target.value })
              }
              value={fiscal.icmsRate}
            />
          </FeatureField>
          <FeatureField label="IPI (%)">
            <FeatureInput
              aria-label="Alíquota de IPI"
              inputMode="decimal"
              onChange={(event) =>
                onFiscalChange({ ipiRate: event.target.value })
              }
              value={fiscal.ipiRate}
            />
          </FeatureField>
          <FeatureField label="PIS (%)">
            <FeatureInput
              aria-label="Alíquota de PIS"
              inputMode="decimal"
              onChange={(event) =>
                onFiscalChange({ pisRate: event.target.value })
              }
              value={fiscal.pisRate}
            />
          </FeatureField>
          <FeatureField label="COFINS (%)">
            <FeatureInput
              aria-label="Alíquota de COFINS"
              inputMode="decimal"
              onChange={(event) =>
                onFiscalChange({ cofinsRate: event.target.value })
              }
              value={fiscal.cofinsRate}
            />
          </FeatureField>
        </FeatureFieldGroup>
      </FeatureFormSection>
    </>
  );
}
