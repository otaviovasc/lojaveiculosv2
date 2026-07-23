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
  createBuyerFieldsBlock,
  createClauseBlock,
  createConsignmentSignaturesBlock,
  createDriverFieldsBlock,
  createFieldGridBlock,
  createFinanceDetailTableBlock,
  createFinanceFieldsBlock,
  createHeadingBlock,
  createPaymentTableBlock,
  createReceiptSignaturesBlock,
  createSaleSignaturesBlock,
  createSignatureBlock,
  createTableBlock,
  createTestDriveSignaturesBlock,
  createVehicleFieldsBlock,
  renderSampleText,
  sampleVariable,
  updateBlockBody,
  type TemplateClauseGroup,
} from "./documentBuilderModel";
import { FeatureSelect } from "../../components/ui/FeatureControls";
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

import {
  getFriendlyVariableLabel,
  renderTextWithVariableChips,
  VariableBadgeChip,
} from "./DocumentRichTextBlockEditor";

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
          className="documents-builder-add-bar flex flex-wrap gap-2 items-center"
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
          <div className="shrink-0 min-w-[11rem]">
            <FeatureSelect
              ariaLabel="Adicionar cabeçalho ou título"
              density="compact"
              onChange={(val) => {
                if (val === "sale_contract")
                  appendBlock(
                    createHeadingBlock("CONTRATO DE COMPRA E VENDA DE VEÍCULO"),
                  );
                if (val === "delivery_term")
                  appendBlock(
                    createHeadingBlock("TERMO DE ENTREGA E RESPONSABILIDADE"),
                  );
                if (val === "reservation_receipt")
                  appendBlock(
                    createHeadingBlock("RECIBO DE SINAL DE RESERVA DE VEÍCULO"),
                  );
                if (val === "power_of_attorney")
                  appendBlock(
                    createHeadingBlock("PROCURAÇÃO ESPECÍFICA PARA DETRAN"),
                  );
                if (val === "warranty_cert")
                  appendBlock(
                    createHeadingBlock(
                      "CERTIFICADO DE GARANTIA DE VEÍCULO USADO",
                    ),
                  );
                if (val === "custom_heading")
                  appendBlock(createHeadingBlock("Novo Título de Seção"));
              }}
              options={[
                { label: "+ Cabeçalho: Contrato", value: "sale_contract" },
                { label: "+ Cabeçalho: Entrega", value: "delivery_term" },
                {
                  label: "+ Cabeçalho: Recibo Reserva",
                  value: "reservation_receipt",
                },
                {
                  label: "+ Cabeçalho: Procuração",
                  value: "power_of_attorney",
                },
                { label: "+ Cabeçalho: Garantia", value: "warranty_cert" },
                { label: "+ Título de Seção", value: "custom_heading" },
              ]}
              value=""
            />
          </div>
          <div className="shrink-0 min-w-[10rem]">
            <FeatureSelect
              ariaLabel="Adicionar bloco de campos"
              density="compact"
              onChange={(val) => {
                if (val === "vehicle") appendBlock(createVehicleFieldsBlock());
                if (val === "buyer") appendBlock(createBuyerFieldsBlock());
                if (val === "finance") appendBlock(createFinanceFieldsBlock());
                if (val === "driver") appendBlock(createDriverFieldsBlock());
              }}
              options={[
                { label: "+ Campos: Veículo", value: "vehicle" },
                { label: "+ Campos: Comprador", value: "buyer" },
                { label: "+ Campos: Financeiro", value: "finance" },
                { label: "+ Campos: Condutor", value: "driver" },
              ]}
              value=""
            />
          </div>
          <div className="shrink-0 min-w-[11rem]">
            <FeatureSelect
              ariaLabel="Adicionar bloco de assinaturas"
              density="compact"
              onChange={(val) => {
                if (val === "sale") appendBlock(createSaleSignaturesBlock());
                if (val === "testdrive")
                  appendBlock(createTestDriveSignaturesBlock());
                if (val === "consignment")
                  appendBlock(createConsignmentSignaturesBlock());
                if (val === "receipt")
                  appendBlock(createReceiptSignaturesBlock());
              }}
              options={[
                { label: "+ Assinaturas: Venda", value: "sale" },
                { label: "+ Assinaturas: Test Drive", value: "testdrive" },
                { label: "+ Assinaturas: Consignação", value: "consignment" },
                { label: "+ Assinaturas: Recibo", value: "receipt" },
              ]}
              value=""
            />
          </div>
          <div className="shrink-0 min-w-[10rem]">
            <FeatureSelect
              ariaLabel="Adicionar tabela"
              density="compact"
              onChange={(val) => {
                if (val === "payments") appendBlock(createPaymentTableBlock());
                if (val === "detail")
                  appendBlock(createFinanceDetailTableBlock());
              }}
              options={[
                { label: "+ Tabela: Pagamentos", value: "payments" },
                { label: "+ Tabela: Custos/Valores", value: "detail" },
              ]}
              value=""
            />
          </div>
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
          onChange={(value) => onChange({ ...block, text: value })}
          placeholder="Escreva o título da seção…"
          value={block.text}
          variables={variables}
        />
      </Suspense>
    ) : (
      <p className="documents-builder-block-preview font-bold text-app-text">
        {renderSampleText(block.text)}
      </p>
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
              <span className="font-semibold text-app-text">
                {sampleVariable(field.token)}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  if (block.type === "table") {
    return isEditable ? (
      <TableBlockEditor
        block={block}
        onChange={onChange}
        variables={variables}
      />
    ) : (
      <div className="documents-builder-table-block flex flex-col gap-2">
        {block.title ? (
          <strong className="text-xs font-bold text-muted uppercase">
            {renderSampleText(block.title)}
          </strong>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {block.columns.map((column, index) => (
            <span key={`${column}-${index}`}>{renderSampleText(column)}</span>
          ))}
        </div>
      </div>
    );
  }

  if (block.type === "signature") {
    return isEditable ? (
      <SignatureBlockEditor
        block={block}
        onChange={onChange}
        variables={variables}
      />
    ) : (
      <div className="documents-builder-signature-block flex flex-col gap-2">
        {block.title ? (
          <strong className="text-xs font-bold text-muted uppercase">
            {renderSampleText(block.title)}
          </strong>
        ) : null}
        <div className="flex flex-wrap gap-3">
          {block.roles.map((role, index) => (
            <span key={`${role}-${index}`}>{renderSampleText(role)}</span>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

function isTextBlock(block: DocumentTemplateBlock) {
  return block.type === "clause" || block.type === "paragraph";
}
