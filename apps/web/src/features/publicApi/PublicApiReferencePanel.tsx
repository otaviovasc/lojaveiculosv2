import { Check, Copy, FileJson, Route } from "lucide-react";
import { FeatureSection } from "../../components/ui/FeatureLayout";
import {
  createCurlExample,
  publicApiEndpoints,
  publicApiResources,
} from "./publicApiCatalog";

export function PublicApiReferencePanel({
  copiedId,
  onCopy,
}: {
  copiedId: string | null;
  onCopy: (value: string, id: string) => void;
}) {
  return (
    <FeatureSection
      className="internal-panel public-api-panel"
      description="Contrato externo limpo para builders, SDKs, agentes e integracoes comerciais."
      headerClassName="internal-panel-title"
      icon={<Route aria-hidden="true" className="size-5" />}
      title="Referencia publica"
    >
      <div className="public-api-resource-grid">
        {publicApiResources.map((resource) => (
          <button
            key={resource.path}
            onClick={() => onCopy(resource.path, resource.path)}
            type="button"
          >
            <resource.icon aria-hidden="true" className="size-4" />
            <span>
              <strong>{resource.label}</strong>
              <small>{resource.description}</small>
              <code>{resource.path}</code>
            </span>
            {copiedId === resource.path ? (
              <Check aria-hidden="true" className="size-4" />
            ) : (
              <Copy aria-hidden="true" className="size-4" />
            )}
          </button>
        ))}
      </div>

      <div className="public-api-endpoints">
        {publicApiEndpoints.map((endpoint) => {
          const copyId = `${endpoint.method}:${endpoint.path}`;
          const curl = createCurlExample(endpoint);
          return (
            <article key={copyId}>
              <header>
                <span data-method={endpoint.method}>{endpoint.method}</span>
                <div>
                  <strong>{endpoint.title}</strong>
                  <code>{endpoint.path}</code>
                </div>
              </header>
              <p>{endpoint.description}</p>
              <div className="public-api-scope-chips">
                {endpoint.scopes.map((scope) => (
                  <code key={scope}>{scope}</code>
                ))}
              </div>
              <pre>
                <code>{curl}</code>
              </pre>
              <button
                className="documents-top-bar-action"
                onClick={() => onCopy(curl, copyId)}
                type="button"
              >
                {copiedId === copyId ? (
                  <Check aria-hidden="true" className="size-4" />
                ) : (
                  <FileJson aria-hidden="true" className="size-4" />
                )}
                <span>{copiedId === copyId ? "Copiado" : "Copiar curl"}</span>
              </button>
            </article>
          );
        })}
      </div>
    </FeatureSection>
  );
}
