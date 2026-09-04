import { Check, ChevronDown, Plug } from "lucide-react";
import { useRef, useState } from "react";
import { FeatureAnchoredPopover } from "../../components/ui/FeaturePopover";
import type { CrmProviderConnection } from "./crmConversationTypes";
import { isInboxBrowsableConnection } from "./crmConnectionSelection";
import { filterConnectionsBrowsableByUser } from "./crmQueueState";
import {
  readCrmChannelLabel,
  readCrmProviderLabel,
} from "./crmConnectionStatus";

const aggregateFilterValue = null;

export function CrmConnectionFilter({
  canAssign = true,
  canReadUnassigned = false,
  connectionFilterId,
  connections,
  currentUserId = null,
  fallbackConnectionId,
  onChange,
  onSetup,
}: {
  canAssign?: boolean;
  canReadUnassigned?: boolean;
  connectionFilterId: string | null;
  connections: readonly CrmProviderConnection[];
  currentUserId?: string | null;
  fallbackConnectionId: string | number | null;
  onChange: (connectionId: string | null) => void;
  onSetup?: () => void;
}) {
  const browsableConnections = filterConnectionsBrowsableByUser(
    connections.filter(isInboxBrowsableConnection),
    { canAssign, canReadUnassigned, currentUserId },
  );
  const showAggregateOption = browsableConnections.length > 1;
  const selectedId =
    connectionFilterId === null && showAggregateOption
      ? aggregateFilterValue
      : String(connectionFilterId ?? fallbackConnectionId ?? "");
  const selectedConnection =
    selectedId === aggregateFilterValue
      ? null
      : (browsableConnections.find(
          (connection) => String(connection.id) === selectedId,
        ) ??
        browsableConnections.find((connection) => connection.isDefault) ??
        null);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  const selectedLabel =
    selectedId === aggregateFilterValue
      ? "Todas as conexões"
      : selectedConnection
        ? readCrmChannelLabel(selectedConnection.channel ?? "")
        : "Nenhum canal pronto";
  const keyboardOptions: Array<string | null> = showAggregateOption
    ? [
        aggregateFilterValue,
        ...browsableConnections.map((connection) => String(connection.id)),
      ]
    : browsableConnections.map((connection) => String(connection.id));
  const moveSelection = (currentValue: string | null, offset: number) => {
    const currentIndex = keyboardOptions.findIndex(
      (value) => value === currentValue,
    );
    const next =
      keyboardOptions[
        (currentIndex + offset + keyboardOptions.length) %
          keyboardOptions.length
      ];
    if (next !== undefined) onChange(next);
  };
  return (
    <div className="crm-connection-filter-anchor">
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Filtrar por conexão"
        className={
          connectionFilterId
            ? "crm-icon-action crm-connection-filter-action crm-icon-action-active"
            : "crm-icon-action crm-connection-filter-action"
        }
        disabled={browsableConnections.length <= 1}
        onClick={() => setOpen((current) => !current)}
        ref={anchorRef}
        title={
          browsableConnections.length === 0
            ? "Nenhum canal pronto. Configure uma conexão."
            : `Canal: ${selectedLabel}`
        }
        type="button"
      >
        {selectedConnection ? (
          <ConnectionIcon channel={selectedConnection.channel ?? ""} />
        ) : (
          <Plug aria-hidden="true" className="crm-connection-filter-icon" />
        )}
        {browsableConnections.length > 1 ? (
          <ChevronDown
            aria-hidden="true"
            className="crm-connection-filter-chevron"
          />
        ) : null}
      </button>
      <FeatureAnchoredPopover
        anchorRef={anchorRef}
        className="crm-connection-filter-menu"
        isOpen={open}
        onClose={() => setOpen(false)}
      >
        <div aria-label="Canais disponíveis" role="listbox">
          {showAggregateOption ? (
            <button
              aria-selected={selectedId === aggregateFilterValue}
              className="crm-connection-filter-option"
              onClick={() => {
                onChange(aggregateFilterValue);
                setOpen(false);
              }}
              onKeyDown={(event) => {
                if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
                  return;
                }
                event.preventDefault();
                moveSelection(
                  aggregateFilterValue,
                  event.key === "ArrowDown" ? 1 : -1,
                );
              }}
              role="option"
              type="button"
            >
              <Plug aria-hidden="true" className="crm-connection-filter-icon" />
              <span>
                <strong>Todas as conexões</strong>
                <small>Fila combinada dos canais prontos</small>
              </span>
              {selectedId === aggregateFilterValue ? (
                <Check aria-hidden="true" />
              ) : null}
            </button>
          ) : null}
          {browsableConnections.map((connection) => {
            const selected = String(connection.id) === selectedId;
            return (
              <button
                aria-selected={selected}
                className="crm-connection-filter-option"
                key={connection.id}
                onClick={() => {
                  onChange(String(connection.id));
                  setOpen(false);
                }}
                onKeyDown={(event) => {
                  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
                    return;
                  }
                  event.preventDefault();
                  moveSelection(
                    String(connection.id),
                    event.key === "ArrowDown" ? 1 : -1,
                  );
                }}
                role="option"
                type="button"
              >
                <ConnectionIcon channel={connection.channel ?? ""} />
                <span>
                  <strong>
                    {readCrmChannelLabel(connection.channel ?? "")}
                  </strong>
                  <small>
                    {readCrmProviderLabel(connection.provider)} ·{" "}
                    {readConnectionPhoneNumber(connection) ??
                      connection.displayName}
                  </small>
                </span>
                {selected ? <Check aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
      </FeatureAnchoredPopover>
      {browsableConnections.length === 0 && onSetup ? (
        <button
          className="crm-connection-filter-setup"
          onClick={onSetup}
          type="button"
        >
          Configurar conexão
        </button>
      ) : null}
    </div>
  );
}

function readConnectionPhoneNumber(connection: CrmProviderConnection) {
  const phoneNumber = connection.phoneNumber;
  return typeof phoneNumber === "string" && phoneNumber.trim()
    ? phoneNumber
    : null;
}

function ConnectionIcon({ channel }: { channel: string }) {
  if (channel === "olx_chat") {
    return (
      <img
        alt=""
        className="crm-connection-filter-icon crm-connection-filter-icon-olx"
        src="/icons/portals/olx.svg"
      />
    );
  }
  if (channel === "whatsapp") {
    return (
      <svg
        aria-hidden="true"
        className="crm-connection-filter-icon"
        viewBox="0 0 24 24"
      >
        <path
          d="M20.5 3.5A11.8 11.8 0 0 0 12.1 0C5.6 0 .4 5.2.4 11.7c0 2.1.6 4.1 1.6 5.8L.3 24l6.6-1.7a11.7 11.7 0 0 0 5.2 1.2h.1c6.4 0 11.6-5.2 11.6-11.7 0-3.1-1.2-6.1-3.3-8.3Zm-8.3 18.1h-.1c-1.7 0-3.4-.5-4.8-1.3l-.3-.2-3.9 1 1-3.8-.2-.4a9.7 9.7 0 1 1 8.3 4.7Zm5.3-7.3c-.3-.2-1.7-.8-2-.9-.3-.1-.5-.2-.7.2-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-1.7-.8-2.8-1.5-3.9-3.4-.3-.5.3-.5.8-1.6.1-.2 0-.4 0-.5-.1-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.1 3c.1.2 2 3.1 4.9 4.3 1.8.8 2.5.9 3.4.8.5-.1 1.7-.7 1.9-1.3.2-.6.2-1.2.1-1.3-.2-.3-.4-.4-.6-.6Z"
          fill="currentColor"
        />
      </svg>
    );
  }
  return <Plug aria-hidden="true" className="crm-connection-filter-icon" />;
}
