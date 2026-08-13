import { describe, expect, it } from "vitest";
import {
  isValidPreflightDocument,
  readApplicantRequirements,
} from "./applicantPreflight";

describe("readApplicantRequirements", () => {
  it("maps nested provider applicant keys and ignores vehicle fields already collected", () => {
    const result = readApplicantRequirements({
      applicant: null,
      applicantKnown: false,
      missingFields: [
        "lead.has_cnh",
        "customer.birthdate",
        "vehicle.licensing_city",
        "vehicle.model_year",
      ],
      requirements: {},
    });

    expect([...result.supported]).toEqual(["hasCnh", "birthDate"]);
    expect(result.unsupported).toEqual([]);
  });

  it("keeps genuinely unsupported provider fields visible to the flow guard", () => {
    const result = readApplicantRequirements({
      applicant: null,
      applicantKnown: true,
      missingFields: ["lead.profession"],
      requirements: {},
    });

    expect(result.unsupported).toEqual(["lead.profession"]);
  });
});

describe("isValidPreflightDocument", () => {
  it("validates CPF/CNPJ check digits before calling the provider", () => {
    expect(isValidPreflightDocument("529.982.247-25")).toBe(true);
    expect(isValidPreflightDocument("529.982.247-24")).toBe(false);
    expect(isValidPreflightDocument("04.252.011/0001-10")).toBe(true);
  });
});
