import { describe, expect, it } from "vitest";
import {
  clearInventoryCreateDraft,
  loadInventoryCreateDraft,
  saveInventoryCreateDraft,
} from "./inventoryCreateDraft";
import { createInitialInventoryForm } from "./formModel";

describe("inventory create draft", () => {
  it("persists and clears a meaningful local draft", () => {
    const storage = createMemoryStorage();
    const form = {
      ...createInitialInventoryForm(),
      plate: "abc1d23",
      title: "HB20 Comfort",
    };

    saveInventoryCreateDraft({ form, mediaFileNames: ["front.jpg"] }, storage);

    expect(loadInventoryCreateDraft(storage)).toMatchObject({
      form,
      mediaFileNames: ["front.jpg"],
    });

    clearInventoryCreateDraft(storage);
    expect(loadInventoryCreateDraft(storage)).toBeNull();
  });

  it("does not persist an empty draft", () => {
    const storage = createMemoryStorage();

    saveInventoryCreateDraft(
      { form: createInitialInventoryForm(), mediaFileNames: [] },
      storage,
    );

    expect(loadInventoryCreateDraft(storage)).toBeNull();
  });
});

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => {
      values.delete(key);
    },
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}
