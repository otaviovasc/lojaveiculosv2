import { KeyRound, Save, ShieldCheck } from "lucide-react";
import { ConnectionSectionCard } from "./CrmWhatsappConnectionAdminParts";
import type { CrmWhatsappProviderConnection } from "./crmWhatsappTypes";

type InstanceDraft = {
  instanceId: string;
  instanceToken: string;
};

export function ConnectionInstanceForm({
  connection,
  disabled,
  draft,
  isSaving,
  onChange,
  onSave,
}: {
  connection: CrmWhatsappProviderConnection;
  disabled: boolean;
  draft: InstanceDraft;
  isSaving: boolean;
  onChange: (draft: InstanceDraft) => void;
  onSave: () => void;
}) {
  return (
    <ConnectionSectionCard
      className="crm-whatsapp-connection-instance-card"
      description="Atualize somente os dados da instancia ZAPI. O token salvo nunca volta para o navegador."
      icon={<KeyRound aria-hidden="true" />}
      title="Instancia ZAPI"
    >
      {connection.credentials?.storedInstanceConfigured ? (
        <div className="crm-whatsapp-connection-protected-note">
          <ShieldCheck aria-hidden="true" />
          <div>
            <strong>Credenciais protegidas</strong>
            <p>
              O token salvo nao e exibido. Informe um novo token somente para
              substituir o atual.
            </p>
          </div>
        </div>
      ) : null}
      <div className="crm-whatsapp-connection-instance-grid">
        <label className="crm-whatsapp-connection-field">
          ID da instancia
          <input
            disabled={disabled || isSaving}
            onChange={(event) =>
              onChange({ ...draft, instanceId: event.target.value })
            }
            placeholder="Ex: 3F1A..."
            value={draft.instanceId}
          />
        </label>
        <label className="crm-whatsapp-connection-field">
          Token da instancia
          <input
            autoComplete="new-password"
            disabled={disabled || isSaving}
            onChange={(event) =>
              onChange({ ...draft, instanceToken: event.target.value })
            }
            placeholder={readTokenPlaceholder(connection)}
            type="password"
            value={draft.instanceToken}
          />
        </label>
        <button
          className="crm-whatsapp-connection-save"
          disabled={disabled || isSaving}
          onClick={onSave}
          type="button"
        >
          <Save aria-hidden="true" />
          {isSaving ? "Salvando" : "Salvar instancia"}
        </button>
      </div>
      {disabled ? (
        <p className="crm-whatsapp-connection-disabled">
          Seu usuario pode visualizar a conexao, mas nao pode alterar as
          credenciais.
        </p>
      ) : null}
    </ConnectionSectionCard>
  );
}

function readTokenPlaceholder(connection: CrmWhatsappProviderConnection) {
  return connection.credentials?.storedInstanceConfigured
    ? "Token configurado, informe para trocar"
    : "Cole o token da ZAPI";
}
