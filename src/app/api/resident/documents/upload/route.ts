import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getRepositories, getToolRegistry } from '@/lib/container';
import { apiError, apiOk } from '@/types/api';
import type { UploadDocumentInput } from '@/tools';
import type { MockUploadResult } from '@/lib/mock-document-upload';

const bodySchema = z
  .object({ requestId: z.string().min(1), typeKey: z.string().min(1), residentId: z.string().min(1) })
  .strict();

// The upload/storage/OCR step is mocked (see lib/mock-document-upload.ts
// — no real file, no real verification queue), but the action itself now
// goes through the same governed, audited, ownership-checked tool
// registry as every other resident-initiated mutation, via the
// uploadDocument tool.
export async function POST(request: NextRequest) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(apiError('Invalid request body'), { status: 400 });
  }

  try {
    const result = await getToolRegistry().execute<UploadDocumentInput, MockUploadResult>(
      'uploadDocument',
      { requestId: parsed.data.requestId, typeKey: parsed.data.typeKey },
      {
        repositories: getRepositories(),
        actorId: parsed.data.residentId,
        actorRole: 'resident',
        requestId: parsed.data.requestId,
        turnId: `upload-${Date.now()}`,
      }
    );
    return NextResponse.json(apiOk(result));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(apiError(message), { status: 400 });
  }
}
