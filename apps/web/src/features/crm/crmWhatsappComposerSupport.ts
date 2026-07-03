import { useEffect, useRef, useState } from "react";
import { isPreviewableMedia } from "./crmWhatsappMediaFiles";
import type {
  CrmWhatsappMessage,
  CrmWhatsappQuickMessage,
} from "./crmWhatsappTypes";

export function addFiles(
  fileList: FileList | null,
  setFiles: (updater: (current: File[]) => File[]) => void,
) {
  const selected = Array.from(fileList ?? []);
  if (selected.length) setFiles((current) => [...current, ...selected]);
}

export function usePreviewUrls(files: File[]) {
  const urlsRef = useRef(new Map<File, string>());
  const [, setVersion] = useState(0);
  useEffect(() => {
    const urls = urlsRef.current;
    const selected = new Set(files);
    for (const file of files) {
      if (isPreviewableMedia(file) && !urls.has(file)) {
        urls.set(file, URL.createObjectURL(file));
      }
    }
    for (const [file, url] of urls) {
      if (!selected.has(file)) {
        URL.revokeObjectURL(url);
        urls.delete(file);
      }
    }
    setVersion((version) => version + 1);
  }, [files]);
  useEffect(
    () => () => {
      const urls = urlsRef.current;
      for (const url of urls.values()) URL.revokeObjectURL(url);
      urls.clear();
    },
    [],
  );
  return urlsRef.current;
}

export function readQuickNeedle(text: string) {
  const value = text.trimStart();
  return value.startsWith("/") ? value.slice(1).toLocaleLowerCase("pt-BR") : "";
}

export function filterQuickMessages(
  messages: CrmWhatsappQuickMessage[],
  needle: string,
) {
  const normalizedNeedle = needle.toLocaleLowerCase("pt-BR");
  return messages.filter((message) => {
    const shortcut = message.shortcut
      .replace(/^\//, "")
      .toLocaleLowerCase("pt-BR");
    return (
      !normalizedNeedle ||
      shortcut.includes(normalizedNeedle) ||
      message.title.toLocaleLowerCase("pt-BR").includes(normalizedNeedle) ||
      message.content.toLocaleLowerCase("pt-BR").includes(normalizedNeedle)
    );
  });
}

export function formatReplyDraft(message: CrmWhatsappMessage) {
  const content = message.content.trim();
  if (content) {
    return content.length > 140 ? `${content.slice(0, 139)}...` : content;
  }
  return message.type.toLowerCase();
}
