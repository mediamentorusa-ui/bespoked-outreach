# Bespoked Outreach

Bespoked Outreach is a static review dashboard for Bespoked's AI-generated need-signal research. V2 is designed primarily for Lucas: open the app, see who is worth contacting, understand why now, review the suggested approach, edit the email, and track what happened.

Research still happens outside the app through ChatGPT or Codex. The dashboard reads structured lead data from `public/data/leads.json` and keeps human review state in local browser storage.

The dashboard does not call OpenAI directly, does not require a backend, does not require IONOS credentials, and does not require Vercel.

## Architecture

```text
ChatGPT / Codex research
-> update public/data/leads.json
-> commit and push to main
-> GitHub Actions builds the static app
-> GitHub Pages publishes it
-> human reviews leads in the dashboard
-> email is opened manually with mailto:
```

Runtime data sources:

- Lead research: `public/data/leads.json`
- Local review state: browser `localStorage`
- Demo leads: optional, hidden by default

## Features

- Static Next.js App Router dashboard exported to `out/`.
- GitHub Pages workflow in `.github/workflows/deploy-pages.yml`.
- Client-side Zod validation for `public/data/leads.json`.
- Malformed lead records are skipped with a visible warning instead of crashing the app.
- Lucas-facing navigation: New, Ready to Contact, Parked, Contacted, Follow Up and Interested.
- Restaurant and Speaking lead lanes, with restaurant opportunities emphasized by default.
- Research readiness mapping: `READY_TO_CONTACT` appears ready; `CONTACT_NEEDED` and `WATCH` appear parked.
- Local review workflow stored separately from the research dataset.
- Follow-up dates, contacted timestamps, interested timestamps and notes stored locally.
- Editable email subject/body with `Reset to Research Draft`.
- Human notes per lead.
- Mailto-based `Open Email`; no SMTP sending in V0.1.1.
- Source URLs displayed and clickable.
- Email certainty labels: Verified, Needs verification, Not found.
- Dashboard summary: Ready to Contact, New This Week, Follow Up, Interested and Contacted This Week.
- Card and table views with filters and sorting.
- V2 filters for lane, readiness, restaurant geography, speaking reach, stage, approach, intervention, talk, paid potential, email, priority and research batch.
- Export filtered or all leads to CSV, including V2 fields.
- Export/import local review-state JSON backup.
- Research Workflow page with `Copy Research Prompt`.

## Lead Data Format

Lead data lives at:

```text
public/data/leads.json
```

Top-level format:

```json
{
  "version": "0.1",
  "generatedAt": "2026-08-11T10:00:00Z",
  "leads": []
}
```

V2 records should use `leadLane: "restaurant"` or `leadLane: "speaking"`.

Restaurant records support fields such as:

```json
{
  "id": "unique-id",
  "leadLane": "restaurant",
  "organizationName": "",
  "organizationType": "restaurant_group",
  "website": "",
  "city": "",
  "state": "",
  "country": "",
  "geographicTier": "TIER_1_LOCAL_CORE",
  "restaurantFormat": "",
  "locationCount": 1,
  "scaleSummary": "",
  "contactName": "",
  "contactTitle": "",
  "contactEmail": null,
  "emailStatus": "verified_public | found_unconfirmed | not_found",
  "emailSourceUrl": null,
  "preferredContactRoute": "",
  "researchReadiness": "READY_TO_CONTACT | CONTACT_NEEDED | WATCH",
  "needSignalType": "",
  "needSignalSummary": "",
  "needSignalDate": null,
  "needSignalEvidenceUrls": [],
  "whyNow": "",
  "likelyFrameworkDimensions": [],
  "recommendedStage": "DIAGNOSE | INTERVENE | REINFORCE | ADVISORY_SESSION",
  "recommendedInterventionModule": "LEADER_OPERATING_RHYTHM | STANDARDS_FLOW_PRESSURE | DIFFICULT_GUESTS_RECOVERY | HIRING_ONBOARDING",
  "recommendedOffer": "Team Diagnostic",
  "recommendedOfferReason": "",
  "commercialFitScore": 0,
  "needSignalScore": 0,
  "geographicFitScore": 0,
  "decisionMakerScore": 0,
  "contactCertaintyScore": 0,
  "offerFitScore": 0,
  "overallScore": 0,
  "researchConfidence": 0,
  "sourceUrls": [],
  "whyBespoked": "",
  "researchSummary": "",
  "emailSubject": "",
  "emailBody": "",
  "createdAt": "",
  "researchBatch": "",
  "tags": []
}
```

Speaking records support:

