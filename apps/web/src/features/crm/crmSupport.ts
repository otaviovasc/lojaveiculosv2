const crmSupportPhone = "5511940231407";

export function crmSupportUrl(supportCode?: string | null) {
  const message = ["Olá! Preciso de ajuda com a conexão do CRM."];
  if (supportCode) message.push(`Código de atendimento: ${supportCode}`);

  return `https://wa.me/${crmSupportPhone}?text=${encodeURIComponent(message.join("\n"))}`;
}
