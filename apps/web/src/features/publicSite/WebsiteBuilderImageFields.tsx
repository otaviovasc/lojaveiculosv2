import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function WebsiteBuilderImageUrlField({
  imageClassName,
  label,
  onChange,
  placeholder,
  value,
}: {
  imageClassName: string;
  label: string;
  onChange: (value: string | null) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </h4>
      <div className="flex flex-col gap-3">
        {value ? (
          <div className="group relative inline-flex max-w-fit">
            <img
              alt=""
              className={cn(
                "border border-border/50 object-cover shadow-sm",
                imageClassName,
              )}
              src={value}
            />
            <button
              className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-destructive text-white shadow-md opacity-0 transition-opacity group-hover:opacity-100"
              onClick={() => onChange(null)}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex min-h-[100px] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-6 transition-all hover:border-primary/40 hover:bg-primary/5">
            <Upload className="h-6 w-6 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              Cole a URL da imagem
            </span>
          </div>
        )}
        <Input
          className="h-10 text-xs"
          onChange={(event) => onChange(event.target.value || null)}
          placeholder={placeholder}
          type="url"
          value={value}
        />
      </div>
    </div>
  );
}

export function WebsiteBuilderHeroImageField({
  onChange,
  value,
}: {
  onChange: (value: string | null) => void;
  value: string;
}) {
  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Imagem de Fundo
      </h4>
      {value ? (
        <div className="group relative overflow-hidden rounded-xl border border-border/50">
          <img alt="" className="h-40 w-full object-cover" src={value} />
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              onClick={() => onChange(null)}
              size="sm"
              type="button"
              variant="secondary"
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Remover
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border py-12 transition-all hover:border-primary/40 hover:bg-primary/5">
          <Upload className="h-5 w-5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            Cole uma URL de imagem
          </span>
        </div>
      )}
      <Input
        className="h-10 text-xs"
        onChange={(event) => onChange(event.target.value || null)}
        placeholder="https://images.unsplash.com/photo-..."
        type="url"
        value={value}
      />
      <p className="text-[11px] text-muted-foreground">
        Imagem de alta resolucao, minimo 1920x1080.
      </p>
    </div>
  );
}
