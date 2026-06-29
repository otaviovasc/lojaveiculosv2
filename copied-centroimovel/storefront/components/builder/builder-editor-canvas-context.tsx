"use client";

import { createContext, useContext } from "react";

/** True when the builder is rendering the iframe preview (admin page editor). */
export const BuilderEditorCanvasContext = createContext(false);

export function useBuilderEditorCanvas() {
  return useContext(BuilderEditorCanvasContext);
}
