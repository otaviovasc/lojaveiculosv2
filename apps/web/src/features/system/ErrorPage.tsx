import { useState } from "react";
import { Home, RotateCcw } from "lucide-react";
import { Button } from "../../components/ui/button";
import { StatusIllustration } from "../../components/ui/StatusIllustration";
import { StatusPage } from "../../components/ui/StatusPage";

export function ErrorPage({
  layout = "screen",
  onRetry,
}: {
  layout?: "fill" | "screen";
  onRetry?: () => void;
}) {
  const [reference] = useState(createErrorReference);

  return (
    <main>
      <StatusPage
        body="Algo inesperado aconteceu ao carregar esta tela e a ação não foi concluída. Tente novamente; se o problema continuar, informe o código de referência ao suporte."
        code="500"
        illustration={<StatusIllustration variant="open-hood" />}
        layout={layout}
        meta={`Código de referência: ${reference}`}
        primaryAction={
          onRetry ? (
            <Button onClick={onRetry} type="button" variant="brand">
              <RotateCcw aria-hidden="true" />
              Tentar novamente
            </Button>
          ) : undefined
        }
        role="alert"
        secondaryAction={
          <Button asChild variant="outline">
            <a href="/">
              <Home aria-hidden="true" />
              Voltar para o início
            </a>
          </Button>
        }
        title="Algo deu errado"
        tone="danger"
      />
    </main>
  );
}

function createErrorReference() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().slice(0, 8);
  }
  return Math.random().toString(36).slice(2, 10);
}
