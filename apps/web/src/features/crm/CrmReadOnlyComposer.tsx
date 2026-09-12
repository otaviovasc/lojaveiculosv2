import { LockKeyhole } from "lucide-react";

export function CrmReadOnlyComposer({
  actionLabel,
  onAction,
  reason,
  title,
}: {
  actionLabel?: string;
  onAction?: () => void;
  reason?: string | null;
  title?: string;
}) {
  return (
    <div className="crm-composer crm-composer-readonly" role="note">
      <LockKeyhole aria-hidden="true" />
      <span className="crm-composer-readonly-content">
        <strong>{title ?? "Somente leitura"}</strong>
        <small>
          {reason ??
            "Seu perfil pode acompanhar esta conversa sem enviar mensagens."}
        </small>
      </span>
      {onAction && actionLabel ? (
        <button className="crm-action" onClick={onAction} type="button">
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
