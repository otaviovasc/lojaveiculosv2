import { useState, useRef } from "react";
import { FileText, Pencil, Check } from "lucide-react";

export function NotesBlockField({
  label,
  value,
  onSave,
}: {
  label: string;
  value: string;
  onSave: (val: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempVal, setTempVal] = useState(value);
  const ref = useRef<HTMLTextAreaElement>(null);

  const handleEdit = () => {
    setIsEditing(true);
    setTimeout(() => {
      ref.current?.focus();
      ref.current?.select();
    }, 50);
  };

  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl border border-line bg-panel/60">
      <div
        className="flex items-center justify-between min-w-0 w-full pb-1.5 border-b border-line/40"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="size-3.5 text-accent shrink-0 animate-none" />
          <span className="text-[10px] font-black text-primary leading-none uppercase tracking-wider truncate">
            {label}
          </span>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (isEditing) {
              setIsEditing(false);
              onSave(tempVal);
            } else {
              handleEdit();
            }
          }}
          className={
            "size-6 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer " +
            (isEditing
              ? "bg-accent text-white hover:bg-accent-strong"
              : "text-muted hover:text-accent bg-transparent hover:bg-accent-soft")
          }
          title={isEditing ? "Salvar" : "Editar"}
        >
          {isEditing ? (
            <Check className="size-3.5" />
          ) : (
            <Pencil className="size-3.5" />
          )}
        </button>
      </div>
      <div className="relative w-full" onClick={(e) => e.stopPropagation()}>
        <textarea
          ref={ref}
          value={tempVal}
          onChange={(e) => setTempVal(e.target.value)}
          disabled={!isEditing}
          rows={3}
          spellCheck={false}
          className={
            "w-full text-xs font-bold text-app-text bg-transparent p-2 rounded-lg border resize-none transition-all duration-300 focus:outline-none focus:ring-1 leading-relaxed " +
            (isEditing
              ? "border-accent/40 bg-app-elevated/45 focus:border-accent focus:ring-accent/20"
              : "border-line/45 hover:border-line-strong/60 bg-transparent disabled:cursor-default")
          }
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              setIsEditing(false);
              onSave(tempVal);
            } else if (e.key === "Escape") {
              setIsEditing(false);
              setTempVal(value);
            }
          }}
        />
        {isEditing && (
          <span className="absolute bottom-1 right-2 text-[8px] text-muted/60 font-medium animate-none">
            Ctrl+Enter
          </span>
        )}
      </div>
    </div>
  );
}
