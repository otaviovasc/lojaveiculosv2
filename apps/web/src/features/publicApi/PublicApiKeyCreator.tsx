import {
  Check,
  Copy,
  KeyRound,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { useState } from "react";
import { FeatureSection } from "../../components/ui/FeatureLayout";
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
      className="internal-panel public-api-panel public-api-key-creator"
      description="Parta de um perfil pronto, ajuste as permissões e nomeie o acesso para encontrá-lo depois."
      headerClassName="internal-panel-title"
      icon={<ShieldCheck aria-hidden="true" className="size-5" />}
      title="Configure um novo acesso"
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

      <div className="public-api-builder-grid">
        <div className="public-api-builder-profile">
          <div className="public-api-builder-kicker">
            <span>01</span>
            <div>
              <strong>Escolha um ponto de partida</strong>
              <small>Os perfis já trazem o mínimo recomendado.</small>
            </div>
          </div>

          <div className="public-api-presets">
            {scopePresets.map((preset) => {
              const isSelected = scopesEqual(scopes, preset.scopes);
              return (
                <button
                  aria-pressed={isSelected}
                  className={isSelected ? "is-active" : ""}
                  key={preset.name}
                  onClick={() =>
                    applyPreset(preset, onNameChange, onScopesChange)
                  }
                  type="button"
                >
                  <span className="public-api-preset-icon">
                    <preset.icon aria-hidden="true" className="size-4" />
                  </span>
                  <span>{preset.label}</span>
                  <small>{preset.description}</small>
                  <i aria-hidden="true">
                    {isSelected ? "Selecionado" : "Usar perfil"}
                  </i>
                </button>
              );
            })}
          </div>

          <label className="internal-field public-api-client-name">
            <span>Nome do cliente</span>
            <small>Use o sistema e a finalidade, como “CRM · Pós-venda”.</small>
            <input
              autoComplete="off"
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
            />
          </label>
        </div>

        <div className="public-api-builder-permissions">
          <div className="public-api-builder-kicker">
            <span>02</span>
            <div>
              <strong>Revise as permissões</strong>
              <small>{scopes.length} escopos selecionados no total.</small>
            </div>
          </div>

          <div
            aria-label="Categorias de permissão"
            className="public-api-scope-tabs"
            role="group"
          >
            {scopeGroups.map((group) => {
              const selectedCount = countSelectedScopes(group, scopes);
              return (
                <button
                  aria-pressed={activeGroup === group.label}
                  className={activeGroup === group.label ? "is-active" : ""}
                  key={group.label}
                  onClick={() => setActiveGroup(group.label)}
                  type="button"
                >
                  <span>{group.label}</span>
                  <small>
                    {selectedCount}/{group.options.length}
                  </small>
                </button>
              );
            })}
          </div>

          <div
            aria-label={`Escopos de ${selectedGroup.label}`}
            className="public-api-scopes"
            role="group"
          >
            {selectedGroup.options.map((option) => (
              <label className="internal-check" key={option.scope}>
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
      </div>

      <div className="public-api-builder-footer">
        <span>
          <SlidersHorizontal aria-hidden="true" className="size-4" />
          <strong>{scopes.length}</strong> permissões para <b>{name}</b>
        </span>
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
          {status.kind === "saving" ? "Criando acesso" : "Criar chave"}
        </button>
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

function countSelectedScopes(
  group: PublicApiScopeGroup,
  scopes: PublicApiScope[],
) {
  return group.options.reduce(
    (count, option) => count + Number(scopes.includes(option.scope)),
    0,
  );
}
