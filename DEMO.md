# DEMO — 10-Minute Interview Walkthrough

A scripted demonstration of the ANACITY Move-In/Move-Out agentic workflow, timed to 10 one-minute beats. Every step below uses real seeded data and was verified against the running app immediately before this script was written — the numbers you'll see are exact, not illustrative.

**Before you start:** run `npm install && npm run dev` fresh. All data is in-memory, reseeded from `src/config/`/`src/mocks/data/*` on every server restart — so if you (or a prior run) mutated anything, a restart guarantees a clean slate. No login, no environment variables, no network calls.

Open `http://localhost:3000` as your home base and keep `EXPLANATION.md` and `SECURITY.md` open in a second window in case a question needs a deeper citation than this script gives.

---

## 1. Architecture Overview — 1 minute

**Screen:** `/` (home page), then `EXPLANATION.md` §4 (architecture diagram) in your editor.

**Action:** Point at the three community cards on the home page (Greenfield Heights, Riverside Villas, Willow Creek), then switch to the architecture diagram.

**Expected result:** Home page shows 3 communities with live config (notice period, inspection requirement, short-notice penalty flag, open request count) pulled from real config, not hardcoded copy. The diagram shows: UI → API/Application layer → Agent Orchestrator → Context Builder → Tool Registry → Domain Services → Repository → Mock Data, with the LLM seam called out separately.

**Concept to explain:** The LLM (today, a deterministic mock standing in for one) sits *beside* the orchestrator, not above the tool layer. It classifies intent — that's its only job. Every tool call, guardrail check, state transition, and word of reply text is deterministic orchestrator code. This is the single design decision the whole safety story depends on: swapping the mock for a real LLM later changes *only* how intent gets classified, never what the system is willing to do.

---

## 2. Resident Starts Move-In — 1 minute

**Screen:** `/resident/community-willow-creek/resident-noah-becker` (Noah Becker, Willow Creek — a fresh resident, no request yet).

**Action:** In chat, type: `I'd like to move in with 1 occupant on 2026-10-01.`

**Expected result:** The agent creates a draft request, immediately validates it, and identifies the one required document (Government ID Proof) — the status card advances and the checklist populates live.

**Concept to explain:** This single turn already exercises the full orchestrator loop: classify intent → assemble context → select tool (`createMoveRequest`) → execute → validate → decide → respond. The checklist wasn't hand-written for Noah — it was generated from Willow Creek's own `CommunityConfiguration.documents.moveIn` at creation time. Zero code path branches on "this is Willow Creek."

---

## 3. Agent Identifies Missing Information — 1 minute

**Screen:** `/resident/community-greenfield-heights/resident-priya-menon` (Priya Menon — already mid move-in).

**Action:** Type: `just checking in`

**Expected result:** Reply: *"I still need the following before I can move this forward: Society NOC."* — names the exact missing document, not a generic "incomplete" message.

**Concept to explain:** This is the `validateDocuments`/`validateMoveRequest` tools running fresh every turn — never a cached judgment. The agent doesn't remember "Priya is missing something"; it re-derives it from real checklist/document state each time, through the same governed tool call a resident-typed question would trigger. This is also a good moment to mention the guardrail pipeline: `missing_data` is the one guardrail that caps the tier at `guide` (ask, don't act) rather than escalating — the safe, low-drama default for "I just need more info."

---

## 4. Community-Specific Policy — 1 minute

**Screen:** Same Priya Menon chat, then switch resident to `/resident/community-willow-creek/resident-jamie-flores`.

**Action:** As Priya, ask: `What is the notice period for moving out?` — note the reply. Then, as Jamie Flores, ask the identical question.

**Expected result:** Priya (Greenfield Heights): *"Residents must provide a minimum of 30 days written notice... a short-notice penalty of ₹500 per day short."* Jamie (Willow Creek): *"...at least 3 days written notice... A $15/day late-notice fee applies."* Same question, same code path, genuinely different — and differently-*currencied* — answers.

**Concept to explain:** Both replies came from the identical `ask_question` handler calling the identical `getCommunityPolicy` tool. The only thing that differs is which `CommunityPolicy` row that tool returns — pure data, not a conditional. This is the concrete proof for "config-driven, not hardcoded": run `grep -rn "community-greenfield-heights" src/agents src/tools src/lib` and show it returns nothing outside comments — there is no business logic anywhere keyed on community identity.

---

## 5. Resident Completes Move-In — 1 minute

**Screen:** Back to Noah Becker's chat from Step 2.

