import { describe, expect, it } from "vitest";
import { findInputMaskViolations } from "./input-mask-rules.mjs";

describe("input mask rules", () => {
  it("detects unmasked native inputs and common wrappers", () => {
    const source = `
      const Fields = () => <>
        <input name="cpf" onChange={setCpf} value={cpf} />
        <FeatureInput type="tel" onChange={setPhone} value={phone} />
        <CrmCreateInput onChange={setWhatsapp} value={whatsapp} />
        <InventoryInput onChange={setZipCode} value={addressZipCode} />
      </>;
    `;

    expect(kinds(source)).toEqual(["document", "phone", "phone", "zip-code"]);
  });

  it("detects uncontrolled and text-input wrappers dynamically", () => {
    const source = `
      const Fields = () => <>
        <input aria-label="Telefone" name="buyerPhone" />
        <DocumentInput label="CNPJ ou CPF" onChange={onDocument} value={buyerDocument} />
        <FeatureInput field="addressZipCode" onValueChange={setZip} value={zip} />
      </>;
    `;

    expect(kinds(source)).toEqual(["phone", "document", "zip-code"]);
  });

  it("accepts canonical masks in change and value paths", () => {
    const source = `
      import {
        formatBrazilianCnpj,
        formatBrazilianCpf,
        formatBrazilianPhone,
        formatBrazilianZipCode,
      } from "../../lib/masks";
      const Fields = () => <>
        <input
          name="cpf"
          onChange={(event) => setCpf(formatBrazilianCpf(event.target.value))}
          value={cpf}
        />
        <FeatureInput
          onChange={(value) => setDocument(formatBrazilianCnpj(value))}
          value={document}
        />
        <CrmCreateInput
          onChange={(event) => setPhone(event.target.value)}
          type="tel"
          value={formatBrazilianPhone(phone)}
        />
        <InventoryInput
          mask={formatBrazilianZipCode}
          onChange={setZipCode}
          value={addressZipCode}
        />
      </>;
    `;

    expect(kinds(source)).toEqual([]);
  });

  it("resolves imported aliases, local handlers, and formatted variables", () => {
    const source = `
      import {
        formatBrazilianDocument as documentMask,
        formatBrazilianPhone as telephoneMask,
        formatBrazilianZipCode,
      } from "../../lib/masks";
      const formattedZip = formatBrazilianZipCode(addressZipCode);
      function handleDocument(event) {
        setDocument(documentMask(event.target.value));
      }
      const handlePhone = (event) => {
        setPhone(telephoneMask(event.target.value));
      };
      const Fields = () => <>
        <FeatureInput onChange={handleDocument} value={document} />
        <FeatureInput onChange={handlePhone} value={phone} />
        <FeatureInput onChange={setZipCode} value={formattedZip} />
      </>;
    `;

    expect(kinds(source)).toEqual([]);
  });

  it("does not trust component names or declarative mask strings", () => {
    const source = `
      const Fields = () => <>
        <CpfInput onChange={setCpf} value={cpf} />
        <PhoneInput onChange={setPhone} value={phone} />
        <CepInput onChange={setCep} value={cep} />
        <FeatureInput mask="000.000.000-00" value={document} onChange={setDocument} />
        <FeatureInput mask="(00) 00000-0000" value={phone} onChange={setPhone} />
        <FeatureInput mask="00000-000" value={cep} onChange={setCep} />
      </>;
    `;

    expect(kinds(source)).toEqual([
      "document",
      "phone",
      "zip-code",
      "document",
      "phone",
      "zip-code",
    ]);
  });

  it("recognizes semantic placeholders and register spreads", () => {
    const source = `
      import { formatBrazilianPhone } from "../../lib/masks";
      const Fields = () => <>
        <input placeholder="000.000.000-00" />
        <FeatureInput {...register("whatsapp")} />
        <FeatureInput {...phoneProps} />
        <FeatureInput {...maskedPhoneProps} />
      </>;
      const maskedPhoneProps = {
        onChange: (event) => setPhone(formatBrazilianPhone(event.target.value)),
        value: phone,
      };
    `;

    expect(kinds(source)).toEqual(["document", "phone", "phone"]);
  });

  it("recognizes buyerDocument and requires an imported shared utility", () => {
    const source = `
      const fakeSharedName = (value) => value;
      const Fields = () => <>
        <FeatureInput onChange={setBuyerDocument} value={buyerDocument} />
        <FeatureInput
          onChange={(event) => setPhone(formatBrazilianPhone(event.target.value))}
          type="tel"
          value={phone}
        />
      </>;
    `;

    expect(kinds(source)).toEqual(["document", "phone"]);
  });

  it("requires the E.164 formatter for country-coded WhatsApp fields", () => {
    const source = `
      import {
        formatBrazilianPhone,
        formatBrazilianWhatsappPhone,
      } from "../../lib/masks";
      const Fields = () => <>
        <FeatureInput
          id="whatsapp"
          onChange={(event) => updateConfig("socialLinks", {
            whatsapp: event.target.value,
          })}
          placeholder="5511999999999"
          value={config.socialLinks.whatsapp}
        />
        <FeatureInput
          onChange={(event) => setWhatsapp(formatBrazilianPhone(event.target.value))}
          placeholder="+5511999999999"
          value={whatsapp}
        />
        <FeatureInput
          onChange={(event) => setWhatsapp(formatBrazilianWhatsappPhone(event.target.value))}
          placeholder="5511999999999"
          value={whatsapp}
        />
      </>;
    `;

    expect(kinds(source)).toEqual(["phone-e164", "phone-e164"]);
  });

  it("requires a category-aware formatter for dynamic PIX keys", () => {
    const source = `
      import { formatBrazilianPixKey } from "../../lib/masks";
      const Fields = () => <>
        <FeatureInput label="Chave PIX" onChange={(event) => setPixKey(event.target.value)} value={state.pixKey} />
        <FeatureInput label="Chave PIX" onChange={(event) => setPixKey(formatBrazilianPixKey(event.target.value, state.pixCategory))} value={state.pixKey} />
      </>;
    `;

    expect(kinds(source)).toEqual(["pix-key"]);
  });

  it("ignores searches, unrelated documents, and non-text inputs", () => {
    const source = `
      const Fields = () => <>
        <FeatureInput
          onChange={setQuery}
          placeholder="Buscar por nome ou telefone"
          type="search"
          value={query}
        />
        <DocumentInput onChange={setTitle} value={form.documentTitle} />
        <FeatureInput onChange={setDocumentType} value={documentType} />
        <input name="documentFile" type="file" />
        <input name="phone" type="hidden" value={phone} />
        <FeatureSelect onChange={setPhoneType} value={phoneType} />
        <FeatureTabs onChange={setPhoneTab} value={phoneTab} />
        <BuilderToggleInput onChange={setWhatsappEnabled} value={whatsappEnabled} />
        <BuilderTextareaInput onChange={setBuyerDocumentNotes} value={buyerDocumentNotes} />
      </>;
    `;

    expect(kinds(source)).toEqual([]);
  });

  it("ignores forbidden-looking comments and string literals", () => {
    const source = `
      // <input name="cpf" value={cpf} />
      const docs = '<FeatureInput type="tel" value={phone} />';
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
