import { NextResponse, type NextRequest } from 'next/server';
import { getWorkspaceData } from '@/features/move-in/get-workspace-data';
import { apiError, apiOk } from '@/types/api';

// Full state for the resident Move-In workspace UI in one round trip —
// see get-workspace-data.ts, shared with the Server Component page so
// the two can never drift.
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
