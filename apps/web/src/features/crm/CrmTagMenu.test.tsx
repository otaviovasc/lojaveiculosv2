// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TagMenu } from "./CrmTagMenu";

describe("TagMenu", () => {
  afterEach(() => {
    cleanup();
  });

  it("sends only the add-tag contract for an existing tag", async () => {
    const onAdd = vi.fn(async () => true);
    const user = userEvent.setup();

    render(
      <TagMenu
        activeTags={[]}
        availableTags={[
          {
            color: "var(--color-accent)",
            emoji: "🤝",
            id: "25200000-0000-4000-8000-000000000004",
            name: "Cliente da loja",
          },
        ]}
        onAdd={onAdd}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Cliente da loja/ }));

    expect(onAdd).toHaveBeenCalledWith({
      color: "var(--color-accent)",
      emoji: "🤝",
      name: "Cliente da loja",
    });
  });
});
