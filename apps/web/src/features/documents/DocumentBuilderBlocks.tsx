import {
  BookOpen,
  FilePlus2,
  GripVertical,
  Heading,
  LayoutGrid,
  PenTool,
  Plus,
  Table as TableIcon,
  Trash2,
} from "lucide-react";
import { lazy, Suspense, useState } from "react";
import {
  blockTitle,
  blockTypeLabel,
  createClauseBlock,
  createFieldGridBlock,
  createHeadingBlock,
  createSignatureBlock,
  createTableBlock,
  renderSampleText,
  sampleVariable,
  updateBlockBody,
  type TemplateClauseGroup,
} from "./documentBuilderModel";
import {
  DocumentClauseBankModal,
  type ClauseBankSelection,
} from "./DocumentClauseBankModal";
import {
  FieldGridBlockEditor,
  SignatureBlockEditor,
  TableBlockEditor,
} from "./DocumentBuilderStructuredBlockEditors";
import type { DocumentTemplateBlock } from "./types";

const DocumentRichTextBlockEditor = lazy(() =>
  import("./DocumentRichTextBlockEditor").then((module) => ({
    default: module.DocumentRichTextBlockEditor,
  })),
);

import { getFriendlyVariableLabel } from "./DocumentRichTextBlockEditor";

export function DocumentBuilderBlocks({
  blocks,
  clauseBank,
  isEditable,
  onBlocksChange,
  variables,
}: {
  blocks: readonly DocumentTemplateBlock[];
  clauseBank: readonly TemplateClauseGroup[];
  isEditable: boolean;
  onBlocksChange: (blocks: DocumentTemplateBlock[]) => void;
  variables: readonly string[];
}) {
  const [isBankOpen, setIsBankOpen] = useState(false);

  const updateBlock = (index: number, next: DocumentTemplateBlock) => {
    onBlocksChange(blocks.map((block, i) => (i === index ? next : block)));
  };
  const removeBlock = (index: number) => {
    onBlocksChange(blocks.filter((_block, i) => i !== index));
  };
  const appendBlock = (block: DocumentTemplateBlock) => {
    onBlocksChange([...blocks, block]);
  };

  return (
    <section className="documents-builder-blocks">
      <header className="documents-builder-panel-heading">
        <div>
          <span>Conteúdo do documento</span>
          <h2>Blocos e cláusulas</h2>
        </div>
      </header>

      {isEditable ? (
        <div
          aria-label="Adicionar blocos"
          className="documents-builder-add-bar"
          role="toolbar"
        >
          <button
            className="documents-builder-ghost-action text-xs shrink-0 flex items-center gap-1.5"
            onClick={() => setIsBankOpen(true)}
            type="button"
            title="Explorar e inserir cláusulas prontas do sistema"
          >
            <BookOpen
              aria-hidden="true"
              className="size-4 text-accent-strong shrink-0"
            />
            <span>Banco de Cláusulas</span>
          </button>
          <button
            className="documents-builder-ghost-action text-xs shrink-0 flex items-center gap-1.5"
            onClick={() => appendBlock(createHeadingBlock())}
            type="button"
            title="Adicionar título de seção"
          >
            <Heading aria-hidden="true" className="size-3.5 shrink-0" />
            <span>+ Título</span>
          </button>
          <button
            className="documents-builder-ghost-action text-xs shrink-0 flex items-center gap-1.5"
            onClick={() => appendBlock(createFieldGridBlock())}
            type="button"
            title="Adicionar grade de campos (Veículo / Comprador / Loja)"
          >
            <LayoutGrid aria-hidden="true" className="size-3.5 shrink-0" />
            <span>+ Campos</span>
          </button>
          <button
            className="documents-builder-ghost-action text-xs shrink-0 flex items-center gap-1.5"
            onClick={() => appendBlock(createSignatureBlock())}
            type="button"
            title="Adicionar bloco de assinaturas"
          >
            <PenTool aria-hidden="true" className="size-3.5 shrink-0" />
            <span>+ Assinaturas</span>
          </button>
          <button
            className="documents-builder-ghost-action text-xs shrink-0 flex items-center gap-1.5"
            onClick={() => appendBlock(createTableBlock())}
            type="button"
            title="Adicionar tabela de valores ou pagamentos"
          >
            <TableIcon aria-hidden="true" className="size-3.5 shrink-0" />
            <span>+ Tabela</span>
          </button>
          <button
            className="documents-builder-primary-action text-xs shrink-0 flex items-center gap-1.5"
            onClick={() => {
              const clauseCount = blocks.filter(
                (b) => b.type === "clause" || b.type === "paragraph",
              ).length;
              appendBlock(createClauseBlock("", `Cláusula ${clauseCount + 1}`));
            }}
            type="button"
            title="Adicionar nova cláusula ao documento"
          >
            <Plus aria-hidden="true" className="size-4 shrink-0" />
            <span>+ Cláusula</span>
          </button>
        </div>
      ) : null}

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
                <small>{blockTypeLabel(block.type)}</small>
                <strong>{blockTitle(block, index)}</strong>
              </div>
              {isEditable ? (
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

      {/* Clause Bank Dialog */}
      {isBankOpen ? (
        <DocumentClauseBankModal
          clauseBank={clauseBank}
          onClose={() => setIsBankOpen(false)}
          onInsert={(selection: ClauseBankSelection) => {
            appendBlock(createClauseBlock(selection.body, selection.label));
            setIsBankOpen(false);
          }}
        />
      ) : null}
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
      <label className="documents-builder-field-label">
        <span>Título da seção</span>
        <input
          className="documents-builder-title-input"
          onChange={(event) => onChange({ ...block, text: event.target.value })}
          value={block.text}
        />
      </label>
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
          placeholder="Escreva a cláusula e insira variáveis pelos botões acima"
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
    return isEditable ? (
      <FieldGridBlockEditor
        block={block}
        onChange={onChange}
        variables={variables}
      />
    ) : (
      <dl className="documents-builder-field-grid">
        {block.fields.map((field, index) => (
          <div key={`${block.id}-${field.token}-${index}`}>
            <dt>{field.label}</dt>
            <dd>
              <code>{getFriendlyVariableLabel(field.token)}</code>
              <span>{sampleVariable(field.token)}</span>
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  if (block.type === "table") {
    return isEditable ? (
      <TableBlockEditor block={block} onChange={onChange} />
    ) : (
      <div className="documents-builder-table-block">
        {block.columns.map((column, index) => (
          <span key={`${column}-${index}`}>{column}</span>
        ))}
      </div>
    );
  }

  if (block.type === "signature") {
    return isEditable ? (
      <SignatureBlockEditor block={block} onChange={onChange} />
    ) : (
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
