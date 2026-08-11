import type { ReactNode } from "react";
import { StatusIllustration } from "../../components/ui/StatusIllustration";
import { StatusPage } from "../../components/ui/StatusPage";

export function PermissionRestrictedPanel({
  children,
  description = "Sua conta não possui permissão para acessar esta funcionalidade.",
  title = "Acesso restrito",
}: {
  children?: ReactNode;
  description?: string;
  title?: string;
}) {
  return (
    <StatusPage
      body={description}
      illustration={<StatusIllustration variant="gate" />}
      layout="fill"
      title={title}
      tone="warning"
    >
      {children}
    </StatusPage>
  );
}
