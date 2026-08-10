// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  PublicStorefrontLeadInput,
  PublicStorefrontLeadResult,
} from "../types";
import { QuadraListingInterestForm } from "./QuadraListingInterestForm";

afterEach(cleanup);

describe("QuadraListingInterestForm", () => {
  it("submits all required lead and anti-spam fields", async () => {
    const onSubmitInterest = vi.fn<
      (
        listingSlug: string,
        input: PublicStorefrontLeadInput,
      ) => Promise<PublicStorefrontLeadResult>
    >(async () => ({
      deduplicated: false,
      lead: { id: "lead_1", source: "public_site", status: "new" },
    }));
    render(
      <QuadraListingInterestForm
        listingSlug="fiat-toro-2023"
        onSubmitInterest={onSubmitInterest}
      />,
    );

    fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: "Tenho interesse" }));

    await waitFor(() =>
      expect(onSubmitInterest).toHaveBeenCalledWith(
        "fiat-toro-2023",
        expect.objectContaining({
          buyerEmail: "ana@example.com",
          buyerName: "Ana Cliente",
          buyerPhone: "11999999999",
          message: "Tenho interesse no veículo.",
          website: "",
        }),
      ),
    );
    const submitted = onSubmitInterest.mock.calls[0]?.[1] as
      PublicStorefrontLeadInput | undefined;
    expect(typeof submitted?.formStartedAt).toBe("number");
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Interesse enviado",
    );
  });

  it("rejects a phone with fewer than ten digits before calling the API", async () => {
    const onSubmitInterest = vi.fn();
    render(
      <QuadraListingInterestForm
        listingSlug="fiat-toro-2023"
        onSubmitInterest={onSubmitInterest}
      />,
    );

    fillRequiredFields();
    fireEvent.change(screen.getByLabelText("Telefone"), {
      target: { value: "123456789" },
    });
    fireEvent.submit(screen.getByRole("button").closest("form")!);

    expect(onSubmitInterest).not.toHaveBeenCalled();
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Não foi possível enviar",
    );
  });
});

function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText("Nome"), {
    target: { value: "Ana Cliente" },
  });
  fireEvent.change(screen.getByLabelText("Telefone"), {
    target: { value: "(11) 99999-9999" },
  });
  fireEvent.change(screen.getByLabelText("E-mail"), {
    target: { value: "ana@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Mensagem"), {
    target: { value: "Tenho interesse no veículo." },
  });
}
