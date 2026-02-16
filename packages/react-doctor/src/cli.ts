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
  .option("--project <name>", "select workspace project (comma-separated for multiple)")
  .action(async (directory: string, flags: CliFlags) => {
    try {
      const resolvedDirectory = path.resolve(directory);
      logger.log(`react-doctor v${VERSION}`);
      logger.break();

      const scanOptions: ScanOptions = {
        lint: flags.lint,
        deadCode: flags.deadCode,
      };

      const projectDirectories = await selectProjects(resolvedDirectory, flags.project);

      for (const projectDirectory of projectDirectories) {
        logger.dim(`Scanning ${projectDirectory}...`);
        logger.break();
        await scan(projectDirectory, scanOptions);
        logger.break();
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
