import { describe, expect, it } from "vitest";
import { AppApiError } from "../../lib/apiErrors";
import { createImportedTaxDefaults } from "./fiscalConnectionFixtures";
import {
  buildReviewedTaxDefaults,
  createTaxDefaultsFormValues,
  FISCAL_DEFAULTS_REQUIRED_FIELDS,
  getBackendMissingFields,
  getTaxDefaultValueAtPath,
  listFiscalDefaultsExtraEntries,
  listMissingRequiredTaxDefaults,
} from "./fiscalTaxDefaultsModel";

describe("fiscalTaxDefaultsModel", () => {
  it("mirrors the backend required nested paths", () => {
    expect(FISCAL_DEFAULTS_REQUIRED_FIELDS.map((field) => field.path)).toEqual([
      "nfe.operationNature",
      "nfe.destination",
      "nfe.isFinalCustomer",
      "nfe.operationType",
      "nfe.presenceType",
      "nfe.purposeType",
      "nfe.cfop",
      "nfe.ncm",
      "nfe.icmsOrigin",
      "nfe.icmsCst",
      "nfe.pisCst",
      "nfe.cofinsCst",
      "nfse.taxLocation",
      "nfse.taxationType",
    ]);
  });

  it("detects missing required fields with backend semantics", () => {
    expect(listMissingRequiredTaxDefaults(createImportedTaxDefaults())).toEqual(
      [],
    );
    expect(listMissingRequiredTaxDefaults({})).toHaveLength(14);
    expect(
      listMissingRequiredTaxDefaults({
        nfe: { operationNature: "  ", isFinalCustomer: null },
        nfse: { taxLocation: "" },
      }),
    ).toEqual([
      "nfe.destination",
      "nfe.isFinalCustomer",
      "nfe.operationType",
      "nfe.presenceType",
      "nfe.purposeType",
      "nfe.cfop",
      "nfe.ncm",
      "nfe.icmsOrigin",
      "nfe.icmsCst",
      "nfe.pisCst",
      "nfe.cofinsCst",
      "nfse.taxLocation",
      "nfse.taxationType",
    ]);
  });

  it("reads values at nested paths safely", () => {
    const defaults = createImportedTaxDefaults();
    expect(getTaxDefaultValueAtPath(defaults, "nfe.cfop")).toBe(5102);
    expect(getTaxDefaultValueAtPath(defaults, "nfse.taxLocation")).toBe(
      "companyMunicipality",
    );
    expect(getTaxDefaultValueAtPath(defaults, "nfe.missing")).toBeUndefined();
    expect(
      getTaxDefaultValueAtPath({ nfe: "oops" }, "nfe.cfop"),
    ).toBeUndefined();
  });

  it("creates form values for required fields and editable extras", () => {
    const values = createTaxDefaultsFormValues(
      createImportedTaxDefaults({
        icmsAliquota: 18,
        nfe: {
          ...createImportedTaxDefaults().nfe,
          series: 1,
          metadata: { source: "spedy" },
        },
      }),
    );
    expect(values["nfe.cfop"]).toBe("5102");
    expect(values["nfe.isFinalCustomer"]).toBe("true");
    expect(values["nfe.icmsOrigin"]).toBe("0");
    expect(values["nfse.taxationType"]).toBe("taxationInMunicipality");
    expect(values["icmsAliquota"]).toBe("18");
    expect(values["nfe.series"]).toBe("1");
    expect(values["nfe.metadata"]).toBeUndefined();
  });

  it("lists extra entries without the required guided fields", () => {
    const entries = listFiscalDefaultsExtraEntries(
      createImportedTaxDefaults({
        icmsAliquota: 18,
        nfe: {
          ...createImportedTaxDefaults().nfe,
          metadata: { source: "spedy" },
          series: 1,
        },
      }),
    );
    expect(entries).toEqual([
      { editable: true, path: "icmsAliquota", value: 18 },
      { editable: false, path: "nfe.metadata", value: { source: "spedy" } },
      { editable: true, path: "nfe.series", value: 1 },
    ]);
  });

  it("rebuilds the nested object preserving unknown provider fields", () => {
    const original = createImportedTaxDefaults({
      icmsAliquota: 18,
      nfe: {
        ...createImportedTaxDefaults().nfe,
        metadata: { source: "spedy" },
        series: 1,
      },
    });
    const edits = createTaxDefaultsFormValues(original);
    edits["nfe.operationNature"] = "Venda de veículo usado";
    edits["nfe.isFinalCustomer"] = "false";
    edits["nfe.cfop"] = "5.102";
    edits["nfe.icmsOrigin"] = "2";
    edits["nfe.series"] = "2";
    edits["nfse.taxLocation"] = "customerMunicipality";

    const reviewed = buildReviewedTaxDefaults(original, edits);
    expect(reviewed).toEqual({
      icmsAliquota: 18,
      nfe: {
        cfop: "5.102",
        cofinsCst: "01",
        destination: "internal",
        icmsCst: "00",
        icmsOrigin: 2,
        isFinalCustomer: false,
        metadata: { source: "spedy" },
        ncm: "8703",
        operationNature: "Venda de veículo usado",
        operationType: "outgoing",
        pisCst: "01",
        presenceType: "presence",
        purposeType: "normal",
        series: 2,
      },
      nfse: {
        taxLocation: "customerMunicipality",
        taxationType: "taxationInMunicipality",
      },
    });
  });

  it("keeps numeric types when the edited value stays numeric", () => {
    const original = createImportedTaxDefaults();
    const edits = createTaxDefaultsFormValues(original);
    const reviewed = buildReviewedTaxDefaults(original, edits);
    expect(reviewed.nfe).toMatchObject({ cfop: 5102, icmsOrigin: 0 });
  });

  it("fills required fields that were never imported", () => {
    const edits = Object.fromEntries(
      Object.entries(createTaxDefaultsFormValues({})).map(([path]) => [
        path,
        path.endsWith("isFinalCustomer") ? "true" : "x",
      ]),
    );
    const reviewed = buildReviewedTaxDefaults({}, edits);
    expect(listMissingRequiredTaxDefaults(reviewed)).toEqual([]);
    expect(getTaxDefaultValueAtPath(reviewed, "nfe.isFinalCustomer")).toBe(
      true,
    );
  });

  it("extracts missing fields reported by the API", () => {
    const error = new AppApiError({
      code: "FISCAL_VALIDATION_FAILED",
      details: { missingFields: ["nfe.cfop", "nfse.taxLocation"] },
      message: "Fiscal defaults are incomplete.",
      status: 400,
    });
    expect(getBackendMissingFields(error)).toEqual([
      "nfe.cfop",
      "nfse.taxLocation",
    ]);
    expect(getBackendMissingFields(new Error("boom"))).toEqual([]);
    expect(
      getBackendMissingFields(
        new AppApiError({ message: "no details", status: 500 }),
      ),
    ).toEqual([]);
  });
});
