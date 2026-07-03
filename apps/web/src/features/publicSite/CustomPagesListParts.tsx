import type { StorefrontCustomPage } from "@lojaveiculosv2/shared";
import {
  CopyPlus,
  ExternalLink,
  Eye,
  FileEdit,
  FileText,
  Layers,
  Trash2,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { buildCustomPagePreviewPath } from "./customPageUtils";

export function PageCard({
  isBusy,
  onDelete,
  onDuplicate,
  onSelect,
  page,
  storeSlug,
}: {
  isBusy: boolean;
  onDelete: () => void;
  onDuplicate: () => void;
  onSelect: () => void;
  page: StorefrontCustomPage;
  storeSlug: string;
}) {
  const previewUrl = buildCustomPagePreviewPath(page, storeSlug);
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-border/50 bg-card transition-all hover:border-primary/30 hover:shadow-lg">
      <div className="flex-1 p-5">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-semibold">{page.title}</h3>
              <p className="truncate text-xs text-muted-foreground">
                /p/{page.slug}
              </p>
            </div>
          </div>
          {!page.visible ? (
            <span className="shrink-0 rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
              Rascunho
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5" />
            <span>{page.components.length} componentes</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5" />
            <span>{page.visible ? "Pública" : "Oculta"}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 border-t border-border/50 bg-muted/30 p-3">
        <Button
          className="h-8 flex-1"
          disabled={isBusy}
          onClick={onSelect}
          size="sm"
          type="button"
        >
          <FileEdit className="mr-1.5 h-3.5 w-3.5" />
          Editar
        </Button>
        <IconButton
          disabled={isBusy}
          icon={<CopyPlus className="h-4 w-4" />}
          label="Duplicar"
          onClick={onDuplicate}
        />
        <Button className="h-8 w-8 p-0" size="sm" variant="outline" asChild>
          <a
            aria-label={`Visualizar ${page.title}`}
            href={previewUrl}
            rel="noopener noreferrer"
            target="_blank"
            title="Visualizar"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
        <IconButton
          className="hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
          disabled={isBusy}
          icon={<Trash2 className="h-4 w-4" />}
          label="Excluir"
          onClick={onDelete}
        />
      </div>
    </div>
  );
}

export function CustomPagesDialog({
  children,
  onClose,
  open,
  title,
}: {
  children: ReactNode;
  onClose: () => void;
  open: boolean;
  title: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        aria-label="Fechar"
        className="absolute inset-0 bg-black/80"
        onClick={onClose}
        type="button"
      />
      <div className="relative z-10 w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-lg">
        <button
          aria-label="Fechar"
          className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100"
          onClick={onClose}
          title="Fechar"
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
        <h2 className="mb-4 text-lg font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function IconButton({
  className,
  disabled,
  icon,
  label,
  onClick,
}: {
  className?: string;
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      aria-label={label}
      className={["h-8 w-8 p-0", className].filter(Boolean).join(" ")}
      disabled={disabled}
      onClick={onClick}
      size="sm"
      title={label}
      type="button"
      variant="outline"
    >
      {icon}
    </Button>
  );
}
