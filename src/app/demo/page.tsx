import Link from 'next/link';
import { Card } from '@/components/ui/Card';

interface DemoScenario {
  number: number;
  title: string;
  description: string;
  steps: string[];
  link?: { href: string; label: string };
  note?: string;
}

const SCENARIOS: DemoScenario[] = [
  {
    number: 1,
    title: 'Normal move-in',
    description: 'Resident provides everything. Agent validates. Request is submitted.',
    steps: [
      'Open Noah Becker (Willow Creek) — a fresh resident with no request yet.',
      'Say: "I\'d like to move in with 1 occupant on 2026-10-01."',
      'Upload the one required document (Government ID Proof) when asked.',
      'Say: "I\'ve uploaded my Government ID Proof."',
      'The request reaches "Submitted" — everything validated, nothing missing.',
    ],
    link: {
      href: '/resident/community-willow-creek/resident-noah-becker',
      label: 'Open Noah Becker — Willow Creek',
    },
  },
  {
    number: 2,
    title: 'Incomplete move-in',
    description: 'A required document is missing. The agent identifies it and asks the resident to provide it.',
    steps: [
      'Open Priya Menon (Greenfield Heights) — already mid move-in.',
      'Say: "just checking in"',
      'The agent names the exact missing document: the Society NOC.',
    ],
    link: {
      href: '/resident/community-greenfield-heights/resident-priya-menon',
      label: 'Open Priya Menon — Greenfield Heights',
    },
  },
  {
    number: 3,
    title: 'Move-in with ambiguous information',
    description: 'The resident provides conflicting information. The agent does not guess — it asks for clarification.',
    steps: [
      'Open Rohan Gupta (Greenfield Heights) — occupant count 3 already on file.',
      'Say: "5"',
      'The agent notices the mismatch (5 vs. 3 on file) and asks which is correct, instead of overwriting or averaging.',
    ],
    link: {
      href: '/resident/community-greenfield-heights/resident-rohan-gupta',
      label: 'Open Rohan Gupta — Greenfield Heights',
    },
  },
  {
    number: 4,
    title: 'Normal move-out',
    description: 'Notice period is satisfied. Checklist is complete. Request proceeds.',
    steps: [
      'Open Sanjay Kulkarni (Riverside Villas) — his prior move-out was cancelled, so he can start fresh.',
      'Pick a move-out date well past RV\'s 14-day notice requirement (e.g. 3+ weeks out).',
      'Upload the one required document (Dues Clearance) when asked.',
      'The request advances cleanly to "Under review" with a recommendation to approve — no violations, no charges.',
    ],
    link: {
      href: '/resident/move-out/community-riverside-villas/resident-sanjay-kulkarni',
      label: 'Open Sanjay Kulkarni — Riverside Villas',
    },
  },
  {
    number: 5,
    title: 'Move-out with potential charges',
    description: 'The agent calculates deterministic charges through a real tool, explains them clearly, and never approves a waiver on its own.',
    steps: [
      'Open Vikram Shah (Greenfield Heights) — an in-progress, short-notice move-out.',
      'Say: "What charges apply to my move-out?"',
      'The agent returns real, calculated figures (short-notice penalty + fees) with a clear "pending admin confirmation" caveat — never a final answer.',
    ],
    link: {
      href: '/resident/move-out/community-greenfield-heights/resident-vikram-shah',
      label: 'Open Vikram Shah — Greenfield Heights',
    },
  },
  {
    number: 6,
    title: 'Move-out dispute',
    description: 'The resident disputes a charge. The agent escalates to an administrator instead of ruling on it.',
    steps: [
      'Continuing from Scenario 5 (or fresh), say: "Can you waive this charge?"',
      'The agent explains plainly that it cannot waive or adjust charges itself, and escalates the request to a community admin.',
    ],
    link: {
      href: '/resident/move-out/community-greenfield-heights/resident-vikram-shah',
      label: 'Open Vikram Shah — Greenfield Heights',
    },
  },
  {
    number: 7,
    title: 'Community-specific policy',
    description: 'The identical question behaves differently depending purely on which community\'s configuration answers it — no code branches on community identity.',
    steps: [
      'Ask "What\'s the notice period for moving out?" as Priya Menon (Greenfield Heights) — 30 days.',
      'Ask the identical question as Jamie Flores (Willow Creek) — 3 days.',
      'Same orchestrator code, same question, two genuinely different, config-driven answers.',
    ],
    link: {
      href: '/resident/community-greenfield-heights/resident-priya-menon',
      label: 'Open Priya Menon — Greenfield Heights',
    },
  },
  {
    number: 8,
    title: 'Admin review',
    description: 'The agent recommends approval. The administrator makes the final decision — agreement or override, either way the record shows whose call it was.',
    steps: [
      'Sign in as Treasurer (Greenfield Heights) on the admin side.',
      'Open Vikram Shah\'s move-out request — already has a real, unreviewed agent recommendation.',
      'Review the "Agent recommendation vs. administrator decision" panel, then Approve, Reject, or Request more info.',
      'The decision is recorded distinctly from the recommendation, including whether it agreed or overrode it.',
    ],
    link: { href: '/admin', label: 'Open the admin identity picker' },
  },
  {
    number: 9,
    title: 'Unauthorized action',
    description: 'A resident attempts an admin-only operation. The agent — and the tool layer underneath it — denies it structurally, not just by hiding a button.',
    steps: [
      'There is no button in the resident UI for this on purpose — the denial is enforced at the tool registry, not the interface.',
      'Proven automatically: a resident actor attempting recordAdminDecision or addAdminNote is rejected outright, and a resident can never read or act on another resident\'s request.',
    ],
    note: 'Run: npm test -- scenarios  (see "Scenario 9" in src/tests/unit/scenarios.test.ts)',
  },
  {
    number: 10,
    title: 'Agent / tool failure',
    description: 'A tool fails mid-turn. The agent recovers gracefully or escalates — it never crashes and never invents an answer to cover the gap.',
    steps: [
      'Not something a live UI can safely trigger on demand — this is deliberately proven with a controlled, simulated tool failure instead.',
      'Covers two cases: a failed validation tool degrades to a clear escalation (no stack trace ever reaches the resident), and a failed policy lookup is never mistaken for "no policy exists."',
    ],
    note: 'Run: npm test -- scenarios  (see "Scenario 10" in src/tests/unit/scenarios.test.ts)',
  },
];

