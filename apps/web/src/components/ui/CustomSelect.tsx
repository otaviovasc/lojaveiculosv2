import { Check, ChevronDown } from "lucide-react";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

export type CustomSelectOption<Value extends string = string> = {
  disabled?: boolean;
  label: ReactNode;
  value: Value;
};

type CustomSelectProps<Value extends string = string> = {
  ariaLabel?: string | undefined;
  className?: string | undefined;
  defaultValue?: Value | undefined;
  density?: "compact" | "default";
  disabled?: boolean | undefined;
  leftIcon?: ReactNode | undefined;
  name?: string | undefined;
  onChange?: ((value: Value) => void) | undefined;
  options: readonly CustomSelectOption<Value>[];
  placeholder?: string | undefined;
  radius?: "default" | "xl";
  value?: Value | undefined;
};

export function CustomSelect<Value extends string = string>({
  ariaLabel,
  className,
  defaultValue,
  density = "default",
  disabled = false,
  leftIcon,
  name,
  onChange,
  options,
  placeholder = "Selecionar",
  radius = "default",
  value,
}: CustomSelectProps<Value>) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuPosition, setMenuPosition] = useState({
    left: 0,
    maxHeight: 288,
    maxWidth: 320,
    minWidth: 0,
    top: 0,
  });
  const [internalValue, setInternalValue] = useState<Value>(() =>
    fallbackValue(options, defaultValue),
  );
  const selectedValue = value ?? internalValue;
  const selectedOption =
    options.find((option) => option.value === selectedValue) ??
    options.find((option) => !option.disabled);

  useEffect(() => {
    if (value !== undefined) return;
    if (options.some((option) => option.value === internalValue)) return;
    setInternalValue(fallbackValue(options, defaultValue));
  }, [defaultValue, internalValue, options, value]);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen) return;

    const updateMenuPosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const gap = 6;
      const edgePadding = 12;
      const preferredHeight = 288;
      const maxWidth = Math.max(96, window.innerWidth - edgePadding * 2);
      const minWidth = Math.min(rect.width, maxWidth);
      const belowSpace = window.innerHeight - rect.bottom - edgePadding;
      const aboveSpace = rect.top - edgePadding;
      const openAbove = belowSpace < 160 && aboveSpace > belowSpace;
      const maxHeight = Math.max(
        96,
        Math.min(
          preferredHeight,
          openAbove ? aboveSpace - gap : belowSpace - gap,
        ),
      );
      const measuredWidth =
        menuRef.current?.getBoundingClientRect().width ?? rect.width;
      const menuWidth = Math.min(Math.max(measuredWidth, minWidth), maxWidth);
      const viewportRight = window.innerWidth - edgePadding;
      const clampedLeft = Math.max(
        edgePadding,
        Math.min(rect.left, viewportRight - menuWidth),
      );

      setMenuPosition({
        left: clampedLeft,
        maxHeight,
        maxWidth,
        minWidth,
        top: openAbove ? rect.top - gap - maxHeight : rect.bottom + gap,
      });
    };

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (value !== undefined) return;
    const form = rootRef.current?.closest("form");
    if (!form) return;
    const onReset = () =>
      setInternalValue(fallbackValue(options, defaultValue));
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, [defaultValue, options, value]);

  const openMenu = () => {
    if (disabled || options.length === 0) return;
    const selectedIndex = options.findIndex(
      (option) => option.value === selectedValue && !option.disabled,
    );
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : firstEnabled(options));
    setIsOpen(true);
  };

  const selectOption = (option: CustomSelectOption<Value>) => {
    if (disabled || option.disabled) return;
    if (value === undefined) setInternalValue(option.value);
    onChange?.(option.value);
    setIsOpen(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) openMenu();
      else setActiveIndex(nextEnabled(options, activeIndex, event.key));
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!isOpen) openMenu();
      else if (options[activeIndex]) selectOption(options[activeIndex]);
      return;
    }

    if (event.key === "Escape") setIsOpen(false);
    if (event.key === "Tab") setIsOpen(false);
  };

  return (
    <div className="custom-select" onKeyDown={onKeyDown} ref={rootRef}>
      {name ? (
        <input
          disabled={disabled}
          name={name}
          type="hidden"
          value={selectedOption?.value ?? selectedValue}
        />
      ) : null}
      <button
        aria-controls={`${id}-listbox`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className={[
          "custom-select-trigger",
          density === "compact"
            ? "!min-h-[2.5rem] !h-[2.5rem] !px-3.5 !py-0"
            : "",
          radius === "xl" ? "rounded-xl" : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        disabled={disabled}
        onClick={() => (isOpen ? setIsOpen(false) : openMenu())}
        ref={triggerRef}
        type="button"
      >
        {leftIcon ? (
          <span className="custom-select-leading">{leftIcon}</span>
        ) : null}
        <span className="custom-select-value">
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown
          aria-hidden="true"
          className="custom-select-chevron"
          data-open={isOpen ? "true" : undefined}
        />
      </button>
      {isOpen
        ? createPortal(
            <div
              className="custom-select-menu"
              id={`${id}-listbox`}
              ref={menuRef}
              role="listbox"
              style={{
                left: menuPosition.left,
                maxHeight: menuPosition.maxHeight,
                maxWidth: menuPosition.maxWidth,
                minWidth: menuPosition.minWidth,
                top: menuPosition.top,
              }}
            >
              {options.map((option, index) => {
                const isSelected = option.value === selectedValue;
                return (
                  <button
                    aria-selected={isSelected}
                    className="custom-select-option"
                    data-active={index === activeIndex ? "true" : undefined}
                    data-selected={isSelected ? "true" : undefined}
                    disabled={option.disabled}
                    key={option.value}
                    onClick={() => selectOption(option)}
                    onMouseEnter={() => setActiveIndex(index)}
                    role="option"
                    type="button"
                  >
                    <span>{option.label}</span>
                    {isSelected ? (
                      <Check
                        aria-hidden="true"
                        className="custom-select-check"
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function fallbackValue<Value extends string>(
  options: readonly CustomSelectOption<Value>[],
  defaultValue: Value | undefined,
) {
  return (
    defaultValue ??
    options.find((option) => !option.disabled)?.value ??
    ("" as Value)
  );
}

function firstEnabled<Value extends string>(
  options: readonly CustomSelectOption<Value>[],
) {
  const index = options.findIndex((option) => !option.disabled);
  return index >= 0 ? index : 0;
}

function nextEnabled<Value extends string>(
  options: readonly CustomSelectOption<Value>[],
  currentIndex: number,
  key: "ArrowDown" | "ArrowUp",
) {
  const enabled = options
    .map((option, index) => (option.disabled ? -1 : index))
    .filter((index) => index >= 0);
  if (enabled.length === 0) return currentIndex;
  const current = enabled.indexOf(currentIndex);
  const offset = key === "ArrowDown" ? 1 : -1;
  const next =
    current === -1 ? 0 : (current + offset + enabled.length) % enabled.length;
  return enabled[next] ?? currentIndex;
}
