"use client";

import { createContext } from "react";

/** When set, UI portaled to the page-builder iframe should use this document (e.g. lightboxes). */
export const PreviewDocumentContext = createContext<Document | null>(null);
