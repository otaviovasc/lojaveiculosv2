import { CircleAlert } from "lucide-react";

export function WhatsappNotice({ message }: { message: string }) {
  return (
    <section className="crm-note">
      <CircleAlert aria-hidden="true" className="size-5 shrink-0" />
      <span>{message}</span>
    </section>
  );
}
