import { cleanup, render, type RenderResult } from "@testing-library/react";
import type { ComponentProps } from "react";
import { vi } from "vitest";
import { MessageComposer } from "./CrmComposer";

type ComposerCallbacks = Pick<
  ComponentProps<typeof MessageComposer>,
  | "onCreateQuickMessage"
  | "onDeleteQuickMessage"
  | "onLoadCatalogProducts"
  | "onLoadVehicles"
  | "onSend"
  | "onSendCatalog"
  | "onSendCatalogProduct"
  | "onSendLocation"
  | "onSendMedia"
  | "onSendQuickMessage"
  | "onSendVehicle"
  | "onUpdateQuickMessage"
>;

export function cleanupTest() {
  cleanup();
  vi.unstubAllGlobals();
}

export function renderComposer(
  props: Partial<ComponentProps<typeof MessageComposer>> = {},
): RenderResult & { callbacks: ComposerCallbacks } {
  const callbacks: ComposerCallbacks = {
    onSend: vi.fn(async () => true),
    onSendCatalog: vi.fn(async () => true),
    onLoadCatalogProducts: vi.fn(async () => null),
    onLoadVehicles: vi.fn(async () => []),
    onSendCatalogProduct: vi.fn(async () => true),
    onCreateQuickMessage: vi.fn(async () => true),
    onDeleteQuickMessage: vi.fn(async () => true),
    onUpdateQuickMessage: vi.fn(async () => true),
    onSendLocation: vi.fn(async () => true),
    onSendMedia: vi.fn(async () => true),
    onSendQuickMessage: vi.fn(async () => true),
    onSendVehicle: vi.fn(async () => true),
  };
  return {
    callbacks,
    ...render(
      <MessageComposer
        capabilities={createComposerCapabilities()}
        {...callbacks}
        {...props}
      />,
    ),
  };
}

function createComposerCapabilities() {
  return {
    allowAudio: true,
    allowCatalog: true,
    allowDelete: true,
    allowDocuments: true,
    allowImageCaption: true,
    allowImages: true,
    allowLocation: true,
    allowQuickMessages: true,
    allowReactions: true,
    allowReply: true,
    allowScheduling: true,
    allowVehicle: true,
    allowVideo: true,
    officialWindowNotice: null,
    provider: "zapi" as const,
  } as const;
}
