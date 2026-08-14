import { Card } from '@/components/ui/Card';
import type { CommunityConfiguration, CommunityPolicy } from '@/domain';

interface RequirementsCardProps {
  config: CommunityConfiguration;
  policies: CommunityPolicy[];
}

// Config-driven, not hardcoded — this card renders whatever the
// community's own CommunityConfiguration/CommunityPolicy says, so a
// differently-configured community (see plan.md §5's two seeded
// communities) shows genuinely different requirements with no code
// change.
export function RequirementsCard({ config, policies }: RequirementsCardProps) {
  const requiredDocs = config.documents.moveIn.filter((doc) => doc.required);
  const optionalDocs = config.documents.moveIn.filter((doc) => !doc.required);

  return (
    <Card>
      <h2 className="text-sm font-medium text-black/50 dark:text-white/50">
        Move-in requirements for this community
      </h2>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
        <dt className="text-black/50 dark:text-white/50">Max occupants</dt>
        <dd>{config.moveIn.maxOccupants}</dd>
        <dt className="text-black/50 dark:text-white/50">Society NOC</dt>
        <dd>{config.moveIn.requiresNOC ? 'Required' : 'Not required'}</dd>
        <dt className="text-black/50 dark:text-white/50">Book move slot by</dt>
        <dd>{config.moveIn.minAdvanceBookingDays}+ days ahead</dd>
      </dl>

      <div className="mt-4">
        <p className="text-xs font-medium text-black/50 dark:text-white/50">Documents needed</p>
        <ul className="mt-1.5 space-y-1 text-sm">
          {requiredDocs.map((doc) => (
            <li key={doc.key} className="flex items-start gap-1.5">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-black/40 dark:bg-white/40" />
              <span>
                {doc.label}
                <span className="block text-xs text-black/45 dark:text-white/45">
                  {doc.description}
                </span>
              </span>
            </li>
          ))}
          {optionalDocs.map((doc) => (
            <li key={doc.key} className="flex items-start gap-1.5 text-black/50 dark:text-white/50">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-black/25 dark:bg-white/25" />
              <span>{doc.label} (if applicable)</span>
            </li>
          ))}
        </ul>
      </div>

      {policies.length > 0 ? (
        <div className="mt-4 border-t border-black/10 pt-3 dark:border-white/10">
          {policies.map((policy) => (
            <p key={policy.id} className="text-xs text-black/50 dark:text-white/50">
              <span className="font-medium text-black/70 dark:text-white/70">{policy.title}:</span>{' '}
              {policy.body}
            </p>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
