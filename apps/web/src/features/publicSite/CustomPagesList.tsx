import { FileText, Loader2, Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { StorefrontCustomPage } from "@lojaveiculosv2/shared";
import { Button } from "@/components/ui/button";
import { FeatureAlert, FeatureEmptyState } from "@/components/ui/FeatureStates";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isValidCustomPageSlug } from "./customPageUtils";
import { CustomPagesDialog, PageCard } from "./CustomPagesListParts";

export type CustomPagesListProps = {
  createDescription: string;
  createSlug: string;
  createTitle: string;
  isBusy: boolean;
  onCreate: () => Promise<boolean>;
  onCreateDescriptionChange: (value: string) => void;
  onCreateSlugChange: (value: string) => void;
  onCreateTitleChange: (value: string) => void;
  onDelete: (page: StorefrontCustomPage) => void;
  onDuplicate: (page: StorefrontCustomPage) => void;
  onSelect: (page: StorefrontCustomPage) => void;
  pages: readonly StorefrontCustomPage[];
  statusMessage?: { text: string; type: "error" | "success" } | null;
  storeSlug: string;
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
  statusMessage,
  storeSlug,
}: CustomPagesListProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pageToDelete, setPageToDelete] = useState<StorefrontCustomPage | null>(
    null,
  );

  const resetCreate = () => {
    setCreateOpen(false);
    onCreateDescriptionChange("");
    onCreateSlugChange("");
    onCreateTitleChange("");
    setFormError(null);
  };

  const submitCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const slug = createSlug.trim();
    if (!createTitle.trim() || !slug) {
      setFormError("Preencha o nome e a URL da pagina.");
      return;
    }
    if (!isValidCustomPageSlug(slug)) {
      setFormError("Use apenas letras minusculas, numeros e hifens na URL.");
      return;
    }
    if (pages.some((page) => page.slug === slug)) {
      setFormError("Esta URL ja esta em uso.");
      return;
    }

    setFormError(null);
    if (await onCreate()) resetCreate();
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

      {statusMessage ? (
        <FeatureAlert
          className={
            statusMessage.type === "error"
              ? "feature-alert text-danger"
              : "feature-alert text-success"
          }
        >
          {statusMessage.text}
        </FeatureAlert>
      ) : null}

      {pages.length === 0 ? (
        <FeatureEmptyState
          action={
            <Button disabled={isBusy} onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeira Pagina
            </Button>
          }
          body="Crie sua primeira pagina personalizada para lancamentos, ofertas ou qualquer outro conteudo."
          icon={FileText}
          title="Nenhuma pagina criada"
        />
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
              storeSlug={storeSlug}
            />
          ))}
        </div>
      )}

      <CustomPagesDialog
        onClose={resetCreate}
        open={createOpen}
        title="Criar Nova Pagina"
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            void submitCreate(event);
          }}
        >
          <p className="text-sm text-muted-foreground">
            Crie uma nova pagina modular com componentes personalizados.
          </p>
          {formError ? (
            <FeatureAlert className="feature-alert text-danger">
              {formError}
            </FeatureAlert>
          ) : null}
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
            <p className="text-xs text-muted-foreground">
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
            <Button
              disabled={isBusy}
              onClick={resetCreate}
              type="button"
              variant="outline"
            >
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
