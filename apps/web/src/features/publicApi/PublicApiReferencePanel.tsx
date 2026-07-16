import {
  Check,
  ChevronDown,
  Copy,
  FileJson,
  Route,
  ShieldCheck,
  TerminalSquare,
} from "lucide-react";
import { useState } from "react";
import { FeatureSection } from "../../components/ui/FeatureLayout";
import { publicApiBasePath, publicApiResources } from "./publicApiCatalog";
import {
  createCurlExample,
  publicApiEndpoints,
} from "./publicApiRuntimeCatalog";

export function PublicApiReferencePanel({
  copiedId,
  deploymentBaseUrl,
  onCopy,
}: {
  copiedId: string | null;
  deploymentBaseUrl: string;
  onCopy: (value: string, id: string) => Promise<void>;
}) {
  const [view, setView] = useState<"endpoints" | "resources">("resources");
  const apiBaseUrl = `${deploymentBaseUrl.replace(/\/$/, "")}${publicApiBasePath}`;

  return (
    <FeatureSection
      className="internal-panel public-api-panel public-api-reference"
      description="Documentação para pessoas, contratos para ferramentas e exemplos executáveis no mesmo lugar."
      headerClassName="internal-panel-title"
      icon={<Route aria-hidden="true" className="size-5" />}
      title="Central do desenvolvedor"
    >
      <div className="public-api-reference-overview">
        <div className="public-api-quickstart">
          <p>
            <TerminalSquare aria-hidden="true" className="size-4" />
            Quickstart
          </p>
          <h4>Da chave ao primeiro request.</h4>
          <p>
            Use a URL abaixo, envie <code>x-api-key</code> e adicione uma chave
            de idempotência sempre que alterar dados.
          </p>
          <div className="public-api-quickstart__endpoint">
            <small>Endpoint base</small>
            <code>{apiBaseUrl}</code>
            <button
              aria-label={
                copiedId === "base-url"
                  ? "URL da API copiada"
                  : "Copiar URL da API"
              }
              className="internal-icon-action"
              onClick={() => void onCopy(apiBaseUrl, "base-url")}
              title="Copiar URL da API"
              type="button"
            >
              {copiedId === "base-url" ? (
                <Check aria-hidden="true" className="size-4" />
              ) : (
                <Copy aria-hidden="true" className="size-4" />
              )}
            </button>
          </div>
          <small className="public-api-quickstart__security">
            <ShieldCheck aria-hidden="true" className="size-4" />
            Nunca exponha a chave no navegador ou em repositórios.
          </small>
        </div>

        <div className="public-api-reference-index">
          <span>Explore o contrato</span>
          <strong>Escolha o formato ideal para sua integração.</strong>
          <p>
            Gere um SDK pelo OpenAPI, dê contexto a um agente com llms.txt ou
            copie um curl pronto para testar agora.
          </p>
          <div
            aria-label="Conteúdo da referência pública"
            className="public-api-reference-switch"
            role="group"
          >
            <button
              aria-pressed={view === "resources"}
              className={view === "resources" ? "is-active" : undefined}
              onClick={() => setView("resources")}
              type="button"
            >
              Artefatos <span>{publicApiResources.length}</span>
            </button>
            <button
              aria-pressed={view === "endpoints"}
              className={view === "endpoints" ? "is-active" : undefined}
              onClick={() => setView("endpoints")}
              type="button"
            >
              Rotas <span>{publicApiEndpoints.length}</span>
            </button>
          </div>
        </div>
      </div>

      {view === "resources" ? (
        <div className="public-api-resource-grid">
          {publicApiResources.map((resource) => (
            <button
              aria-label={`Copiar rota do artefato ${resource.label}`}
              key={resource.path}
              onClick={() => void onCopy(resource.path, resource.path)}
              type="button"
            >
              <span className="public-api-resource-icon">
                <resource.icon aria-hidden="true" className="size-4" />
              </span>
              <span className="public-api-resource-copy">
                <strong>{resource.label}</strong>
                <small>{resource.description}</small>
                <code>{resource.path}</code>
              </span>
              <span className="public-api-resource-action">
                {copiedId === resource.path ? (
                  <Check aria-hidden="true" className="size-4" />
                ) : (
                  <Copy aria-hidden="true" className="size-4" />
                )}
                {copiedId === resource.path ? "Copiado" : "Copiar rota"}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {view === "endpoints" ? (
        <div className="public-api-endpoints">
          {publicApiEndpoints.map((endpoint) => {
            const copyId = `${endpoint.method}:${endpoint.path}`;
            const curl = createCurlExample(endpoint, deploymentBaseUrl);
            return (
              <details key={copyId}>
                <summary>
                  <span data-method={endpoint.method}>{endpoint.method}</span>
                  <div>
                    <strong>{endpoint.title}</strong>
                    <code>{endpoint.path}</code>
                  </div>
                  <span className="public-api-endpoint-scope">
                    {endpoint.scopes[0]}
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className="public-api-endpoint-chevron size-4"
                  />
                </summary>
                <div className="public-api-endpoint-body">
                  <p>{endpoint.description}</p>
                  <div className="public-api-scope-chips">
                    {endpoint.scopes.map((scope) => (
                      <code key={scope}>{scope}</code>
                    ))}
                  </div>
                  <pre
                    aria-label={`Exemplo curl para ${endpoint.title}`}
                    tabIndex={0}
                  >
                    <code>{curl}</code>
                  </pre>
                  <button
                    aria-label={`Copiar curl de ${endpoint.title}`}
                    className="documents-top-bar-action"
                    onClick={() => void onCopy(curl, copyId)}
                    type="button"
                  >
                    {copiedId === copyId ? (
                      <Check aria-hidden="true" className="size-4" />
                    ) : (
                      <FileJson aria-hidden="true" className="size-4" />
                    )}
                    <span>
                      {copiedId === copyId ? "Copiado" : "Copiar curl"}
                    </span>
                  </button>
                </div>
              </details>
            );
          })}
        </div>
      ) : null}
    </FeatureSection>
  );
}