```json
{
  "leadLane": "speaking",
  "eventOrProgramName": "",
  "speakingGeographyType": "LOCAL | REGIONAL | NATIONAL | INTERNATIONAL",
  "researchReadiness": "READY_TO_CONTACT | CONTACT_NEEDED | WATCH",
  "opportunitySignal": "",
  "opportunityDate": null,
  "opportunityEvidenceUrls": [],
  "recommendedTalk": "A_LIFE_IN_HOSPITALITY | EXCEPTIONAL_TEAMS",
  "recommendedFormat": "KEYNOTE | WORKSHOP | MASTERCLASS | PANEL | GUEST_LECTURE | OTHER",
  "talkFitReason": "",
  "paidPotential": "HIGH | MEDIUM | LOW | UNKNOWN",
  "paidPotentialReason": "",
  "paidPotentialEvidenceUrls": [],
  "audienceFitScore": 0,
  "timingScore": 0,
  "decisionMakerScore": 0,
  "contactCertaintyScore": 0,
  "paidPotentialScore": 0,
  "strategicValueScore": 0,
  "overallScore": 0
}
```

Legacy V1 records are not deleted. The loader normalizes them for display:

- University, conference, tourism and public-institution records become Speaking leads.
- Hotel and restaurant-group records become Restaurant leads.
- Legacy operational offers display in V2 language where practical, for example `Hospitality Health Check` becomes `Team Diagnostic` and `On-Site Training` becomes `Team Intervention`.
- Missing V2 readiness is inferred from score, verified email and contact completeness.

## Review State

Review state is stored locally in the user's browser, separate from `leads.json`:

```json
{
  "lead-id": {
    "status": "APPROVED",
    "editedSubject": "...",
    "editedBody": "...",
    "notes": "...",
    "followUpDate": "2026-09-15",
    "contactedAt": "...",
    "interestedAt": "...",
    "updatedAt": "..."
  }
}
```

This means new pushes to `public/data/leads.json` do not overwrite the user's approval status, notes or edited drafts. Use Settings to export/import review-state backups.

## Research Workflow

Use the dashboard's Research Workflow page or `prompts/research-agent.md`.

Expected research process:

1. Research organizations.
2. Check existing leads for duplicates.
3. Identify decision maker.
4. Verify sources.
5. Find email if publicly available.
6. Identify trigger.
7. Match Bespoked offer.
8. Score lead.
9. Draft email.
10. Write results to `public/data/leads.json`.
11. Commit and push.

Never invent emails. If a public email is not found, use `contactEmail: null` and `emailStatus: "not_found"`.

## Local Development

```bash
cd bespoked-outreach
npm install
npm run dev
```

Open `http://localhost:3000`.

## Build Static Site

```bash
npm run lint
npm run build
```

With `output: "export"`, Next.js writes the static site to:

```text
out/
```

To test a repository subpath locally:

```bash
NEXT_PUBLIC_BASE_PATH=/bespoked-outreach npm run build
```

## GitHub Pages Deployment

The workflow is already configured:

```text
.github/workflows/deploy-pages.yml
```

Deployment behavior:

- push to `main`
- install dependencies
- build static app
- upload `out`
- deploy to GitHub Pages

In GitHub repository settings:

1. Go to **Settings -> Pages**.
2. Set **Build and deployment** source to **GitHub Actions**.
3. Push to `main`.
4. Wait for the **Deploy GitHub Pages** workflow.

The workflow sets:

```text
NEXT_PUBLIC_BASE_PATH=/${{ github.event.repository.name }}
```

This makes routes/assets work from a URL such as:

```text
https://USERNAME.github.io/bespoked-outreach/
```

## Updating Leads

1. Ask ChatGPT or Codex to use `prompts/research-agent.md`.
2. Add or append sourced leads in `public/data/leads.json`.
3. Validate/deduplicate the JSON.
4. Run:

```bash
npm run lint
npm run build
```

5. Commit and push to `main`.

## V2 Limitations

- Review state is local to one browser/device.
- There is no authentication.
- There is no shared database.
- There is no direct email sending.
- There is no reply monitoring.
- There is no email verification API.
- V1 records are normalized for display, but old records do not magically gain missing V2 evidence fields.
- GitHub Pages redeploys only after commits/pushes.

## Future V0.2 Possibilities

- Secure backend.
- IONOS SMTP sending.
- IONOS IMAP reply monitoring.
- Supabase/Postgres.
- Shared review state across devices.
- Authentication.
- Hunter or Apollo integrations.
- Scheduled follow-ups.
- Automated reply classification.
- CRM integrations.
- Analytics.
