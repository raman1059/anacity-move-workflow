import { NextResponse, type NextRequest } from 'next/server';
import { getWorkspaceData } from '@/features/move-out/get-workspace-data';
import { apiError, apiOk } from '@/types/api';

// Full state for the resident Move-Out workspace UI in one round trip —
// see get-workspace-data.ts, shared with the Server Component page so
// the two can never drift. Mirrors /api/resident/[residentId]/workspace
// (move-in).
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ residentId: string }> }
) {
  const { residentId } = await params;
  const result = getWorkspaceData(residentId);

  if (!result.ok) {
    return NextResponse.json(apiError(result.error), { status: result.status });
  }

  return NextResponse.json(apiOk(result.data));
}
