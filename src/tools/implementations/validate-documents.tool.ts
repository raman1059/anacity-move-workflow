import { z } from 'zod';
import {
  validateMoveRequestDocuments,
  type ValidateDocumentsResult,
} from '../../lib/policy-engine';
import { assertResidentOwns } from '../authorization';
import { idSchema, validateDocumentsResultSchema } from '../schemas';
import type { ToolDefinition } from '../types';

const inputSchema = z.object({ requestId: idSchema }).strict();
export type ValidateDocumentsInput = z.infer<typeof inputSchema>;
const outputSchema = validateDocumentsResultSchema;

// READ_ONLY, DECIDE tier — pure computation over the checklist/document
// state already on file. No side effects.
export const validateDocumentsTool: ToolDefinition<
  ValidateDocumentsInput,
  ValidateDocumentsResult
> = {
  name: 'validateDocuments',
  description: 'Check whether all required documents for a move request are uploaded and verified.',
  inputSchema,
  outputSchema,
  authorization: 'self',
  allowedRoles: ['resident', 'admin', 'system'],
  sideEffect: 'READ_ONLY',
  tier: 'decide',
  async execute(input, context) {
    const request = context.repositories.moveRequests.getById(input.requestId);
    if (!request) {
      throw new Error(`MoveRequest ${input.requestId} not found`);
    }
    assertResidentOwns(
      context,
      request.residentId,
      'validateDocuments',
      'Residents may only validate documents on their own requests'
    );
    const resident = context.repositories.residents.getById(request.residentId);
    if (!resident) {
      throw new Error(`Resident ${request.residentId} not found`);
    }
    const config = context.repositories.communities.getConfiguration(request.communityId);
    if (!config) {
      throw new Error(`CommunityConfiguration for ${request.communityId} not found`);
    }
    const documents = context.repositories.documents.listByRequest(request.id);
    return validateMoveRequestDocuments(request, resident, config, documents);
  },
};
