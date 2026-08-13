import { CircleAlert } from "lucide-react";
import { Button } from "../../components/ui/button";

export function WhatsappNotice({
  actionLabel,
  message,
  onAction,
}: {
  actionLabel?: string;
  message: string;
  onAction?: () => void;
}) {
  return (
    <section className="crm-note" role="alert">
      <CircleAlert aria-hidden="true" className="size-5 shrink-0" />
      <span>{message}</span>
      {actionLabel && onAction ? (
        <Button onClick={onAction} size="xs" type="button" variant="outline">
          {actionLabel}
        </Button>
      ) : null}
    </section>
  );
}
