import { FilePlus2, GripVertical, Trash2 } from "lucide-react";
import { DocumentRichTextBlockEditor } from "./DocumentRichTextBlockEditor";
import {
  blockTitle,
  createClauseBlock,
  renderSampleText,
  sampleVariable,
  updateBlockBody,
} from "./documentBuilderModel";
import type { DocumentTemplateBlock } from "./types";

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
          <strong>Blocos do documento</strong>
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
          <article className="documents-builder-block" key={block.id}>
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
      <DocumentRichTextBlockEditor
        onChange={(value) => onChange(updateBlockBody(block, value))}
        placeholder="Escreva usando variáveis como {{buyer.name}}"
        value={block.body}
        variables={variables}
      />
    ) : (
      <p className="documents-builder-block-preview">
        {renderSampleText(block.body)}
      </p>
    );
  }

  if (block.type === "field_grid") {
    return (
      <dl className="documents-builder-field-grid">
        {block.fields.map((field) => (
          <div key={`${block.id}-${field.token}`}>
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
        {block.columns.map((column) => (
          <span key={column}>{column}</span>
        ))}
      </div>
    );
  }

  if (block.type === "signature") {
    return (
      <div className="documents-builder-signature-block">
        {block.roles.map((role) => (
          <span key={role}>{role}</span>
        ))}
      </div>
    );
  }

  return null;
}

function isTextBlock(block: DocumentTemplateBlock) {
  return block.type === "clause" || block.type === "paragraph";
}
