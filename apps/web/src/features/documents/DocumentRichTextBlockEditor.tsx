import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Building2,
  Calendar,
  Car,
  CreditCard,
  DollarSign,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Gauge,
  Globe,
  Hash,
  HelpCircle,
  MapPin,
  Palette,
  Phone,
  Redo2,
  Store,
  Tag,
  Undo2,
  User,
  UserCheck,
  Variable,
} from "lucide-react";
import type { ComponentType } from "react";
import { useEffect, useMemo } from "react";
import { sampleVariable } from "./documentBuilderModel";
import { VariableChip } from "./DocumentVariableChipNode";

export type VariableMeta = {
  icon: ComponentType<{ className?: string }>;
  label: string;
};

export function getVariableMeta(variable: string): VariableMeta {
  const clean = variable
    .replace(/^\{\{\s*/, "")
    .replace(/\s*\}\}$/, "")
    .trim();
  const lowerClean = clean.toLowerCase();

  const explicitMap: Record<string, VariableMeta> = {
    // Store
    "store.name": { icon: Store, label: "Nome da Loja" },
    "store.document": { icon: Building2, label: "CNPJ da Loja" },
    "store.address": { icon: MapPin, label: "Endereço da Loja" },
    "store.citystate": { icon: Globe, label: "Cidade/UF da Loja" },
    "store.phone": { icon: Phone, label: "Telefone da Loja" },

    // Buyer
    "buyer.name": { icon: User, label: "Nome do Comprador" },
    "buyer.document": { icon: FileCheck, label: "CPF/CNPJ do Comprador" },
    "buyer.cpf": { icon: FileCheck, label: "CPF do Comprador" },
    "buyer.address": { icon: MapPin, label: "Endereço do Comprador" },
    "buyer.email": { icon: User, label: "E-mail do Comprador" },
    "buyer.phone": { icon: Phone, label: "Telefone do Comprador" },

    // Driver
    "driver.name": { icon: User, label: "Nome do Condutor" },
    "driver.document": { icon: FileCheck, label: "CPF do Condutor" },

    // Vehicle
    "vehicle.title": { icon: Car, label: "Veículo" },
    "vehicle.label": { icon: Car, label: "Veículo" },
    "vehicle.plate": { icon: Hash, label: "Placa" },
    "vehicle.renavam": { icon: FileSpreadsheet, label: "RENAVAM" },
    "vehicle.chassis": { icon: Hash, label: "Chassi (VIN)" },
    "vehicle.km": { icon: Gauge, label: "Quilometragem" },
    "vehicle.color": { icon: Palette, label: "Cor" },
    "vehicle.brand": { icon: Car, label: "Marca do Veículo" },
    "vehicle.model": { icon: Car, label: "Modelo do Veículo" },
    "vehicle.version": { icon: Car, label: "Versão do Veículo" },
    "vehicle.year": { icon: Calendar, label: "Ano do Veículo" },
    "vehicle.fuel": { icon: Car, label: "Combustível" },

    // Finance
    "finance.saleprice": { icon: DollarSign, label: "Valor da Venda" },
    "sale.price": { icon: DollarSign, label: "Valor da Venda" },
    "finance.price": { icon: DollarSign, label: "Valor da Venda" },
    "finance.signalamount": { icon: DollarSign, label: "Valor do Sinal" },
    "finance.paymentmethod": { icon: CreditCard, label: "Forma de Pagamento" },

    // Document
    "document.number": { icon: Hash, label: "Número do Documento" },
    "document.issuedat": { icon: Calendar, label: "Data de Emissão" },
  };

  if (explicitMap[lowerClean]) return explicitMap[lowerClean];

  // Dynamic camelCase & snake_case parser
  const parts = clean.split(".");
  if (parts.length === 2) {
    const groupMap: Record<
      string,
      { icon: ComponentType<{ className?: string }>; label: string }
    > = {
      buyer: { icon: User, label: "Comprador" },
      contract: { icon: FileText, label: "Contrato" },
      document: { icon: FileCheck, label: "Documento" },
      finance: { icon: DollarSign, label: "Financeiro" },
      sale: { icon: DollarSign, label: "Venda" },
      seller: { icon: UserCheck, label: "Vendedor" },
      store: { icon: Store, label: "Loja" },
      vehicle: { icon: Car, label: "Veículo" },
    };

    const grp = groupMap[parts[0]!.toLowerCase()];
    const categoryLabel = grp
      ? grp.label
      : parts[0]!.charAt(0).toUpperCase() + parts[0]!.slice(1);
    const subField = parts[1]!.toLowerCase();
    if (subField === "label" || subField === "title") {
      return { icon: grp ? grp.icon : Tag, label: categoryLabel };
    }
    const formattedField = formatSubFieldToPortuguese(parts[1]!);
    if (categoryLabel.toLowerCase() === formattedField.toLowerCase()) {
      return { icon: grp ? grp.icon : Tag, label: categoryLabel };
    }
    return {
      icon: grp ? grp.icon : Tag,
      label: `${categoryLabel}: ${formattedField}`,
    };
  }

  return { icon: HelpCircle, label: formatSubFieldToPortuguese(clean) };
}

