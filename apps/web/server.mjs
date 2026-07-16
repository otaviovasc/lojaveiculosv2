import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".pdf", "application/pdf"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);

export function createSpaServer({
  distDirectory = fileURLToPath(new URL("./dist", import.meta.url)),
} = {}) {
  const root = resolve(distDirectory);

  return createServer(async (request, response) => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { Allow: "GET, HEAD" });
      response.end();
      return;
    }

    const pathname = readPathname(request.url);
    if (pathname === null) {
      response.writeHead(400);
      response.end();
      return;
    }
    if (pathname === "/health") {
      response.writeHead(200, {
        "Cache-Control": "no-store",
        "Content-Type": "application/json; charset=utf-8",
      });
      response.end(request.method === "HEAD" ? undefined : '{"ok":true}');
      return;
    }

    const requestedFile = resolve(root, pathname.replace(/^\/+/, ""));
    if (!isInsideRoot(root, requestedFile)) {
      response.writeHead(404);
      response.end();
      return;
    }

    const file = (await isFile(requestedFile))
      ? requestedFile
      : extname(requestedFile)
        ? null
        : resolve(root, "index.html");
    if (!file || !(await isFile(file))) {
      response.writeHead(404);
      response.end();
      return;
    }

    response.writeHead(200, {
      "Cache-Control": file.includes(`${sep}assets${sep}`)
        ? "public, max-age=31536000, immutable"
        : "no-cache",
      "Content-Type":
        contentTypes.get(extname(file).toLowerCase()) ??
        "application/octet-stream",
    });
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    createReadStream(file).pipe(response);
  });
}

function readPathname(url) {
  try {
    return decodeURIComponent(new URL(url ?? "/", "http://localhost").pathname);
  } catch {
    return null;
  }
}

function isInsideRoot(root, file) {
  return file === root || file.startsWith(`${root}${sep}`);
}

async function isFile(file) {
  try {
    return (await stat(file)).isFile();
  } catch {
    return false;
  }
}

const entrypoint = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : null;
if (entrypoint === import.meta.url) {
  const port = readPositivePort(process.env.PORT, 3000);
  const distDirectory = process.env.WEB_DIST_DIR?.trim();
  createSpaServer(distDirectory ? { distDirectory } : {}).listen(
    port,
    "0.0.0.0",
    () => console.info(`Loja Veiculos web listening on port ${String(port)}`),
  );
}

function readPositivePort(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 65_535
    ? parsed
    : fallback;
}
