export type DocumentTemplateSuggestionInput = {
  blocks: readonly Record<string, unknown>[];
  clauses: readonly string[];
  instruction: string;
  templateKey: string;
  title: string;
};

export type DocumentTemplateSuggestion = {
  appliedBlocks: readonly Record<string, unknown>[];
  appliedClauses: readonly string[];
  appliedTitle: string;
  diff: readonly DocumentTemplateSuggestionDiff[];
  generatedAt: Date;
  summary: string;
};

export type DocumentTemplateSuggestionDiff = {
  after: string;
  before: string;
  label: string;
  type: "added" | "changed" | "removed";
};

export type DocumentTemplateSuggestionProvider = {
  suggest: (
    input: DocumentTemplateSuggestionInput,
  ) => Promise<DocumentTemplateSuggestion>;
};
