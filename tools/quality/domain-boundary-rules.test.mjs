import { describe, expect, it } from "vitest";
import { findDomainBoundaryViolations } from "./domain-boundary-rules.mjs";

const root = "/repo";
const file = "/repo/apps/api/src/domains/vehicle/service.ts";

describe("domain boundary rules", () => {
  it("detects every static module-loading form", () => {
    const source = [
      'import "hono";',
      'export { db } from "drizzle-orm";',
      'const feature = import("../../features");',
      'const infra = require("../../infrastructure/db");',
      'import clerk = require("@clerk/backend");',
      'import { S3Client } from "@aws-sdk/client-s3";',
      'import postgres from "postgres";',
      'import next from "next";',
    ].join("\n");

    expect(specifiers(source)).toEqual([
      "hono",
      "drizzle-orm",
      "../../features",
      "../../infrastructure/db",
      "@clerk/backend",
      "@aws-sdk/client-s3",
      "postgres",
      "next",
    ]);
  });

  it("detects imports of the forbidden directory root", () => {
    expect(specifiers('import "../../features";')).toEqual(["../../features"]);
  });

  it("ignores imports written only in comments and string literals", () => {
    const source = [
      '// import "hono";',
      'const example = `require("drizzle-orm")`;',
      'const text = "import ../../features";',
    ].join("\n");

    expect(specifiers(source)).toEqual([]);
  });

  it("allows domain and external dependency imports", () => {
    const source = [
      'import type { ServiceContext } from "@lojaveiculosv2/shared";',
      'import { helper } from "../shared/helper.js";',
    ].join("\n");

    expect(specifiers(source)).toEqual([]);
  });
});

function specifiers(source) {
  return findDomainBoundaryViolations(file, source, root).map(
    (item) => item.specifier,
  );
}
