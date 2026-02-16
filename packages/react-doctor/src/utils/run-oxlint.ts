import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { JSX_FILE_PATTERN, SPAWN_MAX_BUFFER_BYTES } from "../constants.js";
import { OXLINT_CONFIG } from "../oxlint-config.js";
import type { Diagnostic, OxlintOutput } from "../types.js";

const PLUGIN_CATEGORY_MAP: Record<string, string> = {
  react: "Correctness",
  "react-hooks": "Correctness",
  "jsx-a11y": "Accessibility",
  "react-perf": "Performance",
};

const parseRuleCode = (code: string): { plugin: string; rule: string } => {
  const match = code.match(/^(.+)\((.+)\)$/);
  if (!match) return { plugin: "unknown", rule: code };
  return { plugin: match[1].replace(/^eslint-plugin-/, ""), rule: match[2] };
};

const resolveOxlintBinary = (): string => {
  const oxlintMainPath = require.resolve("oxlint");
  const oxlintPackageDirectory = path.resolve(path.dirname(oxlintMainPath), "..");
  return path.join(oxlintPackageDirectory, "bin", "oxlint");
};

export const runOxlint = (rootDirectory: string, hasTypeScript: boolean): Diagnostic[] => {
  const configPath = path.join(os.tmpdir(), `react-doctor-oxlintrc-${process.pid}.json`);

  try {
    fs.writeFileSync(configPath, JSON.stringify(OXLINT_CONFIG, null, 2));

    const oxlintBinary = resolveOxlintBinary();
    const args = [oxlintBinary, "-c", configPath, "--format", "json"];

    if (hasTypeScript) {
      args.push("--tsconfig", "./tsconfig.json");
    }

    args.push(".");

    const result = spawnSync(process.execPath, args, {
      cwd: rootDirectory,
      encoding: "utf-8",
      maxBuffer: SPAWN_MAX_BUFFER_BYTES,
    });

    if (result.error) {
      throw new Error(`Failed to run oxlint: ${result.error.message}`);
    }

    const stdout = result.stdout.trim();
    if (!stdout) {
      return [];
    }

    const output = JSON.parse(stdout) as OxlintOutput;

    return output.diagnostics
      .filter((diagnostic) => JSX_FILE_PATTERN.test(diagnostic.filename))
      .map((diagnostic) => {
        const { plugin, rule } = parseRuleCode(diagnostic.code);
        const primaryLabel = diagnostic.labels[0];

        return {
          filePath: diagnostic.filename,
          plugin,
          rule,
          severity: diagnostic.severity,
          message: diagnostic.message,
          help: diagnostic.help,
          line: primaryLabel?.span.line ?? 0,
          column: primaryLabel?.span.column ?? 0,
          category: PLUGIN_CATEGORY_MAP[plugin] ?? "Other",
        };
      });
  } finally {
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }
  }
};
