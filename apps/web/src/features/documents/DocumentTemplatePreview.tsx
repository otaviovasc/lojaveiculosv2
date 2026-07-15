import { BadgeCheck, FileText } from "lucide-react";
import { Logo } from "../../components/ui/logo";
import { kindLabel } from "./documentLabels";
import type { DocumentTemplatePreviewModel } from "./documentTemplatePreviewModel";
import type { DocumentKind } from "./types";

export function DocumentTemplatePreview({
  isCustomized,
  kind,
  preview,
}: {
  isCustomized: boolean;
  kind: DocumentKind;
  preview: DocumentTemplatePreviewModel;
}) {
  return (
    <section
      aria-label="Prévia do documento"
      className="documents-template-preview-pane"
    >
      <header>
        <div>
          <FileText aria-hidden="true" className="size-4" />
          <span>Prévia do documento</span>
        </div>
        <strong>{isCustomized ? "Personalizado" : "Padrão"}</strong>
      </header>

      <article className="documents-template-paper">
        <div className="documents-template-paper-heading">
          <div className="documents-template-paper-brand">
            <span>
              <Logo className="max-h-5 w-8" variant="white" />
            </span>
            <div>
              <strong>{preview.store.name}</strong>
              <small>CNPJ {preview.store.cnpj}</small>
              <small>{preview.store.address}</small>
            </div>
          </div>
          <div className="documents-template-paper-title">
            <span>{kindLabel(kind)}</span>
            <strong>{preview.title}</strong>
            <small>
              {preview.documentNumber} | {preview.issuedAt}
            </small>
          </div>
        </div>

        <p className="documents-template-paper-intro">{preview.intro}</p>

        {preview.sections.map((section) => (
          <section
            className="documents-template-paper-section"
            key={section.title}
          >
            <h3>{section.title}</h3>
            <dl className="documents-template-paper-fields">
              {section.fields.map((item) => (
                <div key={item.label}>
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}

        {preview.finance.length ? (
          <section className="documents-template-paper-section">
            <h3>{preview.financeSectionTitle}</h3>
            <dl className="documents-template-paper-fields">
              {preview.finance.map((item) => (
                <div key={item.label}>
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        <section className="documents-template-paper-clauses">
          <h3>Cláusulas do modelo</h3>
          {preview.clauses.map((clause, index) => (
            <p key={`${index}-${clause}`}>
              <span>Cláusula {index + 1}</span>
              {clause}
            </p>
          ))}
        </section>

        <div className="documents-template-paper-check">
          <BadgeCheck aria-hidden="true" className="size-4" />
          <span>
            Documento gerado com dados de exemplo para conferência visual.
          </span>
        </div>

        <footer className="documents-template-paper-signatures">
          <span>{preview.store.name}</span>
          <span>Ana Cliente</span>
        </footer>
      </article>
    </section>
  );
}
