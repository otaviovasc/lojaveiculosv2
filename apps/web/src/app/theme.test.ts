import { describe, expect, it } from "vitest";
import { getNextTheme, getPreferredTheme, persistTheme } from "./theme";

describe("app theme", () => {
  it("uses stored user preference before system preference", () => {
    const storage = createStorage("light");

    expect(getPreferredTheme({ prefersDark: true, storage })).toBe("light");
  });

  it("uses system preference when no valid preference is stored", () => {
    expect(
      getPreferredTheme({ prefersDark: true, storage: createStorage("auto") }),
    ).toBe("dark");
    expect(getPreferredTheme({ prefersDark: false })).toBe("light");
  });

  it("toggles between light and dark", () => {
    expect(getNextTheme("light")).toBe("dark");
    expect(getNextTheme("dark")).toBe("light");
  });

  it("persists explicit user choice", () => {
    let saved = "";
    persistTheme(
      {
        getItem: () => null,
        setItem: (_key, value) => {
          saved = value;
        },
      },
      "dark",
    );

    expect(saved).toBe("dark");
  });
});

function createStorage(value: string) {
  return {
    getItem: () => value,
    setItem: () => undefined,
  };
}
