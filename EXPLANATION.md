# EXPLANATION

Engineering notes for the ANACITY Move-In / Move-Out Agentic Workflow — an SDE-3 interview assessment submission. This document explains *why* the system is built the way it is, not what each file contains. For "what's in the codebase," see `plan.md` (the running design log, written phase by phase as the system was built) and `SECURITY.md` (the dedicated security/agent-safety report). This file is the synthesis of both, written last, for a reader who wasn't in the room for any of it.

---

## 1. Executive Summary

**The problem:** residential communities (ANACITY manages many, under the ANAROCK umbrella) each run move-in and move-out as a manual, paperwork-heavy process — a resident emails or calls the office, an admin manually checks documents against whatever that community's rules happen to be, calculates deposit deductions by hand, and the resident waits without visibility into what's missing or why. This gets slower and more inconsistent as the number of communities grows, because every community's rules (notice periods, required documents, charges, approval authority) are different, and today that knowledge lives in an admin's head, not in a system.

**What was built:** a chat-first resident experience backed by a governed, tool-mediated agent that validates requests against real community configuration, explains what's missing and why, calculates deposit charges deterministically, and knows exactly where its own authority ends — every high-impact decision (approve, reject, waive a charge) is escalated to a human, never taken autonomously. An administrator dashboard sits alongside it, showing the agent's recommendation and the admin's actual decision as two distinct, separately-recorded things. The whole system is driven entirely by per-community configuration data — three communities with meaningfully different rules run today on the identical agent/tool/orchestrator code, with zero branching on which community it is anywhere in that code (verified by grep, not assumed — see `plan.md`'s Scalability Architecture section).

**What it demonstrably is not:** a chatbot with tools bolted on. The distinction that matters throughout this document: an LLM (today, a deterministic mock standing in for one — see §12) is used for exactly one job, classifying what a resident means. It never selects a tool, never decides an outcome, and never writes the words in a reply. Tool selection, guardrail enforcement, state transitions, and response text are all deterministic orchestrator code. That's what makes "the agent cannot blindly execute arbitrary actions" a structural property of this codebase, not a claim about prompt engineering — see `SECURITY.md` for the review that verified it.

---

## 2. Problem Interpretation

### The resident's problem

A resident starting a move-in or move-out doesn't know, up front: which documents this specific community needs (it varies — see §10), whether they've given enough notice, what happens if they haven't, or what a "yes" or "no" from the office will actually depend on. Today that's a black box until someone at the office looks at it. The resident-facing goal here is to collapse that black box into a conversation that tells them, in real time, exactly what's missing and why, using the real rules for their specific community — never a generic answer.

### The administrator's problem

An admin reviewing a request today has to reconstruct context from scratch: what was actually submitted, whether it's complete, what the applicable policy says, and whether anything about it is unusual enough to need judgment (a name mismatch, a short-notice move-out, a dispute). The administrator-facing goal is a **Decision Context** panel that already has all of that assembled — what's requested, what the policy says, what's missing, what was validated, and a clearly-labeled agent recommendation the admin can agree with or override, with the override reason preserved either way.

### Move-in vs. move-out — genuinely different problems, not the same flow twice

They share a state machine (submit → review → approve/reject) but almost nothing else about what has to be checked:

| | Move-in | Move-out |
|---|---|---|
| Core question | Is this person allowed to move in, and do they have what's required? | Has enough notice been given, and what does the community owe back? |
| Documents | Identity, ownership/lease proof, sometimes an NOC | Forwarding address, dues clearance, key return |
| The hard case | Ambiguous/conflicting information (an occupant count that doesn't match what's on file) | Financial: charges are a *calculation*, not a lookup, and disputes over them are the primary escalation path |
| Terminates in | A yes/no decision | A yes/no decision *plus a number* (a net refund) that has to be defensible |

Treating these as the same flow with a type flag would have hidden this: move-out is the one with real financial exposure, and that's exactly where the guardrails do the most work (§9, §14).

### Why agentic assistance, not just a form

A form can validate that a field is present. It can't explain *why* a document is required for this specific community, notice that two things a resident said conflict with each other and ask which is right instead of picking one, calculate what a short-notice move-out actually costs against config that varies per community, or know on its own that a charge dispute is exactly the kind of thing it must never resolve itself. Those four things — grounded explanation, refusing to guess, deterministic calculation, and self-aware escalation — are the actual argument for an agent here, not "chat is a nicer UI than a form." Every one of them is demonstrated as a distinct, tested scenario (see `src/tests/unit/scenarios.test.ts` and `/demo`).

---

## 3. User Experience

