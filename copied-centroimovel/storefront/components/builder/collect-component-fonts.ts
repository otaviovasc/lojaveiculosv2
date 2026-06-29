/**
 * Collects fontFamily values from component `style` (including nested layout blocks).
 * Used so Google Fonts can be loaded on preview and public custom pages.
 */
export function collectFontFamiliesFromPageComponents(
  components: Array<{ type: string; props: Record<string, unknown> }>,
): string[] {
  const families = new Set<string>();

  const addFontFromStyleObject = (style: unknown) => {
    if (!style || typeof style !== "object") return;
    const raw = (style as Record<string, unknown>).fontFamily;
    if (typeof raw === "string") {
      const trimmed = raw.trim();
      if (trimmed) families.add(trimmed);
    }
  };

  const visit = (comp: { type: string; props: Record<string, unknown> }) => {
    const { props } = comp;
    addFontFromStyleObject(props.style);
    addFontFromStyleObject(props.leftStyle);
    addFontFromStyleObject(props.rightStyle);

    const children = props.children as
      Array<{ type: string; props: Record<string, unknown> }> | undefined;
    if (Array.isArray(children)) {
      for (const child of children) visit(child);
    }

    for (const key of ["leftChildren", "rightChildren"] as const) {
      const col = props[key] as
        Array<{ type: string; props: Record<string, unknown> }> | undefined;
      if (Array.isArray(col)) {
        for (const child of col) visit(child);
      }
    }

    const left = props.leftContent as
      { type: string; props: Record<string, unknown> } | undefined;
    const right = props.rightContent as
      { type: string; props: Record<string, unknown> } | undefined;
    if (left?.type) visit(left);
    if (right?.type) visit(right);

    const content = props.content as
      { type: string; props: Record<string, unknown> } | undefined;
    if (content?.type) visit(content);
  };

  for (const c of components) visit(c);
  return [...families];
}
