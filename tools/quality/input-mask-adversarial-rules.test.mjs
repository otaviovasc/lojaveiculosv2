import { describe, expect, it } from "vitest";
import { findInputMaskViolations } from "./input-mask-rules.mjs";

describe("input mask adversarial rules", () => {
  it("does not treat mask or format props as behavior on native inputs", () => {
    const source = `
      import { formatBrazilianDocument, formatBrazilianPhone } from "../../lib/masks";
      const Fields = () => <>
        <input mask={formatBrazilianPhone} name="phone" value={phone} />
        <input format={formatBrazilianDocument} name="cpf" value={cpf} />
        <FeatureInput mask={formatBrazilianPhone} name="phone" value={phone} />
      </>;
    `;

    expect(kinds(source)).toEqual(["phone", "document"]);
  });

  it("requires every conditional and logical output branch to be masked", () => {
    const source = `
      import { formatBrazilianPhone } from "../../lib/masks";
      const Fields = () => <>
        <FeatureInput name="phone" value={enabled ? formatBrazilianPhone(phone) : phone} />
        <FeatureInput name="phone" value={formatBrazilianPhone(phone) || fallbackPhone} />
        <FeatureInput name="phone" value={enabled ? formatBrazilianPhone(phone) : formatBrazilianPhone(fallbackPhone)} />
        <FeatureInput
          name="phone"
          onChange={(event) => setPhone(enabled ? formatBrazilianPhone(event.target.value) : event.target.value)}
          value={phone}
        />
      </>;
    `;

    expect(kinds(source)).toEqual(["phone", "phone", "phone"]);
  });

  it("rejects a returned formatter after an unmasked sequence setter", () => {
    const source = `
      import { formatBrazilianPhone } from "../../lib/masks";
      const Field = () => (
        <FeatureInput
          name="phone"
          onChange={(event) => (
            setPhone(event.target.value),
            formatBrazilianPhone(event.target.value)
          )}
          value={phone}
        />
      );
    `;

    expect(kinds(source)).toEqual(["phone"]);
  });

  it("rejects formatter calls that do not carry the edited value to the sink", () => {
    const source = `
      import { formatBrazilianPhone } from "../../lib/masks";
      function handlePhone(event) {
        formatBrazilianPhone(other);
        setPhone(event.target.value);
      }
      const Fields = () => <>
        <FeatureInput onChange={handlePhone} type="tel" value={phone} />
        <FeatureInput
          onChange={(event) => {
            formatBrazilianPhone(event.target.value);
            setWhatsapp(event.target.value);
          }}
          value={whatsapp}
        />
      </>;
    `;

    expect(kinds(source)).toEqual(["phone", "phone"]);
  });

  it("requires a selected PIX category rather than a hardcoded category", () => {
    const source = `
      import { formatBrazilianPixKey } from "../../lib/masks";
      const Fields = () => <>
        <FeatureInput label="Chave PIX" onChange={(event) => setPixKey(formatBrazilianPixKey(event.target.value, "Email"))} value={state.pixKey} />
        <FeatureInput label="Chave PIX" onChange={(event) => setPixKey(formatBrazilianPixKey(event.target.value, PixKeyCategory.CPF))} value={state.pixKey} />
        <FeatureInput label="Chave PIX" onChange={(event) => setPixKey(formatBrazilianPixKey(event.target.value, state.pixCategory))} value={state.pixKey} />
      </>;
    `;

    expect(kinds(source)).toEqual(["pix-key", "pix-key"]);
  });

  it("infers E.164 requirements from country-coded identifiers", () => {
    const source = `
      import { formatBrazilianPhone, formatBrazilianWhatsappPhone } from "../../lib/masks";
      const Fields = () => <>
        <FeatureInput name="whatsappE164" onChange={(event) => setWhatsapp(formatBrazilianPhone(event.target.value))} value={whatsappE164} />
        <FeatureInput name="countryCodedWhatsapp" onChange={(event) => setWhatsapp(formatBrazilianPhone(event.target.value))} value={countryCodedWhatsapp} />
        <FeatureInput name="phoneE164" onChange={(event) => setPhone(formatBrazilianWhatsappPhone(event.target.value))} value={phoneE164} />
      </>;
    `;

    expect(kinds(source)).toEqual(["phone-e164", "phone-e164"]);
  });

  it("requires E.164 for settings and storefront profile WhatsApp paths", () => {
    const source = `
      import { formatBrazilianPhone, formatBrazilianWhatsappPhone } from "../../lib/masks";
      const Fields = () => <>
        <FeatureInput onChange={(event) => updateDraft(formatBrazilianPhone(event.target.value))} value={draft.profile.whatsappPhone} />
        <FeatureInput onChange={(event) => updateSettings(formatBrazilianWhatsappPhone(event.target.value))} value={settings.profile.whatsappPhone} />
        <FeatureInput onChange={(event) => setWhatsapp(formatBrazilianPhone(event.target.value))} value={lead.whatsapp} />
      </>;
    `;

    expect(kinds(source)).toEqual(["phone-e164"]);
  });

  it("accepts only canonical mask modules", () => {
    const source = `
      import { formatBrazilianPhone as localMask } from "./lib/masks";
      import { formatBrazilianPhone as canonicalMask } from "@/lib/masks";
      const Fields = () => <>
        <FeatureInput onChange={(event) => setPhone(localMask(event.target.value))} type="tel" value={phone} />
        <FeatureInput onChange={(event) => setWhatsapp(canonicalMask(event.target.value))} value={whatsapp} />
      </>;
    `;

    expect(kinds(source)).toEqual(["phone"]);
  });

  it("accepts the canonical input-mask helper only with its input target and formatter", () => {
    const source = `
      import { applyInputMask, formatBrazilianPhone } from "../../lib/masks";
      const Fields = () => <>
        <input name="phone" onInput={(event) => applyInputMask(event.currentTarget, formatBrazilianPhone)} />
        <input name="whatsapp" onInput={(event) => applyInputMask(otherTarget, formatBrazilianPhone)} />
        <input name="phone" onInput={() => applyInputMask(input, formatBrazilianPhone)} />
        <input name="phone" onInput={(event) => applyInputMask(event.currentTarget.form.elements.phone, formatBrazilianPhone)} />
        <input name="phone" onInput={(event) => applyInputMask(event.relatedTarget, formatBrazilianPhone)} />
      </>;
    `;

    expect(kinds(source)).toEqual(["phone", "phone", "phone", "phone"]);
  });

  it("does not trust same-named utilities from screen-local modules", () => {
    const source = `
      import { formatBrazilianPhone } from "./screenLocalFormatter";
      import * as localMasks from "./localMasks";
      const Fields = () => <>
        <FeatureInput onChange={(event) => setPhone(formatBrazilianPhone(event.target.value))} type="tel" value={phone} />
        <FeatureInput onChange={(event) => setWhatsapp(localMasks.formatBrazilianPhone(event.target.value))} value={whatsapp} />
      </>;
    `;

    expect(kinds(source)).toEqual(["phone", "phone"]);
  });

  it("allows shared namespace imports", () => {
    const source = `
      import * as masks from "@/lib/masks";
      const Field = () => (
        <FeatureInput onChange={(event) => setPhone(masks.formatBrazilianPhone(event.target.value))} type="tel" value={phone} />
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
