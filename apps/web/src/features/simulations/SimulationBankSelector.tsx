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
      hint="Nada selecionado consulta todos os bancos ativos e autorizados pelo servidor para esta loja mapeada."
      label="Bancos (opcional)"
    >
      <div className="flex flex-wrap gap-2">
        {banks.map((bank) => (
          <label
            className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border border-line bg-app px-3 text-xs font-bold text-app-text"
            key={bank.code}
          >
            <input
              checked={bankCodes.includes(bank.code)}
              className="size-4"
              onChange={() => onToggleBank(bank.code)}
              type="checkbox"
            />
            {bank.name ?? bank.code}
          </label>
        ))}
      </div>
    </FeatureField>
  );
}
