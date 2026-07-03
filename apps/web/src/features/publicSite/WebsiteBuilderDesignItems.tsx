import {
  Home,
  Info,
  Layers,
  MessageSquareQuote,
  Palette,
  Phone,
  Sparkles,
  Type,
  User,
} from "lucide-react";
import type { WebsiteBuilderAccordionItem } from "./WebsiteBuilderEditorPanel";
import {
  WebsiteBuilderAboutPanel,
  WebsiteBuilderContactPanel,
  WebsiteBuilderTestimonialsPanel,
} from "./WebsiteBuilderPanelsContent";
import {
  WebsiteBuilderBrandPanel,
  WebsiteBuilderHeroPanel,
  WebsiteBuilderTemplatePanel,
  WebsiteBuilderTypographyPanel,
} from "./WebsiteBuilderPanelsPrimary";
import { WebsiteBuilderColorsSection } from "./WebsiteBuilderColorsSection";
import { WebsiteBuilderSectionsManager } from "./WebsiteBuilderSectionsManager";
import type {
  WebsiteBuilderConfig,
  WebsiteBuilderTemplateId,
} from "./WebsiteBuilderTypes";

export function createWebsiteBuilderAccordionItems({
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
}): WebsiteBuilderAccordionItem[] {
  return [
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
        <WebsiteBuilderBrandPanel config={config} updateConfig={updateConfig} />
      ),
      icon: User,
      id: "brand",
      title: "Marca e Profissional",
    },
    {
      children: (
        <WebsiteBuilderColorsSection config={config} onUpdate={updateConfig} />
      ),
      icon: Palette,
      id: "colors",
      title: "Identidade Visual",
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
        <WebsiteBuilderHeroPanel config={config} updateConfig={updateConfig} />
      ),
      icon: Home,
      id: "hero",
      title: "Capa do Site (Hero)",
    },
    {
      children: (
        <WebsiteBuilderAboutPanel config={config} updateConfig={updateConfig} />
      ),
      icon: Info,
      id: "about",
      title: "Seção Sobre",
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
      title: "Contato e Redes Sociais",
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
        <WebsiteBuilderSectionsManager
          onUpdate={(sections) => updateConfig("sections", sections)}
          sections={config.sections}
        />
      ),
      icon: Layers,
      id: "sections",
      title: "Secoes do Site",
    },
  ];
}
