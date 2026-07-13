import type { KeyboardEvent as ReactKeyboardEvent } from "react";

export const focusableSelector = [
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[href]:not([aria-disabled="true"])',
  '[tabindex]:not([tabindex="-1"])',
].join(",");

const modalStack: symbol[] = [];
let bodyScrollLocks = 0;
let originalBodyOverflow = "";

export function activateModalLayer() {
  const token = Symbol("modal-layer");
  let released = false;
  modalStack.push(token);
  lockBodyScroll();

  return {
    isTopLayer: () => modalStack.at(-1) === token,
    release: () => {
      if (released) return;
      released = true;
      const index = modalStack.lastIndexOf(token);
      if (index < 0) return;
      modalStack.splice(index, 1);
      unlockBodyScroll();
    },
  };
}

export function focusDialogTarget(
  container: ElementTarget,
  preferredTarget?: ElementTarget,
) {
  const frame = requestAnimationFrame(() => {
    const resolvedContainer = resolveElementTarget(container);
    if (resolvedContainer?.contains(document.activeElement)) return;
    const target =
      resolveElementTarget(preferredTarget) ??
      resolvedContainer?.querySelector<HTMLElement>(focusableSelector) ??
      resolvedContainer;
    target?.focus();
  });
  return () => cancelAnimationFrame(frame);
}

type ElementTarget =
  HTMLElement | null | undefined | (() => HTMLElement | null);

function resolveElementTarget(target: ElementTarget) {
  return typeof target === "function" ? target() : target;
}

export function trapDialogFocus(
  event: ReactKeyboardEvent<HTMLElement>,
  container: HTMLElement | null,
) {
  if (event.defaultPrevented || event.key !== "Tab") return;
  const focusable = Array.from(
    container?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
  );
  if (focusable.length === 0) {
    event.preventDefault();
    container?.focus();
    return;
  }

  const first = focusable[0];
  const last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
}

function lockBodyScroll() {
  if (bodyScrollLocks === 0) {
    originalBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  bodyScrollLocks += 1;
}

function unlockBodyScroll() {
  bodyScrollLocks = Math.max(0, bodyScrollLocks - 1);
  if (bodyScrollLocks === 0) {
    document.body.style.overflow = originalBodyOverflow;
  }
}