**Action:** Click the checklist item's upload button for Government ID Proof, then type: `I've uploaded my Government ID Proof.`

**Expected result:** Checklist shows the document verified, and the request advances to `submitted` — then **stops there**, with the reply: *"Everything looks complete on your end. This community has requests moved to review manually rather than automatically, so I've left it as submitted — a community admin will pick it up from here."*

**Concept to explain:** This is deliberate, not a bug — Willow Creek's `autonomy.allowAutoStatusAdvance` is `false` in its config, a genuine per-community workflow variation the state machine explicitly supports (it allows `admin`, not just `system`, on the `submitted → under_review` transition for exactly this case). Contrast this with Greenfield Heights or Riverside Villas, where the identical clean-request logic would auto-advance straight to `under_review` with a recommendation. Same orchestrator code, same validation result, two different stopping points — purely because of one config flag. This is worth flagging now and calling back to explicitly in Step 10.

---

## 6. Resident Starts Move-Out — 1 minute

**Screen:** `/resident/move-out/community-riverside-villas/resident-sanjay-kulkarni` (Sanjay Kulkarni, Riverside Villas — his prior move-out was cancelled, so he can start a fresh one).

**Action:** Type: `I'd like to move out on 2026-09-15.`

**Expected result:** The agent explains Riverside Villas' 14-day notice policy *in the same turn*, before being asked — not something the resident has to think to look up.

**Concept to explain:** Move-out always requires an explicit date up front — never defaulted to "today" — because it drives both the notice-period check and any short-notice charge calculation. This is a deliberate hardening: guessing a financially-consequential input is exactly the kind of thing the agent must not do. Good moment to contrast with Step 2: move-in and move-out are modeled as a genuine discriminated union (`MoveInRequest | MoveOutRequest`), not one flat shape with a type flag — they ask fundamentally different questions.

---

## 7. Move-Out Charge Calculation — 1 minute

**Screen:** `/resident/move-out/community-greenfield-heights/resident-vikram-shah` (Vikram Shah — an in-progress, short-notice move-out: 10 days' notice given against Greenfield Heights' 30-day requirement).

**Action:** Type: `What charges apply to my move-out?`

**Expected result:** Exact figures, not an estimate: *"Short Notice Penalty: INR 10,000; Standard Cleaning Fee: INR 2,000, for an estimated net refund of INR 38,000"* (from a ₹50,000 deposit) — with an explicit "this is only a projection... before final admin confirmation" caveat.

**Concept to explain:** These numbers came from `calculateMoveOutCharges` — a pure, deterministic function of `CommunityConfiguration` alone (20 days short × ₹500/day = ₹10,000; flat ₹2,000 cleaning fee). No LLM ever touches a dollar figure. This is also where to name the `financial_decision` guardrail: financial actions can *never* reach `decide`/`act` tier regardless of confidence, full stop — and because these deductions (₹12,000) exceed Greenfield Heights' own `financialEscalationThreshold` of ₹10,000, this case is already flagged as a financial exception requiring specific admin authority (setup for Step 8).

---

## 8. Admin Reviews Request — 1 minute

**Screen:** `/admin` → pick **Treasurer — Greenfield Heights** → open Vikram Shah's request (`/admin/community-greenfield-heights/treasurer/request-gh-005`).

**Action:** Open the **Decision Context** panel.

**Expected result:** One screen shows: the applicable policy (notice period, dues), what's missing/verified, the real charge projection from Step 7, and — critically — the Approve action is only enabled here because a Treasurer specifically has `canApproveFinancialException: true`. Switch the role switcher to **Facility Manager** and show Approve becomes disabled for this same request — Facility Managers can approve move-outs generally, just not financial exceptions.

**Concept to explain:** Available actions aren't a client-side guess — `getAllowedTransitions(status, 'admin')` plus each admin role's declared capabilities (`adminPermissions.roles` in config) compute this server-side; the UI only renders what's already legal. This is real, per-role, per-community authorization, not a single "admin can do everything" flag.

---

## 9. Agent Recommendation vs. Human Decision — 1 minute

**Screen:** Same request detail, the **Recommendation vs. Decision** card.

**Action:** Point out the two distinct, separately-colored panels: the agent's recommendation (*"approve_with_charges," confidence 0.7, citing 3 policy clauses*) and the (currently empty) administrator decision panel. As Treasurer, click **Reject** and type a reason.

**Expected result:** The card now shows both: the agent's original recommendation, unchanged, next to the admin's actual decision, with an "OVERRODE RECOMMENDATION" badge since they disagree. Ask Vikram (resident) "what's the status of my request?" in a separate tab — the reply says the request was rejected but does **not** repeat your internal reason text verbatim.

**Concept to explain:** These are structurally two different things (`AgentRecommendation` vs. `AdminReview`), never merged into one verdict — the system is explicit about who actually decided and whether they agreed with the agent. The withheld reason text is a live guardrail: `sensitive_information` fires whenever the terminal-state reply would otherwise echo an admin's internal note verbatim to the resident it's about — an admin's own audit-trail note isn't automatically resident-facing just because it's the latest note on the record.

