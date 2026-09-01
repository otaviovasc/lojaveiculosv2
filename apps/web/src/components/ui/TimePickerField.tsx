import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Clock, Sparkles } from "lucide-react";
import { FeatureAnchoredPopover } from "./FeaturePopover";
import { cn } from "@/lib/utils";

const BUSINESS_HOURS = [
  "08",
  "09",
  "10",
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
  "18",
  "19",
  "20",
];

const EXTENDED_HOURS = [
  "06",
  "07",
  "08",
  "09",
  "10",
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
  "18",
  "19",
  "20",
  "21",
  "22",
  "23",
];

const COMMON_MINUTES = [
  "00",
  "05",
  "10",
  "15",
  "20",
  "25",
  "30",
  "35",
  "40",
  "45",
  "50",
  "55",
];

const QUICK_PRESETS = [
  "09:00",
  "10:00",
  "11:00",
  "14:00",
  "15:30",
  "17:00",
  "18:00",
];

export type TimePickerFieldProps = {
  align?: "left" | "right";
  ariaDescribedBy?: string;
  className?: string;
  disabled?: boolean;
  displayValue?: string;
  invalid?: boolean;
  isDisabled?: boolean;
  isRequired?: boolean;
  label?: string;
  onChange: (time: string) => void;
  value: string;
};

