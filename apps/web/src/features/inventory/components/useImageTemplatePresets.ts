import { useCallback, useEffect, useState } from "react";
import type { ImageTemplatePreset } from "./ImageTemplateTypes";

const legacyPresetStorageKey = "lv_banner_presets";
const presetStoragePrefix = "lv_post_studio_presets";

export function useImageTemplatePresets(
  getCurrentConfig: () => ImageTemplatePreset,
  scope: string,
) {
  const [presets, setPresets] = useState<ImageTemplatePreset[]>([]);
  const [presetName, setPresetName] = useState("");
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const storageKey = `${presetStoragePrefix}:${scope || "default"}`;

  useEffect(() => {
    try {
      const saved =
        localStorage.getItem(storageKey) ??
        localStorage.getItem(legacyPresetStorageKey);
      const parsed: unknown = saved ? JSON.parse(saved) : [];
      const nextPresets = Array.isArray(parsed)
        ? parsed.filter(isImageTemplatePreset)
        : [];
      setPresets(nextPresets);
      if (!localStorage.getItem(storageKey) && nextPresets.length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(nextPresets));
      }
    } catch (error) {
      console.error(error);
      setPresets([]);
    }
  }, [storageKey]);

  const savePreset = useCallback(() => {
    if (!presetName.trim() || presets.length >= 10) return;
    setIsSavingPreset(true);
    const updated = [
      { ...getCurrentConfig(), name: presetName.trim() },
      ...presets,
    ];
    setPresets(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    setPresetName("");
    setIsSavingPreset(false);
  }, [getCurrentConfig, presetName, presets, storageKey]);

  const deletePreset = useCallback(
    (idx: number) => {
      const updated = presets.filter((_, i) => i !== idx);
      setPresets(updated);
      localStorage.setItem(storageKey, JSON.stringify(updated));
    },
    [presets, storageKey],
  );

  return {
    deletePreset,
    isSavingPreset,
    presetName,
    presets,
    savePreset,
    setPresetName,
  };
}

function isImageTemplatePreset(value: unknown): value is ImageTemplatePreset {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ImageTemplatePreset>;
  return (
    typeof candidate.name === "string" &&
    typeof candidate.color === "string" &&
    typeof candidate.bgStyle === "string"
  );
}
