import { FeatureSelect } from "../../components/ui/FeatureControls";
import { FeatureField } from "../../components/ui/FeatureForms";
import {
  BRAZILIAN_STATES,
  getCitiesByStateCode,
} from "../../lib/data/brazilian-states-cities";

const EMPTY_STATE_OPTION = {
  disabled: true,
  label: "Selecione o estado",
  value: "",
} as const;

export function SettingsStateCityFields({
  city,
  onCityChange,
  onStateChange,
  state,
}: {
  city: string;
  onCityChange: (city: string) => void;
  onStateChange: (state: string) => void;
  state: string;
}) {
  const cities = getCitiesByStateCode(state);
  const stateOptions = [
    EMPTY_STATE_OPTION,
    ...BRAZILIAN_STATES.map((item) => ({
      label: `${item.name} (${item.code})`,
      searchText: `${item.name} ${item.code}`,
      value: item.code,
    })),
  ];
  const cityOptions = [
    {
      disabled: true,
      label: state ? "Selecione a cidade" : "Selecione o estado primeiro",
      value: "",
    },
    ...cities.map((item) => ({ label: item, value: item })),
  ];

  if (city && !cities.includes(city)) {
    cityOptions.push({ label: city, value: city });
  }

  return (
    <>
      <FeatureField className="settings-profile-field" label="UF">
        <FeatureSelect
          ariaLabel="UF"
          className="settings-profile-input"
          emptyMessage="Nenhum estado encontrado"
          onChange={(nextState) => {
            onStateChange(nextState);
            if (!getCitiesByStateCode(nextState).includes(city)) {
              onCityChange("");
            }
          }}
          options={stateOptions}
          placeholder="Selecione o estado"
          searchable
          searchPlaceholder="Buscar estado ou UF..."
          value={state}
        />
      </FeatureField>

      <FeatureField
        className="settings-profile-field md:col-span-2"
        label="Cidade"
      >
        <FeatureSelect
          ariaLabel="Cidade"
          className="settings-profile-input"
          disabled={!state}
          emptyMessage="Nenhuma cidade encontrada"
          onChange={onCityChange}
          options={cityOptions}
          placeholder={
            state ? "Selecione a cidade" : "Selecione o estado primeiro"
          }
          searchable
          searchPlaceholder="Buscar cidade..."
          value={city}
        />
      </FeatureField>
    </>
  );
}
