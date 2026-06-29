"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CopyPlus,
  ExternalLink,
  FileEdit,
  FileText,
  Layers,
  Loader2,
  Plus,
  Trash2,
  Eye as View,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface CustomPage {
  id: string;
  slug: string;
  label: string;
  description?: string;
  visible: boolean;
  order: number;
  secretToken?: string;
  components?: Array<{ type: string }>;
  backgroundColor?: string;
  accentColor?: string;
}

function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-lg">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </button>
        <h2 className="text-lg font-semibold mb-4">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export default function PagesListPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params.slug;

  const [loading, setLoading] = useState(true);
  const [pages, setPages] = useState<CustomPage[]>([]);
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pageToDelete, setPageToDelete] = useState<CustomPage | null>(null);
  const [newPage, setNewPage] = useState({ slug: "", label: "" });
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  useEffect(() => {
    async function fetchPages() {
      try {
        const res = await fetch(`/api/workspaces/${slug}/storefront`);
        const data = await res.json();
        if (res.ok && data.customRoutes) {
          const modularPages = (data.customRoutes as CustomPage[]).filter(
            (r) => r.id && r.slug && r.label,
          );
          setPages(modularPages.sort((a, b) => a.order - b.order));
        }
      } catch (err) {
        console.error("Error fetching pages:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPages();
  }, [slug]);

  async function handleCreate() {
    if (!newPage.slug || !newPage.label) {
      toast.error("Preencha o nome e URL da página");
      return;
    }

    if (!/^[a-z0-9-]+$/.test(newPage.slug)) {
      toast.error("URL deve ter apenas letras minúsculas, números e hífen");
      return;
    }

    if (pages.some((p) => p.slug === newPage.slug)) {
      toast.error("Esta URL já está em uso");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(`/api/workspaces/${slug}/storefront`);
      const data = await res.json();
      const existingRoutes = (data.customRoutes || []) as CustomPage[];

      const newPageData: CustomPage = {
        id: "p_" + Math.random().toString(36).substring(2, 10),
        slug: newPage.slug,
        label: newPage.label,
        visible: false,
        order: existingRoutes.length,
        components: [],
        backgroundColor:
          ((data.config as Record<string, unknown>)?.backgroundColor as
            string | undefined) || "#F8F5F0",
        accentColor:
          ((data.config as Record<string, unknown>)?.accentColor as
            string | undefined) || "#C9A84C",
      };

      const updatedRoutes = [...existingRoutes, newPageData];

      const saveRes = await fetch(`/api/workspaces/${slug}/storefront`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customRoutes: updatedRoutes }),
      });

      if (saveRes.ok) {
        setPages([...pages, newPageData].sort((a, b) => a.order - b.order));
        setCreateOpen(false);
        setSlugManuallyEdited(false);
        setNewPage({ slug: "", label: "" });
        toast.success("Página criada com sucesso!");
        router.push(`/${slug}/admin/website/pages/${newPageData.id}`);
      } else {
        toast.error("Erro ao criar página");
      }
    } catch {
      toast.error("Erro de conexão");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!pageToDelete) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/workspaces/${slug}/storefront`);
      const data = await res.json();
      const existingRoutes = (data.customRoutes || []) as CustomPage[];

      const updatedRoutes = existingRoutes.filter(
        (r) => r.id !== pageToDelete.id,
      );

      const saveRes = await fetch(`/api/workspaces/${slug}/storefront`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customRoutes: updatedRoutes }),
      });

      if (saveRes.ok) {
        setPages(pages.filter((p) => p.id !== pageToDelete.id));
        setDeleteOpen(false);
        setPageToDelete(null);
        toast.success("Página excluída com sucesso!");
      } else {
        toast.error("Erro ao excluir página");
      }
    } catch {
      toast.error("Erro de conexão");
    } finally {
      setSaving(false);
    }
  }

  async function handleDuplicate(page: CustomPage) {
    setSaving(true);
    try {
      const res = await fetch(`/api/workspaces/${slug}/storefront`);
      const data = await res.json();
      const existingRoutes = (data.customRoutes || []) as CustomPage[];

      const newSlug = `${page.slug}-copy`;
      const duplicatedPage: CustomPage = {
        ...page,
        id: "p_" + Math.random().toString(36).substring(2, 10),
        slug: newSlug,
        label: `${page.label} (cópia)`,
        visible: false,
        order: existingRoutes.length,
      };

      const updatedRoutes = [...existingRoutes, duplicatedPage];

      const saveRes = await fetch(`/api/workspaces/${slug}/storefront`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customRoutes: updatedRoutes }),
      });

      if (saveRes.ok) {
        setPages([...pages, duplicatedPage].sort((a, b) => a.order - b.order));
        toast.success("Página duplicada com sucesso!");
        router.push(`/${slug}/admin/website/pages/${duplicatedPage.id}`);
      } else {
        toast.error("Erro ao duplicar página");
      }
    } catch {
      toast.error("Erro ao duplicar página");
    } finally {
      setSaving(false);
    }
  }

  function getPreviewUrl(page: CustomPage) {
    return `/${slug}/p/${page.slug}${page.secretToken ? `?token=${page.secretToken}` : ""}`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Páginas Personalizadas</h1>
          <p className="text-sm text-muted-foreground">
            Crie páginas personalizadas para lançamentos, sobre nós, etc.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Página
        </Button>
      </div>

      {pages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mb-2 text-lg font-semibold">Nenhuma página criada</h3>
          <p className="mb-6 max-w-sm text-sm text-muted-foreground">
            Crie sua primeira página personalizada para lançamentos, páginas
            sobre nós, ou qualquer outro conteúdo.
          </p>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Criar Primeira Página
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pages.map((page) => (
            <div
              key={page.id}
              className="group relative flex flex-col rounded-xl border border-border/50 bg-card transition-all hover:border-primary/30 hover:shadow-lg overflow-hidden"
            >
              <div className="p-5 flex-1">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold text-sm">
                        {page.label}
                      </h3>
                      <p className="truncate text-xs text-muted-foreground">
                        /p/{page.slug}
                      </p>
                    </div>
                  </div>
                  {!page.visible && (
                    <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                      Rascunho
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5" />
                    <span>{page.components?.length || 0} componentes</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <View className="h-3.5 w-3.5" />
                    <span>{page.visible ? "Pública" : "Oculta"}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-border/50 p-3 flex items-center gap-1.5 bg-muted/30">
                <Button
                  variant="default"
                  size="sm"
                  className="h-8 flex-1"
                  asChild
                >
                  <Link href={`/${slug}/admin/website/pages/${page.id}`}>
                    <FileEdit className="mr-1.5 h-3.5 w-3.5" />
                    Editar
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => handleDuplicate(page)}
                  title="Duplicar"
                >
                  <CopyPlus className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  asChild
                >
                  <a
                    href={getPreviewUrl(page)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Visualizar"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30"
                  onClick={() => {
                    setPageToDelete(page);
                    setDeleteOpen(true);
                  }}
                  title="Excluir"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setSlugManuallyEdited(false);
          setNewPage({ slug: "", label: "" });
        }}
        title="Criar Nova Página"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Crie uma nova página modular com componentes personalizados.
          </p>
          <div className="space-y-2">
            <Label htmlFor="label">Nome da Página</Label>
            <Input
              id="label"
              value={newPage.label}
              onChange={(e) => {
                const label = e.target.value;
                setNewPage((prev) => ({
                  ...prev,
                  label,
                  slug: slugManuallyEdited
                    ? prev.slug
                    : label
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/^-|-$/g, ""),
                }));
              }}
              placeholder="Ex: Lançamento Vista Verde"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">URL</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">/{slug}/p/</span>
              <Input
                id="slug"
                value={newPage.slug}
                onChange={(e) => {
                  setSlugManuallyEdited(true);
                  setNewPage((prev) => ({
                    ...prev,
                    slug: e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]/g, "-"),
                  }));
                }}
                placeholder="lancamento-vista-verde"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Letras, números e hífens apenas
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setCreateOpen(false);
                setSlugManuallyEdited(false);
                setNewPage({ slug: "", label: "" });
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Página
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Excluir Página"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir &quot;{pageToDelete?.label}&quot;?
            Esta ação não pode ser desfeita.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={saving}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