export function TimePickerField({
  align = "left",
  ariaDescribedBy,
  className,
  disabled,
  displayValue,
  invalid = false,
  isDisabled = false,
  isRequired = false,
  label = "Horário",
  onChange,
  value,
}: TimePickerFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const hoursListRef = useRef<HTMLDivElement>(null);
  const minutesListRef = useRef<HTMLDivElement>(null);

  const effectiveDisabled = disabled || isDisabled;

  const [currentHour, currentMinute] = useMemo(() => {
    if (!value || !value.includes(":")) {
      return ["10", "00"];
    }
    const [h, m] = value.split(":");
    const safeH = String(h ?? "10")
      .padStart(2, "0")
      .slice(0, 2);
    const safeM = String(m ?? "00")
      .padStart(2, "0")
      .slice(0, 2);
    return [safeH, safeM];
  }, [value]);

  useEffect(() => {
    if (isOpen) {
      setManualInput(value || `${currentHour}:${currentMinute}`);
    }
  }, [isOpen, value, currentHour, currentMinute]);

  const handleSelectHour = (hour: string) => {
    const nextTime = `${hour}:${currentMinute}`;
    onChange(nextTime);
    setManualInput(nextTime);
  };

  const handleSelectMinute = (minute: string) => {
    const nextTime = `${currentHour}:${minute}`;
    onChange(nextTime);
    setManualInput(nextTime);
  };

  const handleSetNow = () => {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, "0");
    const rawM = now.getMinutes();
    const roundedM = String((Math.round(rawM / 5) * 5) % 60).padStart(2, "0");
    const time = `${h}:${roundedM}`;
    onChange(time);
    setManualInput(time);
  };

  const handleManualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/[^0-9:]/g, "");
    if (val.length === 2 && !val.includes(":") && !manualInput.includes(":")) {
      val = `${val}:`;
    }
    if (val.length > 5) val = val.slice(0, 5);
    setManualInput(val);

    if (/^([01]\d|2[0-3]):([0-5]\d)$/.test(val)) {
      onChange(val);
    }
  };

  const formattedDisplay =
    displayValue ?? (value || `${currentHour}:${currentMinute}`);

  return (
    <div className={cn("inline-block w-full", className)} ref={rootRef}>
      <button
        ref={triggerRef}
        aria-describedby={ariaDescribedBy}
        aria-invalid={invalid || undefined}
        aria-label={`${label}: ${formattedDisplay}`}
        aria-required={isRequired || undefined}
        className={cn(
          "datepicker-field-trigger group flex min-h-11 w-full items-center gap-2 px-3.5 py-2 rounded-xl bg-card/60 hover:bg-card border border-border/50 hover:border-accent/40 text-foreground transition-all duration-200 cursor-pointer active:scale-[0.98] select-none touch-target whitespace-nowrap outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:border-accent",
          "disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:bg-card/60 disabled:active:scale-100",
          invalid && "!border-danger !bg-danger/5",
        )}
        data-invalid={invalid ? "true" : undefined}
        disabled={effectiveDisabled}
        onClick={() => {
          if (effectiveDisabled) return;
          setIsOpen((current) => !current);
        }}
        type="button"
      >
        <Clock className="size-4 text-accent/60 shrink-0 group-hover:text-accent transition-colors duration-200" />
        <span className="datepicker-field-label text-xs text-muted font-medium">
          {label}:
        </span>
        <span className="font-bold text-xs text-foreground tracking-wide font-mono">
          {formattedDisplay}
        </span>
      </button>

      <FeatureAnchoredPopover
        align={align === "right" ? "end" : "start"}
        anchorRef={rootRef}
        className="p-3 bg-panel border border-line rounded-2xl shadow-[var(--shadow-panel)] overflow-hidden w-[290px]"
        isOpen={isOpen}
        maxHeight={420}
        onClose={() => setIsOpen(false)}
      >
        <div className="flex flex-col gap-3">
          {/* Header with current time & Now button */}
          <div className="flex items-center justify-between pb-2 border-b border-border/50">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted font-medium">Horário:</span>
              <span className="text-sm font-bold text-foreground font-mono tracking-wider">
                {currentHour}:{currentMinute}
              </span>
            </div>
            <button
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold text-accent hover:bg-accent hover:text-accent-foreground transition-colors"
              onClick={handleSetNow}
              type="button"
            >
              <Sparkles className="size-3" />
              Agora
            </button>
          </div>

          {/* Quick presets pills */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-muted">
              Sugestões
            </span>
            <div className="flex flex-wrap gap-1">
              {QUICK_PRESETS.map((preset) => {
                const isActive = value === preset;
                return (
                  <button
                    className={cn(
                      "px-2 py-1 text-xs font-mono font-medium rounded-lg border transition-all cursor-pointer",
                      isActive
                        ? "bg-accent text-accent-foreground border-accent font-bold"
                        : "bg-app hover:bg-accent hover:text-accent-foreground border-border/60 text-foreground hover:border-accent",
                    )}
                    key={preset}
                    onClick={() => {
                      onChange(preset);
                      setManualInput(preset);
                    }}
                    type="button"
                  >
                    {preset}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dual Pickers (Hours and Minutes) */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            {/* Hours Column */}
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold uppercase tracking-wider text-muted text-center">
                Hora
              </span>
              <div
                className="flex flex-col gap-1 max-h-36 overflow-y-auto pr-1 scrollbar-thin rounded-lg bg-app/60 p-1 border border-border/40"
                ref={hoursListRef}
              >
                {EXTENDED_HOURS.map((h) => {
                  const isSelected = currentHour === h;
                  const isBusinessHour = BUSINESS_HOURS.includes(h);
                  return (
                    <button
                      className={cn(
                        "flex items-center justify-between px-2.5 py-1 text-xs rounded-md font-mono transition-all text-left",
                        isSelected
                          ? "bg-accent text-accent-foreground font-bold"
                          : isBusinessHour
                            ? "hover:bg-accent hover:text-accent-foreground text-foreground font-semibold"
                            : "hover:bg-accent text-muted hover:text-accent-foreground",
                      )}
                      key={h}
                      onClick={() => handleSelectHour(h)}
                      type="button"
                    >
                      <span>{h}h</span>
                      {isSelected ? (
                        <Check className="size-3 shrink-0" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Minutes Column */}
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold uppercase tracking-wider text-muted text-center">
                Minuto
              </span>
              <div
                className="flex flex-col gap-1 max-h-36 overflow-y-auto pr-1 scrollbar-thin rounded-lg bg-app/60 p-1 border border-border/40"
                ref={minutesListRef}
              >
                {COMMON_MINUTES.map((m) => {
                  const isSelected = currentMinute === m;
                  return (
                    <button
                      className={cn(
                        "flex items-center justify-between px-2.5 py-1 text-xs rounded-md font-mono transition-all text-left",
                        isSelected
                          ? "bg-accent text-accent-foreground font-bold"
                          : "hover:bg-accent hover:text-accent-foreground text-foreground font-medium",
                      )}
                      key={m}
                      onClick={() => handleSelectMinute(m)}
                      type="button"
                    >
                      <span>:{m}</span>
                      {isSelected ? (
                        <Check className="size-3 shrink-0" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer with manual input & Done button */}
          <div className="flex items-center gap-2 pt-2 border-t border-border/50">
            <input
              aria-label="Digitar horário manualmente"
              className="w-20 px-2 py-1 text-xs font-mono font-bold bg-app rounded-lg border border-border/70 text-foreground text-center focus:outline-none focus:border-accent"
              maxLength={5}
              onChange={handleManualChange}
              placeholder="00:00"
              type="text"
              value={manualInput}
            />
            <button
              className="flex-1 py-1 px-3 text-xs font-bold bg-accent text-accent-foreground rounded-lg hover:opacity-90 transition-opacity cursor-pointer text-center"
              onClick={() => setIsOpen(false)}
              type="button"
            >
              Confirmar
            </button>
          </div>
        </div>
      </FeatureAnchoredPopover>
    </div>
  );
}
