---
name: bespoked-outreach-research
description: Run the Bespoked Outreach recurring research workflow for the static dashboard. Use when asked to find or publish new Bespoked hospitality prospects, run the weekday outbound research rotation, add qualified leads to public/data/leads.json, deduplicate leads, draft personalized outreach, validate the dataset, or prepare/publish a research batch for the Bespoked Outreach repository.
---

# Bespoked Outreach Research

## Mission

Find a small number of genuinely actionable Bespoked prospects, research them deeply, draft concise personalized outreach, and publish only qualified records into `public/data/leads.json`.

Quality beats volume. Add a lead only when there is both a credible reason Bespoked could help and a meaningful reason to contact them now.

## Required Context

Before researching or editing data:

1. Read `AGENTS.md`.
2. Read `prompts/research-agent.md`.
3. Read `public/data/leads.json`.
4. Inspect the active schema in `lib/types.ts` and scoring in `lib/scoring.ts` if the dataset shape or scoring rules are unclear.

Respect the repository architecture:

- Keep the app static; do not introduce a backend, API route, SMTP sending, CRM integration, auth, database, or OpenAI API usage unless the user explicitly asks.
- Store only research lead records in `public/data/leads.json`; do not store review status, edited drafts, approval state, or reviewer notes there.
- Preserve existing leads and unrelated research batches.

## Weekday Rotation

Use the current local weekday unless the user specifies another category.

**Monday: Universities / Hospitality Schools**

Focus on paid guest speaking, hospitality leadership workshops, masterclasses, executive education, industry speaker programs, and hospitality, tourism, or hotel management programs.

Likely offers: `Keynote`, `Workshop / Masterclass`.

**Tuesday: Hospitality Conferences / Associations / Conventions**

Focus on upcoming conferences, calls for speakers, programming opportunities, workshops, panels, hospitality associations, conventions, and industry events.

Likely offers: `Keynote`, `Workshop / Masterclass`.

**Wednesday: Operator Pain / Culture Opportunity**

Focus on restaurants, restaurant groups, independent hospitality businesses, and owner-led operations showing visible guest-experience, team-culture, leadership, or hospitality-culture friction.

Prioritize `NEED + OWNER INTENT + COMMERCIAL CAPACITY`.

Look for pain signals such as recurring recent reviews about poor or inconsistent service, rude or indifferent behavior, guest-care failures, communication problems, weak management, hospitality inconsistency, team culture issues, operational friction, good product but poor experience, growth-related inconsistency, service quality depending heavily on which employee is working, or owners struggling to create standards and systems.

Look simultaneously for investment signals such as active and caring owners, thoughtful review responses, recent acquisition or new ownership, renovation, repositioning, strong demand, expansion, good product reputation, multiple locations, public statements about improvement, visible investment, passionate founders, or operators who appear willing but under-systemized.

Do not prioritize insolvent, permanently closing, abandoned, random low-signal, giant-chain, or no-investment-capacity businesses.

Likely offers: `Hospitality Health Check`, `Advisory Session`, `On-Site Training`, `Consulting / Transformation`.

**Thursday: Hotels / Resorts / Hospitality Groups**

Prioritize new openings, expansions, acquisitions, new management, new GM or COO, rebrands, reopenings, guest-experience initiatives, training needs, recurring guest-experience review issues, multi-property consistency issues, and rapidly growing hospitality groups.

Likely offers: `Hospitality Health Check`, `On-Site Training`, `Consulting / Transformation`, `Advisory Session`.

**Friday: Tourism Boards / Public Institutions / Workforce Development**

Prioritize hospitality workforce programs, tourism initiatives, service-training programs, economic development, hospitality education, visitor-experience initiatives, public-private hospitality programs, destination-management organizations, tourism boards, and community or state hospitality initiatives.

Likely offers: `Workshop / Masterclass`, `On-Site Training`, `Consulting / Transformation`, `Keynote`.

## Research Standard

Aim for 5 excellent new prospects. Do not lower the quality threshold to reach 5; if only 2 or 3 strong prospects exist, add only those.

For each candidate, establish:

- A specific trigger or "why now"; generic facts like "they operate hotels" are not enough.
- A specific reason Bespoked could help, connected to hospitality culture, leadership, guest experience, operations, brand, team behavior, standards, consistency, or service philosophy.
- The most relevant decision maker for the opportunity.
- Source URLs for every material claim.
- A clear recommendation from the existing offer taxonomy.

Never invent organizations, people, titles, emails, programs, events, conferences, initiatives, reviews, or business facts.

## Duplicate Prevention

Before adding a prospect:

1. Compare against existing records in `public/data/leads.json`.
2. Check organization name, website, contact name, and contact email when available.
3. Do not add the same organization/contact again unless there is a materially different new opportunity or trigger.
4. If a prior sample/demo record exists, do not treat it as verified research.

## Email Rules

Never invent or pattern-guess an email address.

Use:

- `verified_public` only when the email is directly supported by a reliable public source.
- `found_unconfirmed` when the email is found but confidence is limited.
- `not_found` when no credible email is available.

When no email is found, use exactly:

```json
"contactEmail": null,
"emailStatus": "not_found",
"emailSourceUrl": null
```

## Lead Record Requirements

Write leads using the dashboard schema in `lib/types.ts` and the top-level structure in `public/data/leads.json`:

```json
{
  "version": "0.1",
  "generatedAt": "2026-08-11T10:00:00Z",
  "leads": []
}
```

Each added lead must include:

- Valid `organizationType`, `recommendedOffer`, and `emailStatus` enum values.
- `sourceUrls` covering organization identity, trigger, contact, and email source when available.
- A specific `trigger`, `triggerDate` when known, and `triggerExplanation`.
- `whyBespoked` and `recommendedOfferReason` grounded only in sourced facts and known Bespoked positioning.
- Scores from 0-100: `fitScore`, `timingScore`, `contactScore`, `opportunityScore`, `confidenceScore`.
- `totalScore` calculated as `30% Fit + 25% Timing + 20% Opportunity + 15% Contact + 10% Confidence`, rounded.
- A short, warm, specific `emailSubject` and `emailBody`.
- `createdAt`, `researchBatch`, and useful `tags`.

## Outreach Voice

Draft email copy that is direct, warm, human, specific, credible, concise, and hospitality-native.

Use Lucas primarily for operational hospitality outreach. Use company-level Bespoked framing for brand, creative, positioning, strategic, and institution-facing opportunities.

Avoid generic corporate language such as "unlock synergies", "transformative solutions", "revolutionize", and "leverage cutting-edge frameworks". Do not expose confidential Culebra, Puerto Rico case-study details, internal metrics, financials, or sensitive operational facts.

## Validation And Finish

After editing `public/data/leads.json`:

1. Validate the JSON parses.
2. Confirm every new record conforms to `lib/types.ts`.
3. Confirm duplicates were avoided.
4. Run `npm run lint`.
5. Run `npm run build`.
6. Commit and push to `main` only when the user requested publishing or the active task explicitly includes publishing the research batch.

Report how many leads were added, which category was used, and whether lint/build passed.
