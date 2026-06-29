"use client";

import { Button } from "@/components/ui/button";
import { CustomDropdown } from "@/components/ui/custom-dropdown";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  COMPONENT_CATEGORIES,
  COMPONENT_ICONS,
  COMPONENT_LABELS,
} from "@/modules/storefront/components/builder";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { createDefaultBlockProps } from "../default-block-props";

export type NestedBlock = { type: string; props: Record<string, unknown> };

const ADDABLE_TYPES = (
  Object.values(COMPONENT_CATEGORIES) as Array<
    ReadonlyArray<{ type: string; label: string }>
  >
).flatMap((cat) => [...cat]);

interface NestedComponentsEditorProps {
  label: string;
  items: NestedBlock[];
  onChange: (items: NestedBlock[]) => void;
  workspaceSlug: string;
  renderPropsEditor: (args: {
    type: string;
    props: Record<string, unknown>;
    onChange: (props: Record<string, unknown>) => void;
  }) => ReactNode;
}

export function NestedComponentsEditor({
  label,
  items,
  onChange,
  workspaceSlug,
  renderPropsEditor,
}: NestedComponentsEditorProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const updateChild = (index: number, props: Record<string, unknown>) => {
    const next = [...items];
    const cur = next[index];
    if (!cur) return;
    next[index] = { ...cur, props };
    onChange(next);
  };

  const removeChild = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
    setOpenIndex((prev) =>
      prev === null
        ? null
        : prev >= items.length - 1
          ? Math.max(0, prev - 1)
          : prev,
    );
  };

  const move = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    const a = next[index];
    const b = next[j];
    if (!a || !b) return;
    next[index] = b;
    next[j] = a;
    onChange(next);
    setOpenIndex(j);
  };

  const addType = (type: string) => {
    const props = createDefaultBlockProps(type, workspaceSlug);
    onChange([...items, { type, props }]);
    setOpenIndex(items.length);
  };

  const dropdownOptions = ADDABLE_TYPES.map((opt) => {
    const IconComponent = COMPONENT_ICONS[opt.type];
    return {
      value: opt.type,
      label: opt.label,
      icon: IconComponent ? (
        <IconComponent className="h-4 w-4 shrink-0" />
      ) : undefined,
    };
  });

  return (
    <div className="space-y-2 rounded-lg border border-border/50 bg-muted/10 p-3">
      <Label className="text-xs font-semibold text-muted-foreground uppercase">
        {label}
      </Label>
      <p className="text-[10px] text-muted-foreground">
        Adicione vários blocos. Cada um aparece na ordem abaixo na página.
      </p>

      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum bloco ainda.</p>
      ) : (
        <div className="space-y-2">
          {items.map((child, index) => {
            const isOpen = openIndex === index;
            const title = COMPONENT_LABELS[child.type] || child.type || "Bloco";
            const BlockIcon = COMPONENT_ICONS[child.type];
            return (
              <div
                key={`${child.type}-${index}`}
                className="overflow-hidden rounded-lg border border-border/40 bg-card"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="flex w-full items-center justify-between px-2 py-2 text-left hover:bg-muted/40"
                >
                  <span className="text-xs font-medium flex items-center gap-2">
                    {BlockIcon && (
                      <BlockIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <span>
                      {index + 1}. {title}
                    </span>
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 transition-transform",
                      isOpen && "rotate-180",
                    )}
                  />
                </button>
                {isOpen && (
                  <div className="space-y-2 border-t border-border/40 p-2">
                    <div className="flex flex-wrap gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-[10px]"
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                      >
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-[10px]"
                        disabled={index >= items.length - 1}
                        onClick={() => move(index, 1)}
                      >
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="h-7 text-[10px]"
                        onClick={() => removeChild(index)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    {renderPropsEditor({
                      type: child.type,
                      props: child.props,
                      onChange: (p) => updateChild(index, p),
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <CustomDropdown
        value=""
        onChange={addType}
        options={dropdownOptions}
        placeholder="+ Adicionar bloco…"
        size="sm"
        className="mt-1"
      />
    </div>
  );
}
