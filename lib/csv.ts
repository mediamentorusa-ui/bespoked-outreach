import type { Lead, ReviewStateMap } from "./types";

const leadFields: Array<keyof Lead> = [
  "id",
  "organizationName",
  "organizationType",
  "website",
  "city",
  "state",
  "country",
  "contactName",
  "contactTitle",
  "contactEmail",
  "emailStatus",
  "emailSourceUrl",
  "trigger",
  "triggerDate",
  "recommendedOffer",
  "fitScore",
  "timingScore",
  "contactScore",
  "opportunityScore",
  "confidenceScore",
  "totalScore",
  "status",
  "researchBatch",
  "createdAt",
  "tags",
  "notes"
];

function escapeCsv(value: unknown) {
  const text = Array.isArray(value) ? value.join(" | ") : String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export function leadsToCsv(leads: Lead[]) {
  return [
    leadFields.join(","),
    ...leads.map((lead) => leadFields.map((field) => escapeCsv(lead[field])).join(","))
  ].join("\n");
}

export function reviewStateToJson(reviewState: ReviewStateMap) {
  return JSON.stringify(reviewState, null, 2);
}
