import type { ActorRole, MoveRequest, Resident, ToolName } from '../domain';
import type { CommunityConfiguration } from '../domain';
import type { Repositories } from '../repositories';
import { getAllowedTransitions } from './state-machine';
import type { AgentContext, AgentMessageInput } from './types';

// A narrow, read-only slice of Repositories: only what has no governed
// tool, because it's pure context-assembly plumbing with no permission
// distinction beyond "belongs to the same request" (unit, checklist,
// documents, charge, notes, community name/city), plus the bookkeeping
// writes that are the orchestrator logging its own activity rather than
// a business mutation (conversations, agentActions). A real
// `Repositories` object structurally satisfies this with zero runtime
// wrapper — assembleAgentContext below only ever sees these methods,
// so it cannot accidentally call a mutation directly; every mutation the
// orchestrator performs goes through callTool -> ToolRegistry instead.
export interface AgentContextReader {
  communities: Pick<Repositories['communities'], 'getById'>;
  units: Pick<Repositories['units'], 'getById'>;
  checklistItems: Pick<Repositories['checklistItems'], 'listByRequest'>;
  documents: Pick<Repositories['documents'], 'listByRequest'>;
  charges: Pick<Repositories['charges'], 'getByRequest'>;
  requestNotes: Pick<Repositories['requestNotes'], 'listByRequest'>;
  conversations: Pick<Repositories['conversations'], 'getById' | 'create' | 'appendMessage'>;
}

// The orchestrator's own governed-call function — every read and every
// mutation goes through the ToolRegistry (permission-checked, audit-
// logged), never straight to a repository. Returns undefined (rather
// than throwing) on a caught ToolPermissionError; the caller inspects
// toolPermissionDenied separately when it needs to know why.
//
// actorOverride lets the orchestrator perform automatic, deterministic
// housekeeping transitions (e.g. submitted -> under_review) as
// actorRole 'system' regardless of which human is chatting — those
// transitions are never a human's own authority, they're the
// orchestrator's. See state-machine.ts's TransitionRule.allowedRoles.
export type CallTool = <TInput, TOutput>(
  tool: ToolName,
  input: TInput,
  actorOverride?: { actorId?: string; actorRole?: ActorRole }
) => Promise<TOutput | undefined>;

// Loop steps 1-3: Observe -> Identify workflow/state -> Check config.
// Builds the cumulative AgentContext fresh, every turn, from governed
// tool calls plus the narrow reader above. Never trusts prior-turn
// memory for any of this.
export async function assembleAgentContext(
  seed: AgentMessageInput,
  turnId: string,
  contextReader: AgentContextReader,
  callTool: CallTool
): Promise<AgentContext> {
  const context: AgentContext = {
    session: {
      communityId: seed.communityId,
      requestId: seed.requestId,
      actorId: seed.actorId,
      actorRole: seed.actorRole,
      turnId,
      conversationId: seed.conversationId,
    },
    community: contextReader.communities.getById(seed.communityId),
    communityConfig: await callTool<{ communityId: string }, CommunityConfiguration>(
      'getCommunityConfig',
      { communityId: seed.communityId }
    ),
    workflowState: { current: 'not_started', allowedTransitions: [] },
    checklist: [],
    documents: [],
    conversation: [],
    policies: [],
    notes: [],
  };

  if (seed.requestId) {
    const request = await callTool<{ requestId: string }, MoveRequest>('getMoveRequest', {
      requestId: seed.requestId,
    });

    if (request) {
      context.request = request;
      context.workflowState = {
        current: request.status,
        allowedTransitions: getAllowedTransitions(request.status, seed.actorRole),
        previousStatus: request.previousStatus,
      };
      context.unit = contextReader.units.getById(request.unitId);
      context.checklist = contextReader.checklistItems.listByRequest(request.id);
      context.documents = contextReader.documents.listByRequest(request.id);
      context.notes = contextReader.requestNotes.listByRequest(request.id);
      if (request.type === 'move_out') {
        context.charge = contextReader.charges.getByRequest(request.id);
      }
      context.resident = await callTool<{ residentId: string }, Resident>('getResident', {
        residentId: request.residentId,
      });
    }
  } else if (seed.actorRole === 'resident') {
    context.resident = await callTool<{ residentId: string }, Resident>('getResident', {
      residentId: seed.actorId,
    });
  }

  if (seed.conversationId) {
    const conversation = contextReader.conversations.getById(seed.conversationId);
    if (conversation) {
      // Windowed — most-recent-N only, not the full history.
      context.conversation = conversation.messages.slice(-10);
    }
  }

  return context;
}
