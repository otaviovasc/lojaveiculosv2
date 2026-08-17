import { Check, ChevronDown, Plug } from "lucide-react";
import { useRef, useState } from "react";
import { FeatureAnchoredPopover } from "../../components/ui/FeaturePopover";
import type { CrmWhatsappProviderConnection } from "./crmWhatsappTypes";
import { isConnectedConnection } from "./crmWhatsappConnectionSelection";
import {
  readCrmWhatsappChannelLabel,
  readCrmWhatsappProviderLabel,
} from "./crmWhatsappConnectionStatus";

export function CrmWhatsappConnectionFilter({
  connectionFilterId,
  connections,
  fallbackConnectionId,
  onChange,
  onSetup,
}: {
  connectionFilterId: string | null;
  connections: readonly CrmWhatsappProviderConnection[];
  fallbackConnectionId: string | number | null;
  onChange: (connectionId: string) => void;
  onSetup?: () => void;
}) {
  const connectedConnections = connections.filter(isConnectedConnection);
  const selectedId = String(connectionFilterId ?? fallbackConnectionId ?? "");
  const selectedConnection =
    connectedConnections.find(
      (connection) => String(connection.id) === selectedId,
    ) ??
    connectedConnections.find((connection) => connection.isDefault) ??
    (connectedConnections.length === 1 ? connectedConnections[0] : null);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  const selectedLabel = selectedConnection
    ? readCrmWhatsappChannelLabel(selectedConnection.channel ?? "")
    : "Nenhum canal pronto";
  return (
    <div className="crm-whatsapp-connection-filter-anchor">
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Filtrar por conexão"
        className={
          connectionFilterId
            ? "crm-icon-action crm-whatsapp-connection-filter-action crm-icon-action-active"
            : "crm-icon-action crm-whatsapp-connection-filter-action"
        }
        disabled={connectedConnections.length <= 1}
        onClick={() => setOpen((current) => !current)}
        ref={anchorRef}
        title={
          connectedConnections.length === 0
            ? "Nenhum canal pronto. Configure uma conexão."
            : `Canal: ${selectedLabel}`
        }
        type="button"
      >
        {selectedConnection ? (
          <ConnectionIcon channel={selectedConnection.channel ?? ""} />
        ) : (
          <Plug
            aria-hidden="true"
            className="crm-whatsapp-connection-filter-icon"
          />
        )}
        {connectedConnections.length > 1 ? (
          <ChevronDown
            aria-hidden="true"
            className="crm-whatsapp-connection-filter-chevron"
          />
        ) : null}
      </button>
      <FeatureAnchoredPopover
        anchorRef={anchorRef}
        className="crm-whatsapp-connection-filter-menu"
        isOpen={open}
        onClose={() => setOpen(false)}
      >
        <div aria-label="Canais conectados" role="listbox">
          {connectedConnections.map((connection) => {
            const selected = String(connection.id) === selectedId;
            return (
              <button
                aria-selected={selected}
                className="crm-whatsapp-connection-filter-option"
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
                  const currentIndex = connectedConnections.findIndex(
                    (item) => String(item.id) === String(connection.id),
                  );
                  const offset = event.key === "ArrowDown" ? 1 : -1;
                  const next =
                    connectedConnections[
                      (currentIndex + offset + connectedConnections.length) %
                        connectedConnections.length
                    ];
                  if (next) onChange(String(next.id));
                }}
                role="option"
                type="button"
              >
                <ConnectionIcon channel={connection.channel ?? ""} />
                <span>
                  <strong>
                    {readCrmWhatsappChannelLabel(connection.channel ?? "")}
                  </strong>
                  <small>
                    {readCrmWhatsappProviderLabel(connection.provider)} ·{" "}
                    {connection.displayName}
                  </small>
                </span>
                {selected ? <Check aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
      </FeatureAnchoredPopover>
      {connectedConnections.length === 0 && onSetup ? (
        <button
          className="crm-whatsapp-connection-filter-setup"
          onClick={onSetup}
          type="button"
        >
          Configurar conexão
        </button>
      ) : null}
    </div>
  );
}

function ConnectionIcon({ channel }: { channel: string }) {
  if (channel === "olx_chat") {
    return (
      <img
        alt=""
        className="crm-whatsapp-connection-filter-icon crm-whatsapp-connection-filter-icon-olx"
        src="/icons/portals/olx.svg"
      />
    );
  }
  if (channel === "whatsapp") {
    return (
      <svg
        aria-hidden="true"
        className="crm-whatsapp-connection-filter-icon"
        viewBox="0 0 24 24"
      >
        <path
          d="M20.5 3.5A11.8 11.8 0 0 0 12.1 0C5.6 0 .4 5.2.4 11.7c0 2.1.6 4.1 1.6 5.8L.3 24l6.6-1.7a11.7 11.7 0 0 0 5.2 1.2h.1c6.4 0 11.6-5.2 11.6-11.7 0-3.1-1.2-6.1-3.3-8.3Zm-8.3 18.1h-.1c-1.7 0-3.4-.5-4.8-1.3l-.3-.2-3.9 1 1-3.8-.2-.4a9.7 9.7 0 1 1 8.3 4.7Zm5.3-7.3c-.3-.2-1.7-.8-2-.9-.3-.1-.5-.2-.7.2-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-1.7-.8-2.8-1.5-3.9-3.4-.3-.5.3-.5.8-1.6.1-.2 0-.4 0-.5-.1-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.1 3c.1.2 2 3.1 4.9 4.3 1.8.8 2.5.9 3.4.8.5-.1 1.7-.7 1.9-1.3.2-.6.2-1.2.1-1.3-.2-.3-.4-.4-.6-.6Z"
          fill="currentColor"
        />
      </svg>
    );
  }
  return (
    <Plug aria-hidden="true" className="crm-whatsapp-connection-filter-icon" />
  );
}
