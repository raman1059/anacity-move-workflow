import type { ActorRole, ToolName } from '../domain';
import {
  ToolPermissionError,
  ToolValidationError,
  type ToolContext,
  type ToolDefinition,
} from './types';

export interface ToolRegistry {
  register(tool: ToolDefinition): void;
  // Returns only the tools the given role is permitted to call — tool
  // exposure is context-dependent, not static. A resident actor should
  // never even see a tool it isn't allowed to use, rather than being
  // trusted to decline it. See plan.md §4.2.
  listAvailable(actorRole: ActorRole): ToolDefinition[];
  get(name: ToolName): ToolDefinition | undefined;
  execute<TInput, TOutput>(name: ToolName, input: TInput, context: ToolContext): Promise<TOutput>;
}

function formatZodIssues(issues: { path: PropertyKey[]; message: string }[]): string[] {
  return issues.map((issue) => `${issue.path.map(String).join('.') || '(root)'}: ${issue.message}`);
}

export function createToolRegistry(): ToolRegistry {
  const tools = new Map<ToolName, ToolDefinition>();

  return {
    register(tool) {
      tools.set(tool.name, tool);
    },

    listAvailable(actorRole) {
      return Array.from(tools.values()).filter((tool) => tool.allowedRoles.includes(actorRole));
    },

    get(name) {
      return tools.get(name);
    },

    async execute<TInput, TOutput>(name: ToolName, input: TInput, context: ToolContext) {
      const tool = tools.get(name);
      if (!tool) {
        throw new Error(`Unknown tool: ${name}`);
      }

      // Structural gate, independent of allowedRoles: an ADMIN_ONLY tool
      // can never be invoked from a resident context, even if a tool were
      // ever misconfigured with a permissive allowedRoles list. This is
      // the rule the user asked for enforced at the registry, not left to
      // per-tool configuration discipline.
      if (tool.sideEffect === 'ADMIN_ONLY' && context.actorRole !== 'admin') {
        throw new ToolPermissionError(
          name,
          `Tool "${name}" is ADMIN_ONLY and cannot be invoked from a "${context.actorRole}" context`
        );
      }

      if (!tool.allowedRoles.includes(context.actorRole)) {
        throw new ToolPermissionError(
          name,
          `Role "${context.actorRole}" is not permitted to call tool "${name}"`
        );
      }

      const parsedInput = tool.inputSchema.safeParse(input);
      if (!parsedInput.success) {
        throw new ToolValidationError(name, formatZodIssues(parsedInput.error.issues));
      }

      const result = await tool.execute(parsedInput.data, context);

      const parsedOutput = tool.outputSchema.safeParse(result);
      if (!parsedOutput.success) {
        // A tool producing output that violates its own declared schema
        // is an implementation bug, not a caller mistake — surfaced
        // distinctly from ToolValidationError (which is about input).
        throw new Error(
          `Tool "${name}" produced output violating its own schema: ${formatZodIssues(parsedOutput.error.issues).join('; ')}`
        );
      }

      return parsedOutput.data as TOutput;
    },
  };
}
