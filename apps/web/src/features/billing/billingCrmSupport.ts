const billingSupportPhone = "5511940231407";

export function billingCrmSupportUrl(supportCode?: string | null) {
  const message = ["Olá! Preciso de ajuda com a Z-API do meu CRM."];
  if (supportCode) message.push(`Código da solicitação: ${supportCode}`);

  return `https://wa.me/${billingSupportPhone}?text=${encodeURIComponent(message.join("\n"))}`;
}
