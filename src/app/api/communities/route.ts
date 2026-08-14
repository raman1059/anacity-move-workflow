import { NextResponse } from 'next/server';
import { getCommunityService } from '@/lib/container';
import { apiOk } from '@/types/api';

// A minimal proof that the API-route layer wires through to services.
// Server Components (see app/page.tsx) call services directly rather than
// fetching this route internally — this endpoint exists for future
// client-side/interactive UI (Phase 3/4) to use.
export async function GET() {
  const communities = getCommunityService().listCommunities();
  return NextResponse.json(apiOk(communities));
}
