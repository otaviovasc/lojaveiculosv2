import { FilePlus2, GripVertical, Trash2 } from "lucide-react";
import { lazy, Suspense } from "react";
import {
  blockTitle,
  createClauseBlock,
  renderSampleText,
  sampleVariable,
  updateBlockBody,
} from "./documentBuilderModel";
import type { DocumentTemplateBlock } from "./types";

const DocumentRichTextBlockEditor = lazy(() =>
  import("./DocumentRichTextBlockEditor").then((module) => ({
    default: module.DocumentRichTextBlockEditor,
  })),
);

export function DocumentBuilderBlocks({
  blocks,
  isEditable,
  onBlocksChange,
  variables,
}: {
  blocks: readonly DocumentTemplateBlock[];
  isEditable: boolean;
  onBlocksChange: (blocks: DocumentTemplateBlock[]) => void;
  variables: readonly string[];
}) {
  const updateBlock = (index: number, next: DocumentTemplateBlock) => {
    onBlocksChange(blocks.map((block, i) => (i === index ? next : block)));
  };
  const removeBlock = (index: number) => {
    onBlocksChange(blocks.filter((_block, i) => i !== index));
  };

  return (
    <section className="documents-builder-blocks">
      <header className="documents-builder-panel-heading">
        <div>
          <span>Estrutura compartilhada</span>
          <h2>Blocos do documento</h2>
        </div>
        <button
          disabled={!isEditable}
          onClick={() => onBlocksChange([...blocks, createClauseBlock()])}
          type="button"
        >
          <FilePlus2 aria-hidden="true" className="size-4" />
          Cláusula
        </button>
      </header>

      <div className="documents-builder-block-list">
        {blocks.map((block, index) => (
          <article
            className="documents-builder-block"
            data-block-type={block.type}
            key={`${block.id}-${index}`}
          >
            <header>
              <span className="documents-builder-block-handle">
                <GripVertical aria-hidden="true" className="size-4" />
              </span>
              <div>
                <small>{block.type}</small>
                <strong>{blockTitle(block, index)}</strong>
              </div>
              {isEditable && isTextBlock(block) ? (
                <button
                  aria-label="Remover bloco"
                  className="documents-builder-icon-action"
                  disabled={blocks.length <= 1}
                  onClick={() => removeBlock(index)}
                  title="Remover bloco"
                  type="button"
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
              ) : null}
            </header>
            {renderBlock({
              block,
              isEditable,
              onChange: (next) => updateBlock(index, next),
              variables,
            })}
          </article>
        ))}
      </div>
    </section>
  );
}

function renderBlock({
  block,
  isEditable,
  onChange,
  variables,
}: {
  block: DocumentTemplateBlock;
  isEditable: boolean;
  onChange: (block: DocumentTemplateBlock) => void;
  variables: readonly string[];
}) {
  if (block.type === "heading") {
    return isEditable ? (
      <input
        className="documents-builder-title-input"
        onChange={(event) => onChange({ ...block, text: event.target.value })}
        value={block.text}
      />
    ) : (
      <p className="documents-builder-block-preview">{block.text}</p>
    );
  }

  if (block.type === "clause" || block.type === "paragraph") {
    return isEditable ? (
      <Suspense
        fallback={
          <div
            aria-live="polite"
            className="documents-builder-block-preview"
            role="status"
          >
            Carregando editor…
          </div>
        }
      >
        <DocumentRichTextBlockEditor
          onChange={(value) => onChange(updateBlockBody(block, value))}
          placeholder="Escreva usando variáveis como {{buyer.name}}"
          value={block.body}
          variables={variables}
        />
      </Suspense>
    ) : (
      <p className="documents-builder-block-preview">
        {renderSampleText(block.body)}
      </p>
    );
  }

  if (block.type === "field_grid") {
    return (
      <dl className="documents-builder-field-grid">
        {block.fields.map((field, index) => (
          <div key={`${block.id}-${field.token}-${index}`}>
            <dt>{field.label}</dt>
            <dd>
              <code>{field.token}</code>
              <span>{sampleVariable(field.token)}</span>
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  if (block.type === "table") {
    return (
      <div className="documents-builder-table-block">
        {block.columns.map((column, index) => (
          <span key={`${column}-${index}`}>{column}</span>
        ))}
      </div>
    );
  }

  if (block.type === "signature") {
    return (
      <div className="documents-builder-signature-block">
        {block.roles.map((role, index) => (
          <span key={`${role}-${index}`}>{role}</span>
        ))}
      </div>
    );
  }

  return null;
}

function isTextBlock(block: DocumentTemplateBlock) {
  return block.type === "clause" || block.type === "paragraph";
}
