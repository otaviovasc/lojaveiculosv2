/**
 * Normalizes legacy modular routes before validation (nested blocks, divider
 * props, contact form colors, deprecated `contact_form` type).
 */

export type NestedBlock = { type: string; props: Record<string, unknown> };

function migrateNestedBlockEntry(raw: unknown): NestedBlock {
  if (!raw || typeof raw !== "object") {
    return { type: "text_block", props: { content: "", style: {} } };
  }
  const b = raw as Record<string, unknown>;
  const type = String(b.type || "text_block");
  const base =
    typeof b.props === "object" && b.props !== null
      ? { ...(b.props as Record<string, unknown>) }
      : {};
  return { type, props: migratePropsForType(type, base) };
}

function migratePropsForType(
  type: string,
  props: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...props };

  if (type === "divider") {
    if (typeof next.style === "string") {
      next.lineVariant = next.style;
      delete next.style;
    }
    if (next.lineVariant === undefined) {
      next.lineVariant = "solid";
    }
  }

  if (type === "section_wrapper") {
    let children = next.children as unknown[] | undefined;
    if (!Array.isArray(children) || children.length === 0) {
      const content = next.content as NestedBlock | undefined;
      if (
        content &&
        typeof content === "object" &&
        typeof (content as NestedBlock).type === "string"
      ) {
        children = [content];
      } else {
        children = [];
      }
    }
    next.children = children.map((c) => migrateNestedBlockEntry(c));
    delete next.content;
  }

  if (type === "two_column") {
    let left = next.leftChildren as unknown[] | undefined;
    if (!Array.isArray(left) || left.length === 0) {
      const lc = next.leftContent as NestedBlock | undefined;
      if (
        lc &&
        typeof lc === "object" &&
        typeof (lc as NestedBlock).type === "string"
      ) {
        left = [lc];
      } else {
        left = [];
      }
    }
    let right = next.rightChildren as unknown[] | undefined;
    if (!Array.isArray(right) || right.length === 0) {
      const rc = next.rightContent as NestedBlock | undefined;
      if (
        rc &&
        typeof rc === "object" &&
        typeof (rc as NestedBlock).type === "string"
      ) {
        right = [rc];
      } else {
        right = [];
      }
    }
    next.leftChildren = left.map((c) => migrateNestedBlockEntry(c));
    next.rightChildren = right.map((c) => migrateNestedBlockEntry(c));
    delete next.leftContent;
    delete next.rightContent;
  }

  if (type === "container") {
    const ch = next.children as unknown[] | undefined;
    next.children = Array.isArray(ch)
      ? ch.map((c) => migrateNestedBlockEntry(c))
      : [];
  }

  if (type === "contact_section") {
    const st = next.style;
    if (st && typeof st === "object") {
      const s = { ...(st as Record<string, unknown>) };
      if (
        next.formBackgroundColor === undefined &&
        typeof s.formBackgroundColor === "string"
      ) {
        next.formBackgroundColor = s.formBackgroundColor;
        delete s.formBackgroundColor;
      }
      if (
        next.formTextColor === undefined &&
        typeof s.formTextColor === "string"
      ) {
        next.formTextColor = s.formTextColor;
        delete s.formTextColor;
      }
      next.style = s;
    }
  }

  return next;
}

const COLOR_KEYS = new Set([
  "textColor",
  "backgroundColor",
  "borderColor",
  "glowColor",
  "buttonColor",
  "buttonTextColor",
  "buttonBorderColor",
  "titleColor",
  "subtitleColor",
  "formBackgroundColor",
  "formTextColor",
  "staticTextColor",
  "typewriterColor",
  "solidColor",
  "color",
]);

function sanitizeColorFields(obj: unknown, keyPath: string[] = []): void {
  if (!obj || typeof obj !== "object") return;

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      sanitizeColorFields(obj[i], [...keyPath, String(i)]);
    }
    return;
  }

  const record = obj as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    const value = record[key];
    const currentPath = [...keyPath, key];

    if (COLOR_KEYS.has(key) && typeof value === "string") {
      const isHeroGradientStop = currentPath.includes("gradientStops");
      const isHeroOverlayColor =
        currentPath.includes("overlay") && key === "color";

      if (isHeroGradientStop || isHeroOverlayColor) {
        continue;
      }

      const trimmed = value.trim();
      if (!/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
        delete record[key];
      } else {
        record[key] = trimmed;
      }
    } else if (value && typeof value === "object") {
      sanitizeColorFields(value, currentPath);
    }
  }
}

export function migrateModularCustomRoute(
  route: Record<string, unknown>,
): Record<string, unknown> {
  const components = route.components;
  if (!Array.isArray(components)) {
    return route;
  }

  const nextComponents = components.map((c) => {
    if (!c || typeof c !== "object") return c;
    const comp = c as Record<string, unknown>;
    let type = String(comp.type || "");
    if (type === "contact_form") {
      type = "contact_section";
    }
    const propsRaw =
      typeof comp.props === "object" && comp.props !== null
        ? { ...(comp.props as Record<string, unknown>) }
        : {};
    return {
      ...comp,
      type,
      props: migratePropsForType(type, propsRaw),
    };
  });

  const nextRoute = { ...route, components: nextComponents };
  sanitizeColorFields(nextRoute);

  return nextRoute;
}
