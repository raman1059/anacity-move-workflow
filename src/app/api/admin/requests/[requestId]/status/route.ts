import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getRepositories, getToolRegistry } from '@/lib/container';
import { generateId } from '@/lib/id';
import type { MoveRequest } from '@/domain';
import type { UpdateMoveRequestInput } from '@/tools/implementations/update-move-request.tool';
import type { ToolContext } from '@/tools';
import { apiError, apiOk } from '@/types/api';

const bodySchema = z
  .object({
    adminId: z.string().min(1),
    status: z.enum([
      'draft',
      'submitted',
      'under_review',
      'information_required',
      'approved',
      'rejected',
      'scheduled',
      'completed',
      'cancelled',
      'escalated',
    ]),
  })
  .strict();

// The lighter "other actions" affordance — legal admin transitions the
// state machine allows that aren't one of the four AdminReview-backed
// decisions (e.g. resuming escalated -> under_review, or the logistics
// steps on a scheduled move). No AdminReview row here — updateMoveRequest
// already enforces canTransition, same as everywhere else.
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
    const updated = await getToolRegistry().execute<UpdateMoveRequestInput, MoveRequest>(
      'updateMoveRequest',
      { requestId, patch: { status: body.status } },
      context
    );
    return NextResponse.json(apiOk(updated));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(apiError(message), { status: 400 });
  }
}