export function formatSubFieldToPortuguese(rawField: string): string {
  // Convert camelCase to words (e.g. cityState -> city State)
  const spaced = rawField
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .toLowerCase()
    .trim();

  const fieldDictionary: Record<string, string> = {
    address: "Endereço",
    bairro: "Bairro",
    brand: "Marca",
    cambio: "Câmbio / Transmissão",
    cep: "CEP",
    chassi: "Chassi (VIN)",
    city: "Cidade",
    "city state": "Cidade e Estado",
    citystate: "Cidade e Estado",
    color: "Cor",
    combustivel: "Combustível",
    complement: "Complemento",
    cpf: "CPF",
    date: "Data",
    document: "Documento (CPF/CNPJ)",
    "document number": "Documento (CPF/CNPJ)",
    doors: "Portas",
    downpayment: "Entrada",
    email: "E-mail",
    fuel: "Combustível",
    "full name": "Nome Completo",
    installments: "Parcelas",
    label: "Descrição",
    make: "Marca",
    mileage: "Quilometragem",
    model: "Modelo",
    name: "Nome",
    neighborhood: "Bairro",
    notes: "Observações",
    number: "Número",
    payment: "Pagamento",
    "payment method": "Forma de Pagamento",
    phone: "Telefone",
    plate: "Placa",
    price: "Preço / Valor",
    renavam: "RENAVAM",
    rg: "RG",
    state: "Estado (UF)",
    street: "Endereço",
    title: "Título",
    total: "Valor Total",
    transmission: "Transmissão",
    version: "Versão",
    vin: "Chassi (VIN)",
    warranty: "Garantia",
    year: "Ano",
    zip: "CEP",
    zipcode: "CEP",
  };

  if (fieldDictionary[spaced]) return fieldDictionary[spaced];

  // Word-by-word fallback translator
  return spaced
    .split(" ")
    .map((word) => {
      const wordMap: Record<string, string> = {
        address: "Endereço",
        city: "Cidade",
        code: "Código",
        document: "Documento",
        date: "Data",
        email: "E-mail",
        name: "Nome",
        number: "Número",
        phone: "Telefone",
        price: "Preço",
        state: "Estado",
        street: "Rua",
        type: "Tipo",
        value: "Valor",
        zip: "CEP",
      };
      return wordMap[word] ?? word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

export function getFriendlyVariableLabel(variable: string): string {
  return getVariableMeta(variable).label;
}

export function VariableBadgeChip({ token }: { token: string }) {
  const meta = getVariableMeta(token);
  const Icon = meta.icon;
  return (
    <span className="documents-variable-chip-btn inline-flex items-center gap-1.5 select-none align-middle font-normal not-italic">
      <Icon className="size-3.5 shrink-0 text-accent-strong" />
      <span>{meta.label}</span>
    </span>
  );
}

export function renderTextWithVariableChips(text: string) {
  if (!text) return null;
  const parts = text.split(/(\{\{[^{}]+\}\})/g);
  return parts.map((part, index) => {
    if (/^\{\{[^{}]+\}\}$/.test(part)) {
      return <VariableBadgeChip key={`${part}-${index}`} token={part} />;
    }
    return part;
  });
}

export function DocumentRichTextBlockEditor({
  onChange,
  placeholder,
  value,
  variables,
}: {
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
  variables: readonly string[];
}) {
  const extensions = useMemo(
    () => [
      StarterKit,
      VariableChip,
      Placeholder.configure({
        placeholder,
      }),
    ],
    [placeholder],
  );
  const editor = useEditor({
    content: toHtml(value),
    editorProps: {
      attributes: {
        class: "documents-builder-rich-text-prose",
      },
    },
    extensions,
    immediatelyRender: false,
    onUpdate: ({ editor: activeEditor }) =>
      onChange(activeEditor.getText({ blockSeparator: "\n" })),
  });

  useEffect(() => {
    if (!editor) return;
    const currentText = editor.getText({ blockSeparator: "\n" });
    if (currentText === value) return;
    editor.commands.setContent(toHtml(value));
  }, [editor, value]);

  return (
    <div className="documents-builder-rich-text">
      <div
        aria-label="Ferramentas do bloco"
        className="documents-builder-rich-toolbar"
        role="toolbar"
      >
        <button
          aria-label="Desfazer"
          disabled={!editor?.can().undo()}
          onClick={() => editor?.chain().focus().undo().run()}
          title="Desfazer"
          type="button"
        >
          <Undo2 aria-hidden="true" className="size-4" />
        </button>
        <button
          aria-label="Refazer"
          disabled={!editor?.can().redo()}
          onClick={() => editor?.chain().focus().redo().run()}
          title="Refazer"
          type="button"
        >
          <Redo2 aria-hidden="true" className="size-4" />
        </button>
        <span className="documents-builder-rich-separator" />
        <Variable aria-hidden="true" className="size-4 text-muted shrink-0" />
        <div className="documents-builder-variable-strip">
          {variables.map((variable) => {
            const meta = getVariableMeta(variable);
            const Icon = meta.icon;
            return (
              <button
                className="documents-variable-chip-btn flex items-center gap-1.5"
                key={variable}
                onClick={() =>
                  editor
                    ?.chain()
                    .focus()
                    .insertContent({
                      type: "variableChip",
                      attrs: { token: variable },
                    })
                    .run()
                }
                title={`Inserir ${variable} (${sampleVariable(variable)})`}
                type="button"
              >
                <Icon className="size-3.5 shrink-0 text-accent-strong" />
                <span>{meta.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

function toHtml(value: string) {
  if (!value) return "<p></p>";
  const lines = value.split(/\r?\n/);
  return lines
    .map((line) => {
      const withChips = escapeHtml(line).replace(
        /\{\{[^{}]+\}\}/g,
        (token) =>
          `<span data-variable-chip data-token="${token}">${token}</span>`,
      );
      return `<p>${withChips || "<br>"}</p>`;
    })
    .join("");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
