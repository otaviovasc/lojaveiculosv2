import { Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import type {
  StorefrontBuilderComponent,
  StorefrontBuilderComponentType,
} from "@lojaveiculosv2/shared";
import { FeatureSelect } from "../../components/ui/FeatureControls";
import { FeatureActionButton } from "../../components/ui/FeatureLayout";
import {
  blockLabel,
  builderBlockTypeOptions,
  createDefaultPageComponent,
} from "./builderBlockCatalog";

export function BuilderNestedComponentsEditor({
  components,
  label,
  onChange,
  renderEditor,
}: {
  components: readonly StorefrontBuilderComponent[];
  label: string;
  onChange: (components: StorefrontBuilderComponent[]) => void;
  renderEditor: (
    component: StorefrontBuilderComponent,
    onChange: (component: StorefrontBuilderComponent) => void,
  ) => ReactNode;
}) {
  const [selectedType, setSelectedType] =
    useState<StorefrontBuilderComponentType>("text_block");
  const orderedComponents = [...components].sort((a, b) => a.order - b.order);

  const addComponent = () =>
    onChange([
      ...orderedComponents,
      createDefaultPageComponent(selectedType, orderedComponents.length),
    ]);

  const updateComponent = (component: StorefrontBuilderComponent) =>
    onChange(
      orderedComponents.map((item) =>
        item.id === component.id ? component : item,
      ),
    );

  const removeComponent = (componentId: string) =>
    onChange(
      orderedComponents
        .filter((component) => component.id !== componentId)
        .map((component, order) => ({ ...component, order })),
    );

  return (
    <div className="grid gap-3 rounded-lg border border-line bg-app p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-black uppercase tracking-widest text-muted">
          {label}
        </span>
        <div className="flex min-w-0 flex-1 justify-end gap-2">
          <FeatureSelect
            ariaLabel={`${label}: tipo do bloco`}
            className="min-w-44"
            onChange={setSelectedType}
            options={builderBlockTypeOptions}
            value={selectedType}
          />
          <FeatureActionButton
            icon={Plus}
            label="Adicionar"
            onClick={addComponent}
          />
        </div>
      </div>
      <div className="grid gap-3">
        {orderedComponents.map((component) => (
          <article
            className="grid gap-3 rounded-lg border border-line bg-panel p-3"
            key={component.id}
          >
            <div className="flex items-center justify-between gap-2">
              <strong className="text-sm font-black">
                {blockLabel(component.type)}
              </strong>
              <div className="flex items-center gap-2">
                <FeatureActionButton
                  icon={component.visible ? Eye : EyeOff}
                  label={component.visible ? "Visivel" : "Oculto"}
                  onClick={() =>
                    updateComponent({
                      ...component,
                      visible: !component.visible,
                    })
                  }
                />
                <FeatureActionButton
                  icon={Trash2}
                  label="Remover"
                  onClick={() => removeComponent(component.id)}
                />
              </div>
            </div>
            {renderEditor(component, updateComponent)}
          </article>
        ))}
      </div>
    </div>
  );
}
