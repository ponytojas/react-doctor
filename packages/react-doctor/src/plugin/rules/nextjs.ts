import {
  PAGE_FILE_PATTERN,
  PAGE_OR_LAYOUT_FILE_PATTERN,
  PAGES_DIRECTORY_PATTERN,
} from "../constants.js";
import {
  containsFetchCall,
  getEffectCallback,
  hasDirective,
  isComponentAssignment,
  isHookCall,
  isUppercaseName,
} from "../helpers.js";
import type { EsTreeNode, Rule, RuleContext } from "../types.js";

export const nextjsNoImgElement: Rule = {
  create: (context: RuleContext) => ({
    JSXOpeningElement(node: EsTreeNode) {
      if (node.name?.type === "JSXIdentifier" && node.name.name === "img") {
        context.report({
          node,
          message:
            "Use next/image instead of <img> — provides automatic optimization, lazy loading, and responsive srcset",
        });
      }
    },
  }),
};

export const nextjsAsyncClientComponent: Rule = {
  create: (context: RuleContext) => {
    let fileHasUseClient = false;

    return {
      Program(programNode: EsTreeNode) {
        fileHasUseClient = hasDirective(programNode, "use client");
      },
      FunctionDeclaration(node: EsTreeNode) {
        if (!fileHasUseClient || !node.async) return;
        if (!node.id?.name || !isUppercaseName(node.id.name)) return;
        context.report({
          node,
          message: `Async client component "${node.id.name}" — client components cannot be async`,
        });
      },
      VariableDeclarator(node: EsTreeNode) {
        if (!fileHasUseClient) return;
        if (!isComponentAssignment(node) || !node.init?.async) return;
        context.report({
          node,
          message: `Async client component "${node.id.name}" — client components cannot be async`,
        });
      },
    };
  },
};

export const nextjsNoAElement: Rule = {
  create: (context: RuleContext) => ({
    JSXOpeningElement(node: EsTreeNode) {
      if (node.name?.type !== "JSXIdentifier" || node.name.name !== "a") return;

      const hrefAttribute = node.attributes?.find(
        (attribute: EsTreeNode) =>
          attribute.type === "JSXAttribute" &&
          attribute.name?.type === "JSXIdentifier" &&
          attribute.name.name === "href",
      );
      if (!hrefAttribute?.value) return;

      const hrefValue =
        hrefAttribute.value.type === "Literal"
          ? hrefAttribute.value.value
          : hrefAttribute.value.type === "JSXExpressionContainer" &&
              hrefAttribute.value.expression?.type === "Literal"
            ? hrefAttribute.value.expression.value
            : null;

      if (typeof hrefValue === "string" && hrefValue.startsWith("/")) {
        context.report({
          node,
          message:
            "Use next/link instead of <a> for internal links — enables client-side navigation and prefetching",
        });
      }
    },
  }),
};

export const nextjsNoUseSearchParamsWithoutSuspense: Rule = {
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      if (!isHookCall(node, "useSearchParams")) return;
      context.report({
        node,
        message:
          "useSearchParams() requires a <Suspense> boundary — without one, the entire page bails out to client-side rendering",
      });
    },
  }),
};

export const nextjsNoClientFetchForServerData: Rule = {
  create: (context: RuleContext) => {
    let fileHasUseClient = false;

    return {
      Program(programNode: EsTreeNode) {
        fileHasUseClient = hasDirective(programNode, "use client");
      },
      CallExpression(node: EsTreeNode) {
        if (!fileHasUseClient || !isHookCall(node, "useEffect")) return;

        const callback = getEffectCallback(node);
        if (!callback || !containsFetchCall(callback)) return;

        const filename = context.getFilename?.() ?? "";
        const isPageOrLayoutFile =
          PAGE_OR_LAYOUT_FILE_PATTERN.test(filename) || PAGES_DIRECTORY_PATTERN.test(filename);

        if (isPageOrLayoutFile) {
          context.report({
            node,
            message:
              "useEffect + fetch in a page/layout — fetch data server-side with a server component instead",
          });
        }
      },
    };
  },
};

export const nextjsMissingMetadata: Rule = {
  create: (context: RuleContext) => ({
    Program(programNode: EsTreeNode) {
      const filename = context.getFilename?.() ?? "";
      if (!PAGE_FILE_PATTERN.test(filename)) return;

      const hasMetadataExport = programNode.body?.some((statement: EsTreeNode) => {
        if (statement.type !== "ExportNamedDeclaration") return false;
        const declaration = statement.declaration;
        if (declaration?.type === "VariableDeclaration") {
          return declaration.declarations?.some(
            (declarator: EsTreeNode) =>
              declarator.id?.type === "Identifier" &&
              (declarator.id.name === "metadata" || declarator.id.name === "generateMetadata"),
          );
        }
        if (declaration?.type === "FunctionDeclaration") {
          return declaration.id?.name === "generateMetadata";
        }
        return false;
      });

      if (!hasMetadataExport) {
        context.report({
          node: programNode,
          message: "Page without metadata or generateMetadata export — hurts SEO",
        });
      }
    },
  }),
};

export const nextjsNoClientSideRedirect: Rule = {
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      if (!isHookCall(node, "useEffect")) return;

      const callback = getEffectCallback(node);
      if (!callback) return;

      const bodyStatements =
        callback.body?.type === "BlockStatement" ? (callback.body.body ?? []) : [callback.body];

      for (const statement of bodyStatements) {
        if (statement?.type !== "ExpressionStatement") continue;
        const expression = statement.expression;
        if (
          expression?.type === "CallExpression" &&
          expression.callee?.type === "MemberExpression" &&
          expression.callee.object?.type === "Identifier" &&
          expression.callee.object.name === "router" &&
          expression.callee.property?.type === "Identifier" &&
          (expression.callee.property.name === "push" ||
            expression.callee.property.name === "replace")
        ) {
          context.report({
            node: expression,
            message:
              "Client-side redirect in useEffect — use redirect() in a server component or middleware instead",
          });
        }
      }
    },
  }),
};
