import { join } from "node:path";
import { findClassContrastViolations } from "./contrast-classes.mjs";
import { findCssStateContrastViolations } from "./contrast-css-states.mjs";
import {
  buildContrastThemes,
  findSemanticContrastViolations,
} from "./contrast-tokens.mjs";
import { readText, repoPath, repoRoot, walkFiles } from "./quality-files.mjs";

const webSourceRoot = join(repoRoot, "apps/web/src");
const designSystemRoot = join(repoRoot, "packages/design-system/src");
const tokensSource = ["tokens.css", "contrast-tokens.css"]
  .map((file) => readText(join(webSourceRoot, "styles", file)))
  .join("\n");
const publicSource = readText(join(webSourceRoot, "styles/publicSite.css"));
const themes = buildContrastThemes(tokensSource, publicSource);
const interactionThemes = themes.filter(
  (theme) => theme.name !== "public-light",
);
const extensions = new Set([".css", ".js", ".jsx", ".ts", ".tsx"]);
const files = walkFiles([webSourceRoot, designSystemRoot], { extensions });
const failures = findSemanticContrastViolations(themes).map(
  (failure) => `apps/web/src/styles/tokens.css: ${failure}`,
);

for (const file of files) {
  const source = readText(file);
  const relativeFile = repoPath(file);
  if (file.endsWith(".css")) {
    failures.push(
      ...findCssStateContrastViolations(
        relativeFile,
        source,
        interactionThemes,
      ),
    );
  } else {
    failures.push(
      ...findClassContrastViolations(relativeFile, source, interactionThemes),
    );
  }
}

if (failures.length > 0) {
  console.error("Foreground/background contrast violations:");
  for (const failure of failures) console.error(`- ${failure}`);
  console.error(
    "Use a semantic foreground token paired with every base, hover, active, or selected background.",
  );
  process.exit(1);
}

console.log("Frontend contrast guard passed.");
