import { Check, ChevronDown, Search } from "lucide-react";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

export type CustomSelectOption<Value extends string = string> = {
  disabled?: boolean;
  label: ReactNode;
  searchText?: string;
  value: Value;
};

type CustomSelectProps<Value extends string = string> = {
  ariaLabel?: string | undefined;
  className?: string | undefined;
  defaultValue?: Value | undefined;
  density?: "compact" | "default";
  disabled?: boolean | undefined;
  emptyMessage?: string | undefined;
  leftIcon?: ReactNode | undefined;
  name?: string | undefined;
  onChange?: ((value: Value) => void) | undefined;
  options: readonly CustomSelectOption<Value>[];
  placeholder?: string | undefined;
  radius?: "default" | "xl";
  searchable?: boolean | undefined;
  searchPlaceholder?: string | undefined;
  value?: Value | undefined;
};

export function CustomSelect<Value extends string = string>({
  ariaLabel,
  className,
  defaultValue,
  density = "default",
  disabled = false,
  emptyMessage = "Nenhuma opção encontrada",
  leftIcon,
  name,
  onChange,
  options,
  placeholder = "Selecionar",
  radius = "default",
  searchable = false,
  searchPlaceholder = "Buscar...",
  value,
}: CustomSelectProps<Value>) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
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
  const visibleOptions = useMemo(
    () => filterOptions(options, searchable ? searchQuery : ""),
    [options, searchQuery, searchable],
  );

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
      setSearchQuery("");
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !searchable) return;
    setActiveIndex(firstEnabled(visibleOptions));
  }, [isOpen, searchQuery, searchable, visibleOptions]);

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
    setSearchQuery("");
    setIsOpen(true);
  };

  const closeMenu = () => {
    setIsOpen(false);
    setSearchQuery("");
  };

  const selectOption = (option: CustomSelectOption<Value>) => {
    if (disabled || option.disabled) return;
    if (value === undefined) setInternalValue(option.value);
    onChange?.(option.value);
    closeMenu();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) openMenu();
      else setActiveIndex(nextEnabled(visibleOptions, activeIndex, event.key));
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!isOpen) openMenu();
      else if (visibleOptions[activeIndex])
        selectOption(visibleOptions[activeIndex]);
      return;
    }

    if (event.key === "Escape") closeMenu();
    if (event.key === "Tab") closeMenu();
  };

  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation();

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex(nextEnabled(visibleOptions, activeIndex, event.key));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const option = visibleOptions[activeIndex];
      if (option) selectOption(option);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
      triggerRef.current?.focus();
    }
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
        onClick={() => (isOpen ? closeMenu() : openMenu())}
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
              ref={menuRef}
              style={{
                left: menuPosition.left,
                maxHeight: menuPosition.maxHeight,
                maxWidth: menuPosition.maxWidth,
                minWidth: menuPosition.minWidth,
                top: menuPosition.top,
              }}
            >
              {searchable ? (
                <label className="custom-select-search">
                  <span className="sr-only">
                    {`${ariaLabel ?? "Seleção"}: buscar`}
                  </span>
                  <Search aria-hidden="true" />
                  <input
                    aria-label={`${ariaLabel ?? "Seleção"}: buscar`}
                    autoFocus
                    onChange={(event) => setSearchQuery(event.target.value)}
                    onKeyDown={onSearchKeyDown}
                    placeholder={searchPlaceholder}
                    type="search"
                    value={searchQuery}
                  />
                </label>
              ) : null}
              <div
                aria-label={`${ariaLabel ?? "Seleção"}: opções`}
                className="custom-select-options"
                id={`${id}-listbox`}
                role="listbox"
              >
                {visibleOptions.map((option, index) => {
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
                {visibleOptions.length === 0 ? (
                  <p className="custom-select-empty" role="status">
                    {emptyMessage}
                  </p>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function filterOptions<Value extends string>(
  options: readonly CustomSelectOption<Value>[],
  query: string,
) {
  const normalizedQuery = normalizeSearch(query);
  if (!normalizedQuery) return options;

  return options.filter((option) => {
    const searchableLabel =
      option.searchText ??
      (typeof option.label === "string" ? option.label : option.value);
    return normalizeSearch(searchableLabel).includes(normalizedQuery);
  });
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "")
    .toLocaleLowerCase("pt-BR");
}

function fallbackValue<Value extends string>(
  options: readonly CustomSelectOption<Value>[],
  defaultValue: Value | undefined,
) {
  const firstValue = options.find((option) => !option.disabled)?.value;
  return defaultValue ?? firstValue ?? ("" as Value);
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
