import { Check, Copy, KeyRound, Plus, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { FeatureField } from "../../components/ui/FeatureForms";
import {
  FeatureInput,
  FeatureSegmentedControl,
} from "../../components/ui/FeatureControls";
import {
  FeatureActionButton,
  FeatureSection,
} from "../../components/ui/FeatureLayout";
import { FeatureRowAction } from "../../components/ui/FeatureTable";
import {
  scopeGroups,
  scopePresets,
  type PublicApiScopeGroup,
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
  const [activeGroup, setActiveGroup] =
    useState<PublicApiScopeGroup["label"]>("Inventário");
  const selectedGroup =
    scopeGroups.find((group) => group.label === activeGroup) ?? scopeGroups[0]!;

  return (
    <FeatureSection
      className="public-api-panel"
      description="Parta de um perfil pronto, ajuste as permissões e nomeie o acesso para encontrá-lo depois."
      icon={<ShieldCheck aria-hidden="true" className="size-5" />}
      title="Nova chave de acesso"
    >
      {createdKey ? (
        <div className="internal-secret public-api-secret">
          <KeyRound aria-hidden="true" className="size-4" />
          <div>
            <small>
              Chave criada. Copie agora: o valor completo não será exibido
              novamente.
            </small>
            <code>{createdKey}</code>
          </div>
          <FeatureRowAction
            ariaLabel={
              copiedId === "created-key"
                ? "Chave copiada"
                : "Copiar nova chave da API"
            }
            icon={copiedId === "created-key" ? Check : Copy}
            onClick={() => void onCopy(createdKey, "created-key")}
            tooltip="Copiar chave"
          />
        </div>
      ) : null}

      <div className="mt-4 grid gap-5">
        <div className="grid gap-2">
          <span className="text-sm font-semibold text-app-text/90">
            Ponto de partida
          </span>
          <div
            aria-label="Perfis de acesso"
            className="public-api-presets"
            role="group"
          >
            {scopePresets.map((preset) => {
              const isSelected = scopesEqual(scopes, preset.scopes);
              return (
                <button
                  aria-pressed={isSelected}
                  className={
                    isSelected
                      ? "public-api-preset is-active"
                      : "public-api-preset"
                  }
                  key={preset.name}
                  onClick={() =>
                    applyPreset(preset, onNameChange, onScopesChange)
                  }
                  type="button"
                >
                  <preset.icon aria-hidden="true" className="size-4" />
                  <span>{preset.label}</span>
                  <small>{preset.description}</small>
                </button>
              );
            })}
          </div>
        </div>

        <FeatureField
          hint="Use o sistema e a finalidade, como “CRM · Pós-venda”."
          label="Nome do cliente"
        >
          <FeatureInput
            autoComplete="off"
            onChange={(event) => onNameChange(event.target.value)}
            value={name}
          />
        </FeatureField>

        <div className="grid gap-3">
          <FeatureSegmentedControl
            ariaLabel="Categorias de permissão"
            onChange={(nextGroup) => setActiveGroup(nextGroup)}
            options={scopeGroups.map((group) => ({
              label: group.label,
              value: group.label,
            }))}
            value={activeGroup}
          />

          <div
            aria-label={`Escopos de ${selectedGroup.label}`}
            className="public-api-scopes"
            role="group"
          >
            {selectedGroup.options.map((option) => (
              <label className="public-api-scope-option" key={option.scope}>
                <input
                  checked={scopes.includes(option.scope)}
                  onChange={() =>
                    onScopesChange(toggleScope(scopes, option.scope))
                  }
                  type="checkbox"
                />
                <span>
                  <strong>{option.label}</strong>
                  <small>{option.description}</small>
                  <code>{option.scope}</code>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="public-api-creator-footer">
          <span>
            <strong>{scopes.length}</strong> permissões para <b>{name}</b>
          </span>
          <FeatureActionButton
            disabled={
              !name.trim() ||
              scopes.length === 0 ||
              status.kind === "loading" ||
              status.kind === "saving"
            }
            icon={Plus}
            isBusy={status.kind === "saving"}
            label="Criar chave"
            onClick={onCreate}
            variant="primary"
          />
        </div>
      </div>
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
