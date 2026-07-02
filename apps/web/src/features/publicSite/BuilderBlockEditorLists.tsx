import { Plus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import {
  FeatureInput,
  FeatureTextarea,
} from "../../components/ui/FeatureControls";
import { FeatureActionButton } from "../../components/ui/FeatureLayout";
import type { BuilderRecord } from "./BuilderBlockEditorFields";
import { textValue } from "./BuilderBlockEditorFields";
import { StorefrontImagePicker } from "./StorefrontImagePicker";

export function BuilderTextItems({
  items,
  label,
  onChange,
}: {
  items: readonly unknown[];
  label: string;
  onChange: (items: string[]) => void;
}) {
  const values = items.map((item) => textValue(item));
  return (
    <BuilderRepeatBox
      addLabel="Adicionar texto"
      label={label}
      onAdd={() => onChange([...values, "Novo texto"])}
    >
      {values.map((value, index) => (
        <div
          className="grid grid-cols-[minmax(0,1fr)_auto] gap-2"
          key={`${value}_${index}`}
        >
          <FeatureInput
            onChange={(event) =>
              onChange(replaceAt(values, index, event.target.value))
            }
            value={value}
          />
          <FeatureActionButton
            icon={Trash2}
            label="Remover"
            onClick={() => onChange(removeAt(values, index))}
          />
        </div>
      ))}
    </BuilderRepeatBox>
  );
}

export function BuilderLinksList({
  items,
  label,
  onChange,
}: {
  items: readonly BuilderRecord[];
  label: string;
  onChange: (items: BuilderRecord[]) => void;
}) {
  return (
    <BuilderRepeatBox
      addLabel="Adicionar link"
      label={label}
      onAdd={() => onChange([...items, { href: "#", title: "Novo link" }])}
    >
      {items.map((item, index) => (
        <div
          className="grid gap-2 rounded-lg border border-line bg-panel p-2"
          key={itemKey(item, index)}
        >
          <FeatureInput
            onChange={(event) =>
              onChange(
                updateRecordAt(items, index, "title", event.target.value),
              )
            }
            placeholder="Titulo"
            value={textValue(item.title)}
          />
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <FeatureInput
              onChange={(event) =>
                onChange(
                  updateRecordAt(items, index, "href", event.target.value),
                )
              }
              placeholder="Link"
              value={textValue(item.href)}
            />
            <FeatureActionButton
              icon={Trash2}
              label="Remover"
              onClick={() => onChange(removeAt(items, index))}
            />
          </div>
        </div>
      ))}
    </BuilderRepeatBox>
  );
}

export function BuilderImageItems({
  items,
  onChange,
}: {
  items: readonly BuilderRecord[];
  onChange: (items: BuilderRecord[]) => void;
}) {
  return (
    <BuilderRepeatBox
      addLabel="Adicionar imagem"
      label="Imagens"
      onAdd={() =>
        onChange([...items, { caption: "", id: createItemId("img"), url: "" }])
      }
    >
      {items.map((item, index) => (
        <div
          className="grid gap-2 rounded-lg border border-line bg-panel p-2"
          key={itemKey(item, index)}
        >
          <StorefrontImagePicker
            imageClassName="h-28 w-full rounded-lg"
            label="Imagem"
            onChange={(value) =>
              onChange(updateRecordAt(items, index, "url", value ?? ""))
            }
            value={textValue(item.url)}
          />
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <FeatureInput
              onChange={(event) =>
                onChange(
                  updateRecordAt(items, index, "caption", event.target.value),
                )
              }
              placeholder="Legenda"
              value={textValue(item.caption)}
            />
            <FeatureActionButton
              icon={Trash2}
              label="Remover"
              onClick={() => onChange(removeAt(items, index))}
            />
          </div>
        </div>
      ))}
    </BuilderRepeatBox>
  );
}

export function BuilderTestimonialsItems({
  items,
  onChange,
}: {
  items: readonly BuilderRecord[];
  onChange: (items: BuilderRecord[]) => void;
}) {
  return (
    <BuilderRepeatBox
      addLabel="Adicionar depoimento"
      label="Depoimentos"
      onAdd={() =>
        onChange([
          ...items,
          {
            id: createItemId("dep"),
            imageSrc: "",
            name: "Cliente",
            quote: "",
          },
        ])
      }
    >
      {items.map((item, index) => (
        <div
          className="grid gap-2 rounded-lg border border-line bg-panel p-2"
          key={itemKey(item, index)}
        >
          <FeatureInput
            onChange={(event) =>
              onChange(updateRecordAt(items, index, "name", event.target.value))
            }
            placeholder="Nome"
            value={textValue(item.name)}
          />
          <StorefrontImagePicker
            imageClassName="size-20 rounded-full"
            label="Imagem do cliente"
            onChange={(value) =>
              onChange(updateRecordAt(items, index, "imageSrc", value ?? ""))
            }
            value={textValue(item.imageSrc)}
          />
          <FeatureInput
            onChange={(event) =>
              onChange(updateRecordAt(items, index, "role", event.target.value))
            }
            placeholder="Descricao"
            value={textValue(item.role)}
          />
          <FeatureTextarea
            onChange={(event) =>
              onChange(
                updateRecordAt(items, index, "quote", event.target.value),
              )
            }
            placeholder="Depoimento"
            value={textValue(item.quote)}
          />
          <FeatureActionButton
            icon={Trash2}
            label="Remover"
            onClick={() => onChange(removeAt(items, index))}
          />
        </div>
      ))}
    </BuilderRepeatBox>
  );
}

export function BuilderFooterColumns({
  items,
  onChange,
}: {
  items: readonly BuilderRecord[];
  onChange: (items: BuilderRecord[]) => void;
}) {
  return (
    <BuilderRepeatBox
      addLabel="Adicionar coluna"
      label="Colunas do rodape"
      onAdd={() =>
        onChange([
          ...items,
          { label: "Coluna", links: [{ href: "#", title: "Link" }] },
        ])
      }
    >
      {items.map((item, index) => {
        const links = Array.isArray(item.links)
          ? item.links.filter(isRecord).map((link) => ({ ...link }))
          : [];
        return (
          <div
            className="grid gap-2 rounded-lg border border-line bg-panel p-2"
            key={itemKey(item, index)}
          >
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <FeatureInput
                onChange={(event) =>
                  onChange(
                    updateRecordAt(items, index, "label", event.target.value),
                  )
                }
                placeholder="Titulo da coluna"
                value={textValue(item.label)}
              />
              <FeatureActionButton
                icon={Trash2}
                label="Remover"
                onClick={() => onChange(removeAt(items, index))}
              />
            </div>
            <BuilderLinksList
              items={links}
              label="Links"
              onChange={(nextLinks) =>
                onChange(updateRecordAt(items, index, "links", nextLinks))
              }
            />
          </div>
        );
      })}
    </BuilderRepeatBox>
  );
}

export function BuilderRepeatBox({
  addLabel,
  children,
  label,
  onAdd,
}: {
  addLabel: string;
  children: ReactNode;
  label: string;
  onAdd: () => void;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-black uppercase tracking-widest text-muted">
          {label}
        </span>
        <FeatureActionButton icon={Plus} label={addLabel} onClick={onAdd} />
      </div>
      <div className="grid gap-2">{children}</div>
    </div>
  );
}

function createItemId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function itemKey(item: BuilderRecord, index: number) {
  return textValue(item.id) || `${index}`;
}

function isRecord(value: unknown): value is BuilderRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function updateRecordAt(
  items: readonly BuilderRecord[],
  index: number,
  key: string,
  value: unknown,
) {
  return items.map((item, itemIndex) =>
    itemIndex === index ? { ...item, [key]: value } : item,
  );
}

function replaceAt<T>(items: readonly T[], index: number, value: T) {
  return items.map((item, itemIndex) => (itemIndex === index ? value : item));
}

function removeAt<T>(items: readonly T[], index: number) {
  return items.filter((_, itemIndex) => itemIndex !== index);
}
