import { NextResponse, type NextRequest } from 'next/server';
import { getAdminRequestDetail } from '@/features/admin/get-admin-request-detail';
import { apiError, apiOk } from '@/types/api';

// Full Decision Context for one request in one round trip — see
// get-admin-request-detail.ts, shared with the Server Component page so
// the two can never drift. Used for the client-side refetch after every
// admin action.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const { requestId } = await params;
  const roleKey = request.nextUrl.searchParams.get('roleKey') ?? undefined;

  const result = getAdminRequestDetail(requestId, roleKey);
  if (!result.ok) {
    return NextResponse.json(apiError(result.error), { status: result.status });
  }

  return NextResponse.json(apiOk(result.data));
}
