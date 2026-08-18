import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEventHandler,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { cx } from "./featureShared";

type FeatureAnchoredPopoverProps = {
  align?: "end" | "start";
  anchorRef: RefObject<HTMLElement | null>;
  ariaLabel?: string;
  children: ReactNode;
  className?: string;
  id?: string;
  initialFocus?: "first" | "last";
  isOpen: boolean;
  maxHeight?: number;
  offset?: number;
  onClose: () => void;
  onKeyDown?: KeyboardEventHandler<HTMLDivElement>;
  restoreFocusOnClose?: boolean;
  role?: "dialog" | "listbox" | "menu";
};

type PopoverPosition = {
  left: number;
  maxHeight: number;
  maxWidth: number;
  minWidth: number;
  top: number;
};

const edgePadding = 12;
const minimumPanelHeight = 96;
const focusableItemSelector = [
  '[role="menuitem"]:not([aria-disabled="true"])',
  '[role="menuitemcheckbox"]:not([aria-disabled="true"])',
  '[role="menuitemradio"]:not([aria-disabled="true"])',
  '[role="option"]:not([aria-disabled="true"])',
  "button:not(:disabled)",
  'input:not(:disabled):not([type="hidden"])',
  "select:not(:disabled)",
  "textarea:not(:disabled)",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function FeatureAnchoredPopover({
  align = "start",
  anchorRef,
  ariaLabel,
  children,
  className,
  id,
  initialFocus,
  isOpen,
  maxHeight = 320,
  offset = 8,
  onClose,
  onKeyDown,
  restoreFocusOnClose = true,
  role = "menu",
}: FeatureAnchoredPopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);
  const [position, setPosition] = useState<PopoverPosition>({
    left: edgePadding,
    maxHeight,
    maxWidth: 320,
    minWidth: 0,
    top: edgePadding,
  });

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [anchorRef, isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  useLayoutEffect(() => {
    if (isOpen) {
      wasOpenRef.current = true;
      if (!initialFocus) return;
      const items = panelRef.current?.querySelectorAll<HTMLElement>(
        focusableItemSelector,
      );
      if (!items?.length) return;
      const item =
        initialFocus === "last" ? items.item(items.length - 1) : items.item(0);
      item?.focus();
      return;
    }

    if (!wasOpenRef.current) return;
    wasOpenRef.current = false;
    if (!restoreFocusOnClose) return;
    const anchor = anchorRef.current;
    const focusTarget = anchor?.matches(focusableItemSelector)
      ? anchor
      : anchor?.querySelector<HTMLElement>(focusableItemSelector);
    focusTarget?.focus();
  }, [anchorRef, initialFocus, isOpen, restoreFocusOnClose]);

  useLayoutEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const anchorRect = anchorRef.current?.getBoundingClientRect();
      if (!anchorRect) return;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const maxWidth = Math.max(120, viewportWidth - edgePadding * 2);
      const minWidth = Math.min(anchorRect.width, maxWidth);
      const panelRect = panelRef.current?.getBoundingClientRect();
      const measuredWidth = panelRect?.width ?? anchorRect.width;
      const measuredHeight = panelRect?.height ?? maxHeight;
      const panelWidth = Math.min(Math.max(measuredWidth, minWidth), maxWidth);
      const viewportRight = viewportWidth - edgePadding;
      const preferredLeft =
        align === "end" ? anchorRect.right - panelWidth : anchorRect.left;
      const left = Math.max(
        edgePadding,
        Math.min(preferredLeft, viewportRight - panelWidth),
      );

      const belowSpace = viewportHeight - anchorRect.bottom - edgePadding;
      const aboveSpace = anchorRect.top - edgePadding;
      const desiredHeight = Math.min(
        maxHeight,
        Math.max(minimumPanelHeight, measuredHeight),
      );
      const openAbove =
        belowSpace < desiredHeight + offset && aboveSpace > belowSpace;
      const availableHeight = openAbove
        ? aboveSpace - offset
        : belowSpace - offset;
      const nextMaxHeight = Math.max(
        minimumPanelHeight,
        Math.min(maxHeight, availableHeight),
      );
      const renderedHeight = Math.min(measuredHeight, nextMaxHeight);
      const top = openAbove
        ? Math.max(edgePadding, anchorRect.top - offset - renderedHeight)
        : anchorRect.bottom + offset;

      setPosition({
        left,
        maxHeight: nextMaxHeight,
        maxWidth,
        minWidth,
        top,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [align, anchorRef, isOpen, maxHeight, offset]);

  if (!isOpen) return null;

  const style = {
    left: position.left,
    maxHeight: position.maxHeight,
    maxWidth: position.maxWidth,
    minWidth: position.minWidth,
    top: position.top,
  } satisfies CSSProperties;

  return createPortal(
    <div
      aria-label={ariaLabel}
      className={cx(
        "fixed z-[1000] overflow-auto rounded-lg border border-line bg-panel p-2 shadow-[var(--shadow-panel)]",
        className,
      )}
      id={id}
      onKeyDown={onKeyDown}
      ref={panelRef}
      role={role}
      style={style}
    >
      {children}
    </div>,
    document.body,
  );
}
