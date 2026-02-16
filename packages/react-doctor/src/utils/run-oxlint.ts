import { spawn } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ERROR_PREVIEW_LENGTH_CHARS, JSX_FILE_PATTERN } from "../constants.js";
import { createOxlintConfig } from "../oxlint-config.js";
import type { CleanedDiagnostic, Diagnostic, Framework, OxlintOutput } from "../types.js";

const esmRequire = createRequire(import.meta.url);

const PLUGIN_CATEGORY_MAP: Record<string, string> = {
  react: "Correctness",
  "react-hooks": "Correctness",
  "react-hooks-js": "React Compiler",
  "react-perf": "Performance",
  "jsx-a11y": "Accessibility",
  import: "Bundle Size",
  typescript: "TypeScript",
};

const RULE_CATEGORY_MAP: Record<string, string> = {
  "react-doctor/no-derived-state-effect": "State & Effects",
  "react-doctor/no-fetch-in-effect": "State & Effects",
  "react-doctor/no-cascading-set-state": "State & Effects",
  "react-doctor/no-effect-event-handler": "State & Effects",
  "react-doctor/no-derived-useState": "State & Effects",
  "react-doctor/prefer-useReducer": "State & Effects",
  "react-doctor/rerender-lazy-state-init": "Performance",
  "react-doctor/rerender-functional-setstate": "Performance",
  "react-doctor/rerender-dependencies": "State & Effects",

  "react-doctor/no-generic-handler-names": "Architecture",
  "react-doctor/no-giant-component": "Architecture",
  "react-doctor/no-render-in-render": "Architecture",
  "react-doctor/no-nested-component-definition": "Correctness",

  "react-doctor/no-usememo-simple-expression": "Performance",
  "react-doctor/no-layout-property-animation": "Performance",
  "react-doctor/rerender-memo-with-default-value": "Performance",
  "react-doctor/rendering-animate-svg-wrapper": "Performance",
  "react-doctor/rendering-usetransition-loading": "Performance",
  "react-doctor/rendering-hydration-no-flicker": "Performance",

  "react-doctor/no-eval": "Security",
  "react-doctor/no-secrets-in-client-code": "Security",

  "react-doctor/no-barrel-import": "Bundle Size",
  "react-doctor/no-full-lodash-import": "Bundle Size",
  "react-doctor/no-moment": "Bundle Size",
  "react-doctor/prefer-dynamic-import": "Bundle Size",
  "react-doctor/use-lazy-motion": "Bundle Size",
  "react-doctor/no-undeferred-third-party": "Bundle Size",

  "react-doctor/no-array-index-as-key": "Correctness",
  "react-doctor/rendering-conditional-render": "Correctness",
  "react-doctor/no-prevent-default": "Correctness",
  "react-doctor/nextjs-no-img-element": "Next.js",
  "react-doctor/nextjs-async-client-component": "Next.js",
  "react-doctor/nextjs-no-a-element": "Next.js",
  "react-doctor/nextjs-no-use-search-params-without-suspense": "Next.js",
  "react-doctor/nextjs-no-client-fetch-for-server-data": "Next.js",
  "react-doctor/nextjs-missing-metadata": "Next.js",
  "react-doctor/nextjs-no-client-side-redirect": "Next.js",

  "react-doctor/server-auth-actions": "Server",
  "react-doctor/server-after-nonblocking": "Server",

  "react-doctor/client-passive-event-listeners": "Performance",

  "react-doctor/js-combine-iterations": "Performance",
  "react-doctor/js-tosorted-immutable": "Performance",
  "react-doctor/js-hoist-regexp": "Performance",
  "react-doctor/js-min-max-loop": "Performance",
  "react-doctor/js-set-map-lookups": "Performance",
  "react-doctor/js-batch-dom-css": "Performance",
  "react-doctor/js-index-maps": "Performance",
  "react-doctor/js-cache-storage": "Performance",
  "react-doctor/js-early-exit": "Architecture",
  "react-doctor/async-parallel": "Performance",
};

const FILEPATH_WITH_LOCATION_PATTERN = /\S+\.\w+:\d+:\d+[\s\S]*$/;

const REACT_COMPILER_MESSAGE = "React Compiler can't optimize this code";

