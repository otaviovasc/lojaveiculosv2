import { CheckCircle2, ImageUp, LoaderCircle } from "lucide-react";
import type { ChangeEvent } from "react";
import {
  mediaKindOptions,
  type InventoryFieldChangeHandler,
  type InventoryFormState,
} from "../model/formModel";
import {
  InventoryBadge,
  InventoryField,
  InventoryInput,
  InventoryPanel,
  InventorySelect,
} from "./InventoryFormParts";
import type { CreateInventoryFlowResult } from "../model/types";

export type SubmitState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; result: CreateInventoryFlowResult }
  | { kind: "error"; message: string };

export function MediaPanel({
  file,
  form,
  onChange,
  onFileChange,
}: {
  file: File | null;
  form: InventoryFormState;
  onChange: InventoryFieldChangeHandler;
  onFileChange: (file: File | null) => void;
}) {
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    onFileChange(event.target.files?.[0] ?? null);
  };

  return (
    <InventoryPanel icon={<ImageUp className="size-5" />} title="Midia R2">
      <div className="grid gap-4">
        <InventoryField label="Arquivo" hint="Envio opcional via URL assinada.">
          <InventoryInput
            accept="image/*,video/*,application/pdf"
            onChange={handleFileChange}
            type="file"
          />
        </InventoryField>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
          <InventoryField label="Tipo">
            <InventorySelect
              disabled={!file}
              onChange={onChange("mediaKind")}
              options={mediaKindOptions}
              value={form.mediaKind}
            />
          </InventoryField>
          <InventoryField label="Texto alternativo">
            <InventoryInput
              disabled={!file}
              onChange={onChange("altText")}
              placeholder="Opcional"
              value={form.altText}
            />
          </InventoryField>
        </div>

        {file ? (
          <div className="rounded-lg border border-line bg-app p-3 text-sm font-bold text-muted">
            <strong className="block text-app-text">{file.name}</strong>
            {(file.size / 1024 / 1024).toFixed(2)} MB
          </div>
        ) : null}
      </div>
    </InventoryPanel>
  );
}

export function SubmitPanel({
  file,
  state,
}: {
  file: File | null;
  state: SubmitState;
}) {
  return (
    <section className="rounded-lg border border-line bg-panel p-4 shadow-[var(--shadow-panel)]">
      <div className="mb-4 flex flex-wrap gap-2">
        <InventoryBadge>1. Anuncio</InventoryBadge>
        <InventoryBadge tone="blue">2. Unidade</InventoryBadge>
        {file ? <InventoryBadge tone="warning">3. Midia</InventoryBadge> : null}
      </div>

      <button
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-black text-accent-foreground disabled:opacity-70"
        disabled={state.kind === "submitting"}
        type="submit"
      >
        {state.kind === "submitting" ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <CheckCircle2 aria-hidden="true" className="size-4" />
        )}
        Criar veiculo
      </button>

      {state.kind === "error" ? (
        <p className="mt-4 rounded-lg border border-line bg-app p-3 text-sm font-black text-danger">
          {state.message}
        </p>
      ) : null}

      {state.kind === "success" ? <SuccessState result={state.result} /> : null}
    </section>
  );
}

function SuccessState({ result }: { result: CreateInventoryFlowResult }) {
  const mediaUrl = result.media?.url ?? result.upload?.publicUrl;

  return (
    <div className="mt-4 space-y-3 rounded-lg border border-line bg-accent-soft p-3 text-sm font-bold text-accent-strong">
      <div>
        <strong className="block text-app-text">Estoque criado</strong>
        Veículo pronto para revisão e publicação.
      </div>
      {mediaUrl ? (
        <a
          className="block break-all underline"
          href={mediaUrl}
          rel="noreferrer"
          target="_blank"
        >
          {mediaUrl}
        </a>
      ) : null}
    </div>
  );
}
