import { z } from 'zod';
import type { Resident } from '../../domain';
import { assertResidentOwns } from '../authorization';
import { idSchema, residentSchema } from '../schemas';
import type { ToolDefinition } from '../types';

const inputSchema = z.object({ residentId: idSchema }).strict();
export type GetResidentInput = z.infer<typeof inputSchema>;
const outputSchema = residentSchema.optional();

// READ_ONLY, GUIDE tier, but not unconditionally safe: this is the tool
// that demonstrates row-level scoping enforced in code rather than
// trusted to the prompt — see plan.md §4.4 ("never expose another
// resident's information"). A resident actor can only ever fetch their
// own record; an admin/system actor can fetch anyone.
export const getResidentTool: ToolDefinition<GetResidentInput, Resident | undefined> = {
  name: 'getResident',
  description:
    "Fetch a resident's profile. Residents may only fetch their own profile; admins and the system may fetch any resident.",
  inputSchema,
  outputSchema,
  authorization: 'self',
  allowedRoles: ['resident', 'admin', 'system'],
  sideEffect: 'READ_ONLY',
  tier: 'guide',
  async execute(input, context) {
    const resident = context.repositories.residents.getById(input.residentId);
    if (!resident) {
      return undefined;
    }
    assertResidentOwns(context, resident.id, 'getResident', 'Residents may only fetch their own profile');
    return resident;
  },
};
