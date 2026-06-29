"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import type { PropsEditorProps } from "./types";

interface Testimonial {
  id: string;
  name: string;
  role: string;
  quote: string;
  imageSrc?: string;
}

export function TestimonialsEditor({ props, onChange }: PropsEditorProps) {
  const testimonials = (props.testimonials as Testimonial[]) || [];

  const addTestimonial = () => {
    const newTestimonial: Testimonial = {
      id: `t_${Date.now()}`,
      name: "",
      role: "",
      quote: "",
    };
    onChange({ ...props, testimonials: [...testimonials, newTestimonial] });
  };

  const updateTestimonial = (index: number, updates: Partial<Testimonial>) => {
    const updated = [...testimonials];
    updated[index] = { ...updated[index]!, ...updates };
    onChange({ ...props, testimonials: updated });
  };

  const removeTestimonial = (index: number) => {
    onChange({
      ...props,
      testimonials: testimonials.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Título da Seção</Label>
        <Input
          value={(props.title as string) || ""}
          onChange={(e) => onChange({ ...props, title: e.target.value })}
          placeholder="O que nossos clientes dizem"
        />
      </div>

      <div className="space-y-3">
        <Label>Depoimentos ({testimonials.length})</Label>
        {testimonials.map((testimonial, index) => (
          <div
            key={testimonial.id}
            className="space-y-2 rounded-lg border border-border/50 p-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Depoimento {index + 1}
              </span>
              <button
                type="button"
                onClick={() => removeTestimonial(index)}
                className="rounded p-1 text-destructive hover:bg-muted"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <Input
              value={testimonial.name}
              onChange={(e) =>
                updateTestimonial(index, { name: e.target.value })
              }
              placeholder="Nome"
              className="h-8"
            />
            <Input
              value={testimonial.role}
              onChange={(e) =>
                updateTestimonial(index, { role: e.target.value })
              }
              placeholder="Cargo/Profissão"
              className="h-8"
            />
            <Input
              value={testimonial.quote}
              onChange={(e) =>
                updateTestimonial(index, { quote: e.target.value })
              }
              placeholder="Depoimento..."
            />
            <Input
              value={testimonial.imageSrc || ""}
              onChange={(e) =>
                updateTestimonial(index, { imageSrc: e.target.value })
              }
              placeholder="URL da foto (opcional)"
              className="h-8"
            />
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addTestimonial}
          className="w-full"
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Adicionar Depoimento
        </Button>
      </div>
    </div>
  );
}
