import { Check } from "lucide-react";
import { FeatureField } from "../../components/ui/FeatureForms";
import type { CredereUsableBank } from "./types";

export function SimulationBankSelector({
  bankCodes,
  banks,
  onToggleBank,
}: {
  bankCodes: readonly string[];
  banks: readonly CredereUsableBank[];
  onToggleBank: (code: string) => void;
}) {
  if (!banks.length) return null;
  return (
    <FeatureField
      as="div"
      className="credere-form-banks-field"
      hint="Todas começam selecionadas. Desmarque as que não devem receber a consulta; ao menos uma instituição é obrigatória."
      label="Bancos"
    >
      <div className="credere-form-banks">
        {banks.map((bank) => {
          const checked = bankCodes.includes(bank.code);
          return (
            <label
              className="credere-form-bank"
              data-checked={checked || undefined}
              key={bank.code}
            >
              <input
                checked={checked}
                className="credere-form-bank-input"
                onChange={() => onToggleBank(bank.code)}
                type="checkbox"
              />
              <span aria-hidden="true" className="credere-form-bank-check">
                <Check />
              </span>
              <span className="credere-form-bank-name">
                {bank.name ?? bank.code}
              </span>
            </label>
          );
        })}
      </div>
    </FeatureField>
  );
}
