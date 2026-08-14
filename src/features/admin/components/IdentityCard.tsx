import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import type { AdminIdentity } from '../types';

export function IdentityCard({ identity }: { identity: AdminIdentity }) {
  const permissions = [
    identity.canApproveMoveIn ? 'Move-in' : null,
    identity.canApproveMoveOut ? 'Move-out' : null,
    identity.canApproveFinancialException ? 'Financial exceptions' : null,
  ].filter(Boolean);

  return (
    <Link href={`/admin/${identity.communityId}/${identity.roleKey}`}>
      <Card className="h-full transition hover:border-black/30 hover:shadow-md dark:hover:border-white/30">
        <p className="font-medium">{identity.roleLabel}</p>
        <p className="text-sm text-black/50 dark:text-white/50">{identity.communityName}</p>
        <p className="mt-2 text-xs text-black/40 dark:text-white/40">
          {permissions.length > 0 ? `Can approve: ${permissions.join(', ')}` : 'No approval authority'}
        </p>
      </Card>
    </Link>
  );
}
