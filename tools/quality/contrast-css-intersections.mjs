import {
  minimumContrastOnSurfaces,
  minimumTextContrast,
  resolveColor,
} from "./contrast-colors.mjs";

const stateSelectorPattern =
  /:(?:hover|active|focus|focus-visible|focus-within)\b|\[(?:aria-(?:selected|current|pressed|checked|expanded)|data-(?:state|selected|active))|\.(?:active|is-(?:active|selected|current|checked|open))\b|-(?:active|selected|current|checked|open)\b/i;

export function findCssStateIntersectionViolations(file, root, themes) {
  const rules = collectRuleStyles(root);
  return [
    ...findDescendantStateViolations(file, rules, themes),
    ...findCombinedStateViolations(file, rules, themes),
  ];
}

function findCombinedStateViolations(file, rules, themes) {
  const failures = [];
  const hoverRules = rules.filter((rule) => /:hover\b/.test(rule.selector));
  const selectedRules = rules.filter((rule) =>
    /(?:--|-)(?:active|selected|current|checked|open)\b/i.test(rule.selector),
  );
  for (const selectedRule of selectedRules) {
    const selectedBase = baseSelector(selectedRule.selector);
    for (const hoverRule of hoverRules) {
      if (baseSelector(hoverRule.selector) !== selectedBase) continue;
      const combinedRule = rules.find(
        (rule) =>
          baseSelector(rule.selector) === selectedBase &&
          /:hover\b/.test(rule.selector) &&
          /(?:--|-)(?:active|selected|current|checked|open)\b/i.test(
            rule.selector,
          ),
      );
      const applicable = [selectedRule, hoverRule, combinedRule].filter(
        Boolean,
      );
      const backgroundRule = winningDeclaration(applicable, "background");
      const foregroundRule = winningDeclaration(applicable, "foreground");
      if (!backgroundRule?.background || !foregroundRule?.foreground) continue;
      const result = worstThemeContrast(
        backgroundRule.background,
        foregroundRule.foreground,
        themes,
      );
      if (!result || result.ratio >= minimumTextContrast) continue;
      failures.push(
        `${file}:${selectedRule.line} ${selectedRule.selector.trim()} combined with ${hoverRule.selector.trim()}: ${backgroundRule.background} + ${foregroundRule.foreground} is ${result.ratio.toFixed(2)}:1 in ${result.theme}; require ${minimumTextContrast}:1`,
      );
    }
  }
  return failures;
}

function findDescendantStateViolations(file, rules, themes) {
  const failures = [];
  for (const stateRule of rules) {
    if (
      !stateRule.background ||
      !stateSelectorPattern.test(stateRule.selector)
    ) {
      continue;
    }
    const stateClass = stateRule.selector.match(
      /\.([\w-]+?(?:--|-)(?:active|selected|current|checked|open))\b/i,
    )?.[1];
    if (!stateClass) continue;
    const stateClassIndex = stateRule.selector.indexOf(`.${stateClass}`);
    const afterStateClass = stateRule.selector.slice(
      stateClassIndex + stateClass.length + 1,
    );
    if (/\s|>|\+|~|::/.test(afterStateClass)) continue;
    const baseClass = stateClass.replace(
      /(?:--|-)(?:active|selected|current|checked|open)$/i,
      "",
    );
    const candidates = new Map();
    for (const rule of rules) {
      if (
        !rule.foreground ||
        rule.background ||
        rule === stateRule ||
        !rule.selector.includes(`.${baseClass}`)
      ) {
        continue;
      }
      const isExplicitStateDescendant = new RegExp(
        `\\.${escapeRegex(stateClass)}(?:\\b|:)['"]?\\s+[>+~]?\\s*`,
      ).test(rule.selector);
      const isNamespacedTextDescendant = new RegExp(
        `\\.${escapeRegex(baseClass)}-(?:text|label|title|subtitle|content|copy|meta|description|top|preview|phone)\\b`,
      ).test(rule.selector);
      if (!isExplicitStateDescendant && !isNamespacedTextDescendant) continue;
      const target = terminalSelectorTarget(rule.selector);
      const priority = rule.selector.includes(`.${stateClass}`) ? 1 : 0;
      const current = candidates.get(target);
      if (!current || priority >= current.priority) {
        candidates.set(target, { ...rule, priority });
      }
    }
    for (const candidate of candidates.values()) {
      const result = worstThemeContrast(
        stateRule.background,
        candidate.foreground,
        themes,
      );
      if (!result || result.ratio >= minimumTextContrast) continue;
      failures.push(
        `${file}:${candidate.line} ${candidate.selector.trim()} inside ${stateRule.selector.trim()}: ${stateRule.background} + ${candidate.foreground} is ${result.ratio.toFixed(2)}:1 in ${result.theme}; require ${minimumTextContrast}:1`,
      );
    }
  }
  return failures;
}

function collectRuleStyles(root) {
  const rules = [];
  let order = 0;
  root.walkRules((rule) => {
    const backgroundDeclaration = declarationNode(rule, [
      "background-color",
      "background",
    ]);
    const foregroundDeclaration = declarationNode(rule, ["color"]);
    for (const selector of rule.selectors) {
      rules.push({
        background: backgroundDeclaration?.value ?? null,
        backgroundImportant: backgroundDeclaration?.important ?? false,
        foreground: foregroundDeclaration?.value ?? null,
        foregroundImportant: foregroundDeclaration?.important ?? false,
        line: rule.source.start.line,
        order,
        selector,
      });
      order += 1;
    }
  });
  return rules;
}

function winningDeclaration(rules, property) {
  return rules
    .filter((rule) => rule?.[property])
    .sort((left, right) => {
      const importance =
        Number(left[`${property}Important`]) -
        Number(right[`${property}Important`]);
      if (importance) return importance;
      const specificity =
        selectorSpecificity(left.selector) -
        selectorSpecificity(right.selector);
      return specificity || left.order - right.order;
    })
    .at(-1);
}

function selectorSpecificity(selector) {
  const ids = selector.match(/#[\w-]+/g)?.length ?? 0;
  const classes =
    selector.match(/\.[\w-]+|\[[^\]]+\]|:(?!:)[\w-]+/g)?.length ?? 0;
  return ids * 100 + classes * 10;
}

function declarationNode(rule, properties) {
  let value = null;
  rule.walkDecls((declaration) => {
    if (properties.includes(declaration.prop)) value = declaration;
  });
  return value;
}

function baseSelector(selector) {
  return selector
    .replace(/:(?:hover|active|focus|focus-visible|focus-within)\b/g, "")
    .replace(
      /\[(?:aria-(?:selected|current|pressed|checked|expanded)|data-(?:state|selected|active))[^\]]*\]/g,
      "",
    )
    .replace(/\.(?:active|is-(?:active|selected|current|checked|open))\b/g, "")
    .replace(/(?:--|-)(?:active|selected|current|checked|open)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function terminalSelectorTarget(selector) {
  const targets = [
    ...selector.matchAll(/\.[\w-]+|(?:^|\s)(?:strong|small|em|span|svg)\b/g),
  ];
  return targets.at(-1)?.[0].trim() ?? selector.trim();
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function worstThemeContrast(background, foreground, themes) {
  let worst = null;
  for (const theme of themes) {
    const backgroundColor = resolveColor(background, theme.variables);
    const foregroundColor = resolveColor(foreground, theme.variables);
    if (!backgroundColor || !foregroundColor || theme.surfaces.length === 0) {
      continue;
    }
    const ratio = minimumContrastOnSurfaces(
      foregroundColor,
      backgroundColor,
      theme.surfaces,
    );
    if (!worst || ratio < worst.ratio) worst = { ratio, theme: theme.name };
  }
  return worst;
}
