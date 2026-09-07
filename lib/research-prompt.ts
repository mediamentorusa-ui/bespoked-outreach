import type { ResearchRequest } from "./types";

export function buildResearchPrompt(input: ResearchRequest) {
  return `Use prompts/research-agent.md as your V2 operating instructions for Bespoked Outreach research.

Research request:
- Legacy segment hint: ${input.segment}
- Geography hint: ${input.geography}
- Maximum requested records: ${input.count}
- Optional instructions: ${input.instructions || "None"}

V2 priority:
1. Prioritize restaurant revenue leads, especially San Diego and San Diego County.
2. Use speaking opportunities as a secondary lane only when strategic value or paid potential is credible.
3. Qualify by observable need/opportunity signal, Bespoked fit, relevant decision-maker, usable contact path and reason to act now.
4. Classify each record as READY_TO_CONTACT, CONTACT_NEEDED or WATCH.
5. Never add weak prospects to satisfy the requested count.

Workflow:
1. Read public/data/leads.json.
2. Research only high-quality, timely V2 prospects.
3. Avoid duplicates by organization, location, decision-maker and recent need signal.
4. Verify sources for every material claim.
5. Never invent or infer an email address.
6. Append only valid V2 lead records to public/data/leads.json, including legacy display fields until the dashboard UI is migrated.
7. Run npm run lint and npm run build.
8. Commit and push to main only when instructed.`;
}
