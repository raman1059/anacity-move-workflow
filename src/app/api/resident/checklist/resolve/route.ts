import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getRepositories } from '@/lib/container';
import { mockResolveChecklistItem } from '@/lib/mock-checklist-resolution';
import { apiError, apiOk } from '@/types/api';

const bodySchema = z.object({ requestId: z.string().min(1), key: z.string().min(1) }).strict();

// Mocked resolution — see lib/mock-checklist-resolution.ts. Not part of
// the agent's tool surface; the agent reacts to the resulting checklist
// state on its next turn rather than performing the confirmation itself.
export async function POST(request: NextRequest) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(apiError('Invalid request body'), { status: 400 });
  }

  try {
    const result = mockResolveChecklistItem(
      getRepositories(),
      parsed.data.requestId,
      parsed.data.key
    );
    return NextResponse.json(apiOk(result));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(apiError(message), { status: 400 });
  }
}
