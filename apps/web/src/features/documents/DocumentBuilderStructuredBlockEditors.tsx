import { Trash2 } from "lucide-react";
import { FeatureSelect } from "../../components/ui/FeatureControls";
import {
  getFriendlyVariableLabel,
  renderTextWithVariableChips,
  VariableBadgeChip,
} from "./DocumentRichTextBlockEditor";
import type { DocumentTemplateBlock } from "./types";

type FieldGridBlock = Extract<DocumentTemplateBlock, { type: "field_grid" }>;
type TableBlock = Extract<DocumentTemplateBlock, { type: "table" }>;
type SignatureBlock = Extract<DocumentTemplateBlock, { type: "signature" }>;

export function FieldGridBlockEditor({
  block,
  onChange,
  variables,
}: {
  block: FieldGridBlock;
  onChange: (block: DocumentTemplateBlock) => void;
  variables: readonly string[];
}) {
  const updateField = (
    index: number,
    next: FieldGridBlock["fields"][number],
  ) => {
    onChange({
      ...block,
      fields: block.fields.map((field, i) => (i === index ? next : field)),
    });
  };
  const removeField = (index: number) => {
    onChange({
      ...block,
      fields: block.fields.filter((_field, i) => i !== index),
    });
  };
  const addField = () => {
    onChange({
      ...block,
      fields: [
        ...block.fields,
        { label: "Novo campo", token: variables[0] ?? "{{store.name}}" },
      ],
    });
  };

  return (
    <div className="documents-builder-structured-editor">
      <label className="documents-builder-field-label">
        <span>Título do grupo de campos</span>
        <input
          className="documents-builder-title-input"
          onChange={(event) =>
            onChange({ ...block, title: event.target.value })
          }
          value={block.title}
        />
      </label>
      <div className="documents-builder-structured-rows">
        {block.fields.map((field, index) => {
          const options = variables.includes(field.token)
            ? variables
            : [field.token, ...variables];
          return (
            <div
              className="documents-builder-structured-row"
              key={`${block.id}-field-${index}`}
            >
              <label className="documents-builder-field-label">
                <span>Rótulo do campo</span>
                <input
                  className="documents-builder-title-input"
                  onChange={(event) =>
                    updateField(index, { ...field, label: event.target.value })
                  }
                  value={field.label}
                />
              </label>
              <label className="documents-builder-field-label">
                <span className="flex items-center justify-between gap-2">
                  <span>Variável</span>
                  <VariableBadgeChip token={field.token} />
                </span>
                <FeatureSelect
                  ariaLabel="Variável do campo"
                  density="compact"
                  onChange={(token) => updateField(index, { ...field, token })}
                  options={options.map((token) => ({
                    label: getFriendlyVariableLabel(token),
                    value: token,
                  }))}
                  searchable
                  searchPlaceholder="Buscar variável…"
                  value={field.token}
                />
              </label>
              <button
                aria-label="Remover campo"
                className="documents-builder-icon-action"
                disabled={block.fields.length <= 1}
                onClick={() => removeField(index)}
                title="Remover campo"
                type="button"
              >
                <Trash2 aria-hidden="true" className="size-4" />
              </button>
            </div>
          );
        })}
        <button
          className="documents-builder-ghost-action"
          onClick={addField}
          type="button"
        >
          + Adicionar campo
        </button>
      </div>
    </div>
  );
}