const cleanDiagnosticMessage = (
  message: string,
  help: string,
  plugin: string,
): CleanedDiagnostic => {
  if (plugin === "react-hooks-js") {
    const rawMessage = message.replace(FILEPATH_WITH_LOCATION_PATTERN, "").trim();
    return { message: REACT_COMPILER_MESSAGE, help: rawMessage || help };
  }
  const cleaned = message.replace(FILEPATH_WITH_LOCATION_PATTERN, "").trim();
  return { message: cleaned || message, help };
};

const parseRuleCode = (code: string): { plugin: string; rule: string } => {
  const match = code.match(/^(.+)\((.+)\)$/);
  if (!match) return { plugin: "unknown", rule: code };
  return { plugin: match[1].replace(/^eslint-plugin-/, ""), rule: match[2] };
};

const resolveOxlintBinary = (): string => {
  const oxlintMainPath = esmRequire.resolve("oxlint");
  const oxlintPackageDirectory = path.resolve(path.dirname(oxlintMainPath), "..");
  return path.join(oxlintPackageDirectory, "bin", "oxlint");
};

const resolvePluginPath = (): string => {
  const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
  return path.join(currentDirectory, "react-doctor-plugin.js");
};

const resolveDiagnosticCategory = (plugin: string, rule: string): string => {
  const ruleKey = `${plugin}/${rule}`;
  return RULE_CATEGORY_MAP[ruleKey] ?? PLUGIN_CATEGORY_MAP[plugin] ?? "Other";
};

export const runOxlint = async (
  rootDirectory: string,
  hasTypeScript: boolean,
  framework: Framework,
  hasReactCompiler: boolean,
): Promise<Diagnostic[]> => {
  const configPath = path.join(os.tmpdir(), `react-doctor-oxlintrc-${process.pid}.json`);
  const pluginPath = resolvePluginPath();
  const config = createOxlintConfig({ pluginPath, framework, hasReactCompiler });

  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    const oxlintBinary = resolveOxlintBinary();
    const args = [oxlintBinary, "-c", configPath, "--format", "json"];

    if (hasTypeScript) {
      args.push("--tsconfig", "./tsconfig.json");
    }

    args.push(".");

    const stdout = await new Promise<string>((resolve, reject) => {
      const child = spawn(process.execPath, args, {
        cwd: rootDirectory,
      });

      const stdoutBuffers: Buffer[] = [];
      const stderrBuffers: Buffer[] = [];

      child.stdout.on("data", (buffer: Buffer) => stdoutBuffers.push(buffer));
      child.stderr.on("data", (buffer: Buffer) => stderrBuffers.push(buffer));

      child.on("error", (error) => reject(new Error(`Failed to run oxlint: ${error.message}`)));
      child.on("close", () => {
        const output = Buffer.concat(stdoutBuffers).toString("utf-8").trim();
        if (!output) {
          const stderrOutput = Buffer.concat(stderrBuffers).toString("utf-8").trim();
          if (stderrOutput) {
            reject(new Error(`Failed to run oxlint: ${stderrOutput}`));
            return;
          }
        }
        resolve(output);
      });
    });

    if (!stdout) {
      return [];
    }

    let output: OxlintOutput;
    try {
      output = JSON.parse(stdout) as OxlintOutput;
    } catch {
      throw new Error(
        `Failed to parse oxlint output: ${stdout.slice(0, ERROR_PREVIEW_LENGTH_CHARS)}`,
      );
    }

    return output.diagnostics
      .filter((diagnostic) => JSX_FILE_PATTERN.test(diagnostic.filename))
      .map((diagnostic) => {
        const { plugin, rule } = parseRuleCode(diagnostic.code);
        const primaryLabel = diagnostic.labels[0];

        const cleaned = cleanDiagnosticMessage(diagnostic.message, diagnostic.help, plugin);

        return {
          filePath: diagnostic.filename,
          plugin,
          rule,
          severity: diagnostic.severity,
          message: cleaned.message,
          help: cleaned.help,
          line: primaryLabel?.span.line ?? 0,
          column: primaryLabel?.span.column ?? 0,
          category: resolveDiagnosticCategory(plugin, rule),
        };
      });
  } finally {
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }
  }
};
