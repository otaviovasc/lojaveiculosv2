import {
  propertyNameText,
  ts,
  unwrapExpression,
} from "./typescript-source.mjs";
import {
  collectBindingNames,
  isEditedInputTarget,
  isFunctionLike,
  maskCallCoversBranches,
  maskResultFlows,
  visitFunctionBody,
} from "./input-mask-data-flow.mjs";
import {
  expressionProducesMask,
  isExpectedMaskCall,
} from "./input-mask-expression.mjs";
import {
  inputMaskAttributeExpression,
  isInputMaskHelperReference,
  maskKindForReference,
  resolveInputMaskReference,
} from "./input-mask-source.mjs";

const handlerAttributes = new Set([
  "onBlur",
  "onChange",
  "onInput",
  "onValueChange",
]);
const transformerAttributes = new Set([
  "format",
  "formatter",
  "mask",
  "normalize",
  "transform",
]);
const valueAttributes = new Set(["defaultValue", "value"]);

export function inputHasMask(node, kind, references) {
  const supportsTransformers = node.tagName.getText() !== "input";
  return node.attributes.properties.some((attribute) => {
    if (ts.isJsxSpreadAttribute(attribute)) {
      return spreadHasMask(
        attribute.expression,
        kind,
        references,
        new Set(),
        supportsTransformers,
      );
    }
    const name = propertyNameText(attribute.name);
    const expression = inputMaskAttributeExpression(attribute);
    return (
      expression &&
      attributeHasMask(name, expression, kind, references, supportsTransformers)
    );
  });
}

function attributeHasMask(
  name,
  expression,
  kind,
  references,
  supportsTransformers,
) {
  if (handlerAttributes.has(name)) {
    return functionUsesMask(expression, kind, references, true);
  }
  if (transformerAttributes.has(name)) {
    if (!supportsTransformers) return false;
    const resolved = resolveInputMaskReference(expression, references);
    if (
      kind !== "pix-key" &&
      maskKindForReference(resolved, references) === kind
    ) {
      return true;
    }
    return functionUsesMask(expression, kind, references, false);
  }
  return (
    valueAttributes.has(name) &&
    expressionProducesMask(expression, kind, references, new Set())
  );
}

function spreadHasMask(
  expression,
  kind,
  references,
  seen,
  supportsTransformers,
) {
  let current = unwrapExpression(expression);
  if (ts.isIdentifier(current)) {
    if (seen.has(current.text)) return false;
    seen.add(current.text);
    current = references.nodes.get(current.text) ?? current;
  }
  const resolved = resolveInputMaskReference(
    current,
    references,
    new Set(seen),
  );
  if (!ts.isObjectLiteralExpression(resolved)) return false;
  return resolved.properties.some((property) => {
    if (ts.isSpreadAssignment(property)) {
      return spreadHasMask(
        property.expression,
        kind,
        references,
        new Set(seen),
        supportsTransformers,
      );
    }
    if (
      !ts.isPropertyAssignment(property) &&
      !ts.isMethodDeclaration(property)
    ) {
      return false;
    }
    const name = propertyNameText(property.name);
    const value = ts.isMethodDeclaration(property)
      ? property
      : property.initializer;
    return attributeHasMask(
      name,
      value,
      kind,
      references,
      supportsTransformers,
    );
  });
}

function functionUsesMask(expression, kind, references, acceptSink) {
  const handler = resolveInputMaskReference(expression, references);
  if (!isFunctionLike(handler)) return false;
  const inputNames = collectBindingNames(handler.parameters);
  let found = false;
  visitFunctionBody(handler, (node) => {
    if (found || !ts.isCallExpression(node)) return;
    if (
      acceptSink &&
      isApplyInputMaskCall(node, kind, references, inputNames)
    ) {
      found = true;
      return;
    }
    if (
      isExpectedMaskCall(node, kind, references, inputNames) &&
      maskCallCoversBranches(node, handler, (branch) =>
        expressionProducesMask(branch, kind, references, new Set(), inputNames),
      ) &&
      maskResultFlows(node, handler, acceptSink)
    ) {
      found = true;
    }
  });
  return found;
}

function isApplyInputMaskCall(node, kind, references, inputNames) {
  return (
    kind !== "pix-key" &&
    isInputMaskHelperReference(node.expression, references) &&
    node.arguments.length >= 2 &&
    isEditedInputTarget(node.arguments[0], inputNames, references, new Set()) &&
    maskKindForReference(node.arguments[1], references) === kind
  );
}
