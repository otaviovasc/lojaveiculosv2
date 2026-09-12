import assert from "node:assert/strict";
import test from "node:test";
import {
  formatModuleMenu,
  parseInteractiveModuleSelection,
  parseModuleArgs,
} from "./cli.mjs";

const modules = ["vehicles", "leads", "sales", "documents", "whatsapp"];

test("interactive selection accepts all", () => {
  assert.deepEqual(
    [...parseInteractiveModuleSelection("all", modules)],
    modules,
  );
});

test("interactive selection accepts numbers, names, and ranges", () => {
  assert.deepEqual(
    [...parseInteractiveModuleSelection("1, 3-4 whatsapp", modules)],
    ["vehicles", "sales", "documents", "whatsapp"],
  );
});

test("interactive selection rejects unknown entries", () => {
  assert.throws(
    () => parseInteractiveModuleSelection("1,unknown", modules),
    /Unknown module "unknown"/,
  );
});

test("module args leave selection interactive when no selector is provided", () => {
  assert.deepEqual(parseModuleArgs([], modules), {
    help: false,
    modules: null,
  });
});

test("module args preserve only and skip automation", () => {
  assert.deepEqual(
    [...parseModuleArgs(["--only=leads,whatsapp"], modules).modules],
    ["leads", "whatsapp"],
  );
  assert.deepEqual(
    [...parseModuleArgs(["--skip=sales,documents"], modules).modules],
    ["vehicles", "leads", "whatsapp"],
  );
});

test("module menu explains multiple selection", () => {
  const menu = formatModuleMenu(modules, { whatsapp: "CRM history" });
  assert.match(menu, /5\. whatsapp — CRM history/);
  assert.match(menu, /commas or ranges/);
});
