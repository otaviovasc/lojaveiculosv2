import { cleanup, render, type RenderResult } from "@testing-library/react";
import type { ComponentProps } from "react";
import { vi } from "vitest";
import { MessageComposer } from "./CrmWhatsappComposer";

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
    ...render(<MessageComposer {...callbacks} {...props} />),
  };
}
