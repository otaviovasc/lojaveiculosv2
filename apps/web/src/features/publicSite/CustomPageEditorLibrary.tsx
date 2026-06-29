import type {
  StorefrontBuilderComponent,
  StorefrontBuilderComponentType,
} from "@lojaveiculosv2/shared";
import type { ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  PlusCircle,
  Search,
  Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  blockIcon,
  blockLabel,
  builderBlockGroups,
} from "./builderBlockCatalog";

export function BuilderBlockLibrary({
  onAdd,
  query,
  setQuery,
}: {
  onAdd: (type: StorefrontBuilderComponentType) => void;
  query: string;
  setQuery: (value: string) => void;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="border-b border-border/50 p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-9 pl-9"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar componentes..."
            value={query}
          />
        </div>
      </div>
      <div className="grid gap-4 p-3">
        {builderBlockGroups.map((group) => {
          const items = group.types.filter((type) =>
            blockLabel(type).toLowerCase().includes(query.toLowerCase()),
          );
          if (!items.length) return null;
          return (
            <div key={group.label}>
              <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </h3>
              <div className="grid gap-1">
                {items.map((type) => (
                  <LibraryBlockButton key={type} onAdd={onAdd} type={type} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LibraryBlockButton({
  onAdd,
  type,
}: {
  onAdd: (type: StorefrontBuilderComponentType) => void;
  type: StorefrontBuilderComponentType;
}) {
  const Icon = blockIcon(type);
  return (
    <button
      className="group flex w-full items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-left text-sm transition-colors hover:border-border hover:bg-muted"
      onClick={() => onAdd(type)}
      type="button"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon aria-hidden="true" className="size-4" />
      </span>
      <span className="min-w-0 flex-1 truncate font-semibold text-foreground">
        {blockLabel(type)}
      </span>
      <PlusCircle
        aria-hidden="true"
        className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
      />
    </button>
  );
}

export function BuilderBlockList({
  components,
  onDuplicate,
  onMove,
  onRemove,
  onSelect,
  onToggle,
  selectedId,
}: {
  components: readonly StorefrontBuilderComponent[];
  onDuplicate: (component: StorefrontBuilderComponent) => void;
  onMove: (fromIndex: number, toIndex: number) => void;
  onRemove: (componentId: string) => void;
  onSelect: (componentId: string) => void;
  onToggle: (component: StorefrontBuilderComponent) => void;
  selectedId: string | null;
}) {
  return (
    <div className="border-t border-border/50 p-3">
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Blocos da pagina
      </h3>
      {components.length ? (
        <div className="grid gap-2">
          {components.map((component, index) => (
            <BlockListRow
              component={component}
              index={index}
              key={component.id}
              onDuplicate={onDuplicate}
              onMove={onMove}
              onRemove={onRemove}
              onSelect={onSelect}
              onToggle={onToggle}
              selected={selectedId === component.id}
              total={components.length}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-border/50 bg-muted/30 p-3 text-xs text-muted-foreground">
          Nenhum bloco adicionado.
        </div>
      )}
    </div>
  );
}

function BlockListRow({
  component,
  index,
  onDuplicate,
  onMove,
  onRemove,
  onSelect,
  onToggle,
  selected,
  total,
}: {
  component: StorefrontBuilderComponent;
  index: number;
  onDuplicate: (component: StorefrontBuilderComponent) => void;
  onMove: (fromIndex: number, toIndex: number) => void;
  onRemove: (componentId: string) => void;
  onSelect: (componentId: string) => void;
  onToggle: (component: StorefrontBuilderComponent) => void;
  selected: boolean;
  total: number;
}) {
  return (
    <div
      className={cn(
        "group flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left transition-all",
        selected
          ? "border-primary bg-primary text-primary-foreground shadow-[0_10px_26px_color-mix(in_oklab,var(--primary)_24%,transparent)]"
          : "border-border/50 bg-card text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground",
      )}
      data-selected={selected ? "true" : undefined}
    >
      <button
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
        onClick={() => onSelect(component.id)}
        type="button"
      >
        <GripVertical className="size-4 shrink-0 opacity-50" />
        <BlockRowIcon type={component.type} />
        <span className="min-w-0 flex-1 truncate text-sm font-black">
          {blockLabel(component.type)}
        </span>
      </button>
      <span className="flex shrink-0 items-center gap-1">
        <MiniAction
          disabled={index === 0}
          label="Mover para cima"
          onClick={() => onMove(index, index - 1)}
        >
          <ArrowUp aria-hidden="true" className="size-3.5" />
        </MiniAction>
        <MiniAction
          disabled={index === total - 1}
          label="Mover para baixo"
          onClick={() => onMove(index, index + 1)}
        >
          <ArrowDown aria-hidden="true" className="size-3.5" />
        </MiniAction>
        <MiniAction label="Duplicar" onClick={() => onDuplicate(component)}>
          <Copy aria-hidden="true" className="size-3.5" />
        </MiniAction>
        <MiniAction
          label="Alternar visibilidade"
          onClick={() => onToggle(component)}
        >
          {component.visible ? (
            <Eye aria-hidden="true" className="size-3.5" />
          ) : (
            <EyeOff aria-hidden="true" className="size-3.5" />
          )}
        </MiniAction>
        <MiniAction label="Remover" onClick={() => onRemove(component.id)}>
          <Trash2 aria-hidden="true" className="size-3.5" />
        </MiniAction>
      </span>
    </div>
  );
}

function BlockRowIcon({ type }: { type: string }) {
  const Icon = blockIcon(type);
  return (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground group-data-[selected=true]:bg-primary-foreground/15 group-data-[selected=true]:text-primary-foreground">
      <Icon aria-hidden="true" className="size-3.5" />
    </span>
  );
}

function MiniAction({
  children,
  disabled,
  label,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className={cn(
        "flex size-7 items-center justify-center rounded-md text-xs font-bold transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/40",
        disabled && "pointer-events-none opacity-30",
      )}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      type="button"
    >
      {children}
    </button>
  );
}
