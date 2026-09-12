import { spawn } from "node:child_process";
import { Buffer } from "node:buffer";
import { CrmAudioNormalizationError } from "../../domains/crm/ports/crmAudioNormalizer.js";

const ffmpegMp3Arguments = [
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
  "libmp3lame",
  "-b:a",
  "64k",
  "-ac",
  "1",
  "-ar",
  "44100",
  "-f",
  "mp3",
  "pipe:1",
] as const;

export type UazapiAudioTranscoder = (input: {
  body: Uint8Array;
  sourceMimeType: string;
}) => Promise<Uint8Array>;

/**
 * Controlled production tests in V1 proved that uazapi produces
 * undownloadable WhatsApp audio from OGG/Opus input across ptt/myaudio,
 * URL and base64 variants. The same bytes transcoded to MP3 and sent as
 * ordinary `audio` download correctly, so voice notes must be transcoded
 * before hitting /send/media.
 */
export function createFfmpegUazapiAudioTranscoder(
  options: {
    ffmpegPath?: string;
    maxOutputBytes?: number;
    timeoutMs?: number;
  } = {},
): UazapiAudioTranscoder {
  const ffmpegPath = options.ffmpegPath ?? "ffmpeg";
  const maxOutputBytes = options.maxOutputBytes ?? 16 * 1024 * 1024;
  const timeoutMs = options.timeoutMs ?? 15_000;
  return ({ body }) =>
    new Promise<Uint8Array>((resolve, reject) => {
      const child = spawn(ffmpegPath, [...ffmpegMp3Arguments], {
        stdio: ["pipe", "pipe", "pipe"],
      });
      const output: Buffer[] = [];
      let outputBytes = 0;
      let runtimeFailure = false;
      let settled = false;
      const finish = (action: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        action();
      };
      const timeout = setTimeout(() => {
        child.kill("SIGKILL");
        finish(() => reject(new CrmAudioNormalizationError("timeout")));
      }, timeoutMs);

      child.stdout.on("data", (chunk: Buffer) => {
        outputBytes += chunk.byteLength;
        if (outputBytes > maxOutputBytes) {
          child.kill("SIGKILL");
          finish(() =>
            reject(new CrmAudioNormalizationError("output_too_large")),
          );
          return;
        }
        output.push(chunk);
      });
      child.stderr.on("data", () => undefined);
      child.on("error", () => {
        runtimeFailure = true;
        finish(() =>
          reject(new CrmAudioNormalizationError("runtime_unavailable")),
        );
      });
      child.on("close", (code) => {
        if (settled || runtimeFailure) return;
        if (code !== 0 || !outputBytes) {
          finish(() => reject(new CrmAudioNormalizationError("invalid_media")));
          return;
        }
        finish(() => resolve(new Uint8Array(Buffer.concat(output))));
      });
      child.stdin.on("error", () => undefined);
      child.stdin.end(Buffer.from(body));
    });
}
