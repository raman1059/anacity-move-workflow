import type { ToolName } from '../domain';
import { ToolPermissionError, type ToolContext } from './types';

// Shared row-level ownership check for every resident-callable tool that
// operates on a single resident's own data. A resident actor may only act
// on records they themselves own; admin/system actors are unrestricted by
// this check (their own authorization, if any, is enforced separately).
// Centralizing this closes the class of bug where a new resident-callable
// tool is added without remembering to reproduce the check by hand.
export function assertResidentOwns(
  context: ToolContext,
  ownerId: string,
  toolName: ToolName,
  message: string
): void {
  if (context.actorRole === 'resident' && context.actorId !== ownerId) {
    throw new ToolPermissionError(toolName, message);
  }
}
