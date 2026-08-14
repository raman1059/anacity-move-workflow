import type { ChecklistItem, RequestId } from '../domain';
import type { Repositories } from '../repositories';

// Mocked resolution for the handful of move-out checklist items that
// aren't document-backed (dues clearance, exit inspection — see
// create-move-request.tool.ts's buildInitialChecklist). Same spirit as
// mock-document-upload.ts: there's no real dues ledger or inspection
// system in this prototype (plan.md §2.13), so this simulates the
// outcome instantly rather than modeling a real verification step.
// Deliberately NOT an agent tool — a resident confirming "my dues are
// cleared" is an external fact the agent reacts to on its next turn, not
// an action the agent performs on the resident's behalf.
export function mockResolveChecklistItem(
  repositories: Repositories,
  requestId: RequestId,
  key: string
): ChecklistItem {
  const checklist = repositories.checklistItems.listByRequest(requestId);
  const matching = checklist.find((item) => item.key === key);
  if (!matching) {
    throw new Error(`No checklist item found for key "${key}" on request ${requestId}`);
  }

  return repositories.checklistItems.update(matching.id, {
    status: 'verified',
    updatedAt: new Date().toISOString(),
  });
}
