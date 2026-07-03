export function readWhatsappStatus(input: {
  hasConnection: boolean;
  isLoading: boolean;
  connectionError: Error | null;
}): {
  label: string;
  tone: "error" | "loading" | "neutral" | "offline" | "online";
} {
  if (input.hasConnection) return { label: "ZAPI conectado", tone: "online" };
  if (input.isLoading) return { label: "Verificando", tone: "loading" };
  if (input.connectionError) {
    return { label: "ZAPI indisponivel", tone: "error" };
  }
  if (input.hasConnection === false) {
    return { label: "Desconectado", tone: "offline" };
  }
  return { label: "WhatsApp", tone: "neutral" };
}
