import { X } from "lucide-react";

export function DialogCloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      aria-label="Fechar"
      className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
      onClick={onClose}
      type="button"
    >
      <X className="h-4 w-4" />
      <span className="sr-only">Fechar</span>
    </button>
  );
}
