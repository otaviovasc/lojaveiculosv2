import { useCallback, useEffect, useState } from "react";
import {
  crmSurfaceHash,
  readCrmSurfaceFromHash,
} from "../features/crm/crmRouteState";
import { defaultModuleId, moduleDefinitions } from "./moduleDefinitions";
import type { ModuleId } from "./modules";

const moduleIds = new Set(Object.keys(moduleDefinitions));
const modulePathAliases: Record<string, ModuleId> = {
  dominio: "domain",
  "custom-pages": "custom-pages",
  "page-builder": "custom-pages",
  paginas: "custom-pages",
  personalizar: "public-site",
  "site-publico": "public-site",
};

function parseModuleHashCandidate(hash: string): ModuleId | undefined {
  const path = hash.replace(/^#\/?/, "").split("?")[0] ?? "";
  const id = path.split("/").filter(Boolean)[0] ?? "";

  if (id === "crm" && readCrmSurfaceFromHash(hash) === "leads") {
    return "customers";
  }

  return resolveModuleId(id);
}

export function parseModuleHash(hash: string): ModuleId {
  return parseModuleHashCandidate(hash) ?? defaultModuleId;
}

export function parseModulePath(pathname: string): ModuleId {
  const id = pathname.replace(/^\/+/, "").split("/")[0] ?? "";

  return resolveModuleId(id) ?? defaultModuleId;
}

export function parseModuleLocation(location: {
  hash: string;
  pathname: string;
}): ModuleId {
  return (
    parseModuleHashCandidate(location.hash) ??
    parseModulePath(location.pathname)
  );
}

function getCurrentModule(): ModuleId {
  if (typeof window === "undefined") {
    return defaultModuleId;
  }

  return parseModuleLocation(window.location);
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
      window.location.hash = moduleHash(moduleId);
    }
  }, []);

  return { activeModuleId, navigate };
}

function moduleHash(moduleId: ModuleId) {
  if (moduleId === "customers") return crmSurfaceHash("leads");
  if (moduleId === "crm") return crmSurfaceHash("whatsapp");
  if (moduleId === "domain") return "/dominio";
  if (moduleId === "public-site") return "/personalizar";
  return `/${moduleId}`;
}

function resolveModuleId(id: string): ModuleId | undefined {
  if (id in modulePathAliases) return modulePathAliases[id];
  if (moduleIds.has(id)) return id as ModuleId;
  return undefined;
}
