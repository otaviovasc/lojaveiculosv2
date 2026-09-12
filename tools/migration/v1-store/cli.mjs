const ALL_ALIASES = new Set(["*", "a", "all", "todos"]);

export function parseModuleArgs(argv, availableModules) {
  let only = null;
  let skip = null;
  let help = false;

  for (const arg of argv) {
    if (arg.startsWith("--only=")) only = arg.slice("--only=".length);
    else if (arg.startsWith("--skip=")) skip = arg.slice("--skip=".length);
    else if (arg === "--help" || arg === "-h") help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  if (only !== null && skip !== null)
    throw new Error("Use either --only or --skip, not both.");

  if (help) return { help, modules: null };
  if (only === null && skip === null) return { help, modules: null };

  const skipped =
    skip === null ? [] : parseNamedModules(skip, availableModules);
  const selected =
    only !== null
      ? parseNamedModules(only, availableModules)
      : availableModules.filter((module) => !skipped.includes(module));
  if (!selected.length) throw new Error("Module selection is empty.");
  return { help, modules: new Set(selected) };
}

export function parseInteractiveModuleSelection(value, availableModules) {
  const normalized = value.trim().toLowerCase();
  if (ALL_ALIASES.has(normalized)) return new Set(availableModules);
  if (!normalized) throw new Error('Choose at least one module or type "all".');

  const selected = new Set();
  for (const token of normalized.split(/[\s,]+/).filter(Boolean)) {
    const range = /^(\d+)-(\d+)$/.exec(token);
    if (range) {
      const start = Number(range[1]);
      const end = Number(range[2]);
      if (start > end) throw new Error(`Invalid module range: ${token}`);
      for (let index = start; index <= end; index += 1)
        addModuleByIndex(selected, index, availableModules);
      continue;
    }

    if (/^\d+$/.test(token)) {
      addModuleByIndex(selected, Number(token), availableModules);
      continue;
    }

    const module = availableModules.find((candidate) => candidate === token);
    if (!module) throw unknownModule(token, availableModules);
    selected.add(module);
  }

  if (!selected.size)
    throw new Error('Choose at least one module or type "all".');
  return new Set(availableModules.filter((module) => selected.has(module)));
}

export function formatModuleMenu(availableModules, descriptions = {}) {
  return [
    "What should be migrated?",
    ...availableModules.map(
      (module, index) =>
        `  ${index + 1}. ${module}${descriptions[module] ? ` — ${descriptions[module]}` : ""}`,
    ),
    "  a. all",
    'Choose multiple with commas or ranges (example: "1,2,6" or "1-3").',
  ].join("\n");
}

function parseNamedModules(value, availableModules) {
  const names = value
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
  for (const name of names)
    if (!availableModules.includes(name))
      throw unknownModule(name, availableModules);
  return names;
}

function addModuleByIndex(selected, oneBasedIndex, availableModules) {
  const module = availableModules[oneBasedIndex - 1];
  if (!module)
    throw new Error(
      `Unknown module number "${oneBasedIndex}". Choose 1-${availableModules.length}.`,
    );
  selected.add(module);
}

function unknownModule(name, availableModules) {
  return new Error(
    `Unknown module "${name}". Valid modules: ${availableModules.join(", ")}`,
  );
}
