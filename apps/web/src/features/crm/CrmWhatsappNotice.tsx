import { Check, CircleAlert, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "../../components/ui/button";

export function WhatsappNotice({
  actionLabel,
  message,
  onAction,
  requestId,
}: {
  actionLabel?: string;
  message: string;
  onAction?: () => void;
  requestId?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <section className="crm-note" role="alert">
      <CircleAlert aria-hidden="true" className="size-5 shrink-0" />
      <div>
        <span>{message}</span>
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
      </div>
      {actionLabel && onAction ? (
        <Button onClick={onAction} size="xs" type="button" variant="outline">
          {actionLabel}
        </Button>
      ) : null}
    </section>
  );
}
