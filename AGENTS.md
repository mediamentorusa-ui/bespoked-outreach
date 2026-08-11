# Bespoked Outreach Agent Notes

## Product Purpose

Bespoked Outreach is a static GitHub Pages dashboard for reviewing AI-generated hospitality prospecting leads. ChatGPT or Codex performs research outside the app, writes structured lead records to `public/data/leads.json`, commits/pushes them, and the dashboard displays the updated dataset for human review.

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

## Bespoked Context

Bespoked Hospitality is a human-centered hospitality consulting company. Its core belief is that service can be transactional, while hospitality is about how people feel.

Bespoked helps hospitality organizations rethink:

- hospitality culture
- leadership
- guest experience
- operations
- brand
- team behavior
- standards
- consistency
- service philosophy

Voice: thoughtful, warm, experienced, practical and human. Avoid generic corporate consulting language such as "unlock synergies", "transformative solutions", "revolutionize" and "leverage cutting-edge frameworks".

Lucas Ketir is Founder & Hospitality Architect with about 15 years of hands-on international hospitality experience, including high-level French hospitality environments. Use Lucas primarily for operational hospitality outreach.

Pablo is the creative and strategic co-founder, focused on positioning, communication, brand strategy, content, systems and translating ideas into clear strategy and execution. Use company-level Bespoked framing for brand, creative and strategic projects.

Case-study context involving Culebra, Puerto Rico is confidential. Do not expose confidential client details, financials, internal metrics or sensitive operational facts in outbound drafts.

## Offer Taxonomy

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
