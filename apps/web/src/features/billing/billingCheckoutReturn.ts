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
          ? "Recebemos o retorno do Asaas. A assinatura consolidada sera confirmada pelo webhook."
          : "Recebemos o retorno do Asaas. A assinatura sera confirmada pelo webhook assim que o pagamento for conciliado.",
      title: "Checkout concluido",
      tone: "success" as const,
    };
  }
  if (status === "cancelled") {
    return {
      message:
        scope === "agency"
          ? "O checkout unificado foi cancelado antes da conclusao."
          : "O checkout foi cancelado antes da conclusao.",
      title: "Checkout cancelado",
      tone: "warning" as const,
    };
  }
  if (status === "expired") {
    return {
      message: "O link do checkout expirou. Gere uma nova contratacao.",
      title: "Checkout expirado",
      tone: "warning" as const,
    };
  }
  return null;
}