function StructuredItemEditor({
  ariaLabel,
  customPlaceholder,
  itemValue,
  labelPrefix,
  onRemove,
  onUpdate,
  variables,
}: {
  ariaLabel: string;
  customPlaceholder: string;
  itemValue: string;
  labelPrefix: string;
  onRemove: () => void;
  onUpdate: (val: string) => void;
  variables: readonly string[];
}) {
  const isVariable =
    variables.includes(itemValue) || /^\{\{[^{}]+\}\}$/.test(itemValue);
  const selectedMode = isVariable ? itemValue : "custom";

  const options = [
    ...variables.map((token) => ({
      label: getFriendlyVariableLabel(token),
      value: token,
    })),
    { label: "Texto livre…", value: "custom" },
  ];

  return (
    <div className="documents-builder-structured-row">
      <label className="documents-builder-field-label">
        <span className="flex items-center justify-between gap-2">
          <span>{labelPrefix}</span>
          {isVariable ? <VariableBadgeChip token={itemValue} /> : null}
        </span>
        <div className="flex gap-2 items-center w-full">
          <div
            className={selectedMode === "custom" ? "w-44 shrink-0" : "w-full"}
          >
            <FeatureSelect
              ariaLabel={ariaLabel}
              density="compact"
              onChange={(val) => {
                if (val === "custom") {
                  onUpdate(isVariable ? "" : itemValue);
                } else {
                  onUpdate(val);
                }
              }}
              options={options}
              searchable
              searchPlaceholder="Buscar opção…"
              value={selectedMode}
            />
          </div>
          {selectedMode === "custom" && (
            <input
              className="documents-builder-title-input flex-1 grow min-w-[14rem]"
              onChange={(e) => onUpdate(e.target.value)}
              placeholder={customPlaceholder}
              value={isVariable ? "" : itemValue}
            />
          )}
        </div>
      </label>
      <button
        aria-label="Remover item"
        className="documents-builder-icon-action"
        onClick={onRemove}
        type="button"
      >
        <Trash2 aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}

export function TableBlockEditor({
  block,
  onChange,
  variables = [],
}: {
  block: TableBlock;
  onChange: (block: DocumentTemplateBlock) => void;
  variables?: readonly string[];
}) {
  const updateColumn = (index: number, value: string) => {
    onChange({
      ...block,
      columns: block.columns.map((column, i) => (i === index ? value : column)),
    });
  };
  const removeColumn = (index: number) => {
    onChange({
      ...block,
      columns: block.columns.filter((_column, i) => i !== index),
    });
  };
  const addColumn = () => {
    onChange({ ...block, columns: [...block.columns, "Nova coluna"] });
  };

  return (
    <div className="documents-builder-structured-editor">
      <label className="documents-builder-field-label">
        <span className="flex items-center justify-between">
          <span>Título da tabela</span>
          {renderTextWithVariableChips(block.title)}
        </span>
        <input
          className="documents-builder-title-input"
          onChange={(event) =>
            onChange({ ...block, title: event.target.value })
          }
          value={block.title}
        />
      </label>
      <div
        aria-label="Colunas"
        className="documents-builder-structured-rows"
        role="group"
      >
        <span className="documents-builder-structured-group-label">
          Colunas
        </span>
        {block.columns.map((column, index) => (
          <StructuredItemEditor
            ariaLabel={`Coluna ${index + 1}`}
            customPlaceholder="Ex: Descrição, Vencimento..."
            itemValue={column}
            key={`${block.id}-column-${index}`}
            labelPrefix={`Coluna ${index + 1}`}
            onRemove={() => removeColumn(index)}
            onUpdate={(val) => updateColumn(index, val)}
            variables={variables}
          />
        ))}
        <button
          className="documents-builder-ghost-action"
          onClick={addColumn}
          type="button"
        >
          + Adicionar coluna
        </button>
      </div>
    </div>
  );
}

export function SignatureBlockEditor({
  block,
  onChange,
  variables = [],
}: {
  block: SignatureBlock;
  onChange: (block: DocumentTemplateBlock) => void;
  variables?: readonly string[];
}) {
  const updateRole = (index: number, value: string) => {
    onChange({
      ...block,
      roles: block.roles.map((role, i) => (i === index ? value : role)),
    });
  };
  const removeRole = (index: number) => {
    onChange({
      ...block,
      roles: block.roles.filter((_role, i) => i !== index),
    });
  };
  const addRole = () => {
    onChange({ ...block, roles: [...block.roles, "Novo signatário"] });
  };

  return (
    <div className="documents-builder-structured-editor">
      <label className="documents-builder-field-label">
        <span className="flex items-center justify-between">
          <span>Título do bloco de assinaturas</span>
          {block.title ? renderTextWithVariableChips(block.title) : null}
        </span>
        <input
          className="documents-builder-title-input"
          onChange={(event) =>
            onChange({ ...block, title: event.target.value })
          }
          value={block.title ?? ""}
        />
      </label>
      <div
        aria-label="Signatários"
        className="documents-builder-structured-rows"
        role="group"
      >
        <span className="documents-builder-structured-group-label">
          Signatários
        </span>
        {block.roles.map((role, index) => (
          <StructuredItemEditor
            ariaLabel={`Signatário ${index + 1}`}
            customPlaceholder="Ex: Testemunha 1, Fiador..."
            itemValue={role}
            key={`${block.id}-role-${index}`}
            labelPrefix={`Signatário ${index + 1}`}
            onRemove={() => removeRole(index)}
            onUpdate={(val) => updateRole(index, val)}
            variables={variables}
          />
        ))}
        <button
          className="documents-builder-ghost-action"
          onClick={addRole}
          type="button"
        >
          + Adicionar signatário
        </button>
      </div>
    </div>
  );
}