All four journeys are chat-first: the agent drives the conversation, a couple of quick-reply buttons exist only as shortcuts for what a resident could type anyway (never a hidden second code path — see §5's "one pipeline" note).

### Move-In resident journey

1. Pick a community, then pick yourself from a resident directory (mocked auth — see §15) — routes to `/resident/[communityId]/[residentId]`.
2. No request yet → a **Start card** offers to begin; typing "I'd like to move in" works identically.
3. The agent creates a draft request, immediately validates it against the real community config, and tells the resident exactly what's missing — a specific document by name, not "your application is incomplete."
4. The resident uploads documents (mocked — see §12) or answers questions in chat (e.g. occupant count). Each answer triggers immediate re-validation.
5. If the resident later gives a *conflicting* answer (a different occupant count than what's on file), the agent explicitly says so and asks which is correct — it never silently overwrites or picks one (§9, "no hallucinated policy" extends to "no hallucinated facts").
6. Once everything validates, the agent auto-advances the request through `submitted → under_review` (or stops at `submitted` for a community configured not to auto-advance — see §10) and records a recommendation for an admin.
7. The resident can ask policy questions at any point ("what documents do I need?") and gets an answer grounded in that community's actual policy text, or an honest "no policy on file" — never an invented answer.
8. A **Status card** with a 5-step progress indicator and a **Checklist card** with a progress bar make "where am I" legible at a glance throughout.

### Move-Out resident journey

1. Same identity-picking pattern, at `/resident/move-out/[communityId]/[residentId]`.
2. Starting a move-out always requires an explicit intended date first — the agent never assumes "today" for something that drives a notice-period and financial calculation (a deliberate hardening — see `plan.md`'s Demo Scenarios §Scenario 10).
3. The agent explains the notice-period policy immediately, in the same turn the request is created — not something the resident has to think to ask about.
4. Documents (dues clearance, key return, forwarding address) work the same as move-in.
5. If notice is short, the agent calculates the actual charge — a real number from `calculateMoveOutCharges`, never an estimate typed by a human — and explains it clearly, always framed as pending admin confirmation.
6. If the resident disputes a charge ("can you waive this?"), the agent explains plainly that it cannot grant that itself and escalates to an admin — every time, regardless of phrasing (tested explicitly, see §13).
7. Everything else (status card, checklist, notes timeline) mirrors move-in.

### Move-In / Move-Out admin journey (the two converge here — one dashboard)

1. Pick an admin identity from `/admin` (a role + community pair, e.g. "Treasurer — Greenfield Heights") — the **role switcher** in the header lets an interviewer jump between any of the 17 seeded personas instantly for a live demo.
2. The dashboard lists every request across **every community** (deliberately cross-community — see §10), filterable by community, type, status, date, and a computed priority.
3. Opening a request shows the **Decision Context** panel: what's requested, what the policy says (the clause the agent actually cited, or an honest "none on file"), what was provided, what's missing, what the agent validated, and why human review is required for this specific case.
4. Directly above it, a **side-by-side card** shows the agent's recommendation and the admin's decision as two visually distinct things — never merged into one verdict (§6's central design point).
5. The **Action panel** offers exactly the decisions the state machine currently allows for this request (approve / reject / request more info / escalate further), computed from `getAllowedTransitions`, never hand-coded — plus a secondary "other actions" row for legal transitions outside the four-decision family (e.g. resuming an escalated request).
6. If the case involves deductions over the community's financial-exception threshold, Approve is visibly disabled unless the acting role has that specific authority (a Facility Manager can't approve what only a Treasurer can, in communities that split that authority — see §10's table).
7. Every decision — agreement or override — is recorded with the admin's identity, timestamp, and (when it overrides the recommendation, or is a rejection) a required reason.

---

## 4. Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  UI  (Next.js App Router, React Server + Client Components)      │
│  Resident workspace  ·  Admin dashboard  ·  /demo cheat-sheet     │
└───────────────────────────────┬────────────────────────────────-─┘
                                 │  fetch (JSON over HTTP)
┌───────────────────────────────▼────────────────────────────────-─┐
│  API / Application Layer  (Next.js Route Handlers)                │
│  /api/agent/message · /api/admin/requests/* · /api/resident/*     │
│  Zod-validates every request body before anything downstream runs │
└───────────────────────────────┬────────────────────────────────-─┘
                                 │  handleMessage(input)   [resident]
                                 │  toolRegistry.execute() [admin — see note below]
┌───────────────────────────────▼────────────────────────────────-─┐
│  Agent Orchestrator   (move-coordinator.agent.ts)                 │
│  observe → classify intent → check config → gather missing info   │
│  → select tool → execute → validate → decide (guardrails run      │
│  here) → update state → respond → trace                           │
└──────────────┬──────────────────────────────┬─────────────────-──┘
               │                              │
┌──────────────▼───────────────┐   ┌──────────▼─────────────────-──┐
│  Context Builder               │   │  LLMAgentProvider  (the ONLY  │
│  assembleAgentContext() —      │   │  seam to a model)              │
│  resident, unit, request,      │   │  intent classification only —  │
│  checklist, documents, policy  │   │  MockAgentProvider today,      │
│  clauses actually retrieved    │   │  a real Claude-backed provider │
│  this turn, windowed history   │   │  in production — see §17       │
└──────────────┬──────────────-──┘   └────────────────────────────-──┘
               │
┌──────────────▼────────────────────────────────────────────────-───┐
│  Tool Registry   (17 tools, one contract each)                     │
│  Zod .strict() input/output · role-gated · ADMIN_ONLY structurally │
│  enforced at the registry, independent of any tool's own config    │
└──────────────┬──────────────────────────────────────────────────-─┘
               │
┌──────────────▼──────────────────────────────────────────────────-─┐
│  Domain Services                                                    │
│  CommunityService · ResidentService · MoveRequestService            │
│  lib/policy-engine.ts — pure, side-effect-free validation and       │
│  charge-calculation functions the tools wrap                        │
└──────────────┬──────────────────────────────────────────────────-──┘
               │
┌──────────────▼──────────────────────────────────────────────────-──┐
│  Repository Layer   (interfaces only — src/repositories/*)          │
│  CommunityRepository · ResidentRepository · MoveRequestRepository   │
│  · PolicyRepository (no write method exists — see §9) · 9 more      │
└──────────────┬──────────────────────────────────────────────────-───┘
               │
┌──────────────▼──────────────────────────────────────────────────-───┐
│  Mock Data   (in-memory, src/mocks/*, seeded from src/config/*)      │
│  3 communities · 13 residents · 11 move requests · policy clauses    │
└───────────────────────────────────────────────────────────────────-─┘
```

**Why the LLM sits where it does, not where you'd expect.** In most agent architectures the model sits *above* the tool layer and decides which tool to call. Here it sits *beside* the orchestrator, feeding it one classified intent per turn — the orchestrator (deterministic code) does 100% of the tool selection, decisioning, and response generation. This is the single design decision the rest of the safety story depends on: swapping `MockAgentProvider` for a real, Claude-backed provider changes *only* how intent gets classified. It cannot change what the system is willing to do, because it was never the thing deciding that.

**A note on the admin path** (visible in the diagram above): admin decisions bypass the orchestrator entirely and call `toolRegistry.execute()` directly from the API route. This is deliberate, not an inconsistency — an admin clicking "Approve" is a direct human action, not an agent turn, and modeling it as one would blur exactly the line §6 exists to keep sharp. It still goes through the identical validated, permissioned, audited tool registry every agent action does.

---

## 5. Agent Design

**Responsibilities.** Guide a resident through move-in/move-out, identify what's missing, ground every policy claim in real community data, calculate charges deterministically, recommend an outcome when confident, and escalate the moment it isn't — or the moment something is outside its authority regardless of confidence (a financial decision, a policy exception, an admin-only action).

**Context** (`AgentContext`, rebuilt fresh every turn, never trusted from memory across turns): the resident, their unit, the current request and its full workflow state, the checklist, uploaded documents, only the policy clauses actually retrieved *this* turn (never "everything the community has ever said"), and a windowed slice of recent conversation (last 10 messages) — enough for continuity, not enough to accumulate stale context indefinitely.

**Tools** — see §7. The rule that matters: every state change and every governed read goes through the tool registry. The orchestrator's own code has no direct repository access for anything with a permission distinction.

**State** — two different things, kept deliberately separate:
- `AgentState` — where the orchestrator is *within one turn's execution* (observing → classifying → checking config → gathering context → selecting a tool → executing → validating → deciding → updating → responding), an internal execution trace.
- `MoveRequestStatus` — where the *request itself* is in its lifecycle (`draft` → ... → `approved`), a persisted, durable state governed by §8's state machine.

**Inference.** `LLMAgentProvider.classifyIntent(message, context)` returns exactly one of a fixed set of intents (start move-in, provide info, ask a question, dispute a charge, cancel, etc.) plus a handful of narrowly-typed extracted fields (an occupant count, a date, a policy topic) — never a tool name, never free text trusted as fact. Every extracted field is re-validated independently before it's trusted for anything consequential (§9, §14 — this is also the concrete answer to "what if the classifier is wrong or compromised," proven in `security.test.ts` with an adversarial provider).

**Decision process.** Once intent is classified, deterministic orchestrator code selects which tool(s) the situation calls for, executes them through the registry, and runs the result through an 8-guardrail pipeline (§9) that can only ever *cap or downgrade* the proposed autonomy tier — never raise it. The tier that survives the guardrails determines what actually happens this turn.

**Autonomy** — see §6, the core of this section.

**Escalation.** Not a fallback for "the agent doesn't know what to do" — a first-class outcome the guardrail pipeline routes to deliberately whenever the situation crosses a real boundary: missing data it can't fill in, an ambiguous or conflicting policy, a financial decision, a request for an exception, or a resident-initiated dispute. Escalating always means calling the real `escalateToAdmin` tool (an auditable state transition + note), never just a reply that sounds unresolved.

---

## 6. Autonomy Model

| Tier | Agent capability | Human approval | Reason |
|---|---|---|---|
| **Guide** | Answer questions, explain policy, state what's missing or ask for clarification. No state change. | Not required | Pure information — nothing to approve because nothing changed. |
| **Recommend** | Propose an outcome (approve / reject / approve-with-charges) and record it as a distinct, structured `AgentRecommendation`. | **Always required** | The recommendation is advisory by construction — `recommendAction` never mutates request status itself. An admin must act on it via a separate, explicit tool call. |
| **Decide** | Run deterministic, side-effect-free logic — validate a request, calculate a charge. | Not required for the *calculation itself* | These are pure functions of config (§9's "policy grounding"); the number is only ever a projection, never final until an admin confirms it downstream. |
| **Act** | Execute a state transition the state machine already permits for the current actor (submit a draft, advance to review, resume from escalation). | Required only where the transition itself is admin-gated | `act` describes *mechanical* transitions already legal for who's asking — it is not a license to approve/reject; those transitions are hardcoded admin-only in the state machine regardless of tier (§8). |
| **Escalate** | Flag the case for a human and stop taking further autonomous action on it. | **Always required** (that's the point) | The safe default whenever confidence is low, data is missing beyond what guide-tier can resolve, a policy is ambiguous, an action is unauthorized, or the case touches money or an exception. |

The one sentence this table exists to prove: **`recommend` is never `decide`, and neither is ever `act` on an approval.** The agent can compute a number and propose an outcome; it can never make the outcome real. That boundary is enforced structurally (the `financial_decision` and `unauthorized_action` guardrails, §9) — not by the agent choosing to be polite about it.

---

## 7. Agent Tools

17 tools, each with a Zod-validated input/output contract, an explicit `authorization` mode, an `allowedRoles` list, a side-effect classification, and an autonomy tier. Grouped by what they do:

**Read-only context** — `getResident`, `getCommunity`, `getCommunityConfig`, `getMoveRequest` (row-scoped: a resident can only fetch their own), `getCommunityPolicy` (topic-scoped; returns `[]`, never a guess, when nothing is defined for that topic), `getAvailableMoveSlots`.

**Pure computation, no side effects** — `validateMoveRequest` and `validateDocuments` (wrap `lib/policy-engine.ts`; determine what's missing vs. what violates policy — two different things, handled differently by the guardrails), `calculateMoveOutCharges` (deterministic, config-only; never invents a dollar figure for something config doesn't define, e.g. outstanding dues with no ledger).

**Resident-initiated writes** — `createMoveRequest` (seeds the checklist from config, rejects a duplicate active request for the same resident/unit/type), `updateMoveRequest` (the one place "invalid transition" and "unauthorized action" get real enforcement — every status change is checked against the state machine, not just documented), `uploadDocument` (attaches a simulated document to a request's checklist — the storage/OCR step is mocked, but the action itself is a governed, audited, ownership-checked tool call like any other, not a bare API route reaching into the repository layer), `addRequestNote`.

All row-scoped resident-callable tools (9 of the 17) share one ownership check — `assertResidentOwns` (`tools/authorization.ts`) — rather than each reimplementing it; a resident actor may only act on records they themselves own, admin/system may act on any. Centralizing this closed a real gap found in a later review: see `SECURITY.md`'s second-pass section for the `escalateToAdmin` tool that was missing this check before the helper existed.

**Agent-only writes** — `recommendAction` (`system_only` — a human never calls this directly; it only ever *records* advice, never finalizes), `escalateToAdmin` (idempotent — escalating an already-escalated request adds a note rather than erroring or double-transitioning).

**Admin-only writes** (`ADMIN_ONLY`, structurally blocked from any non-admin context at the registry level, independent of the tool's own configuration) — `addAdminNote`, `recordAdminDecision` (the single atomic action behind approve/reject/request-info/escalate-further: transitions status, snapshots the recommendation it agreed with or overrode, creates the audit row and note, all in one call so there's no window where one happened without the other; requires the acting admin's role to actually have authority for this request's community and this decision type — fails closed, not open, if it doesn't).

Full contract details (Zod schemas, exact authorization rules) live in the tool files themselves under `src/tools/implementations/`; this section is the *why* for each, not a schema dump.

---

## 8. State Machine

10 states, encoded as one data table (`TransitionRule[]` in `agents/state-machine.ts`) — `{from, to, allowedRoles, reversible}` — consulted by every tool and guardrail that needs to know what's legal. No transition logic is duplicated anywhere else.

```
                         ┌─────────┐
                         │  draft  │
                         └────┬────┘
                resident/admin│  │resident/admin/system: cancel
                      submit  │  └──────────────────┐
                              ▼                      ▼
                       ┌────────────┐         ┌────────────┐
              ┌───────▶│ submitted  │         │ cancelled  │ (terminal)
              │        └─────┬──────┘         └────────────┘
              │      system: │  system/admin: escalate
              │   info needed│  ┌─────────────────────────┐
              │              ▼  ▼                          │
              │     ┌──────────────────┐                   │
   resident/  │     │information_      │  system/admin:     │
   admin:     │     │required          │  escalate           │
   resubmit   │     └────┬─────────┬───┘                     │
              │          │resident/│resident/admin:           │
              └──────────┘admin:   │cancel → cancelled         │
                          │        │ (terminal)                │
              system, if  │        ▼                           │
        allowAutoStatus    ▼  ┌────────────┐                   │
        Advance (§10)  ┌──────┤under_review│                   │
                        │      └──┬───┬──┬──┘                   │
                        │  admin: │   │  │admin/system:          │
                        │  info   │   │  │escalate                │
                        │  needed │   │  └───────────┐            │
                        │         │admin:            │            │
                        │         │approve/reject     ▼            │
                        │         ▼          ┌──────────────┐      │
                        │  ┌────────────┐    │  escalated   │◀─────┘
                        │  │ approved / │    └──┬───┬───┬───┘
                        │  │ rejected*  │       │   │   │  admin: resume to
                        │  └─────┬──────┘   admin: │   │  under_review /
                        │  system│(approved  approve  │  information_required
                        │  only) │  only)    /reject   │
                        │        ▼                     │
                        │  ┌────────────┐               │
                        └─▶│ scheduled  │               │
                           └──┬──┬───┬──┘               │
                     resident/│  │   │admin: complete     │
                     admin:   │  │   ▼                    │
                     cancel   │  │ ┌───────────┐          │
                        │     │  │ │ completed │(terminal)│
                        ▼     │  │ └───────────┘          │
                  ┌──────────┐│  │                        │
                  │cancelled*││  └── admin: resume to      │
                  └──────────┘│      under_review ─────────┘
                               ▼
                        (rejected is terminal too — see * below)
```
`*` `rejected`, `completed`, and `cancelled` are the three terminal states — no outgoing transitions from any of them.

**Three invariants hold regardless of tier or confidence, hardcoded in the table itself, not layered on as a guardrail afterward:**
1. `under_review → approved/rejected` and `escalated → approved/rejected` are unconditionally `admin`-only. No `CommunityConfiguration` flag can relax this (§9).
2. `submitted → under_review` — the agent's own autonomous "this looks ready" advance — allows `admin` too, specifically so a community configured *not* to auto-advance (§10) never dead-ends waiting on the agent.
3. Escalating (`→ escalated`) is reversible from every state that can reach it, and resuming from `escalated` is always `admin`-only — an escalation is a pause for judgment, never a one-way trip.

---

## 9. Guardrails

Eight named categories (`agents/guardrails.ts`), each a pure function of a structured input bag, run at the orchestrator's `deciding` step. Any one of them can only *cap or downgrade* the tier the orchestrator was about to use — never raise it. `missing_data` alone caps at `guide`; every other violation forces `escalate`.

- **Authorization** — `unauthorized_action` fires when a proposed tool call or status target isn't permitted for the acting role; enforced twice, once here (defense-in-depth) and once, for real, inside the tool itself (`ToolPermissionError`).
- **Policy grounding / no hallucinated policy** — every policy statement in a reply traces back to a `getCommunityPolicy` call made *this turn*; a miss (`[]`) is reported honestly, never filled in. `policy_ambiguity` additionally fires if more than one clause exists for a topic — the agent has no basis for picking one, so it doesn't (see §14).
- **Financial boundaries** — `financial_decision` is a structural ceiling: a financial action can never reach `decide`/`act` tier regardless of confidence, and is forced to `escalate` (not just downgraded to `recommend`) once the amount exceeds the community's own `financialEscalationThreshold`.
- **Admin approval** — not a guardrail category by itself so much as the reason all the others exist: `under_review → approved/rejected` is admin-only in the state machine directly (§8), so even a guardrail bypass couldn't reach it — belt and suspenders, not one or the other.
- **Ambiguity handling** — `low_confidence` downgrades a would-be recommendation to escalate below the community's own configured confidence floor; `policy_exception` catches any request that's really "grant me an exception" (no tool exists to do that, so it always escalates).
- **Sensitive data** — two layers, not one: a *type-level* guarantee (`RedactedAgentContext`, what actually reaches a trace, has no field a resident's email, phone, or another resident's data could occupy — nothing to forget to redact) plus a genuine *runtime* check (`sensitive_information`, triggered by `exposesUnauthorizedPII`), which fires for real whenever the terminal-state reply branch would otherwise echo an admin's internal note text verbatim to the resident it belongs to (see `SECURITY.md`'s second-pass review, gap 9, for the concrete leak this closed).
- **Invalid transitions** — `invalid_state_transition` re-checks `canTransition` at the guardrail layer. Honestly: this specific guardrail and half of `unauthorized_action` (the `requestedTransition`-driven branch) are real, unit-tested, defense-in-depth code that isn't separately re-invoked by the live orchestrator today — every organic transition attempt is either performed by the unrestricted `system` actor or already produces a caught `ToolPermissionError` that feeds `unauthorized_action`'s other, live branch. Not every guardrail input is exercised by a real conversation; `SECURITY.md`'s second-pass review documents exactly which are and aren't, rather than leaving that implicit.

**Two categories added in a dedicated review, not from the original design** (see `SECURITY.md` for the full audit): a **cross-community integrity check** — a chat payload with a real request id but a mismatched community id is refused outright, since the request record's own community is the only source of truth for which rules apply to it — and **fail-closed role resolution** for admin decisions — an admin role that doesn't resolve for a request's own community is now a hard denial, not a silently-skipped check. A later, second-pass review closed three more gaps this way — see `SECURITY.md`.

---

## 10. Multi-Community Scalability

**The design constraint, stated once, applied everywhere:** `src/agents`, `src/tools`, and `src/lib` contain zero occurrences of `if (communityId === ...)` or a `switch` on community identity — verified by grep as part of a dedicated review, not asserted from memory (`plan.md`'s Scalability Architecture section documents the audit). Every community-specific rule lives on one of two config objects, read generically:

- **`CommunityConfiguration`** — notice periods, required documents (per resident type), the generated checklist, move-slot resources and booking windows, charge rules (deposit amount, currency, which of 3 deduction *strategies* apply), approval authority per admin role, and autonomy settings (confidence floor, financial-escalation threshold, whether the agent auto-advances a clean request or waits for a human to push it forward).
- **`CommunityPolicy`** — the human-readable clause text a resident actually gets shown, topic-scoped and independently versioned per community.

**Proof, not just design intent:** three communities run today with meaningfully different rules on the identical code:

| | Greenfield Heights | Riverside Villas | Willow Creek |
|---|---|---|---|
| Move-out notice | 30 days | 14 days | 3 days |
| Currency | INR | INR | USD |
| Short-notice charge | flat penalty + flat fee | none (early move simply isn't permitted) | per-day deduction |
| Admin authority | split (Facility Manager / Treasurer) | single, full authority | single, full authority |
| Auto-advance to review | automatic | automatic | **manual — an admin pushes it** |

That last row is the sharpest proof point: it isn't a numbers difference, it's a difference in *shape of workflow* — the identical clean request reaches `recommend` tier at two communities and stops at `guide` (awaiting a human) at the third, from the same orchestrator code path, purely because one config flag differs. `src/tests/unit/scalability.test.ts` also constructs a fourth configuration that is **never registered anywhere in the app** — used only inside that test file — specifically to prove the system generalizes to a community it has never seen at build time, not just the three wired into the live demo.

---

## 11. Data Model

Core entities and how they relate (full types in `src/domain/*.ts`):

- **Community** ↔ **CommunityConfiguration** (1:1) ↔ **CommunityPolicy[]** (1:many, topic-scoped) — the config-as-data layer §10 describes.
- **Resident** (belongs to a Community, optionally linked to a **Unit**) is the actor behind every resident-initiated action.
- **MoveRequest** is a discriminated union — `MoveInRequest | MoveOutRequest` — sharing a common base (status, dates, checklist/document references) but with type-specific fields (`occupantCount` vs. `noticeGivenAt`/`forwardingAddress`). This was a deliberate modeling choice: move-in and move-out are different enough (§2) that a single flat shape with a `type` flag and a pile of optional fields would have hidden that difference instead of expressing it.
- **ChecklistItem** and **Document** are separate on purpose: a checklist item can be sourced from a document, a system check (dues cleared), or a manual step (a move slot booked) — `source` distinguishes which, and only document-sourced items get an upload affordance.
- **MoveSlot** tracks capacity/booking against a community's own scheduling resources.
- **Charge** persists a *confirmed* settlement (`status: 'projected' | 'admin_confirmed'`) — distinct from the live, always-recomputed projection `calculateMoveOutCharges` returns, which is never itself the source of truth until an admin confirms it.
- **AgentAction** is the full, append-only audit trail: every tool call the orchestrator makes, with its tier, actor, input, output, and success/failure — this is what makes tier classification *verifiable*, not just asserted, and it's also the source `findLatestRecommendation` reads from rather than storing a recommendation redundantly.
- **AdminReview** — the explicit "agent recommendation vs. administrator decision" record: a snapshot of what the agent recommended, the admin's actual decision, whether it overrode the recommendation, and (when it does, or when rejecting) a required reason.
- **RequestNote** is the shared, human-readable timeline every actor type (agent, admin, resident) writes to — the one place all three converge for a resident or admin skimming "what happened."
- **AgentConversation** persists chat history windowed to the last 10 messages when read into agent context (§5), independent of how much history the UI shows.

---

## 12. Mocking Strategy

**Mocked, and why:**
- **Persistence** — `src/mocks/repositories/*` implement the same interfaces `src/repositories/*` define, backed by in-memory arrays. Chosen specifically so a real database swap-in touches *only* this layer — no agent, tool, service, or UI code imports a mock repository directly; everything depends on the `Repositories` interface.
- **Authentication** — there is no login. A resident or admin "picks themselves" from a directory. This was a deliberate, repeatedly-reaffirmed scope decision from the very first design phase (`plan.md` §2.12), not an oversight — see §15/§18 for the honest cost of that choice.
- **Document upload/verification** — `lib/mock-document-upload.ts` marks a document verified the instant it's "uploaded." There's no real file storage, no OCR, no human verification queue.
- **Dues/payment ledgers** — `calculateMoveOutCharges` computes strictly from `CommunityConfiguration`; there is no real ledger anywhere in the domain model to check an actual outstanding balance against.
- **The LLM** — `MockAgentProvider` is deterministic keyword/regex classification, zero network calls, zero API key required. This is why the whole project runs with `npm install && npm run dev` and nothing else.

**Why mock rather than stub out entirely:** every mock above is a *faithful* implementation of its real interface, seeded with enough realistic, narratively-consistent data (three communities, thirteen residents, eleven requests spanning every status the state machine defines) that the system is genuinely exercisable end-to-end, not just structurally present. That's what makes `/demo`'s ten scenarios (§13) real conversations against real (mocked) data, not canned responses.

**What replaces each in production** — covered in full in §17, not repeated here.

---

## 13. Testing

**270 tests across 21 files**, run via `npm test` (Vitest). The full breakdown:

- **Unit tests** — pure logic with no I/O: `policy-engine.test.ts` (validation, document requirements, all 3 charge-deduction strategies including the one no seeded community exercises), `state-machine.test.ts` (the full transition table), `guardrails.test.ts` (all 8 categories), `admin-identity.test.ts`, `request-priority.test.ts`, `agent-recommendation.test.ts`, `status-copy.test.ts`, `mock-document-upload.test.ts`, `mock-checklist-resolution.test.ts`.
- **Repository tests** — `repositories.test.ts`: seeding correctness, slot booking/capacity, the conversations repository, and an explicit check that Willow Creek seeds correctly as a cold-start community with zero move-request history.
- **Service tests** — `services.test.ts`: all three services (`CommunityService`, `ResidentService`, `MoveRequestService`), including the full `getDetail` aggregation.
- **Tool tests** — `tools.test.ts` (33 tests: valid/invalid input, missing entities, per-tool contracts) and `tools-mutations.test.ts` (21 tests: illegal transitions, unauthorized actors, duplicate-request rejection, ownership checks for every resident-callable mutating tool including `escalateToAdmin` and `uploadDocument`) plus `tool-authorization.test.ts` (the dedicated `ADMIN_ONLY` structural-gate proof) and `record-admin-decision.test.ts` (role-based permission enforcement, idempotency).
- **Agent tests** — `mock-agent-provider.test.ts` (deterministic classification, extraction, the cancel-negation guard) and `orchestrator.test.ts` (34 tests: every example trace from the original design — clean move-in, incomplete move-in, move-out with charges, ambiguous-policy escalation — plus explicit "the agent selects the correct tool" proofs, both positive selection and *absence* of an unnecessary or forbidden one, resident-initiated cancellation, and withholding an admin's internal note text from a resident-facing reply).
- **Workflow/integration tests** — `scenarios.test.ts` (14 tests, one per numbered demo scenario, each a realistic multi-turn conversation exercising the real orchestrator + tool registry together) and `scalability.test.ts` (16 tests, config-swap-changes-behavior proofs across all 3 communities plus one never-registered).
- **Guardrail / security tests** — `security.test.ts` (23 tests, one section per category in `SECURITY.md`'s original review) plus the second-pass review's own new tests embedded in `tools-mutations.test.ts` and `orchestrator.test.ts` (see above) proving the three additionally-found gaps stay fixed.
- **Config tests** — `config.test.ts`: per-community configuration differences, policy-lookup-miss behavior.
- **End-to-end (Playwright)** — one smoke test (`src/tests/e2e/home.spec.ts`) verifying the home page renders all 3 communities and the resident/admin/demo entry points. Present and current, but **not independently verified in this authoring environment** — see §18.

**Test results (last run, this environment):**

```
 Test Files  21 passed (21)
      Tests  270 passed (270)
```

`npm run lint` and `npm run build` are both clean at the same commit (see §20 for exact commands and output shape).

---

## 14. Failure Recovery

- **Tool failures.** Every tool call is wrapped in try/catch (`callTool` in `move-coordinator.agent.ts`); a caught failure is logged to the audit trail and the turn degrades to a graceful `escalate` reply — never an unhandled exception reaching the resident. Specifically hardened: a **caught exception** (tool threw) is distinguished from a **successful call that legitimately found nothing** (e.g. an empty policy lookup) — conflating them would have the agent falsely claim "no policy exists" when the real problem was that it couldn't check at all (found and fixed during the security review — see `SECURITY.md` gap 15... actually documented as part of the tool-failure category there).
- **Missing data.** The `missing_data` guardrail caps the tier at `guide` and the reply names the specific missing field or document — never a generic "incomplete." A genuinely missing `CommunityConfiguration` (e.g. a corrupted or unknown community reference) is caught with an explicit guard before it would otherwise crash a forced type-read.
- **Ambiguous requests.** Two distinct kinds, both escalate rather than guess: an ambiguous/conflicting *fact* the resident supplied (occupant count that contradicts what's on file — asks for clarification, never picks one) and an ambiguous *policy* (more than one clause on file for a topic, or a topic that would need an exception no tool can grant).
- **Invalid requests.** Malformed input is rejected at the tool boundary by Zod `.strict()` schemas before any business logic runs — unknown fields, wrong types, and (since a dedicated hardening pass) out-of-format values like a non-`YYYY-MM-DD` date are all rejected at the schema, not "handled" downstream.
- **LLM failure.** The interface (`LLMAgentProvider.classifyIntent`) can throw or return low-confidence garbage; because the classifier's output is never trusted beyond a narrow, independently-re-validated set of fields (§5, §9), a failure here degrades to the `ambiguous` intent path (a guide-tier clarifying reply) at worst — it cannot corrupt state, because it was never the thing with write access.
- **Duplicate actions.** `createMoveRequestTool` rejects a duplicate active request for the same resident/unit/type before creating anything; `recordAdminDecisionTool` is idempotent — an already-applied identical decision (a double-clicked "Approve") returns the existing record instead of creating a second one; `escalateToAdminTool` treats escalating an already-escalated request as adding another note, never a double-transition or an error.

---

## 15. Assumptions

Documented explicitly, not left implicit:

1. **No real authentication is in scope.** A resident or admin "picks themselves" from a directory. This is stated as a foundational decision in the very first design phase and reaffirmed every time it became relevant again (the admin dashboard, the security review) — never quietly worked around.
2. **A resident is always exactly who the URL/session claims.** Every authorization check downstream (§9) assumes this; it is the actual, load-bearing gap `SECURITY.md` names explicitly rather than glossing over.
3. **Every community pre-exists with a resident already "on file."** There's no self-service signup flow — matches "the leasing office already knows who's moving" rather than open registration, which is why `ResidentRepository`/`UnitRepository` have no `create` method at all (residents and units are provisioned externally, never by the app).
4. **Document upload is a boolean, not a review process.** A mocked upload is instantly `verified` — there is no rejected-then-resubmitted document lifecycle modeled beyond the checklist item's own status field allowing `rejected` as a value (exercised in seed data, but nothing in this prototype re-triggers it after the fact).
5. **Charges are always a projection until an admin confirms them.** `Charge.status` distinguishes `'projected'` from `'admin_confirmed'`, but nothing in this prototype actually performs the confirmation write (§19) — the distinction exists in the model ahead of the capability, deliberately.
6. **A single active (non-terminal) request per resident/unit/type at a time.** Enforced by `createMoveRequestTool`; a resident whose prior request was rejected or cancelled can always start a fresh one (verified and, in one case, a real bug fixed to make true — see `plan.md`'s Demo Scenarios section on the "stuck on a cancelled request" fix).
7. **"Today" is whatever the server's clock says.** Notice-period math for seeded historical requests uses fixed timestamps (not relative to "now"), but a live, freshly-started request always measures from the real current time — meaning demo behavior for a *new* request is time-sensitive by design, not a bug.
8. **No real concurrency exists to reason about.** The mock repositories are synchronous and single-process; double-submit protections (duplicate requests, idempotent decisions) fix the *symptom* class of bug a race would cause, but there is no optimistic-locking mechanism because there is no real race to lock against yet.

---

## 16. Trade-offs

What was deliberately **not** built, and why it was the right call for this assessment rather than a shortcut:

- **No real LLM integration.** The entire point of the `LLMAgentProvider` seam is that this is a one-line swap with zero orchestrator changes (§17) — building it now would have spent the assessment's time on API plumbing instead of the governance architecture that's actually being evaluated, and would have made every test non-deterministic and dependent on a network call and an API key.
- **No real authentication.** Building a real session/auth layer would have been a large, separate engineering effort orthogonal to "does the agent behave safely once it knows who's asking" — the question this assessment centers on. Explicitly named as the load-bearing gap it is, rather than silently assumed away (§9, §15, `SECURITY.md`).
- **No admin-role mutation UI (creating/editing `AdminRole`s at runtime).** Community configuration, including admin roles, is static data (§10) by design for this phase; a config-authoring UI is real, valuable future work (§19), not something worth half-building here.
- **No real-time updates (WebSockets/polling) between resident and admin views.** Both sides refetch after their own actions; an admin doesn't see a resident's message appear live. Correct behavior without it (nothing goes stale beyond a page refresh) mattered more here than the polish of live sync.
- **No pagination on the admin dashboard.** At 3 communities and ~11 requests, client-side filtering of a fully-loaded list is legitimately the right engineering call, not a shortcut that will bite immediately — but it is a choice that would need revisiting well before "100+ communities" (§10's own report says so directly).
- **No property-based/generated testing.** `scalability.test.ts` proves the pattern (tests parametrized over a list of configs, including one never registered) but the actual test suite uses hand-picked configurations, not generated ones — the right first step, not the final scale answer (also named directly in the Scalability Architecture report as the natural next step).

---

## 17. Production Architecture

None of what follows is implemented. This section exists specifically to be honest about that line, per the assessment's own instruction — everything below is a description of the *next* system, not a claim about this one.

- **Real database.** Every mock repository already exists behind an interface (`src/repositories/*`) that the rest of the app depends on exclusively — swapping in Postgres/DynamoDB/etc. means implementing that interface once, touching zero agent/tool/service/UI code. `CommunityConfiguration.version`/`effectiveFrom` (already modeled, currently informational) become the real config-change audit trail once writes exist.
- **Real authentication.** Sessions (JWT/cookie) feeding the same `actorId`/`actorRole` the tool layer already keys every permission check on — no guardrail or tool changes required, only how `ToolContext` gets populated at the API boundary.
- **Real document storage.** Object storage (S3-equivalent) plus a real verification queue (human or OCR) replacing `mockUploadDocument`'s instant-verify — now reached only through the governed `uploadDocument` tool, so the swap is contained to that one function's body; `Document.status` already models the states (`pending_upload → uploaded → verified/rejected`) a real pipeline would drive.
- **Real LLM.** Implement `LLMAgentProvider.classifyIntent` against Claude. `lib/env.ts#isLlmConfigured()` already checks for `ANTHROPIC_API_KEY`, but to be precise about the current state: `getAgentProvider()` (`lib/container.ts`) does not yet branch on it — it unconditionally returns `MockAgentProvider` today. The interface itself is genuinely narrow and swappable (§5); the env-based selection switch is not yet wired, and this document should not have implied otherwise.
- **Event-driven workflows.** Long-running steps this prototype does synchronously in one HTTP request (escalation notifications, a real move-slot confirmation flow, idle-time-based auto-escalation using the already-modeled but currently-unused-for-this `idleDaysBeforeEscalate`) become queue/event-driven (SQS/EventBridge-equivalent) rather than blocking a request-response cycle.
- **Observability.** `AgentAction` is already a structured, complete audit log of every tool call — in production this streams to real tracing/metrics (OpenTelemetry-equivalent) instead of living only in the mock repository, with the same fields already captured (tier, actor, success, timing) becoming real dashboards.
- **Audit logs.** Already modeled and populated (`AgentAction`, `AdminReview`, `RequestNote`) — production work here is retention/immutability guarantees (append-only storage, not deletion semantics), not new modeling.
- **Rate limiting.** None exists today (an internal prototype with mocked auth has no abuse surface worth limiting yet); production would add it at the API gateway layer, ahead of the route handlers, transparent to everything below.
- **Secrets management.** Today: zero required secrets, one optional env var. Production: `ANTHROPIC_API_KEY` and a database connection string move to a real secrets manager (Vault/AWS Secrets Manager-equivalent), never `.env` files in source control.

---

## 18. Limitations

Stated plainly, not softened:

- **No real authentication is the single biggest gap.** Every "resident can only see their own data" guarantee in this codebase is real and tested — *given* a correctly-established identity. Establishing that identity correctly is explicitly out of scope, and that's a genuine limitation of what can be claimed about this system as it stands, not a solved problem with an asterisk.
- **The admin decision route trusts whatever `roleKey` and `adminId` a request claims.** The tool-layer fix (§9) makes an *unresolvable* role fail closed; it does not — cannot, without real auth — verify the caller is actually who they claim to be.
- **No real concurrency was tested, because none exists to test.** The duplicate/idempotency protections in this codebase close the *symptom* a race condition would cause; they are not a substitute for optimistic locking against a real, concurrent datastore.
- **The Playwright e2e spec was updated to match the current UI in this pass but could not be run in this authoring environment** (unsupported OS for headless Chromium here) — it is present, current, and reads correctly, but its last independently-verified pass predates this document. `npm test` (Vitest, 270 tests) is the suite that's actually re-verified on every change and is the one to trust.
- **A handful of small, deliberately-undone items are on record rather than silently absent**: repeatedly checking in on an already-recommended request adds a duplicate advisory note each time (cosmetic audit noise, not a correctness issue — documented in `SECURITY.md` rather than rushed); the `uploadDocument` tool and the checklist-resolution endpoint aren't themselves idempotent against a rapid double-submit (lower-risk than the admin-decision case that was fixed, and not currently exercised by the UI in a way that would trigger it — see `SECURITY.md`'s second-pass review for the ownership/audit gap in document upload that *was* fixed in this pass).
- **A prior version of this document undercounted its own second-pass fixes.** An earlier Principal Engineer review of this codebase found and fixed 3 additional gaps beyond `SECURITY.md`'s original 6 (an `escalateToAdmin` ownership check, the document-upload tool-registry bypass, and a dead `sensitiveInformation` guardrail that turned out to guard a real information leak) — see `SECURITY.md`'s "Second-Pass Review" section for the full account, including one thing deliberately *not* force-fixed and why.
- **The mock data is illustrative, not exhaustive.** Three communities and thirteen residents are enough to prove every state the system supports is reachable and every guardrail is exercisable — they are not a load test, and nothing about this prototype's performance characteristics at real scale has been measured.

---

## 19. Future Improvements

Ordered by what would move the needle most, not by ease:

1. **Real authentication** — closes the limitation named twice above as the most significant one; unlocks everything else in §17 being meaningfully "production," not just "production-shaped."
2. **A real, Claude-backed `LLMAgentProvider`** — the seam exists and is deliberately narrow specifically so this is a contained, low-risk piece of work when it happens.
3. **Admin config-authoring UI** — the actual unlock for "100+ communities" (§10's own report is explicit that a new community requiring an engineer to write a TypeScript file hasn't solved the *scaling* problem, only the *coupling* problem).
4. **Real document storage + verification pipeline**, replacing the instant-verify mock — the most visibly "fake" part of the current resident experience.
5. **Confirming a `Charge` from `projected` to `admin_confirmed`** as a real admin action — the domain model already distinguishes the two states; nothing currently performs that transition.
6. **Idle-time-based proactive escalation**, using `autonomy.idleDaysBeforeEscalate` (already read by the admin dashboard's priority computation, not yet driving any proactive notification) to surface a stalled request before an admin has to think to look for it.
7. **Property-based tests generated over `CommunityConfiguration`** rather than hand-picked ones, extending the pattern `scalability.test.ts` already establishes.

---

## 20. Running Locally

No environment variables are required. `ANTHROPIC_API_KEY` is the one optional variable (`lib/env.ts#isLlmConfigured()`) — the app runs fully without it; it exists only for the future real-LLM swap-in described in §17.

```bash
npm install
npm run dev
```

Then open `http://localhost:3000` (or the next available port — the dev server prints whichever it actually bound to; `3001` if `3000` is already in use). Start at `/demo` for a guided walkthrough of 10 realistic scenarios with exact resident/admin identities to click through, or use the role switcher in the header to jump straight to any of the 17 seeded personas.

**Test, build, and lint — the exact commands, verified in this environment immediately before writing this section:**

```bash
npm test          # Vitest — 270 tests across 21 files
npm run build     # Next.js production build (Turbopack)
npm run lint      # ESLint (flat config: eslint-config-next + eslint-config-prettier)
npm run typecheck # tsc --noEmit, strict mode
```

All four are clean at the current commit. `npm run typecheck` is not one of the three the assessment named explicitly, but is included here because it's part of the same gate and catches a category of error `lint`/`build`/`test` individually don't guarantee.

Two additional scripts exist and are documented honestly rather than glossed over:

```bash
npm run format        # Prettier — write mode
npm run format:check  # Prettier — check mode, no writes
npm run test:e2e      # Playwright — one smoke test (src/tests/e2e/home.spec.ts)
```

`test:e2e` requires a one-time browser download (`npx playwright install`) before its first run — standard Playwright setup, not a project-specific step — and was not independently re-verified in this authoring environment for the reason stated in §18.