---

## 10. Scalability / Architecture Explanation — 1 minute

**Screen:** Terminal.

**Action:** Run: `grep -rn "community-greenfield-heights\|community-riverside-villas\|community-willow-creek" src/agents src/tools src/lib src/services` — show it returns nothing (only comments, if anything).

**Expected result:** Zero business-logic hits. Every difference you demonstrated in Steps 4, 6, 7, and 8 (30 vs. 14 vs. 3-day notice, ₹ vs. $ currency, per-day vs. flat charge strategies, split vs. unified admin authority) came from `src/config/communities/*.ts` and `src/config/policies/*.ts` alone.

**Concept to explain:** Onboarding community #4 means writing a new config file — `CommunityConfiguration` + `CommunityPolicy[]` + seed data — and touching zero orchestrator, tool, or guardrail code. `src/tests/unit/scalability.test.ts` proves this with a 4th configuration that's *never registered in the live app at all*, constructed only inside the test, specifically to show the system generalizes to a community it's never seen. The honest caveat, worth stating unprompted: today a new community still means an engineer writing a TypeScript file — the real "1000 communities" unlock is a config-authoring admin UI on top of this same repository-interface boundary, not a re-architecture (see `EXPLANATION.md` §19).

---

## Likely Interviewer Questions

### 1. "Why is this agentic? Couldn't this just be a form?"

A form validates that a field is present. It can't explain *why* a document is required for this specific community, notice that two things a resident said conflict and ask which is right instead of picking one, calculate what a short-notice move-out costs against config that varies per community, or recognize on its own that a charge dispute is exactly the kind of thing it must never resolve itself. Those four behaviors — grounded explanation, refusing to guess, deterministic calculation, and self-aware escalation — are demonstrated live in Steps 3, 4, 7, and the charge-dispute path, each as a distinct, tested scenario. That's the actual argument for an agent here, not "chat is a nicer UI."

### 2. "Why not just use a workflow engine (Temporal, Airflow, a state machine library)?"

I did use one — `state-machine.ts` is exactly that, a data-driven transition table with role gating, and it's the single source of truth for every status change in the system. What a workflow engine alone doesn't give you is the *conversational* layer on top: interpreting free text into intent, deciding what's missing without a human authoring every branch, and explaining policy in context. This system is deliberately both — a rigid, auditable workflow engine underneath, with an LLM-classified, guardrail-governed agent layer on top of it, not instead of it. The workflow engine gives me safety; the agent gives me the resident-facing flexibility a pure state machine can't.

### 3. "How would this scale to 1000 communities?"

Architecturally, it already does — proven in Step 10 and by `scalability.test.ts`'s never-registered 4th config. The actual bottleneck at 1000 communities isn't the agent or tool layer, it's two things: (1) an engineer currently has to hand-author each `CommunityConfiguration` as a TypeScript file — the real fix is a config-authoring admin UI validated by the same Zod schemas the tools already use, so a non-engineer can onboard a community; (2) the mock repositories are synchronous in-memory Maps — swapping in a real database is a repository-interface implementation, not a rewrite, since nothing above that layer knows or cares that it's in-memory today.

### 4. "How would you use an actual LLM here?"

There's exactly one seam: `LLMAgentProvider.classifyIntent(message, context) → AgentIntentClassification`. I'd implement it against Claude, constrained to return one of a fixed intent enum plus a handful of typed, format-checked fields (occupant count, a date, a policy topic) — never freeform text that gets interpolated into a reply or trusted as fact. Nothing else in the orchestrator changes, by construction: it never sees the LLM's reasoning, only its structured output, and every field that comes back is independently re-validated by the tool layer's own Zod schemas regardless of what the model claims.

### 5. "How would you prevent an LLM from taking unsafe actions?"

By never giving it the *ability* to — this isn't a prompt-engineering answer. The LLM's only function is intent classification; it never selects a tool, never calls one directly, and never writes reply text. Tool selection is deterministic orchestrator code; every tool call goes through a Zod-validated, role-gated registry that structurally blocks `ADMIN_ONLY` actions regardless of what's asked; and an 8-guardrail pipeline sits between "the agent wants to do X" and "X happens," which can only ever *downgrade* the proposed autonomy tier, never grant more of it — financial decisions, policy exceptions, and every approval/rejection are hardcoded to always require a human, with no config flag able to relax that. So even a fully adversarial or hallucinating model, in this architecture, has no path to an unreviewed action — a claim `src/tests/unit/security.test.ts` proves directly with a deliberately hostile mock provider.
