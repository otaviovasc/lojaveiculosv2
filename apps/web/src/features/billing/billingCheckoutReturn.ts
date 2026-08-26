export function redirectToCheckout(checkoutUrl: string) {
  window.location.assign(checkoutUrl);
}

export function readBillingCheckoutReturn(scope: "agency" | "store") {
  if (typeof window === "undefined") return null;
  const status = new URLSearchParams(window.location.search).get("checkout");
  if (status === "success") {
    return {
      message:
        scope === "agency"
          ? "Recebemos apenas o retorno do navegador. A assinatura será confirmada pelo servidor depois da conciliação do pagamento."
          : "Recebemos apenas o retorno do navegador. O acesso pago só será ativado quando o servidor confirmar e conciliar o pagamento.",
      title: "Retorno do checkout recebido",
      tone: "info" as const,
    };
  }
  if (status === "cancelled") {
    return {
      message:
        scope === "agency"
          ? "O checkout unificado foi cancelado antes da conclusão."
          : "O checkout foi cancelado antes da conclusão.",
      title: "Checkout cancelado",
      tone: "warning" as const,
    };
  }
  if (status === "expired") {
    return {
      message: "O link do checkout expirou. Gere uma nova contratação.",
      title: "Checkout expirado",
      tone: "warning" as const,
    };
  }
  return null;
}
