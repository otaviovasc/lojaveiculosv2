"use client";

import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Testimonial } from "@centroimovel/types";
import {
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Loader2,
  MessageSquareQuote,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";

interface TestimonialsSectionProps {
  testimonials: Testimonial[];
  config: Record<string, unknown>;
  slug: string;
  onUpdate: (key: string, value: unknown) => void;
}

export function TestimonialsSection({
  testimonials,
  config,
  slug,
  onUpdate,
}: TestimonialsSectionProps) {
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Testimonial>>({
    quote: "",
    name: "",
    role: "",
    imageSrc: null,
  });

  const isTestimonialsVisible =
    (config?.sections as Array<{ id: string; visible: boolean }>)?.find(
      (s) => s.id === "testimonials",
    )?.visible ?? false;

  const toggleTestimonialsVisible = (checked: boolean) => {
    const sections =
      (config?.sections as Array<{ id: string; visible: boolean }>) || [];
    const updated = sections.map((s) =>
      s.id === "testimonials" ? { ...s, visible: checked } : s,
    );
    onUpdate("sections", updated);
  };

  const openAddModal = () => {
    setEditingId(null);
    setDraft({ quote: "", name: "", role: "", imageSrc: null });
    setModalOpen(true);
  };

  const openEditModal = (t: Testimonial) => {
    setEditingId(t.id);
    setDraft({
      quote: t.quote ?? "",
      name: t.name ?? "",
      role: t.role ?? "",
      imageSrc: t.imageSrc ?? null,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
  };

  const saveTestimonial = () => {
    const name = (draft.name ?? "").trim();
    const quote = (draft.quote ?? "").trim();
    const role = (draft.role ?? "").trim();
    const imageSrc = draft.imageSrc ?? null;

    if (editingId) {
      onUpdate(
        "testimonials",
        testimonials.map((t) =>
          t.id === editingId ? { ...t, name, quote, role, imageSrc } : t,
        ),
      );
    } else {
      const newT: Testimonial = {
        id: crypto.randomUUID(),
        quote,
        name,
        role,
        imageSrc,
      };
      onUpdate("testimonials", [...testimonials, newT]);
    }
    closeModal();
  };

  const removeTestimonial = (id: string) => {
    onUpdate(
      "testimonials",
      testimonials.filter((t) => t.id !== id),
    );
  };

  const moveTestimonial = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= testimonials.length) return;
    const updated = [...testimonials];
    const [removed] = updated.splice(index, 1);
    if (!removed) return;
    updated.splice(newIndex, 0, removed);
    onUpdate("testimonials", updated);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingId(editingId ?? "new");
    try {
      const res = await fetch(`/api/workspaces/${slug}/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          assetType: "testimonial",
          testimonialId: editingId ?? crypto.randomUUID(),
        }),
      });

      let data: { presignedUrl?: string; publicUrl?: string; error?: string };
      try {
        data = await res.json();
      } catch {
        throw new Error("Resposta inválida do servidor");
      }

      if (!res.ok) {
        throw new Error(data.error ?? `Erro ${res.status}`);
      }

      const { presignedUrl, publicUrl } = data;
      if (!presignedUrl || !publicUrl) {
        throw new Error("Dados de upload incompletos");
      }

      const putRes = await fetch(presignedUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!putRes.ok) {
        throw new Error("Erro ao enviar imagem");
      }

      setDraft((p) => ({ ...p, imageSrc: publicUrl }));
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setUploadingId(null);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-6">
      {/* Section toggle */}
      <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 px-4 py-3">
        <div>
          <Label className="text-sm font-medium">
            Ativar seção Depoimentos
          </Label>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Exibir depoimentos no site
          </p>
        </div>
        <label className="flex shrink-0 cursor-pointer items-center">
          <input
            type="checkbox"
            checked={isTestimonialsVisible}
            onChange={(e) => toggleTestimonialsVisible(e.target.checked)}
            className="sr-only"
          />
          <div
            className={cn(
              "relative h-7 w-12 rounded-full shadow-inner transition-colors",
              isTestimonialsVisible ? "bg-primary" : "bg-muted",
            )}
          >
            <div
              className={cn(
                "absolute top-1 h-5 w-5 rounded-full bg-background shadow transition-transform",
                isTestimonialsVisible ? "translate-x-6" : "translate-x-1",
              )}
            />
          </div>
        </label>
      </div>

      {/* Testimonials list */}
      {testimonials.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-border/50 bg-muted/5 py-12 text-center">
          <MessageSquareQuote className="h-10 w-10 text-muted-foreground/40" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              Nenhum depoimento
            </p>
            <p className="text-xs text-muted-foreground">
              Adicione depoimentos de clientes para exibir no site
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openAddModal}
          >
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Depoimento
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {testimonials.map((testimonial, index) => (
            <div
              key={testimonial.id}
              className="flex items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3 shadow-sm transition-all hover:border-border/80"
            >
              {/* Thumbnail */}
              {testimonial.imageSrc ? (
                <img
                  src={testimonial.imageSrc}
                  alt={testimonial.name}
                  className="h-12 w-12 shrink-0 rounded-full object-cover border border-border/50"
                />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted/50">
                  <MessageSquareQuote className="h-5 w-5 text-muted-foreground/50" />
                </div>
              )}

              {/* Preview */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {testimonial.name || "Sem nome"}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {testimonial.quote
                    ? `"${testimonial.quote}"`
                    : testimonial.role || "Depoimento vazio"}
                </p>
              </div>

              {/* Controls */}
              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => openEditModal(testimonial)}
                  className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  title="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => moveTestimonial(index, -1)}
                  disabled={index === 0}
                  className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
                  title="Mover para cima"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => moveTestimonial(index, 1)}
                  disabled={index === testimonials.length - 1}
                  className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
                  title="Mover para baixo"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => removeTestimonial(testimonial.id)}
                  className="rounded-lg p-2 text-destructive/70 transition-colors hover:bg-destructive/10 hover:text-destructive"
                  title="Remover"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={openAddModal}
          >
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Depoimento
          </Button>
        </div>
      )}

      {/* Modal: Add / Edit testimonial */}
      <Drawer
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingId ? "Editar Depoimento" : "Novo Depoimento"}
        description={
          editingId
            ? "Altere os dados do depoimento"
            : "Preencha as informações do cliente"
        }
        footer={
          <div className="flex w-full gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={closeModal}
            >
              Cancelar
            </Button>
            <Button type="button" className="flex-1" onClick={saveTestimonial}>
              Salvar
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Photo */}
          <div className="space-y-2">
            <Label>Foto do cliente</Label>
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                id="testimonial-modal-photo"
                onChange={handlePhotoUpload}
              />
              {draft.imageSrc ? (
                <div className="group relative">
                  <img
                    src={draft.imageSrc}
                    alt=""
                    className="h-20 w-20 rounded-full border-2 border-border/50 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setDraft((p) => ({ ...p, imageSrc: null }))}
                    className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-white shadow-md opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="testimonial-modal-photo"
                  className={cn(
                    "flex h-20 w-20 cursor-pointer items-center justify-center rounded-full border-2 border-dashed transition-all",
                    uploadingId
                      ? "border-muted opacity-50"
                      : "border-border hover:border-primary/40 hover:bg-primary/5",
                  )}
                >
                  {uploadingId ? (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  )}
                </label>
              )}
              <div>
                <p className="text-sm text-muted-foreground">
                  Clique para enviar uma foto
                </p>
                <p className="text-[11px] text-muted-foreground">
                  PNG ou JPG recomendado
                </p>
              </div>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="modal-name">Nome do cliente</Label>
            <Input
              id="modal-name"
              value={draft.name ?? ""}
              onChange={(e) =>
                setDraft((p) => ({ ...p, name: e.target.value }))
              }
              placeholder="Ex: Maria Silva"
              className="h-10"
            />
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label htmlFor="modal-role">Cargo ou relação</Label>
            <Input
              id="modal-role"
              value={draft.role ?? ""}
              onChange={(e) =>
                setDraft((p) => ({ ...p, role: e.target.value }))
              }
              placeholder="Ex: Compradora"
              className="h-10"
            />
          </div>

          {/* Quote */}
          <div className="space-y-2">
            <Label htmlFor="modal-quote">Depoimento</Label>
            <Textarea
              id="modal-quote"
              value={draft.quote ?? ""}
              onChange={(e) =>
                setDraft((p) => ({ ...p, quote: e.target.value }))
              }
              placeholder="O que o cliente disse sobre o seu trabalho..."
              rows={5}
              className="min-h-[120px] resize-y"
            />
          </div>
        </div>
      </Drawer>
    </div>
  );
}
