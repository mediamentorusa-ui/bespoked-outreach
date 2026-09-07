---
name: bespoked-outreach-research
description: Run the Bespoked Outreach V2 need-signal research workflow for the static dashboard. Use when asked to find, qualify, park, watch, or publish Bespoked restaurant team-development leads or secondary speaking opportunities; update public/data/leads.json; deduplicate prospects; draft Bespoked-first outreach; validate the dataset; or prepare a research batch for the Bespoked Outreach repository.
---

# Bespoked Outreach Research

## Mission

Run Bespoked Outreach as a V2 need-signal research system, not as a broad hospitality prospecting engine.

Bespoked's primary positioning is: "We help restaurants build exceptional teams." The primary commercial wedge is restaurants, and the primary B2B journey is `DIAGNOSE -> INTERVENE -> REINFORCE`.

Quality always overrides volume. Add or prepare a lead only when there is:

`SPECIFIC OBSERVABLE SIGNAL + CREDIBLE BESPOKED FIT + RELEVANT DECISION-MAKER + USABLE CONTACT PATH + REASON TO ACT NOW`

If the answer to "Why might this organization need Bespoked now?" is generic, the record is not ready for outreach.

## Required Context

Before researching or editing data, read:

1. `AGENTS.md`
2. `prompts/research-agent.md`
3. `public/data/leads.json`
4. `lib/types.ts` and `lib/scoring.ts` when schema or scoring details matter

Do not run live research, modify scheduled tasks, commit, or push unless the user asks for that action in the current task.

## V2 Allocation

Use weekly targets, not forced quotas:

- About 70% restaurant revenue leads.
- About 30% speaking opportunities.
- Default weekly ceiling: 20 qualified new records.
- Speaking should split roughly half local/regional and half national/international.

It is fine for a run to return 0, 2, 5, or 9 qualified records. Never fill a quota with generic prospects.

## Restaurant Lane

Restaurant leads should receive 65-70% of research effort.

Geographic priority:

- `TIER_1_LOCAL_CORE`: San Diego and San Diego County.
- `TIER_2_REGIONAL`: Southern California.
- `TIER_3_CALIFORNIA_OPPORTUNITY`: Rest of California, only for unusually strong opportunities.
- `OUT_OF_SCOPE`: exceptional non-California opportunities only.

Prioritize independent restaurants, owner-led restaurants, small restaurant groups, and one-to-several-location operators with enough team complexity that leadership, standards, onboarding, handovers and team behavior matter.

The ideal restaurant opportunity combines `NEED + OWNER/OPERATOR INTENT + COMMERCIAL CAPACITY + TIMING`. Avoid closing, insolvent, inactive, giant-chain, generic-fit, one-off bad-review, or no-capacity businesses.

Need signals include opening, expansion, rapid hiring, turnover, management transition, new GM/operator/ownership, culture reset, recurring service complaints, guest-care failures, weak handovers, FOH/BOH friction, standards drift, owner rescue, manager inconsistency, weak onboarding, multi-location variation, guest-experience deterioration, growth strain, service-improvement initiatives, or visible operational/team strain.

Reviews can support a signal, but do not diagnose from reviews. Use cautious language such as "may indicate", "may be worth exploring", and "the observable signal suggests".

## Restaurant Offer Routing

Use the first layer of commercial reasoning:

- `DIAGNOSE` / `Team Diagnostic`: preferred front door when the signal is real but the root cause cannot responsibly be known externally.
- `INTERVENE` / `Team Intervention`: use only when evidence strongly suggests a specific intervention area.
- `REINFORCE` / `Ongoing Advisory`: use when ownership or management is implementing change and needs 30-90 day support.
- `ADVISORY_SESSION` / `Paid Advisory Session`: use for a defined owner/manager problem when a full diagnostic is unnecessary.

Initial intervention modules:

- `LEADER_OPERATING_RHYTHM`
- `STANDARDS_FLOW_PRESSURE`
- `DIFFICULT_GUESTS_RECOVERY`
- `HIRING_ONBOARDING`

Use the Exceptional Team Framework internally through `likelyFrameworkDimensions`:

1. Right People for This House
2. A House Worth Belonging To
3. Leaders Who Create the Conditions
4. Standards That Enable Ownership
5. One Team, Especially Under Pressure
6. Bring the House to Life

Do not present the framework as scientifically validated, a certification, or a guaranteed business outcome.

## Speaking Lane

Speaking remains secondary. Only pursue opportunities with meaningful authority, audience, strategic value, or plausible paid potential.

Use only two speaking products:

- `A_LIFE_IN_HOSPITALITY`
- `EXCEPTIONAL_TEAMS`

Every speaking lead must include `paidPotential`, `paidPotentialReason`, and `paidPotentialEvidenceUrls`.

Allowed `paidPotential` values:

- `HIGH`
- `MEDIUM`
- `LOW`
- `UNKNOWN`

Never state that an opportunity is paid unless evidence supports it.

## Contact And Readiness Gates

Do not settle for a generic contact if a direct decision-maker can reasonably be found.

Restaurant decision-makers include owners, founders, operating partners, managing partners, CEO, COO, Director of Operations, Regional Director, relevant GM, L&D, People or Training leadership.

Speaking decision-makers include program director, event director, conference producer, programming director, speaker manager, executive director, department chair, dean, or relevant faculty/program lead.

Never invent or infer an email. Store email statuses in the dashboard's lowercase values: `verified_public`, `found_unconfirmed`, or `not_found`. A generic `info@`, `hello@`, or `contact@` route should not normally qualify as `READY_TO_CONTACT` unless it is explicitly the recommended route for that decision.

Classify every lead:

- `READY_TO_CONTACT`: strong fit, credible signal, clear why now, relevant decision-maker, usable contact path, source evidence, and clear offer/talk fit.
- `CONTACT_NEEDED`: strong organization/signal/offer fit, but no sufficiently reliable direct contact.
- `WATCH`: interesting but timing or signal is insufficient or premature.

## Record Shape

Use the V2 fields defined in `prompts/research-agent.md` and supported by `lib/types.ts`.

For restaurant records, include lane, geography tier, format/scale, contact route, readiness, need-signal fields, `whyNow`, `likelyFrameworkDimensions`, recommended stage/offer/module, V2 scores, source URLs, and outreach draft.

For speaking records, include lane, event/program, speaking geography type, contact route, readiness, opportunity signal, recommended talk/format, paid potential, V2 scores, source URLs, and outreach draft.

Until the dashboard UI is migrated, include the legacy display fields too: `trigger`, `triggerDate`, `triggerExplanation`, `recommendedOffer`, `recommendedOfferReason`, `fitScore`, `timingScore`, `contactScore`, `opportunityScore`, `confidenceScore`, and `totalScore`.

## Outreach Voice

Write as Bespoked speaking directly. Restaurant emails should usually be 150-220 words; speaking emails should usually be 140-210 words.

Do not use "I hope this email finds you well", generic AI compliments, fake familiarity, unsupported claims, broad service menus, assumptions framed as diagnosis, confidential client references, or corporate filler language.

Do not randomly introduce Lucas in the third person. Mention him only when it improves credibility for the specific opportunity and explain who he is.

## Safety

Keep the GitHub Pages/static export architecture intact. Do not add a backend, OpenAI API dependency, Vercel, Supabase, email sending, CRM integration, authentication, or analytics unless the user explicitly asks.

During normal research runs, read the dataset, research, validate, deduplicate, preserve existing records, update only relevant data, run `npm run lint` and `npm run build`, and commit/push only when instructed.

If the schema is incompatible with a requested V2 record, stop and report the issue instead of silently redesigning the dashboard.
