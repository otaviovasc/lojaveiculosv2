import { Clock, Sparkles } from "lucide-react";

export type CrmDateTimePreset = {
  dayOffset: number;
  h: number;
  label: string;
  m: number;
};

const frequentTimeSlots = [
  { h: 9, label: "09:00", m: 0 },
  { h: 10, label: "10:30", m: 30 },
  { h: 14, label: "14:00", m: 0 },
  { h: 15, label: "15:30", m: 30 },
  { h: 17, label: "17:00", m: 0 },
  { h: 18, label: "18:00", m: 0 },
] as const;

export function CrmDateTimeShortcuts({
  activeTime,
  onApplyPreset,
  onApplyTime,
  presets,
}: {
  activeTime: string;
  onApplyPreset: (dayOffset: number, h: number, m: number) => void;
  onApplyTime: (h: number, m: number) => void;
  presets: readonly CrmDateTimePreset[];
}) {
  return (
    <>
      <div className="crm-visit-quick-group">
        <span className="crm-visit-quick-group-label">
          <Sparkles aria-hidden="true" />
          Sugestões rápidas:
        </span>
        <div className="crm-visit-quick-preset-pills">
          {presets.map((preset) => (
            <button
              className="crm-visit-preset-btn"
              key={preset.label}
              onClick={() =>
                onApplyPreset(preset.dayOffset, preset.h, preset.m)
              }
              type="button"
            >
              <Clock aria-hidden="true" />
              {preset.label}
            </button>
          ))}
        </div>
      </div>
      <div className="crm-visit-time-slots">
        <span className="crm-visit-time-slots-label">Horários frequentes:</span>
        <div className="crm-visit-time-slot-pills">
          {frequentTimeSlots.map((slot) => {
            const isActive = activeTime === slot.label;
            return (
              <button
                className={`crm-visit-time-slot-btn${isActive ? " active" : ""}`}
                data-active={isActive ? "true" : undefined}
                key={slot.label}
                onClick={() => onApplyTime(slot.h, slot.m)}
                type="button"
              >
                {slot.label}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
