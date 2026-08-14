// Tool contracts for the agent orchestrator (plan.md §4.2) — 17 tools:
// the original 13 plus getCommunity, addAdminNote, recordAdminDecision,
// and uploadDocument. The orchestrator (src/agents/move-coordinator.agent.ts)
// never touches a repository directly; every domain read/write it
// performs goes through createDefaultToolRegistry() below, which
// validates input/output against each tool's Zod schemas and enforces
// the ADMIN_ONLY side-effect gate structurally. recordAdminDecision is
// the one tool never called by the orchestrator itself — it's invoked
// directly by the admin dashboard's API routes (a human decision, not
// an agent one), through the same validated/permissioned registry.
export * from './types';
export * from './registry';
export * from './schemas';

export { getCommunityConfigTool } from './implementations/get-community-config.tool';
export type { GetCommunityConfigInput } from './implementations/get-community-config.tool';
export { getCommunityTool } from './implementations/get-community.tool';
export type { GetCommunityInput } from './implementations/get-community.tool';
export { getResidentTool } from './implementations/get-resident.tool';
export type { GetResidentInput } from './implementations/get-resident.tool';
export { getMoveRequestTool } from './implementations/get-move-request.tool';
export type { GetMoveRequestInput } from './implementations/get-move-request.tool';
export { getCommunityPolicyTool } from './implementations/get-community-policy.tool';
export type { GetCommunityPolicyInput } from './implementations/get-community-policy.tool';
export { getAvailableMoveSlotsTool } from './implementations/get-available-move-slots.tool';
export type { GetAvailableMoveSlotsInput } from './implementations/get-available-move-slots.tool';
export { validateMoveRequestTool } from './implementations/validate-move-request.tool';
export type { ValidateMoveRequestInput } from './implementations/validate-move-request.tool';
export { validateDocumentsTool } from './implementations/validate-documents.tool';
export type { ValidateDocumentsInput } from './implementations/validate-documents.tool';
export { calculateMoveOutChargesTool } from './implementations/calculate-move-out-charges.tool';
export type { CalculateMoveOutChargesInput } from './implementations/calculate-move-out-charges.tool';
export { createMoveRequestTool } from './implementations/create-move-request.tool';
export type { CreateMoveRequestInput } from './implementations/create-move-request.tool';
export { updateMoveRequestTool } from './implementations/update-move-request.tool';
export type { UpdateMoveRequestInput } from './implementations/update-move-request.tool';
export { uploadDocumentTool } from './implementations/upload-document.tool';
export type { UploadDocumentInput } from './implementations/upload-document.tool';
export { addRequestNoteTool } from './implementations/add-request-note.tool';
export type { AddRequestNoteInput } from './implementations/add-request-note.tool';
export { addAdminNoteTool } from './implementations/add-admin-note.tool';
export type { AddAdminNoteInput } from './implementations/add-admin-note.tool';
export { recommendActionTool } from './implementations/recommend-action.tool';
export type { RecommendActionInput } from './implementations/recommend-action.tool';
export { escalateToAdminTool } from './implementations/escalate-to-admin.tool';
export { recordAdminDecisionTool } from './implementations/record-admin-decision.tool';
export type { RecordAdminDecisionInput } from './implementations/record-admin-decision.tool';
export type { EscalateToAdminInput } from './implementations/escalate-to-admin.tool';

import { createToolRegistry, type ToolRegistry } from './registry';
import { getCommunityConfigTool } from './implementations/get-community-config.tool';
import { getCommunityTool } from './implementations/get-community.tool';
import { getResidentTool } from './implementations/get-resident.tool';
import { getMoveRequestTool } from './implementations/get-move-request.tool';
import { getCommunityPolicyTool } from './implementations/get-community-policy.tool';
import { getAvailableMoveSlotsTool } from './implementations/get-available-move-slots.tool';
import { validateMoveRequestTool } from './implementations/validate-move-request.tool';
import { validateDocumentsTool } from './implementations/validate-documents.tool';
import { calculateMoveOutChargesTool } from './implementations/calculate-move-out-charges.tool';
import { createMoveRequestTool } from './implementations/create-move-request.tool';
import { updateMoveRequestTool } from './implementations/update-move-request.tool';
import { uploadDocumentTool } from './implementations/upload-document.tool';
import { addRequestNoteTool } from './implementations/add-request-note.tool';
import { addAdminNoteTool } from './implementations/add-admin-note.tool';
import { recommendActionTool } from './implementations/recommend-action.tool';
import { escalateToAdminTool } from './implementations/escalate-to-admin.tool';
import { recordAdminDecisionTool } from './implementations/record-admin-decision.tool';

export function createDefaultToolRegistry(): ToolRegistry {
  const registry = createToolRegistry();
  registry.register(getCommunityConfigTool);
  registry.register(getCommunityTool);
  registry.register(getResidentTool);
  registry.register(getMoveRequestTool);
  registry.register(getCommunityPolicyTool);
  registry.register(getAvailableMoveSlotsTool);
  registry.register(validateMoveRequestTool);
  registry.register(validateDocumentsTool);
  registry.register(calculateMoveOutChargesTool);
  registry.register(createMoveRequestTool);
  registry.register(updateMoveRequestTool);
  registry.register(uploadDocumentTool);
  registry.register(addRequestNoteTool);
  registry.register(addAdminNoteTool);
  registry.register(recommendActionTool);
  registry.register(escalateToAdminTool);
  registry.register(recordAdminDecisionTool);
  return registry;
}
