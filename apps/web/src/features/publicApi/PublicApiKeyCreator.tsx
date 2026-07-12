import { Check, Copy, KeyRound, Plus, ShieldCheck } from "lucide-react";
import { FeatureSection } from "../../components/ui/FeatureLayout";
import {
  scopeOptions,
  scopePresets,
  type PublicApiScopePreset,
} from "./publicApiCatalog";
import type { PublicApiScope, PublicApiStatus } from "./types";

export function PublicApiKeyCreator({
  copiedId,
  createdKey,
  name,
  onCopy,
  onCreate,
  onNameChange,
  onScopesChange,
  scopes,
  status,
}: {
  copiedId: string | null;
  createdKey: string | null;
  name: string;
  onCopy: (value: string, id: string) => Promise<void>;
  onCreate: () => void;
  onNameChange: (value: string) => void;
  onScopesChange: (scopes: PublicApiScope[]) => void;
  scopes: PublicApiScope[];
  status: PublicApiStatus;
}) {
  return (
    <FeatureSection
      className="internal-panel public-api-panel"
      description="Crie chaves por caso de uso. A chave completa aparece uma unica vez."
      headerClassName="internal-panel-title"
      icon={<ShieldCheck aria-hidden="true" className="size-5" />}
      title="Nova chave"
    >
      <div className="public-api-presets">
        {scopePresets.map((preset) => (
          <button
            aria-pressed={scopesEqual(scopes, preset.scopes)}
            className={scopesEqual(scopes, preset.scopes) ? "is-active" : ""}
            key={preset.name}
            onClick={() => applyPreset(preset, onNameChange, onScopesChange)}
            type="button"
          >
            <preset.icon aria-hidden="true" className="size-4" />
            <span>{preset.label}</span>
            <small>{preset.description}</small>
          </button>
        ))}
      </div>

      <label className="internal-field">
        <span>Nome do cliente</span>
        <input
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
        />
      </label>

      <div
        aria-label="Escopos disponíveis para a nova chave"
        className="public-api-scopes"
        role="group"
      >
        {scopeOptions.map((option) => (
          <label className="internal-check" key={option.scope}>
            <input
              checked={scopes.includes(option.scope)}
              onChange={() => onScopesChange(toggleScope(scopes, option.scope))}
              type="checkbox"
            />
            <span>
              <strong>{option.label}</strong>
              <small>{option.description}</small>
            </span>
          </label>
        ))}
      </div>

      <button
        className="internal-primary"
        disabled={
          !name.trim() ||
          scopes.length === 0 ||
          status.kind === "loading" ||
          status.kind === "saving"
        }
        onClick={onCreate}
        type="button"
      >
        <Plus aria-hidden="true" className="size-4" />
        Criar chave
      </button>

      {createdKey ? (
        <div className="internal-secret public-api-secret">
          <KeyRound aria-hidden="true" className="size-4" />
          <div>
            <small>
              Copie agora. O valor completo nao sera exibido novamente.
            </small>
            <code>{createdKey}</code>
          </div>
          <button
            aria-label={
              copiedId === "created-key"
                ? "Chave copiada"
                : "Copiar nova chave da API"
            }
            className="internal-icon-action"
            onClick={() => void onCopy(createdKey, "created-key")}
            title="Copiar chave"
            type="button"
          >
            {copiedId === "created-key" ? (
              <Check aria-hidden="true" className="size-4" />
            ) : (
              <Copy aria-hidden="true" className="size-4" />
            )}
          </button>
        </div>
      ) : null}
    </FeatureSection>
  );
}

function applyPreset(
  preset: PublicApiScopePreset,
  onNameChange: (value: string) => void,
  onScopesChange: (scopes: PublicApiScope[]) => void,
) {
  onNameChange(preset.label);
  onScopesChange([...preset.scopes]);
}

function toggleScope(scopes: PublicApiScope[], scope: PublicApiScope) {
  return scopes.includes(scope)
    ? scopes.filter((item) => item !== scope)
    : [...scopes, scope].sort();
}

function scopesEqual(left: PublicApiScope[], right: PublicApiScope[]) {
  return (
    left.length === right.length && left.every((scope) => right.includes(scope))
  );
}
