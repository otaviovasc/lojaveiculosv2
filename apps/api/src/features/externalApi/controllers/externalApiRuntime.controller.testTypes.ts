export type ManifestJson = {
  aiNative: Record<string, string>;
  operations: Array<{ path: string }>;
};

export type ToolsJson = {
  tools: Array<{
    function: {
      name: string;
      parameters: { properties: Record<string, unknown> };
    };
  }>;
};

export type VehicleListJson = {
  data: Array<Record<string, unknown>>;
};

export type VehicleDetailJson = {
  data: {
    media: Array<Record<string, unknown>>;
    units: Array<Record<string, unknown>>;
  };
};

export type LeadDetailJson = {
  data: Record<string, unknown>;
};
