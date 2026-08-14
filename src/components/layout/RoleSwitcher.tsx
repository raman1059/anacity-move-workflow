'use client';

import { useRouter } from 'next/navigation';
import type { AdminIdentity } from '@/features/admin/types';

export interface ResidentOption {
  id: string;
  communityId: string;
  communityName: string;
  name: string;
  workflow: 'move_in' | 'move_out';
}

interface RoleSwitcherProps {
  residents: ResidentOption[];
  identities: AdminIdentity[];
}

function residentHref(resident: ResidentOption): string {
  return resident.workflow === 'move_in'
    ? `/resident/${resident.communityId}/${resident.id}`
    : `/resident/move-out/${resident.communityId}/${resident.id}`;
}

function identityHref(identity: AdminIdentity): string {
  return `/admin/${identity.communityId}/${identity.roleKey}`;
}

// Not real auth — a plain navigation shortcut for demo purposes (see
// plan.md). Uncontrolled on purpose: each page load is a fresh render of
// this select with no selection, so it always reads as "jump to..."
// rather than "currently viewing as," which is the real identity shown
// in each workspace's own header instead.
export function RoleSwitcher({ residents, identities }: RoleSwitcherProps) {
  const router = useRouter();

  return (
    <select
      aria-label="Switch role (demo)"
      defaultValue=""
      onChange={(e) => {
        if (e.target.value) router.push(e.target.value);
      }}
      className="rounded-full border border-black/15 bg-transparent px-3 py-1.5 text-xs text-black/70 outline-none focus:border-blue-400 dark:border-white/15 dark:text-white/70"
    >
      <option value="" disabled>
        Switch role (demo)…
      </option>
      <optgroup label="Residents">
        {residents.map((resident) => (
          <option key={resident.id} value={residentHref(resident)}>
            {resident.name} — {resident.communityName}
          </option>
        ))}
      </optgroup>
      <optgroup label="Admins">
        {identities.map((identity) => (
          <option key={identity.adminId} value={identityHref(identity)}>
            {identity.roleLabel} — {identity.communityName}
          </option>
        ))}
      </optgroup>
    </select>
  );
}
