import path from "node:path";
import { Command } from "commander";
import type { ScanOptions } from "./types.js";
import { handleError } from "./utils/handle-error.js";
import { highlighter } from "./utils/highlighter.js";
import { logger } from "./utils/logger.js";
import { scan } from "./scan.js";
import { selectProjects } from "./utils/select-projects.js";

const VERSION = process.env.VERSION ?? "0.0.0";

interface CliFlags {
  lint: boolean;
  deadCode: boolean;
  verbose: boolean;
  score: boolean;
  yes: boolean;
  project?: string;
}

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));

const program = new Command()
  .name("react-doctor")
  .description("Diagnose React codebase health")
  .version(VERSION, "-v, --version", "display the version number")
  .argument("[directory]", "project directory to scan", ".")
  .option("--no-lint", "skip linting")
  .option("--no-dead-code", "skip dead code detection")
  .option("--verbose", "show file details per rule")
  .option("--score", "output only the score")
  .option("-y, --yes", "skip prompts, scan all workspace projects")
  .option("--project <name>", "select workspace project (comma-separated for multiple)")
  .action(async (directory: string, flags: CliFlags) => {
    try {
      const resolvedDirectory = path.resolve(directory);
      const isScoreOnly = flags.score;

      if (!isScoreOnly) {
        logger.log(`react-doctor v${VERSION}`);
        logger.break();
      }

      const scanOptions: ScanOptions = {
        lint: flags.lint,
        deadCode: flags.deadCode,
        verbose: Boolean(flags.verbose),
        scoreOnly: isScoreOnly,
      };

      const shouldSkipPrompts =
        flags.yes ||
        Boolean(process.env.CI) ||
        Boolean(process.env.CLAUDECODE) ||
        Boolean(process.env.AMI) ||
        !process.stdin.isTTY;
      const projectDirectories = await selectProjects(
        resolvedDirectory,
        flags.project,
        shouldSkipPrompts,
      );

      for (const projectDirectory of projectDirectories) {
        if (!isScoreOnly) {
          logger.dim(`Scanning ${projectDirectory}...`);
          logger.break();
        }
        await scan(projectDirectory, scanOptions);
        if (!isScoreOnly) {
          logger.break();
        }
      }
    } catch (error) {
      handleError(error);
    }
  })
  .addHelpText(
    "after",
    `
${highlighter.dim("Learn more:")}
  ${highlighter.info("https://github.com/aidenybai/react-doctor")}
`,
  );

const main = async () => {
  await program.parseAsync();
};

main();
