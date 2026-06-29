import {
  CopyPlus,
  ExternalLink,
  Eye,
  FileEdit,
  FileText,
  Layers,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import type { StorefrontCustomPage } from "@lojaveiculosv2/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type CustomPagesListProps = {
  createDescription: string;
  createSlug: string;
  createTitle: string;
  isBusy: boolean;
  onCreate: (event: FormEvent<HTMLFormElement>) => void;
  onCreateDescriptionChange: (value: string) => void;
  onCreateSlugChange: (value: string) => void;
  onCreateTitleChange: (value: string) => void;
  onDelete: (page: StorefrontCustomPage) => void;
  onDuplicate: (page: StorefrontCustomPage) => void;
  onSelect: (page: StorefrontCustomPage) => void;
  pages: readonly StorefrontCustomPage[];
};

export function CustomPagesList({
  createDescription,
  createSlug,
  createTitle,
  isBusy,
  onCreate,
  onCreateDescriptionChange,
  onCreateSlugChange,
  onCreateTitleChange,
  onDelete,
  onDuplicate,
  onSelect,
  pages,
}: CustomPagesListProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [pageToDelete, setPageToDelete] = useState<StorefrontCustomPage | null>(
    null,
  );

  const resetCreate = () => {
    setCreateOpen(false);
    onCreateDescriptionChange("");
    onCreateSlugChange("");
    onCreateTitleChange("");
  };

  const submitCreate = (event: FormEvent<HTMLFormElement>) => {
    onCreate(event);
    setCreateOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Paginas Personalizadas</h1>
          <p className="text-sm text-muted-foreground">
            Crie paginas personalizadas para campanhas, ofertas e conteudo
            institucional.
          </p>
        </div>
        <Button disabled={isBusy} onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Pagina
        </Button>
      </div>

      {pages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mb-2 text-lg font-semibold">Nenhuma pagina criada</h3>
          <p className="mb-6 max-w-sm text-sm text-muted-foreground">
            Crie sua primeira pagina personalizada para lancamentos, ofertas ou
            qualquer outro conteudo.
          </p>
          <Button disabled={isBusy} onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Criar Primeira Pagina
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pages.map((page) => (
            <PageCard
              isBusy={isBusy}
              key={page.id}
              onDelete={() => setPageToDelete(page)}
              onDuplicate={() => onDuplicate(page)}
              onSelect={() => onSelect(page)}
              page={page}
            />
          ))}
        </div>
      )}

      <CustomPagesDialog
        onClose={resetCreate}
        open={createOpen}
        title="Criar Nova Pagina"
      >
        <form className="space-y-4" onSubmit={submitCreate}>
          <p className="text-sm text-muted-foreground">
            Crie uma nova pagina modular com componentes personalizados.
          </p>
          <div className="space-y-2">
            <Label htmlFor="page-title">Nome da Pagina</Label>
            <Input
              disabled={isBusy}
              id="page-title"
              onChange={(event) => onCreateTitleChange(event.target.value)}
              placeholder="Ex: Lancamento Especial"
              required
              value={createTitle}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="page-slug">URL</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">/p/</span>
              <Input
                disabled={isBusy}
                id="page-slug"
                onChange={(event) => onCreateSlugChange(event.target.value)}
                placeholder="lancamento-especial"
                required
                value={createSlug}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Letras, numeros e hifens apenas.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="page-description">Descricao</Label>
            <Input
              disabled={isBusy}
              id="page-description"
              onChange={(event) =>
                onCreateDescriptionChange(event.target.value)
              }
              placeholder="Resumo curto para identificar a pagina"
              value={createDescription}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button onClick={resetCreate} type="button" variant="outline">
              Cancelar
            </Button>
            <Button disabled={isBusy} type="submit">
              {isBusy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Criar Pagina
            </Button>
          </div>
        </form>
      </CustomPagesDialog>

      <CustomPagesDialog
        onClose={() => setPageToDelete(null)}
        open={Boolean(pageToDelete)}
        title="Excluir Pagina"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir "{pageToDelete?.title}"? Esta acao
            nao pode ser desfeita.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              onClick={() => setPageToDelete(null)}
              type="button"
              variant="outline"
            >
              Cancelar
            </Button>
            <Button
              disabled={isBusy}
              onClick={() => {
                if (pageToDelete) onDelete(pageToDelete);
                setPageToDelete(null);
              }}
              type="button"
              variant="destructive"
            >
              {isBusy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Excluir
            </Button>
          </div>
        </div>
      </CustomPagesDialog>
    </div>
  );
}

function PageCard({
  isBusy,
  onDelete,
  onDuplicate,
  onSelect,
  page,
}: {
  isBusy: boolean;
  onDelete: () => void;
  onDuplicate: () => void;
  onSelect: () => void;
  page: StorefrontCustomPage;
}) {
  const previewUrl = page.publicUrl ?? page.previewUrl;
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
            <span className="shrink-0 rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning">
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
            <span>{page.visible ? "Publica" : "Oculta"}</span>
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
        <Button
          className="h-8 w-8 p-0"
          disabled={isBusy}
          onClick={onDuplicate}
          size="sm"
          title="Duplicar"
          type="button"
          variant="outline"
        >
          <CopyPlus className="h-4 w-4" />
        </Button>
        {previewUrl ? (
          <Button className="h-8 w-8 p-0" size="sm" variant="outline" asChild>
            <a
              href={previewUrl}
              rel="noopener noreferrer"
              target="_blank"
              title="Visualizar"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        ) : null}
        <Button
          className="h-8 w-8 p-0 hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
          disabled={isBusy}
          onClick={onDelete}
          size="sm"
          title="Excluir"
          type="button"
          variant="outline"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function CustomPagesDialog({
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
          className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100"
          onClick={onClose}
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
