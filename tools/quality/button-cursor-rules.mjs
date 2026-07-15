const cursorContracts = [
  {
    selector: 'button:not(:disabled):not([aria-disabled="true"])',
    value: "pointer !important",
  },
  {
    selector: '[role="button"]:not(button):not([aria-disabled="true"])',
    value: "pointer !important",
  },
  { selector: "button:disabled", value: "not-allowed !important" },
  {
    selector: 'button[aria-disabled="true"]',
    value: "not-allowed !important",
  },
  {
    selector: '[role="button"][aria-disabled="true"]',
    value: "not-allowed !important",
  },
];

export function findButtonCursorContractViolations(input) {
  const { cursorCss, globalCss, mainSource } = input;
  const violations = [];

  if (!hasSideEffectImport(mainSource, "./styles/global.css")) {
    violations.push("apps/web/src/main.tsx must import ./styles/global.css");
  }
  if (!hasCssImport(globalCss, "./button-cursors.css")) {
    violations.push(
      "apps/web/src/styles/global.css must import ./button-cursors.css",
    );
  }

  const rules = cssRules(cursorCss);
  for (const contract of cursorContracts) {
    const value = rules.get(normalizeSelector(contract.selector));
    if (value !== contract.value) {
      violations.push(
        `${contract.selector} must declare cursor: ${contract.value}`,
      );
    }
  }

  return violations;
}

function hasSideEffectImport(source, specifier) {
  return importSpecifiers(source, /import\s+["']([^"']+)["']/g).has(specifier);
}

function hasCssImport(source, specifier) {
  return importSpecifiers(source, /@import\s+["']([^"']+)["']\s*;/g).has(
    specifier,
  );
}

function importSpecifiers(source, pattern) {
  return new Set(
    [...stripComments(source).matchAll(pattern)].map((match) => match[1]),
  );
}

function cssRules(source) {
  const rules = new Map();
  const pattern = /([^{}]+)\{([^{}]*)\}/g;
  for (const match of stripComments(source).matchAll(pattern)) {
    const cursor = cursorDeclaration(match[2]);
    if (!cursor) continue;
    for (const selector of match[1].split(",")) {
      rules.set(normalizeSelector(selector), cursor);
    }
  }
  return rules;
}

function cursorDeclaration(body) {
  const declarations = [...body.matchAll(/(?:^|;)\s*cursor\s*:\s*([^;]+)/g)];
  return declarations.at(-1)?.[1].trim().replace(/\s+/g, " ") ?? null;
}

function normalizeSelector(selector) {
  return selector.trim().replace(/\s+/g, " ");
}

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "");
}