// A cheat-sheet for live demos — see plan.md's Demo Scenarios section.
// Every scenario here maps to a real, already-seeded resident/request or
// a real automated test; nothing on this page requires setup beyond
// `npm run dev`.
export default function DemoPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-12">
      <header>
        <p className="text-sm font-medium text-black/50 dark:text-white/50">ANACITY</p>
        <h1 className="mt-1 text-2xl font-semibold">Demo scenarios</h1>
        <p className="mt-2 max-w-2xl text-sm text-black/60 dark:text-white/60">
          10 realistic scenarios exercising the agent end to end, each backed by a real seeded
          resident or an automated test — nothing here needs to be set up beforehand.
        </p>
      </header>

      <div className="space-y-5">
        {SCENARIOS.map((scenario) => (
          <Card key={scenario.number}>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black/80 text-xs font-semibold text-white dark:bg-white/80 dark:text-black">
                {scenario.number}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-medium">{scenario.title}</h2>
                <p className="mt-0.5 text-sm text-black/60 dark:text-white/60">
                  {scenario.description}
                </p>

                <ol className="mt-3 space-y-1 text-sm text-black/70 dark:text-white/70">
                  {scenario.steps.map((step, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-black/35 dark:text-white/35">{i + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>

                <div className="mt-3">
                  {scenario.link ? (
                    <Link
                      href={scenario.link.href}
                      className="inline-block rounded-full bg-blue-600 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700"
                    >
                      {scenario.link.label} &rarr;
                    </Link>
                  ) : null}
                  {scenario.note ? (
                    <code className="block rounded-md bg-black/5 px-3 py-1.5 text-xs text-black/60 dark:bg-white/10 dark:text-white/60">
                      {scenario.note}
                    </code>
                  ) : null}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </main>
  );
}
