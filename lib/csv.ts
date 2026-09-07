import type { Lead, ReviewStateMap } from "./types";

const leadFields: Array<keyof Lead> = [
  "id",
  "leadLane",
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
  "preferredContactRoute",
  "researchReadiness",
  "trigger",
  "triggerDate",
  "whyNow",
  "needSignalType",
  "needSignalSummary",
  "opportunitySignal",
  "recommendedOffer",
  "recommendedStage",
  "recommendedInterventionModule",
  "recommendedTalk",
  "recommendedFormat",
  "paidPotential",
  "paidPotentialReason",
  "fitScore",
  "timingScore",
  "contactScore",
  "opportunityScore",
  "confidenceScore",
  "totalScore",
  "overallScore",
  "status",
  "followUpDate",
  "contactedAt",
  "interestedAt",
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
