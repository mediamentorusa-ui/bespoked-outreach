# Bespoked Outreach Agent Notes

## Product Purpose

Bespoked Outreach is a static GitHub Pages dashboard for reviewing AI-generated Bespoked prospect research. ChatGPT or Codex performs research outside the app, writes structured lead records to `public/data/leads.json`, commits/pushes them when instructed, and the dashboard displays the updated dataset for human review.

Do not introduce a backend unless the user explicitly asks.
Do not add OpenAI API usage unless the user explicitly asks.
Do not add direct SMTP sending unless the user explicitly asks.

## Current Architecture

- Next.js App Router with `output: "export"`.
- Static export output: `out/`.
- GitHub Pages workflow: `.github/workflows/deploy-pages.yml`.
- Lead data source: `public/data/leads.json`.
- Local review state: browser `localStorage`.
- Review-state code: `lib/storage.ts`.
- Dataset validation and loading: `lib/data-source.ts`, `lib/types.ts`.
- Main UI: `components/outreach-app.tsx`.
- Research instructions: `prompts/research-agent.md` and `/research/`.

There are no API routes in V0.1.1. The dashboard must remain deployable as static files.

## Bespoked V2 Context

Bespoked is primarily a restaurant team-development company.

Primary positioning:

> We help restaurants build exceptional teams.

The primary B2B customer journey is:

```text
DIAGNOSE -> INTERVENE -> REINFORCE
```

The outreach system should behave as a need-signal research system, not a broad hospitality prospecting engine. A lead is qualified only when there is a specific observable signal, credible Bespoked fit, relevant decision-maker, usable contact path and reason to act now.

Restaurant revenue leads are primary. Speaking opportunities remain useful, but secondary.

Bespoked's core belief remains that service can be transactional, while hospitality is about how people feel.

Bespoked helps hospitality organizations rethink:

- hospitality culture
- leadership
- guest experience
- team behavior
- standards
- onboarding
- handovers
- consistency
- manager rhythm
- service recovery
- operating conditions that shape team performance

Voice: thoughtful, warm, experienced, practical and human. Avoid generic corporate consulting language such as "unlock synergies", "transformative solutions", "revolutionize" and "leverage cutting-edge frameworks".

Do not randomly introduce Lucas in the third person in outreach copy. Mention him only when it improves credibility for the specific opportunity and explain who he is.

Pablo is the creative and strategic co-founder, focused on positioning, communication, brand strategy, content, systems and translating ideas into clear strategy and execution. Use company-level Bespoked framing for brand, creative and strategic projects.

Case-study context involving Culebra, Puerto Rico is confidential. Do not expose confidential client details, financials, internal metrics or sensitive operational facts in outbound drafts.

## V2 Research Doctrine

Restaurant research should prioritize San Diego and San Diego County first, Southern California second, and the rest of California only for unusually strong opportunities. Geographic fit materially affects qualification because Bespoked's Team Diagnostic may involve observation, mystery guest work, live-service observation, owner/manager conversations or onsite intervention.

Target independent restaurants, owner-led restaurants, small restaurant groups and one-to-several-location operators where team complexity makes leadership, standards, onboarding, handovers and behavior matter.

Do not treat a restaurant as a lead merely because it has bad reviews. The ideal opportunity combines:

```text
NEED + OWNER/OPERATOR INTENT + COMMERCIAL CAPACITY + TIMING
```

Reviews may be evidence, but not a diagnosis. Use careful language such as "may indicate" or "may be worth exploring" unless direct evidence supports a stronger claim.

Weekly research mix target:

- Approximately 70% restaurant revenue leads.
- Approximately 30% speaking opportunities.
- Default weekly ceiling: 20 qualified new records.
- Quality always overrides quota.

Lead readiness states:

- `READY_TO_CONTACT`
- `CONTACT_NEEDED`
- `WATCH`

Generic contact lists are not enough. Do not mark a lead ready simply because the organization is strong; there must be a relevant decision-maker and usable contact path.

## V2 Offer Architecture

Restaurant:

