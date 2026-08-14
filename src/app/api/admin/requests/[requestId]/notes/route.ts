import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getRepositories, getToolRegistry } from '@/lib/container';
import { generateId } from '@/lib/id';
import type { RequestNote } from '@/domain';
import type { AddAdminNoteInput } from '@/tools/implementations/add-admin-note.tool';
import type { ToolContext } from '@/tools';
import { apiError, apiOk } from '@/types/api';

const bodySchema = z.object({ adminId: z.string().min(1), text: z.string().min(1) }).strict();

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
    const note = await getToolRegistry().execute<AddAdminNoteInput, RequestNote>(
      'addAdminNote',
      { requestId, text: body.text },
      context
    );
    return NextResponse.json(apiOk(note));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(apiError(message), { status: 400 });
  }
}
