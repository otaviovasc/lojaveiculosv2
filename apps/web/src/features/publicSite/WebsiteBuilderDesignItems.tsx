import {
  Home,
  Info,
  Layers,
  MessageSquareQuote,
  Palette,
  Phone,
  Search,
  SunMoon,
  Sparkles,
  Store,
  Type,
} from "lucide-react";
import type { WebsiteBuilderEditorGroups } from "./WebsiteBuilderEditorPanel";
import {
  WebsiteBuilderAboutPanel,
  WebsiteBuilderContactPanel,
  WebsiteBuilderSeoPanel,
  WebsiteBuilderTestimonialsPanel,
} from "./WebsiteBuilderPanelsContent";
import {
  WebsiteBuilderBrandPanel,
  WebsiteBuilderHeroPanel,
  WebsiteBuilderTemplatePanel,
  WebsiteBuilderTypographyPanel,
} from "./WebsiteBuilderPanelsPrimary";
import { WebsiteBuilderColorsSection } from "./WebsiteBuilderColorsSection";
import { WebsiteBuilderAppearancePanel } from "./WebsiteBuilderAppearancePanel";
import { WebsiteBuilderSectionsManager } from "./WebsiteBuilderSectionsManager";
import type {
  WebsiteBuilderConfig,
  WebsiteBuilderTemplateId,
} from "./WebsiteBuilderTypes";

export function createWebsiteBuilderEditorGroups({
  config,
  setTemplateId,
  templateId,
  updateConfig,
}: {
  config: WebsiteBuilderConfig;
  setTemplateId: (templateId: WebsiteBuilderTemplateId) => void;
  templateId: WebsiteBuilderTemplateId;
  updateConfig: <K extends keyof WebsiteBuilderConfig>(
    key: K,
    value: WebsiteBuilderConfig[K],
  ) => void;
}): WebsiteBuilderEditorGroups {
  return {
    checklist: [
      {
        children: (
          <WebsiteBuilderTemplatePanel
            onChange={(value) => {
              setTemplateId(value);
              updateConfig("templateId", value);
            }}
            templateId={templateId}
          />
        ),
        icon: Sparkles,
        id: "template",
        title: "Modelo do Site",
      },
      {
        children: (
          <WebsiteBuilderBrandPanel
            config={config}
            updateConfig={updateConfig}
          />
        ),
        icon: Store,
        id: "brand",
        title: "Marca",
      },
      {
        children: (
          <WebsiteBuilderColorsSection
            config={config}
            onUpdate={updateConfig}
          />
        ),
        icon: Palette,
        id: "colors",
        title: "Cores",
      },
      {
        children: (
          <WebsiteBuilderTypographyPanel
            config={config}
            updateConfig={updateConfig}
          />
        ),
        icon: Type,
        id: "typography",
        title: "Tipografia",
      },
      {
        children: (
          <WebsiteBuilderAppearancePanel
            config={config}
            updateConfig={updateConfig}
          />
        ),
        icon: SunMoon,
        id: "appearance",
        title: "Aparência",
      },
      {
        children: (
          <WebsiteBuilderHeroPanel
            config={config}
            updateConfig={updateConfig}
          />
        ),
        icon: Home,
        id: "hero",
        title: "Capa",
      },
      {
        children: (
          <WebsiteBuilderSectionsManager
            onUpdate={(sections) => updateConfig("sections", sections)}
            sections={config.sections}
          />
        ),
        icon: Layers,
        id: "sections",
        title: "Seções do Site",
      },
      {
        children: (
          <WebsiteBuilderAboutPanel
            config={config}
            updateConfig={updateConfig}
          />
        ),
        icon: Info,
        id: "about",
        title: "Sobre",
      },
      {
        children: (
          <WebsiteBuilderTestimonialsPanel
            config={config}
            updateConfig={updateConfig}
          />
        ),
        icon: MessageSquareQuote,
        id: "testimonials",
        title: "Depoimentos",
      },
      {
        children: (
          <WebsiteBuilderContactPanel
            config={config}
            updateConfig={updateConfig}
          />
        ),
        icon: Phone,
        id: "contact",
        title: "Contato",
      },
      {
        children: (
          <WebsiteBuilderSeoPanel config={config} updateConfig={updateConfig} />
        ),
        icon: Search,
        id: "seo",
        title: "SEO",
      },
    ],
  };
}
