import { SEPARATOR_LENGTH } from "./constants.js";
import type { Diagnostic } from "./types.js";
import { discoverProject, formatFrameworkName } from "./utils/discover-project.js";
import { groupBy } from "./utils/group-by.js";
import { highlighter } from "./utils/highlighter.js";
import { logger } from "./utils/logger.js";
import { runOxlint } from "./utils/run-oxlint.js";

const printCategorySection = (category: string, diagnostics: Diagnostic[]): void => {
  const separatorFill = "─".repeat(SEPARATOR_LENGTH - category.length - 6);
  logger.log(`──── ${category} ${separatorFill}`);
  logger.break();

  const ruleGroups = groupBy(
    diagnostics,
    (diagnostic) => `${diagnostic.plugin}/${diagnostic.rule}`,
  );

  for (const [ruleKey, ruleDiagnostics] of ruleGroups) {
    const firstDiagnostic = ruleDiagnostics[0];
    const icon =
      firstDiagnostic.severity === "error" ? highlighter.error("✗") : highlighter.warn("⚠");
    const count = ruleDiagnostics.length;
    const countLabel = count > 1 ? ` (${count})` : "";

    logger.log(`  ${icon} ${firstDiagnostic.message}${countLabel}`);
    if (firstDiagnostic.help) {
      logger.dim(`    ${firstDiagnostic.help}`);
    }
    logger.dim(`    Rule: ${ruleKey}`);

    const fileOccurrences = new Map<string, number>();
    for (const diagnostic of ruleDiagnostics) {
      const currentCount = fileOccurrences.get(diagnostic.filePath) ?? 0;
      fileOccurrences.set(diagnostic.filePath, currentCount + 1);
    }

    for (const [filePath, occurrenceCount] of fileOccurrences) {
      const fileCountLabel = occurrenceCount > 1 ? ` (${occurrenceCount}x)` : "";
      logger.dim(`    ${filePath}${fileCountLabel}`);
    }

    logger.break();
  }
};

const printSummary = (diagnostics: Diagnostic[]): void => {
  const errorCount = diagnostics.filter((diagnostic) => diagnostic.severity === "error").length;
  const warningCount = diagnostics.filter((diagnostic) => diagnostic.severity === "warning").length;

  logger.log("─".repeat(SEPARATOR_LENGTH));
  logger.break();

  const parts: string[] = [];
  if (errorCount > 0) {
    parts.push(highlighter.error(`${errorCount} error${errorCount === 1 ? "" : "s"}`));
  }
  if (warningCount > 0) {
    parts.push(highlighter.warn(`${warningCount} warning${warningCount === 1 ? "" : "s"}`));
  }

  logger.log(parts.join("  "));
};

export const scan = (directory: string): void => {
  const projectInfo = discoverProject(directory);

  if (!projectInfo.reactVersion) {
    throw new Error("No React dependency found in package.json");
  }

  const frameworkLabel = formatFrameworkName(projectInfo.framework);
  const languageLabel = projectInfo.hasTypeScript ? "TypeScript" : "JavaScript";

  logger.log(
    `Found: ${frameworkLabel} · React ${projectInfo.reactVersion} · ${languageLabel} · ${projectInfo.sourceFileCount} source files`,
  );
  logger.break();

  const diagnostics = runOxlint(directory, projectInfo.hasTypeScript);

  if (diagnostics.length === 0) {
    logger.success("No issues found!");
    return;
  }

  const groupedDiagnostics = groupBy(diagnostics, (diagnostic) => diagnostic.category);

  for (const [category, categoryDiagnostics] of groupedDiagnostics) {
    printCategorySection(category, categoryDiagnostics);
  }

  printSummary(diagnostics);
};
