import type { ReactNode } from "react";
import type {
  StorefrontBuilderComponent,
  StorefrontBuilderConfig,
  StorefrontBuilderVehicle,
} from "@lojaveiculosv2/shared";

export type BuilderRenderContext = {
  accent: string;
  config: StorefrontBuilderConfig;
  pageSlug: string;
  preview: boolean;
  renderBlocks: (
    components: readonly StorefrontBuilderComponent[] | unknown,
    className?: string,
  ) => ReactNode;
  storeSlug?: string;
  vehicles: readonly StorefrontBuilderVehicle[];
};

export type BuilderBlockProps = {
  component: StorefrontBuilderComponent;
  context: BuilderRenderContext;
};
