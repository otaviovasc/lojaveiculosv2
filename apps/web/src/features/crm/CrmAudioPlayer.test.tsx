// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CrmAudioPlayer } from "./CrmAudioPlayer";

describe("CrmAudioPlayer", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the audio player with play button and waveform", () => {
    render(<CrmAudioPlayer src="https://audio.local/test.ogg" />);

    expect(
      screen.getByRole("region", { name: "Audio player" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Reproduzir audio" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Velocidade de reproducao/ }),
    ).toHaveTextContent("1x");
  });

  it("cycles playback speed on speed button click", async () => {
    const user = userEvent.setup();
    render(<CrmAudioPlayer src="https://audio.local/test.ogg" />);

    const speedBtn = screen.getByRole("button", {
      name: /Velocidade de reproducao/,
    });
    expect(speedBtn).toHaveTextContent("1x");

    await user.click(speedBtn);
    expect(speedBtn).toHaveTextContent("1.5x");

    await user.click(speedBtn);
    expect(speedBtn).toHaveTextContent("2x");

    await user.click(speedBtn);
    expect(speedBtn).toHaveTextContent("1x");
  });

  it("toggles play/pause state when clicking play button", async () => {
    const user = userEvent.setup();
    const playMock = vi.fn(async () => {});
    const pauseMock = vi.fn();

    window.HTMLMediaElement.prototype.play = playMock;
    window.HTMLMediaElement.prototype.pause = pauseMock;

    render(<CrmAudioPlayer src="https://audio.local/test.ogg" />);

    const playButton = screen.getByRole("button", { name: "Reproduzir audio" });
    await user.click(playButton);

    expect(playMock).toHaveBeenCalled();
  });
});
