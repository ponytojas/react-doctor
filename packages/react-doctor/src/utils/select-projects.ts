import path from "node:path";
import type { WorkspacePackage } from "../types.js";
import { listWorkspacePackages } from "./discover-project.js";
import { prompts } from "./prompts.js";

export const selectProjects = async (
  rootDirectory: string,
  projectFlag: string | undefined,
): Promise<string[]> => {
  const workspacePackages = listWorkspacePackages(rootDirectory);

  if (workspacePackages.length === 0) {
    return [rootDirectory];
  }

  if (projectFlag) {
    return resolveProjectFlag(projectFlag, workspacePackages);
  }

  return promptProjectSelection(workspacePackages, rootDirectory);
};

const resolveProjectFlag = (
  projectFlag: string,
  workspacePackages: WorkspacePackage[],
): string[] => {
  const requestedNames = projectFlag.split(",").map((name) => name.trim());
  const resolvedDirectories: string[] = [];

  for (const requestedName of requestedNames) {
    const matched = workspacePackages.find(
      (workspacePackage) =>
        workspacePackage.name === requestedName ||
        path.basename(workspacePackage.directory) === requestedName,
    );

    if (!matched) {
      const availableNames = workspacePackages
        .map((workspacePackage) => workspacePackage.name)
        .join(", ");
      throw new Error(`Project "${requestedName}" not found. Available: ${availableNames}`);
    }

    resolvedDirectories.push(matched.directory);
  }

  return resolvedDirectories;
};

const promptProjectSelection = async (
  workspacePackages: WorkspacePackage[],
  rootDirectory: string,
): Promise<string[]> => {
  const { selectedDirectories } = await prompts({
    type: "multiselect",
    name: "selectedDirectories",
    message: "Select projects to scan",
    choices: workspacePackages.map((workspacePackage) => ({
      title: workspacePackage.name,
      description: path.relative(rootDirectory, workspacePackage.directory),
      value: workspacePackage.directory,
    })),
    min: 1,
  });

  return selectedDirectories;
};
