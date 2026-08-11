import { z } from "zod";
import { calculateTotalScore, clampScore } from "./scoring";

export const organizationTypeSchema = z.enum([
  "university",
  "conference",
  "hotel",
  "restaurant_group",
  "tourism_board",
  "public_institution",
  "other"
]);

export const segmentSchema = z.enum([
  "Universities",
  "Hospitality Schools",
  "Conferences",
  "Hotels",
  "Resorts",
  "Restaurant Groups",
  "Tourism Boards",
  "Public Institutions"
]);

export const offerSchema = z.enum([
  "Advisory Session",
  "Hospitality Health Check",
  "On-Site Training",
  "Consulting / Transformation",
  "Keynote",
  "Workshop / Masterclass"
]);

export const reviewStatusSchema = z.enum([
  "NEW",
  "APPROVED",
  "REJECTED",
  "CONTACTED",
  "INTERESTED",
  "FOLLOW_UP",
  "WON",
  "LOST"
]);

export const emailStatusSchema = z.enum([
  "verified_public",
  "found_unconfirmed",
  "not_found"
]);

const nullableString = z.union([z.string(), z.null()]).transform((value) => value || null);
const nullableUrl = z.union([z.string().url(), z.literal(""), z.null()]).transform((value) => value || null);
const nullableEmail = z.union([z.string().email(), z.literal(""), z.null()]).transform((value) => value || null);
const optionalScore = z.number().min(0).max(100).optional().default(0);

export const rawLeadSchema = z.object({
  id: z.string().min(1),
  organizationName: z.string().min(1),
  organizationType: organizationTypeSchema,
  website: nullableUrl,
  city: nullableString,
  state: nullableString,
  country: nullableString,
  contactName: nullableString,
  contactTitle: nullableString,
  contactEmail: nullableEmail,
  emailStatus: emailStatusSchema,
  emailSourceUrl: nullableUrl,
  sourceUrls: z.array(nullableUrl).default([]).transform((urls) => urls.filter((url): url is string => Boolean(url))),
  trigger: nullableString,
  triggerDate: nullableString,
  triggerExplanation: z.string().min(1),
  whyBespoked: z.string().min(1),
  recommendedOffer: offerSchema,
  recommendedOfferReason: z.string().min(1),
  fitScore: optionalScore,
  timingScore: optionalScore,
  contactScore: optionalScore,
  opportunityScore: optionalScore,
  confidenceScore: optionalScore,
  totalScore: z.number().min(0).max(100).optional(),
  researchSummary: z.string().min(1),
  emailSubject: z.string().min(1).max(160),
  emailBody: z.string().min(1).max(3000),
  createdAt: z.string().min(1),
  researchBatch: z.string().min(1),
  tags: z.array(z.string()).default([]),
  demo: z.boolean().optional().default(false)
});

export const datasetSchema = z.object({
  version: z.string().min(1),
  generatedAt: z.string().min(1),
  leads: z.array(z.unknown())
});

export const reviewStateSchema = z.object({
  status: reviewStatusSchema.default("NEW"),
  editedSubject: z.string().optional(),
  editedBody: z.string().optional(),
  notes: z.string().optional(),
  updatedAt: z.string().min(1)
});

export const reviewStateMapSchema = z.record(reviewStateSchema);

export type OrganizationType = z.infer<typeof organizationTypeSchema>;
export type Segment = z.infer<typeof segmentSchema>;
export type Offer = z.infer<typeof offerSchema>;
export type ReviewStatus = z.infer<typeof reviewStatusSchema>;
export type EmailStatus = z.infer<typeof emailStatusSchema>;
type ParsedLead = z.infer<typeof rawLeadSchema>;
export type RawLead = Omit<ParsedLead, "totalScore"> & { totalScore: number };
export type ReviewState = z.infer<typeof reviewStateSchema>;
export type ReviewStateMap = z.infer<typeof reviewStateMapSchema>;

export type Lead = RawLead & {
  status: ReviewStatus;
  editedSubject: string;
  editedBody: string;
  notes: string;
  updatedAt: string | null;
};

export type LeadDataset = {
  version: string;
  generatedAt: string;
  leads: RawLead[];
  invalidRecords: Array<{ index: number; reason: string }>;
};

export type ResearchRequest = {
  segment: Segment;
  geography: string;
  count: 5 | 10 | 20;
  instructions: string;
};

export const organizationTypes = organizationTypeSchema.options;
export const segments = segmentSchema.options;
export const offers = offerSchema.options;
export const reviewStatuses = reviewStatusSchema.options;
export const emailStatuses = emailStatusSchema.options;

export function normalizeLead(raw: ParsedLead): RawLead {
  const fitScore = clampScore(raw.fitScore);
  const timingScore = clampScore(raw.timingScore);
  const contactScore = clampScore(raw.contactScore);
  const opportunityScore = clampScore(raw.opportunityScore);
  const confidenceScore = clampScore(raw.confidenceScore);
  const totalScore =
    typeof raw.totalScore === "number"
      ? clampScore(raw.totalScore)
      : calculateTotalScore({ fitScore, timingScore, opportunityScore, contactScore, confidence: confidenceScore });

  const emailIsUsable = raw.emailStatus !== "not_found" && Boolean(raw.contactEmail);
  return {
    ...raw,
    contactEmail: emailIsUsable ? raw.contactEmail : null,
    emailSourceUrl: emailIsUsable ? raw.emailSourceUrl : null,
    sourceUrls: Array.from(new Set(raw.sourceUrls)),
    fitScore,
    timingScore,
    contactScore,
    opportunityScore,
    confidenceScore,
    totalScore
  };
}

export function mergeReviewState(lead: RawLead, review?: ReviewState): Lead {
  return {
    ...lead,
    status: review?.status || "NEW",
    editedSubject: review?.editedSubject ?? lead.emailSubject,
    editedBody: review?.editedBody ?? lead.emailBody,
    notes: review?.notes || "",
    updatedAt: review?.updatedAt || null
  };
}

export function classifyScore(totalScore: number) {
  if (totalScore >= 90) return { label: "A - PRIORITY", tone: "priority" as const };
  if (totalScore >= 75) return { label: "B - STRONG", tone: "strong" as const };
  if (totalScore >= 60) return { label: "C - POSSIBLE", tone: "possible" as const };
  return { label: "LOW PRIORITY", tone: "low" as const };
}

export function emailStatusLabel(status: EmailStatus) {
  if (status === "verified_public") return "VERIFIED / PUBLIC";
  if (status === "found_unconfirmed") return "FOUND / UNCONFIRMED";
  return "NOT FOUND";
}

export function organizationTypeLabel(type: OrganizationType) {
  return type
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
