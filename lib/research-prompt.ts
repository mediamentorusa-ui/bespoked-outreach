import type { ResearchRequest } from "./types";

export function buildResearchPrompt(input: ResearchRequest) {
  return `Use prompts/research-agent.md as your operating instructions for Bespoked Outreach research.

Research request:
- Segment: ${input.segment}
- Geography: ${input.geography}
- Number of leads: ${input.count}
- Optional instructions: ${input.instructions || "None"}

Workflow:
1. Read public/data/leads.json.
2. Research high-quality timely prospects matching the request.
3. Avoid duplicates by organization and contact.
4. Verify sources for all material claims.
5. Never invent an email address.
6. Append valid lead records to public/data/leads.json using the exact dashboard schema.
7. Run npm run lint and npm run build.
8. Commit with a clear message and push to main so GitHub Pages redeploys.`;
}
