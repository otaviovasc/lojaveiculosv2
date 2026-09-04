import { Check, CircleAlert, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "../../components/ui/button";
import { Toast } from "../../components/ui/Toast";

export function CrmNotice({
  actionLabel,
  durationMs = null,
  inline = false,
  message,
  onAction,
  onDismiss,
  noticeId,
  requestId,
}: {
  actionLabel?: string;
  durationMs?: number | null;
  inline?: boolean;
  message: string;
  onAction?: () => void;
  onDismiss?: () => void;
  noticeId?: string;
  requestId?: string;
}) {
  const [copied, setCopied] = useState(false);

  const details = (
    <>
      {requestId ? (
        <details>
          <summary>Detalhes técnicos</summary>
          <div>
            <code>ID do erro: {requestId}</code>
            <Button
              aria-label="Copiar ID do erro"
              onClick={() => {
                void navigator.clipboard.writeText(requestId).then(() => {
                  setCopied(true);
                });
              }}
              size="xs"
              type="button"
              variant="ghost"
            >
              {copied ? (
                <Check aria-hidden="true" />
              ) : (
                <Copy aria-hidden="true" />
              )}
              {copied ? "Copiado" : "Copiar ID"}
            </Button>
          </div>
        </details>
      ) : null}
      {actionLabel && onAction ? (
        <Button onClick={onAction} size="xs" type="button" variant="outline">
          {actionLabel}
        </Button>
      ) : null}
    </>
  );

  if (inline) {
    return (
      <aside className="crm-note" role="note">
        <CircleAlert aria-hidden="true" className="size-5" />
        <strong>{message}</strong>
        {details}
      </aside>
    );
  }

  return (
    <Toast
      durationMs={durationMs}
      icon={<CircleAlert aria-hidden="true" className="size-5" />}
      {...(onDismiss ? { onDismiss } : {})}
      priority="assertive"
      {...(noticeId ? { resetKey: noticeId } : {})}
      title={message}
      tone="danger"
    >
      {details}
    </Toast>
  );
}
