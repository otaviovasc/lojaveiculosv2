import { describe, expect, it } from "vitest";
import { findInputMaskViolations } from "./input-mask-rules.mjs";

describe("input mask wrapper rules", () => {
  it("uses a supported immediate field ancestor as semantic context", () => {
    const source = `
      const Fields = () => <>
        <FeatureField label="Telefone">
          <FeatureInput value={value} onChange={setValue} />
        </FeatureField>
        <InventoryField label={<FieldLabel label="CEP" />}>
          <InventoryInput value={addressValue} onChange={setAddressValue} />
        </InventoryField>
        <CrmField label="Celular">
          <CrmCreateInput value={contactValue} onChange={setContactValue} />
        </CrmField>
        <label>
          CPF ou CNPJ
          <input value={identityValue} onChange={setIdentityValue} />
        </label>
      </>;
    `;

    expect(kinds(source)).toEqual(["phone", "zip-code", "phone", "document"]);
  });

  it("inspects TextField wrappers", () => {
    const source = `
      const Fields = () => <>
        <TextField label="Celular" value={value} onChange={setValue} />
        <Ui.TextField name="buyerDocument" value={identity} onChange={setIdentity} />
      </>;
    `;

    expect(kinds(source)).toEqual(["phone", "document"]);
  });

  it("keeps mixed name and phone searches exempt", () => {
    const source = `
      const Fields = () => <>
        <FeatureField label="Buscar por nome ou telefone">
          <FeatureInput value={query} onChange={setQuery} />
        </FeatureField>
        <TextField
          label="Pesquisar telefone"
          type="search"
          value={query}
          onChange={setQuery}
        />
        <label aria-label={"Incluir " + row.rawPhone}>
          <input checked={row.included} onChange={toggleRow} type="checkbox" />
        </label>
      </>;
    `;

    expect(kinds(source)).toEqual([]);
  });

  it("accepts a shared formatter with ancestor-only semantics", () => {
    const source = `
      import { formatBrazilianPhone } from "../../lib/masks";
      const Field = () => (
        <SaleField label="WhatsApp">
          <FeatureInput
            value={value}
            onChange={(event) => setValue(formatBrazilianPhone(event.target.value))}
          />
        </SaleField>
      );
    `;

    expect(kinds(source)).toEqual([]);
  });
});

function kinds(source) {
  return findInputMaskViolations(
    "apps/web/src/features/example/Example.tsx",
    source,
  ).map((violation) => violation.kind);
}
