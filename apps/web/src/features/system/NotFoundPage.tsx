import { Home, LayoutDashboard } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { StatusIllustration } from "../../components/ui/StatusIllustration";
import { StatusPage } from "../../components/ui/StatusPage";

export function NotFoundPage() {
  return (
    <main>
      <StatusPage
        body="O endereço que você tentou abrir não existe ou saiu do ar. Confira o link digitado ou volte para uma área conhecida."
        code="404"
        illustration={<StatusIllustration variant="lost-car" />}
        primaryAction={
          <Button asChild variant="brand">
            <Link to="/">
              <Home aria-hidden="true" />
              Voltar para o início
            </Link>
          </Button>
        }
        secondaryAction={
          <Button asChild variant="outline">
            <Link to="/dashboard">
              <LayoutDashboard aria-hidden="true" />
              Ir para o painel
            </Link>
          </Button>
        }
        title="Página não encontrada"
      />
    </main>
  );
}
