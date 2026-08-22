import { expect, test } from "@playwright/test";
import { loginAs } from "./support/auth";
import { qaPersonas } from "./support/personas";
import { expectAccessible } from "./support/uiQuality";

test.use({ baseURL: process.env.QA_BASE_URL ?? "http://127.0.0.1:5173" });

test("shared select keeps the chosen option brand-forward and accessible", async ({
  page,
}) => {
  await loginAs(page, qaPersonas.owner);
  await page.goto("/reports");
  await expect(
    page.getByRole("heading", { level: 1, name: "Relatórios" }),
  ).toBeVisible();

  await page
    .getByRole("button", { exact: true, name: "Período dos relatórios" })
    .click();
  const selected = page.getByRole("option", { selected: true });
  await expect(selected).toBeVisible();
  const colors = await selected.evaluate((element) => {
    const root = getComputedStyle(document.documentElement);
    const normalize = (value: string) => {
      const probe = document.createElement("span");
      probe.style.color = value.trim();
      document.body.append(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      return color;
    };
    const style = getComputedStyle(element);
    return {
      accent: normalize(root.getPropertyValue("--color-accent")),
      background: style.backgroundColor,
      color: style.color,
      foreground: normalize(root.getPropertyValue("--color-accent-foreground")),
    };
  });

  expect(colors.background).toBe(colors.accent);
  expect(colors.color).toBe(colors.foreground);
  await expectAccessible(page);
});
