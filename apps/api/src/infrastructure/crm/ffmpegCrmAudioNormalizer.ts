import { spawn } from "node:child_process";
import { Buffer } from "node:buffer";
import {
  CrmAudioNormalizationError,
  type CrmAudioNormalizer,
} from "../../domains/crm/ports/crmAudioNormalizer.js";

const ffmpegArguments = [
  "-hide_banner",
  "-loglevel",
  "error",
  "-nostdin",
  "-i",
  "pipe:0",
  "-map",
  "0:a:0",
  "-vn",
  "-c:a",
  "libopus",
  "-application",
  "voip",
  "-b:a",
  "32k",
  "-vbr",
  "on",
  "-compression_level",
  "10",
  "-ac",
  "1",
  "-ar",
  "48000",
  "-f",
  "ogg",
  "pipe:1",
] as const;

export function createFfmpegCrmAudioNormalizer(
  options: {
    ffmpegPath?: string;
    maxOutputBytes?: number;
    timeoutMs?: number;
  } = {},
): CrmAudioNormalizer {
  const ffmpegPath = options.ffmpegPath ?? "ffmpeg";
  const maxOutputBytes = options.maxOutputBytes ?? 25 * 1024 * 1024;
  const timeoutMs = options.timeoutMs ?? 30_000;
  return {
    normalizeToOggOpus: (input) =>
      runFfmpeg({
        body: input.body,
        ffmpegPath,
        maxOutputBytes,
        timeoutMs,
      }),
  };
}

function runFfmpeg(input: {
  body: Uint8Array;
  ffmpegPath: string;
  maxOutputBytes: number;
  timeoutMs: number;
}): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const child = spawn(input.ffmpegPath, ffmpegArguments, {
      stdio: ["pipe", "pipe", "pipe"],
    });
    const output: Buffer[] = [];
    let outputBytes = 0;
    let runtimeFailure = false;
    let settled = false;
    let stderr = "";
    const finish = (action: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      action();
    };
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      finish(() => reject(new CrmAudioNormalizationError("timeout")));
    }, input.timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      outputBytes += chunk.byteLength;
      if (outputBytes > input.maxOutputBytes) {
        child.kill("SIGKILL");
        finish(() =>
          reject(new CrmAudioNormalizationError("output_too_large")),
        );
        return;
      }
      output.push(chunk);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      if (stderr.length < 4_096) stderr += chunk.toString("utf8");
    });
    child.on("error", () => {
      runtimeFailure = true;
      finish(() =>
        reject(new CrmAudioNormalizationError("runtime_unavailable")),
      );
    });
    child.on("close", (code) => {
      if (settled || runtimeFailure) return;
      if (code !== 0 || !outputBytes) {
        const reason = /Unknown encoder|not found/i.test(stderr)
          ? "runtime_unavailable"
          : "invalid_media";
        finish(() => reject(new CrmAudioNormalizationError(reason)));
        return;
      }
      finish(() => resolve(new Uint8Array(Buffer.concat(output))));
    });
    child.stdin.on("error", () => undefined);
    child.stdin.end(Buffer.from(input.body));
  });
}
