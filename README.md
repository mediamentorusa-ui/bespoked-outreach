# Bespoked Outreach

Bespoked Outreach is a static internal review dashboard for AI-assisted prospecting at Bespoked Hospitality. V0.1.1 is designed for a GitHub Pages workflow: research happens outside the app through ChatGPT or Codex, then structured lead data is committed to the repository and displayed by the dashboard.

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
- Local approval/rejection workflow stored separately from the research dataset.
- Editable email subject/body with `Reset to AI Draft`.
- Internal notes per lead.
- Mailto-based `Open Email`; no SMTP sending in V0.1.1.
- Source URLs displayed and clickable.
- Email certainty labels: `VERIFIED / PUBLIC`, `FOUND / UNCONFIRMED`, `NOT FOUND`.
- Dashboard stats, recent leads, priority leads and research batch summaries.
- Card and table views with filters and sorting.
- Export filtered leads to CSV.
- Export all leads to CSV.
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

Each lead must follow:

```json
{
  "id": "unique-id",
  "organizationName": "",
  "organizationType": "university | conference | hotel | restaurant_group | tourism_board | public_institution | other",
  "website": "",
  "city": "",
  "state": "",
  "country": "",
  "contactName": "",
  "contactTitle": "",
  "contactEmail": null,
  "emailStatus": "verified_public | found_unconfirmed | not_found",
  "emailSourceUrl": null,
  "sourceUrls": [],
  "trigger": "",
  "triggerDate": null,
  "triggerExplanation": "",
  "whyBespoked": "",
  "recommendedOffer": "Advisory Session | Hospitality Health Check | On-Site Training | Consulting / Transformation | Keynote | Workshop / Masterclass",
  "recommendedOfferReason": "",
  "fitScore": 0,
  "timingScore": 0,
  "contactScore": 0,
  "opportunityScore": 0,
  "confidenceScore": 0,
  "totalScore": 0,
  "researchSummary": "",
  "emailSubject": "",
  "emailBody": "",
  "createdAt": "",
  "researchBatch": "",
  "tags": []
}
```

If `totalScore` is missing, the dashboard calculates it with:

```text
30% Fit + 25% Timing + 20% Opportunity + 15% Contact + 10% Confidence
```

## Review State

Review state is stored locally in the user's browser, separate from `leads.json`:

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

## V0.1.1 Limitations

- Review state is local to one browser/device.
- There is no authentication.
- There is no shared database.
- There is no direct email sending.
- There is no reply monitoring.
- There is no email verification API.
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
