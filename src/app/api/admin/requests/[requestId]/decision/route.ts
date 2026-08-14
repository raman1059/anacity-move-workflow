import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getRepositories, getToolRegistry } from '@/lib/container';
import { generateId } from '@/lib/id';
import type { AdminReview } from '@/domain';
import type { RecordAdminDecisionInput } from '@/tools/implementations/record-admin-decision.tool';
import type { ToolContext } from '@/tools';
import { apiError, apiOk } from '@/types/api';

const bodySchema = z
  .object({
    adminId: z.string().min(1),
    decision: z.enum(['approved', 'rejected', 'requested_info', 'escalated_further']),
    reason: z.string().min(1).optional(),
    // Required — matches recordAdminDecisionTool's own requirement (see
    // plan.md's Security & Agent-Safety Review, gap 5). The real UI
    // always sends the picked identity's own roleKey, so this is not a
    // behavior change for normal usage — it just fails fast, with a
    // clear 400, on a request that omits it instead of silently
    // reaching the tool and having its role-based checks skipped.
    roleKey: z.string().min(1),
  })
  .strict();

// A direct human decision — bypasses the LLM orchestrator entirely (an
// admin clicking "Approve" is not an agent turn) but still goes through
// the same validated, permissioned tool registry every agent tool call
// does. See plan.md's Administrator Workflow design decisions.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const { requestId } = await params;
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(apiError('Invalid request body'), { status: 400 });
  }
  const body = parsed.data;

  const context: ToolContext = {
    repositories: getRepositories(),
    actorId: body.adminId,
    actorRole: 'admin',
    requestId,
    turnId: generateId('admin-turn'),
  };

  try {
    const review = await getToolRegistry().execute<RecordAdminDecisionInput, AdminReview>(
      'recordAdminDecision',
      { requestId, decision: body.decision, reason: body.reason, roleKey: body.roleKey },
      context
    );
    return NextResponse.json(apiOk(review));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(apiError(message), { status: 400 });
  }
}
