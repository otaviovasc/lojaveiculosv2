import { Trash2 } from "lucide-react";
import { FeatureSelect } from "../../components/ui/FeatureControls";
import { getFriendlyVariableLabel } from "./DocumentRichTextBlockEditor";
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
                <span>Variável</span>
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

export function TableBlockEditor({
  block,
  onChange,
}: {
  block: TableBlock;
  onChange: (block: DocumentTemplateBlock) => void;
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
        <span>Título da tabela</span>
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
          <div
            className="documents-builder-structured-row"
            key={`${block.id}-column-${index}`}
          >
            <label className="documents-builder-field-label">
              <span>Coluna {index + 1}</span>
              <input
                className="documents-builder-title-input"
                onChange={(event) => updateColumn(index, event.target.value)}
                value={column}
              />
            </label>
            <button
              aria-label="Remover coluna"
              className="documents-builder-icon-action"
              disabled={block.columns.length <= 1}
              onClick={() => removeColumn(index)}
              title="Remover coluna"
              type="button"
            >
              <Trash2 aria-hidden="true" className="size-4" />
            </button>
          </div>
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
}: {
  block: SignatureBlock;
  onChange: (block: DocumentTemplateBlock) => void;
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
        <span>Título do bloco de assinaturas</span>
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
          <div
            className="documents-builder-structured-row"
            key={`${block.id}-role-${index}`}
          >
            <label className="documents-builder-field-label">
              <span>Signatário {index + 1}</span>
              <input
                className="documents-builder-title-input"
                onChange={(event) => updateRole(index, event.target.value)}
                value={role}
              />
            </label>
            <button
              aria-label="Remover signatário"
              className="documents-builder-icon-action"
              disabled={block.roles.length <= 1}
              onClick={() => removeRole(index)}
              title="Remover signatário"
              type="button"
            >
              <Trash2 aria-hidden="true" className="size-4" />
            </button>
          </div>
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
