import { useLayoutEffect, useState } from "react";

export function artifactPageWidth(stageWidth: number, zoom: number) {
  if (!Number.isFinite(stageWidth) || stageWidth <= 0) return 0;
  return Math.floor(Math.min(920, stageWidth) * zoom);
}

export function isArtifactAccessExpired(expiresAt: string | undefined) {
  if (!expiresAt) return false;
  return Date.parse(expiresAt) <= Date.now();
}

export function isPdfArtifact({
  fileName,
  mimeType,
}: {
  fileName: string;
  mimeType: string | null;
}) {
  return (
    mimeType === "application/pdf" ||
    fileName.toLocaleLowerCase("pt-BR").endsWith(".pdf")
  );
}

export function humanizePdfError(error: unknown) {
  const detail = error instanceof Error ? `${error.name} ${error.message}` : "";
  const normalized = detail.toLocaleLowerCase("pt-BR");

  if (/password|senha/.test(normalized)) {
    return "Este PDF é protegido por senha e não pode ser aberto nesta prévia.";
  }
  if (/invalid|corrupt|malformed|format/.test(normalized)) {
    return "O arquivo parece inválido ou corrompido. Baixe o original ou gere uma nova versão.";
  }
  if (/missing|not found|404/.test(normalized)) {
    return "O arquivo não foi encontrado. Renove o acesso ou gere uma nova versão.";
  }
  if (/fetch|network|response|load|conex/.test(normalized)) {
    return "Não foi possível carregar o PDF. Verifique a conexão e tente renovar o acesso.";
  }
  if (/abort|cancel/.test(normalized)) {
    return "A abertura do PDF foi interrompida. Tente novamente quando estiver pronto.";
  }
  return "Não foi possível abrir este PDF agora. Baixe o original ou tente novamente.";
}

export async function toggleArtifactFullscreen(root: HTMLElement | null) {
  if (!root || typeof document === "undefined") return;

  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    await root.requestFullscreen();
  } catch {
    // Fullscreen can be denied by the browser or an embedding policy.
  }
}

export function useElementWidth(node: HTMLElement | null) {
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    if (!node) {
      setWidth(0);
      return;
    }

    const update = (nextWidth = measureContentWidth(node)) => {
      if (!Number.isFinite(nextWidth) || nextWidth <= 0) return;
      setWidth((current) =>
        Math.abs(current - nextWidth) < 0.5 ? current : nextWidth,
      );
    };

    update();
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(([entry]) => {
        if (entry) update(entry.contentRect.width);
      });
      observer.observe(node);
      return () => observer.disconnect();
    }

    const handleResize = () => update();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [node]);

  return width;
}

function measureContentWidth(node: HTMLElement) {
  const style = window.getComputedStyle(node);
  const inlinePadding =
    (Number.parseFloat(style.paddingLeft) || 0) +
    (Number.parseFloat(style.paddingRight) || 0);
  const borderBoxWidth = node.clientWidth || node.getBoundingClientRect().width;
  return Math.max(0, borderBoxWidth - inlinePadding);
}