- `Team Diagnostic` for the Diagnose stage.
- `Team Intervention` for the Intervene stage.
- `Ongoing Advisory` for the Reinforce stage.
- `Paid Advisory Session` for a defined owner/manager problem when a full diagnostic is unnecessary.

Initial intervention modules:

- `LEADER_OPERATING_RHYTHM`
- `STANDARDS_FLOW_PRESSURE`
- `DIFFICULT_GUESTS_RECOVERY`
- `HIRING_ONBOARDING`

Speaking products:

- `A_LIFE_IN_HOSPITALITY`
- `EXCEPTIONAL_TEAMS`

Every speaking lead must classify paid potential as `HIGH`, `MEDIUM`, `LOW` or `UNKNOWN`, with a reason and evidence URLs. Never state that an opportunity is paid unless evidence supports it.

Legacy V1 offer labels may still exist in older records:

- Advisory Session
- Hospitality Health Check
- On-Site Training
- Consulting / Transformation
- Keynote
- Workshop / Masterclass

Do not quote pricing in cold outreach unless the user explicitly asks.

## Lead Data Rules

Lead data lives in `public/data/leads.json`:

```json
{
  "version": "0.1",
  "generatedAt": "2026-08-11T10:00:00Z",
  "leads": []
}
```

When adding research-generated leads:

- validate JSON
- deduplicate against existing records
- preserve existing leads
- do not remove human-generated data without reason
- do not overwrite unrelated research batches
- keep source URLs for all material claims
- use V2 fields for new research records
- include legacy display fields until the dashboard UI is migrated
- run `npm run lint`
- run `npm run build`

## Anti-Hallucination Rules

- Never invent organizations, people, titles, emails, programs, conferences, events or company facts.
- Every important claim needs a supporting URL.
- Never invent an email address.
- Use `emailStatus: "verified_public"` only for publicly verified emails.
- Use `emailStatus: "found_unconfirmed"` only when the email is found but confidence is limited.
- Use `contactEmail: null`, `emailStatus: "not_found"` and `emailSourceUrl: null` when no public email is found.
- Do not generate guessed patterns such as `firstname.lastname@domain.com`.
- A generic `info@`, `hello@` or `contact@` route should not normally qualify a lead as `READY_TO_CONTACT` unless it is explicitly the recommended route for the relevant decision.

## Review-State Rules

Review state is local and separate from the dataset:

```json
{
  "lead-id": {
    "status": "APPROVED",
    "editedSubject": "...",
    "editedBody": "...",
    "notes": "...",
    "updatedAt": "..."
  }
}
```

Do not store approval status, edited drafts or notes in `public/data/leads.json` for V0.1.1. This preserves local human review state when new research is published.

## Email Rules

V0.1.1 uses `mailto:` only. It does not send emails directly.

Expected flow:

1. NEW
2. APPROVED
3. Open Email
4. User sends manually
5. CONTACTED

The user can also set REJECTED, INTERESTED, FOLLOW_UP, WON and LOST.

## Design Principles

Preserve the existing Bespoked editorial direction: premium, warm, minimal, practical, paper-like background, charcoal typography, subtle borders and restrained accents.

Avoid neon gradients, generic purple AI styling, glassmorphism, cartoon illustrations and excessive roundness.

Desktop is primary, but tablet and mobile must remain usable.

## Static Export / GitHub Pages

The app must work from a repository subpath such as:

```text
https://USERNAME.github.io/bespoked-outreach/
```

`next.config.mjs` uses:

- `output: "export"`
- optional `NEXT_PUBLIC_BASE_PATH`
- `trailingSlash: true`
- unoptimized images

GitHub Actions sets `NEXT_PUBLIC_BASE_PATH=/${{ github.event.repository.name }}`.

## Future V0.2

Do not implement unless explicitly requested:

- secure backend
- IONOS SMTP send
- IONOS IMAP reply monitoring
- Supabase/Postgres
- shared review state across devices
- authentication
- Hunter
- Apollo
- scheduled follow-ups
- automated reply classification
- CRM integrations
- analytics

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
