// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CrmAudioPlayer } from "./CrmAudioPlayer";

describe("CrmAudioPlayer", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the audio player with play button and waveform", () => {
    const src = "https://audio.local/test.ogg";
    render(<CrmAudioPlayer src={src} />);

    expect(
      screen.getByRole("region", { name: "Audio player" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Reproduzir audio" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("slider")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Velocidade de reproducao/ }),
    ).toHaveTextContent("1x");
    expect(screen.getByRole("link", { name: "Baixar audio" })).toHaveAttribute(
      "href",
      src,
    );
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

  it("reloads the audio after an error", async () => {
    const user = userEvent.setup();
    const loadMock = vi.fn();
    const pauseMock = vi.fn();
    window.HTMLMediaElement.prototype.load = loadMock;
    window.HTMLMediaElement.prototype.pause = pauseMock;
    render(<CrmAudioPlayer src="https://audio.local/test.ogg" />);

    fireEvent.error(screen.getByLabelText("Mensagem de audio"));
    const retry = screen.getByRole("button", {
      name: "Tentar carregar audio novamente",
    });
    expect(retry).toBeEnabled();

    await user.click(retry);

    expect(pauseMock).toHaveBeenCalled();
    expect(loadMock).toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Reproduzir audio" }),
    ).toBeEnabled();
  });

  it("seeks from the keyboard when the waveform is focused", () => {
    render(<CrmAudioPlayer src="https://audio.local/test.ogg" />);
    const audio = screen.getByLabelText<HTMLAudioElement>("Mensagem de audio");
    Object.defineProperties(audio, {
      currentTime: { configurable: true, value: 10, writable: true },
      duration: { configurable: true, value: 100 },
    });

    fireEvent.keyDown(screen.getByRole("slider"), { key: "ArrowRight" });

    expect(audio.currentTime).toBe(15);
    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuenow", "15");
  });

  it("recovers a finite duration from MediaRecorder WebM metadata", () => {
    render(<CrmAudioPlayer src="https://audio.local/recording.webm" />);
    const audio = screen.getByLabelText<HTMLAudioElement>("Mensagem de audio");
    let duration = Number.POSITIVE_INFINITY;
    Object.defineProperties(audio, {
      currentTime: { configurable: true, value: 0, writable: true },
      duration: { configurable: true, get: () => duration },
    });

    fireEvent.loadedMetadata(audio);
    expect(screen.queryByText(/Infinity|NaN/)).not.toBeInTheDocument();

    duration = 65;
    fireEvent.durationChange(audio);

    expect(screen.getByText("1:05")).toBeInTheDocument();
    expect(audio.currentTime).toBe(0);
  });
});
