import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, UserMinus, UserPlus, Users } from "lucide-react";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import { useOptionalAccountSession } from "../account/accountSession";
import { ConnectionSectionCard } from "./CrmConnectionAdminParts";
import type {
  CrmConnectionId,
  CrmConnectionMember,
  CrmConnectionMemberRevokeResult,
  CrmProviderConnection,
} from "./crmConversationTypes";
import { useCrmAssignableMembers } from "./useCrmAssignableMembers";
import { CrmSelect } from "./CrmFormControls";

export type CrmConnectionMembersHandlers = {
  onGrantConnectionMember?: (
    connectionId: CrmConnectionId,
    userId: string,
  ) => Promise<void>;
  onListConnectionMembers?: (
    connectionId: CrmConnectionId,
  ) => Promise<readonly CrmConnectionMember[]>;
  onRevokeConnectionMember?: (
    connectionId: CrmConnectionId,
    userId: string,
  ) => Promise<CrmConnectionMemberRevokeResult>;
};

/**
 * Per-connection agent access editor for WhatsApp channels. Member ids come
 * from the server (members endpoint, or the connection DTO as a fallback);
 * names resolve against the store's assignable members. Grant/revoke only
 * update the list after a confirmed server refresh — never optimistically.
 */
export function CrmConnectionMembersSection({
  canManage,
  connection,
  onGrantConnectionMember,
  onListConnectionMembers,
  onRevokeConnectionMember,
}: {
  canManage: boolean;
  connection: CrmProviderConnection;
} & CrmConnectionMembersHandlers) {
  const session = useOptionalAccountSession();
  const { assignableMembers } = useCrmAssignableMembers(session);
  const [memberIds, setMemberIds] = useState<readonly string[] | null>(
    connection.memberUserIds ?? null,
  );
  const [selectedUserId, setSelectedUserId] = useState("");
  const [busy, setBusy] = useState<"grant" | "list" | "revoke" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connectionId = connection.id;
  const loadMembers = useCallback(async () => {
    if (!onListConnectionMembers) {
      setMemberIds(connection.memberUserIds ?? null);
      return;
    }
    setBusy("list");
    setError(null);
    try {
      const members = await onListConnectionMembers(connectionId);
      setMemberIds(members.map((member) => member.userId));
    } catch (caught) {
      setMemberIds(connection.memberUserIds ?? null);
      setError(
        formatApiErrorDisplay(
          caught,
          "Não foi possível carregar os atendentes com acesso a esta conexão.",
        ),
      );
    } finally {
      setBusy(null);
    }
  }, [connection.memberUserIds, connectionId, onListConnectionMembers]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  const membersById = useMemo(
    () =>
      new Map(assignableMembers.map((member) => [String(member.id), member])),
    [assignableMembers],
  );
  const memberSet = useMemo(() => new Set(memberIds ?? []), [memberIds]);
  const candidates = assignableMembers.filter(
    (member) => !memberSet.has(String(member.id)),
  );

  const grant = async () => {
    if (!onGrantConnectionMember || !selectedUserId || busy) return;
    setBusy("grant");
    setError(null);
    try {
      await onGrantConnectionMember(connectionId, selectedUserId);
      setSelectedUserId("");
      await loadMembers();
    } catch (caught) {
      setError(
        formatApiErrorDisplay(
          caught,
          "Não foi possível liberar o acesso. Nenhuma alteração foi confirmada.",
        ),
      );
    } finally {
      setBusy(null);
    }
  };

  const revoke = async (userId: string) => {
    if (!onRevokeConnectionMember || busy) return;
    setBusy("revoke");
    setError(null);
    try {
      await onRevokeConnectionMember(connectionId, userId);
      await loadMembers();
    } catch (caught) {
      setError(
        formatApiErrorDisplay(
          caught,
          "Não foi possível remover o acesso. Nenhuma alteração foi confirmada.",
        ),
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <ConnectionSectionCard
      description="Restrinja quais atendentes da loja enxergam esta conexão de WhatsApp."
      icon={<Users aria-hidden="true" />}
      title="Atendentes com acesso"
    >
      {busy === "list" && memberIds === null ? (
        <p className="crm-connection-empty" role="status">
          <Loader2 aria-hidden="true" className="crm-spin" /> Carregando
          atendentes com acesso.
        </p>
      ) : memberIds === null ? (
        <p className="crm-connection-empty" role="status">
          O servidor ainda não informou o acesso desta conexão.
        </p>
      ) : memberIds.length === 0 ? (
        <p className="crm-connection-empty">
          Nenhum atendente vinculado. A conexão segue visível conforme as
          permissões gerais da loja.
        </p>
      ) : (
        <ul
          aria-label="Atendentes com acesso a esta conexão"
          className="crm-connection-member-list"
        >
          {memberIds.map((userId) => {
            const member = membersById.get(userId);
            return (
              <li key={userId}>
                <span>
                  <strong>
                    {member?.name ?? "Atendente fora da lista da loja"}
                  </strong>
                  {member?.email ? <small>{member.email}</small> : null}
                </span>
                {canManage && onRevokeConnectionMember ? (
                  <button
                    aria-label={`Remover acesso de ${member?.name ?? userId}`}
                    className="crm-icon-action"
                    disabled={busy !== null}
                    onClick={() => void revoke(userId)}
                    title="Remover acesso"
                    type="button"
                  >
                    {busy === "revoke" ? (
                      <Loader2 aria-hidden="true" className="crm-spin" />
                    ) : (
                      <UserMinus aria-hidden="true" />
                    )}
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      {error ? (
        <p className="crm-connection-error" role="alert">
          {error}
        </p>
      ) : null}
      {canManage && onGrantConnectionMember && onListConnectionMembers ? (
        <div className="crm-zapi-inline-actions">
          <label className="crm-pairing-phone">
            Adicionar atendente
            <CrmSelect
              ariaLabel="Atendente para liberar acesso"
              disabled={busy !== null || candidates.length === 0}
              onChange={(value) => setSelectedUserId(value)}
              options={candidates.map((member) => ({
                label: member.name,
                value: String(member.id),
              }))}
              placeholder={
                candidates.length
                  ? "Selecione um atendente"
                  : "Todos os atendentes já têm acesso"
              }
              value={selectedUserId || undefined}
            />
          </label>
          <button
            className="crm-action crm-action-secondary"
            disabled={busy !== null || !selectedUserId}
            onClick={() => void grant()}
            type="button"
          >
            {busy === "grant" ? (
              <Loader2 aria-hidden="true" className="crm-spin" />
            ) : (
              <UserPlus aria-hidden="true" />
            )}
            {busy === "grant" ? "Liberando acesso" : "Liberar acesso"}
          </button>
        </div>
      ) : (
        <small className="crm-zapi-permission-note">
          Peça a um administrador da loja para gerenciar o acesso por conexão.
        </small>
      )}
    </ConnectionSectionCard>
  );
}
