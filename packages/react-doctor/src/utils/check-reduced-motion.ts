import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { MOTION_LIBRARY_PACKAGES } from "../plugin/constants.js";
import type { Diagnostic } from "../types.js";
import { readPackageJson } from "./read-package-json.js";

const REDUCED_MOTION_GREP_PATTERN = "prefers-reduced-motion|useReducedMotion";
const REDUCED_MOTION_FILE_GLOBS = '"*.ts" "*.tsx" "*.js" "*.jsx" "*.css" "*.scss"';

export const checkReducedMotion = (rootDirectory: string): Diagnostic[] => {
  const packageJsonPath = path.join(rootDirectory, "package.json");
  if (!fs.existsSync(packageJsonPath)) return [];

  const packageJson = readPackageJson(packageJsonPath);
  const allDependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
  const hasMotionLibrary = Object.keys(allDependencies).some((packageName) =>
    MOTION_LIBRARY_PACKAGES.has(packageName),
  );
  if (!hasMotionLibrary) return [];

  try {
    execSync(`git grep -ql -E "${REDUCED_MOTION_GREP_PATTERN}" -- ${REDUCED_MOTION_FILE_GLOBS}`, {
      cwd: rootDirectory,
      stdio: "pipe",
    });
    return [];
  } catch {
    return [
      {
        filePath: "package.json",
        plugin: "react-doctor",
        rule: "require-reduced-motion",
        severity: "error",
        message:
          "Project uses a motion library but has no prefers-reduced-motion handling — required for accessibility (WCAG 2.3.3)",
        help: "Add `useReducedMotion()` from your animation library, or a `@media (prefers-reduced-motion: reduce)` CSS query",
        line: 0,
        column: 0,
        category: "Accessibility",
      },
    ];
  }
};
