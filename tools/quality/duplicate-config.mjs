export const legacyAllowMarker = "duplicate-implementation-allow";
export const fileAllowMarker = "duplicate-implementation-file-allow";
export const blockAllowStartMarker = "duplicate-implementation-allow-start";
export const blockAllowEndMarker = "duplicate-implementation-allow-end";

export const fileAllowMarkerPattern =
  /duplicate-implementation-file-allow:\s+\S(?:.*\S)?/;
export const blockAllowStartPattern =
  /duplicate-implementation-allow-start:\s+\S(?:.*\S)?/g;
export const legacyAllowMarkerPattern =
  /duplicate-implementation-allow:\s+\S(?:.*\S)?/;

export const minimumImplementationLines = 8;
export const minimumImplementationTokens = 80;
export const minimumImplementationLength = 420;
export const minimumCloneWindowTokens = 100;
export const minimumCloneWindowLines = 10;
export const cloneWindowStride = 20;
export const minimumOptionItems = 3;
export const minimumOptionLength = 90;
export const maximumReportedGroups = 20;
