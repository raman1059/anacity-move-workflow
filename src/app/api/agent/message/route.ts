import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getMoveCoordinatorAgent, getRepositories } from '@/lib/container';
import { generateId } from '@/lib/id';
import { apiError, apiOk } from '@/types/api';

const bodySchema = z
  .object({
    residentId: z.string().min(1),
    communityId: z.string().min(1),
    requestId: z.string().min(1).optional(),
    unitId: z.string().min(1).optional(),
    conversationId: z.string().min(1).optional(),
    content: z.string().min(1),
  })
  .strict();

// A single chat turn. Persists both sides of the conversation (the
// orchestrator itself deliberately does not — see plan.md's Agent
// Orchestrator design decisions — that bookkeeping belongs to whatever
// is driving the conversation, which here is this route). Everything
// else — tool selection, decisioning, guardrails, the reply text — is
// entirely the orchestrator's; this route is a thin session wrapper
// around createMoveCoordinatorAgent().handleMessage(...).
export async function POST(request: NextRequest) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(apiError('Invalid request body'), { status: 400 });
  }
  const body = parsed.data;

  const repositories = getRepositories();
  const resident = repositories.residents.getById(body.residentId);
  if (!resident) {
    return NextResponse.json(apiError('Resident not found'), { status: 404 });
  }

  try {
    let conversationId = body.conversationId;
    if (!conversationId) {
      const now = new Date().toISOString();
      const conversation = repositories.conversations.create({
        id: generateId('conv'),
        requestId: body.requestId ?? null,
        actorId: body.residentId,
        actorRole: 'resident',
        messages: [],
        createdAt: now,
        updatedAt: now,
      });
      conversationId = conversation.id;
    }

    repositories.conversations.appendMessage(conversationId, {
      id: generateId('msg'),
      role: 'user',
      content: body.content,
      relatedActionIds: [],
      createdAt: new Date().toISOString(),
    });

    const result = await getMoveCoordinatorAgent().handleMessage({
      content: body.content,
      communityId: body.communityId,
      requestId: body.requestId,
      unitId: body.unitId,
      actorId: body.residentId,
      actorRole: 'resident',
      conversationId,
    });

    repositories.conversations.appendMessage(conversationId, {
      id: generateId('msg'),
      role: 'agent',
      content: result.reply,
      relatedActionIds: [],
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json(
      apiOk({
        reply: result.reply,
        decision: result.decision,
        trace: result.trace,
        requestId: result.trace.requestId,
        conversationId,
      })
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(apiError(message), { status: 500 });
  }
}
