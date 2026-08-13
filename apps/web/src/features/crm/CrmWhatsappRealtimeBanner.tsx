import { AlertTriangle, Loader2, WifiOff } from "lucide-react";
import { useState } from "react";
import { Toast } from "../../components/ui/Toast";
import type { CrmWhatsappRealtimeStatus } from "./crmWhatsappTypes";

export function CrmWhatsappRealtimeBanner({
  hasCachedInbox,
  status,
}: {
  hasCachedInbox: boolean;
  status: CrmWhatsappRealtimeStatus;
}) {
  if (status === "connected") return null;

  return (
    <RealtimeStatusToast
      hasCachedInbox={hasCachedInbox}
      key={status}
      status={status}
    />
  );
}

function RealtimeStatusToast({
  hasCachedInbox,
  status,
}: {
  hasCachedInbox: boolean;
  status: Exclude<CrmWhatsappRealtimeStatus, "connected">;
}) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const content = {
    connecting: {
      icon: <Loader2 aria-hidden="true" className="crm-spin" />,
      label: "Conectando às atualizações em tempo real.",
      detail: "O envio permanece bloqueado até a conexão ser confirmada.",
    },
    degraded: {
      icon: <AlertTriangle aria-hidden="true" />,
      label: "Atualizações em tempo real degradadas.",
      detail: hasCachedInbox
        ? "As conversas já carregadas continuam visíveis; o envio está bloqueado por segurança."
        : "O inbox pode estar desatualizado; o envio está bloqueado por segurança.",
    },
    offline: {
      icon: <WifiOff aria-hidden="true" />,
      label: "Sem conexão em tempo real.",
      detail: hasCachedInbox
        ? "As conversas já carregadas continuam visíveis. Tente novamente quando a conexão voltar."
        : "Não foi possível confirmar o estado atual do inbox.",
    },
  }[status];

  return (
    <Toast
      className="crm-whatsapp-realtime-toast"
      icon={content.icon}
      {...(status === "connecting"
        ? {}
        : { onDismiss: () => setDismissed(true) })}
      title={content.label}
      tone={status === "connecting" ? "warning" : "danger"}
    >
      {content.detail}
    </Toast>
  );
}
