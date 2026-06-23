import { useCallback, useEffect, useState } from "react";
import type { ImageTemplatePreset } from "./ImageTemplateTypes";

const presetStorageKey = "lv_banner_presets";

export function useImageTemplatePresets(
  getCurrentConfig: () => ImageTemplatePreset,
) {
  const [presets, setPresets] = useState<ImageTemplatePreset[]>([]);
  const [presetName, setPresetName] = useState("");
  const [isSavingPreset, setIsSavingPreset] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(presetStorageKey);
      if (saved) setPresets(JSON.parse(saved));
    } catch (error) {
      console.error(error);
    }
  }, []);

  const savePreset = useCallback(() => {
    if (!presetName.trim() || presets.length >= 10) return;
    setIsSavingPreset(true);
    const updated = [
      { ...getCurrentConfig(), name: presetName.trim() },
      ...presets,
    ];
    setPresets(updated);
    localStorage.setItem(presetStorageKey, JSON.stringify(updated));
    setPresetName("");
    setIsSavingPreset(false);
  }, [getCurrentConfig, presetName, presets]);

  const deletePreset = useCallback(
    (idx: number) => {
      const updated = presets.filter((_, i) => i !== idx);
      setPresets(updated);
      localStorage.setItem(presetStorageKey, JSON.stringify(updated));
    },
    [presets],
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
