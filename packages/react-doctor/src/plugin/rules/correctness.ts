import { INDEX_PARAMETER_NAMES } from "../constants.js";
import { findJsxAttribute, walkAst } from "../helpers.js";
import type { EsTreeNode, Rule, RuleContext } from "../types.js";

const extractIndexName = (node: EsTreeNode): string | null => {
  if (node.type === "Identifier" && INDEX_PARAMETER_NAMES.has(node.name)) return node.name;

  if (
    node.type === "TemplateLiteral" &&
    node.expressions?.some(
      (expression: EsTreeNode) =>
        expression.type === "Identifier" && INDEX_PARAMETER_NAMES.has(expression.name),
    )
  )
    return node.expressions.find(
      (expression: EsTreeNode) =>
        expression.type === "Identifier" && INDEX_PARAMETER_NAMES.has(expression.name),
    )?.name;

  if (
    node.type === "CallExpression" &&
    node.callee?.type === "MemberExpression" &&
    node.callee.object?.type === "Identifier" &&
    INDEX_PARAMETER_NAMES.has(node.callee.object.name) &&
    node.callee.property?.type === "Identifier" &&
    node.callee.property.name === "toString"
  )
    return node.callee.object.name;

  if (
    node.type === "CallExpression" &&
    node.callee?.type === "Identifier" &&
    node.callee.name === "String" &&
    node.arguments?.[0]?.type === "Identifier" &&
    INDEX_PARAMETER_NAMES.has(node.arguments[0].name)
  )
    return node.arguments[0].name;

  return null;
};

export const noArrayIndexAsKey: Rule = {
  create: (context: RuleContext) => ({
    JSXAttribute(node: EsTreeNode) {
      if (node.name?.type !== "JSXIdentifier" || node.name.name !== "key") return;
      if (!node.value || node.value.type !== "JSXExpressionContainer") return;

      const indexName = extractIndexName(node.value.expression);
      if (indexName) {
        context.report({
          node,
          message: `Array index "${indexName}" used as key — causes bugs when list is reordered or filtered`,
        });
      }
    },
  }),
};

const PREVENT_DEFAULT_ELEMENTS: Record<string, string> = {
  form: "onSubmit",
  a: "onClick",
};

const containsPreventDefaultCall = (node: EsTreeNode): boolean => {
  let found = false;
  walkAst(node, (child) => {
    if (found) return;
    if (
      child.type === "CallExpression" &&
      child.callee?.type === "MemberExpression" &&
      child.callee.property?.type === "Identifier" &&
      child.callee.property.name === "preventDefault"
    ) {
      found = true;
    }
  });
  return found;
};

export const noPreventDefault: Rule = {
  create: (context: RuleContext) => ({
    JSXOpeningElement(node: EsTreeNode) {
      const elementName = node.name?.type === "JSXIdentifier" ? node.name.name : null;
      if (!elementName) return;

      const targetEventProp = PREVENT_DEFAULT_ELEMENTS[elementName];
      if (!targetEventProp) return;

      const eventAttribute = findJsxAttribute(node.attributes ?? [], targetEventProp);
      if (!eventAttribute?.value || eventAttribute.value.type !== "JSXExpressionContainer") return;

      const expression = eventAttribute.value.expression;
      if (
        expression?.type !== "ArrowFunctionExpression" &&
        expression?.type !== "FunctionExpression"
      )
        return;

      if (!containsPreventDefaultCall(expression)) return;

      const message =
        elementName === "form"
          ? "preventDefault() on <form> onSubmit — form won't work without JavaScript"
          : "preventDefault() on <a> onClick — use a <button> or routing component instead";

      context.report({ node, message });
    },
  }),
};

export const renderingConditionalRender: Rule = {
  create: (context: RuleContext) => ({
    LogicalExpression(node: EsTreeNode) {
      if (node.operator !== "&&") return;

      const isRightJsx = node.right?.type === "JSXElement" || node.right?.type === "JSXFragment";
      if (!isRightJsx) return;

      if (
        node.left?.type === "MemberExpression" &&
        node.left.property?.type === "Identifier" &&
        node.left.property.name === "length"
      ) {
        context.report({
          node,
          message:
            "Conditional rendering with .length can render '0' — use .length > 0 or Boolean(.length)",
        });
      }
    },
  }),
};
