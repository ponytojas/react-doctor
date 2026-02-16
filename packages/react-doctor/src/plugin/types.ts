export interface ReportDescriptor {
  node: EsTreeNode;
  message: string;
}

export interface RuleContext {
  report: (descriptor: ReportDescriptor) => void;
  getFilename?: () => string;
}

export interface RuleVisitors {
  [selector: string]: ((node: EsTreeNode) => void) | (() => void);
}

export interface Rule {
  create: (context: RuleContext) => RuleVisitors;
}

export interface RulePlugin {
  meta: { name: string };
  rules: Record<string, Rule>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EsTreeNode = Record<string, any> & { type: string };
