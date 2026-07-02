import { FileText } from "lucide-react";
import { Logo } from "../../components/ui/logo";
import { kindLabel, statusLabel } from "./documentLabels";
import type { DocumentPreview, WorkspaceDocument } from "./types";

export function DocumentGeneratedPreview({
  document,
  preview,
}: {
  document: WorkspaceDocument;
  preview: DocumentPreview | null;
}) {
  const sections = preview?.sections ?? [];

  return (
    <article className="documents-template-paper documents-generated-paper">
      <div className="documents-template-paper-heading">
        <div className="documents-template-paper-brand">
          <span>
            <Logo className="max-h-5 w-8" variant="white" />
          </span>
          <div>
            <strong>Loja Veículos</strong>
            <small>{kindLabel(document.kind)}</small>
            <small>{statusLabel(document.status)}</small>
          </div>
        </div>
        <div className="documents-template-paper-title">
          <span>Documento emitido</span>
          <strong>{document.title}</strong>
          <small>{document.file.fileName}</small>
        </div>
      </div>

      {sections.length === 0 ? (
        <section className="documents-template-paper-section">
          <h3>Prévia indisponível</h3>
          <p className="documents-template-paper-intro">
            Use visualizar ou baixar para consultar o arquivo original.
          </p>
        </section>
      ) : (
        sections.map((section) => (
          <section
            className="documents-template-paper-section"
            key={section.heading}
          >
            <h3>{section.heading}</h3>
            <dl className="documents-template-paper-fields">
              {section.lines.map((line) => {
                const field = parsePreviewLine(line);
                return (
                  <div key={line}>
                    <dt>{field.label}</dt>
                    <dd>{field.value}</dd>
                  </div>
                );
              })}
            </dl>
          </section>
        ))
      )}

      <div className="documents-template-paper-check">
        <FileText aria-hidden="true" className="size-4" />
        <span>Arquivo vinculado ao histórico operacional da loja.</span>
      </div>

      <footer className="documents-template-paper-signatures">
        <span>Loja / vendedor</span>
        <span>Comprador</span>
      </footer>
    </article>
  );
}

function parsePreviewLine(line: string) {
  const separatorIndex = line.indexOf(":");
  if (separatorIndex === -1) return { label: "Informação", value: line };
  return {
    label: line.slice(0, separatorIndex).trim() || "Informação",
    value: line.slice(separatorIndex + 1).trim() || "-",
  };
}
