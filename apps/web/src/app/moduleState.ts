import { useCallback, useEffect, useState } from "react";
import { defaultModuleId, moduleDefinitions } from "./moduleDefinitions";
import type { ModuleId } from "./modules";

const moduleIds = new Set(Object.keys(moduleDefinitions));

export function parseModuleHash(hash: string): ModuleId {
  const id = hash.replace(/^#\/?/, "");

  if (moduleIds.has(id)) {
    return id as ModuleId;
  }

  return defaultModuleId;
}

function getCurrentModule(): ModuleId {
  if (typeof window === "undefined") {
    return defaultModuleId;
  }

  return parseModuleHash(window.location.hash);
}

export function useModuleState() {
  const [activeModuleId, setActiveModuleId] = useState(getCurrentModule);

  useEffect(() => {
    const syncFromHash = () => {
      setActiveModuleId(getCurrentModule());
    };

    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  const navigate = useCallback((moduleId: ModuleId) => {
    setActiveModuleId(moduleId);

    if (typeof window !== "undefined") {
      window.location.hash = moduleId;
    }
  }, []);

  return { activeModuleId, navigate };
}
