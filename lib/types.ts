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
  "Workshop / Masterclass",
  "Team Diagnostic",
  "Team Intervention",
  "Ongoing Advisory",
  "Paid Advisory Session",
  "A Life in Hospitality",
  "Exceptional Teams"
]);

export const reviewStatusSchema = z.enum([
  "NEW",
  "APPROVED",
  "REJECTED",
  "DISMISSED",
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

const emailStatusInputSchema = z
  .enum(["verified_public", "found_unconfirmed", "not_found", "VERIFIED_PUBLIC", "FOUND_UNCONFIRMED", "NOT_FOUND"])
  .transform((value) => value.toLowerCase() as z.infer<typeof emailStatusSchema>);

export const leadLaneSchema = z.enum(["restaurant", "speaking"]);
export const geographicTierSchema = z.enum([
  "TIER_1_LOCAL_CORE",
  "TIER_2_REGIONAL",
  "TIER_3_CALIFORNIA_OPPORTUNITY",
  "OUT_OF_SCOPE"
]);
export const speakingGeographyTypeSchema = z.enum(["LOCAL", "REGIONAL", "NATIONAL", "INTERNATIONAL"]);
export const researchReadinessSchema = z.enum(["READY_TO_CONTACT", "CONTACT_NEEDED", "WATCH"]);
export const recommendedStageSchema = z.enum(["DIAGNOSE", "INTERVENE", "REINFORCE", "ADVISORY_SESSION"]);
export const interventionModuleSchema = z.enum([
  "LEADER_OPERATING_RHYTHM",
  "STANDARDS_FLOW_PRESSURE",
  "DIFFICULT_GUESTS_RECOVERY",
  "HIRING_ONBOARDING"
]);
export const frameworkDimensionSchema = z.enum([
  "Right People for This House",
  "A House Worth Belonging To",
  "Leaders Who Create the Conditions",
  "Standards That Enable Ownership",
  "One Team, Especially Under Pressure",
  "Bring the House to Life"
]);
export const recommendedTalkSchema = z.enum(["A_LIFE_IN_HOSPITALITY", "EXCEPTIONAL_TEAMS"]);
export const recommendedFormatSchema = z.enum(["KEYNOTE", "WORKSHOP", "MASTERCLASS", "PANEL", "GUEST_LECTURE", "OTHER"]);
export const paidPotentialSchema = z.enum(["HIGH", "MEDIUM", "LOW", "UNKNOWN"]);

const nullableString = z.union([z.string(), z.null()]).transform((value) => value || null);
const nullableUrl = z.union([z.string().url(), z.literal(""), z.null()]).transform((value) => value || null);
const nullableEmail = z.union([z.string().email(), z.literal(""), z.null()]).transform((value) => value || null);
const nullableNumber = z.union([z.number().int().nonnegative(), z.null()]).optional().default(null);
const optionalScore = z.number().min(0).max(100).optional().default(0);
const optionalV2Score = z.number().min(0).max(100).optional();
const optionalNullableString = nullableString.optional().default(null);
const optionalString = z.string().optional().default("");
const optionalUrlArray = z
  .array(nullableUrl)
  .optional()
  .default([])
  .transform((urls) => urls.filter((url): url is string => Boolean(url)));

export const rawLeadSchema = z.object({
  id: z.string().min(1),
  organizationName: z.string().min(1),
  organizationType: organizationTypeSchema,
  website: nullableUrl,
  city: nullableString,
  state: nullableString,
  country: nullableString,
  contactName: optionalNullableString,
  contactTitle: optionalNullableString,
  contactEmail: nullableEmail,
  emailStatus: emailStatusInputSchema,
  emailSourceUrl: nullableUrl.optional().default(null),
  preferredContactRoute: optionalNullableString,
  sourceUrls: optionalUrlArray,
  trigger: optionalNullableString,
  triggerDate: optionalNullableString,
  triggerExplanation: optionalString,
  whyBespoked: z.string().min(1),
  whyNow: optionalString,
  recommendedOffer: offerSchema.optional(),
  recommendedOfferReason: optionalString,
  fitScore: optionalScore,
  timingScore: optionalScore,
  contactScore: optionalScore,
  opportunityScore: optionalScore,
  confidenceScore: optionalScore,
  totalScore: z.number().min(0).max(100).optional(),
  leadLane: leadLaneSchema.optional(),
  geographicTier: geographicTierSchema.optional(),
  geographicFitScore: optionalV2Score,
  restaurantFormat: optionalNullableString,
  locationCount: nullableNumber,
  scaleSummary: optionalNullableString,
  researchReadiness: researchReadinessSchema.optional(),
  needSignalType: optionalNullableString,
  needSignalSummary: optionalString,
  needSignalDate: optionalNullableString,
  needSignalEvidenceUrls: optionalUrlArray,
  likelyFrameworkDimensions: z.array(frameworkDimensionSchema).optional().default([]),
  recommendedStage: recommendedStageSchema.optional(),
  recommendedInterventionModule: interventionModuleSchema.optional(),
  commercialFitScore: optionalV2Score,
  needSignalScore: optionalV2Score,
  decisionMakerScore: optionalV2Score,
  contactCertaintyScore: optionalV2Score,
  offerFitScore: optionalV2Score,
  overallScore: optionalV2Score,
  researchConfidence: optionalV2Score,
  eventOrProgramName: optionalNullableString,
  speakingGeographyType: speakingGeographyTypeSchema.optional(),
  opportunitySignal: optionalString,
  opportunityDate: optionalNullableString,
  opportunityEvidenceUrls: optionalUrlArray,
  recommendedTalk: recommendedTalkSchema.optional(),
  recommendedFormat: recommendedFormatSchema.optional(),
  talkFitReason: optionalString,
  paidPotential: paidPotentialSchema.optional(),
  paidPotentialReason: optionalString,
  paidPotentialEvidenceUrls: optionalUrlArray,
  audienceFitScore: optionalV2Score,
  paidPotentialScore: optionalV2Score,
  strategicValueScore: optionalV2Score,
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
  followUpDate: z.string().optional(),
  contactedAt: z.string().optional(),
  interestedAt: z.string().optional(),
  updatedAt: z.string().min(1)
}).passthrough();

export const reviewStateMapSchema = z.record(reviewStateSchema);

export type OrganizationType = z.infer<typeof organizationTypeSchema>;
export type Segment = z.infer<typeof segmentSchema>;
export type Offer = z.infer<typeof offerSchema>;
export type ReviewStatus = z.infer<typeof reviewStatusSchema>;
export type EmailStatus = z.infer<typeof emailStatusSchema>;
type ParsedLead = z.infer<typeof rawLeadSchema>;
type LeadInput = z.input<typeof rawLeadSchema>;
export type LeadLane = z.infer<typeof leadLaneSchema>;
export type GeographicTier = z.infer<typeof geographicTierSchema>;
export type SpeakingGeographyType = z.infer<typeof speakingGeographyTypeSchema>;
export type ResearchReadiness = z.infer<typeof researchReadinessSchema>;
export type RecommendedStage = z.infer<typeof recommendedStageSchema>;
export type InterventionModule = z.infer<typeof interventionModuleSchema>;
export type FrameworkDimension = z.infer<typeof frameworkDimensionSchema>;
export type RecommendedTalk = z.infer<typeof recommendedTalkSchema>;
export type RecommendedFormat = z.infer<typeof recommendedFormatSchema>;
export type PaidPotential = z.infer<typeof paidPotentialSchema>;
export type RawLead = Omit<ParsedLead, "recommendedOffer" | "recommendedOfferReason" | "totalScore" | "trigger" | "triggerDate" | "triggerExplanation"> & {
  recommendedOffer: Offer;
  recommendedOfferReason: string;
  totalScore: number;
  trigger: string | null;
  triggerDate: string | null;
  triggerExplanation: string;
};
export type ReviewState = z.infer<typeof reviewStateSchema>;
export type ReviewStateMap = z.infer<typeof reviewStateMapSchema>;

export type Lead = RawLead & {
  status: ReviewStatus;
  editedSubject: string;
  editedBody: string;
  notes: string;
  followUpDate: string;
  contactedAt: string | null;
  interestedAt: string | null;
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

function inferRecommendedOffer(raw: ParsedLead): Offer {
  if (raw.recommendedOffer) return raw.recommendedOffer;
  if (raw.recommendedStage === "DIAGNOSE") return "Team Diagnostic";
  if (raw.recommendedStage === "INTERVENE") return "Team Intervention";
  if (raw.recommendedStage === "REINFORCE") return "Ongoing Advisory";
  if (raw.recommendedStage === "ADVISORY_SESSION") return "Paid Advisory Session";
  if (raw.recommendedTalk === "A_LIFE_IN_HOSPITALITY") return "A Life in Hospitality";
  if (raw.recommendedTalk === "EXCEPTIONAL_TEAMS") return "Exceptional Teams";
  return "Advisory Session";
}

function inferRecommendedOfferReason(raw: ParsedLead) {
  return raw.recommendedOfferReason || raw.talkFitReason || raw.whyNow || raw.needSignalSummary || raw.researchSummary;
}

function inferLeadLane(raw: ParsedLead): LeadLane {
  if (raw.leadLane) return raw.leadLane;
  if (
    raw.organizationType === "restaurant_group" ||
    raw.organizationType === "hotel" ||
    raw.recommendedOffer === "Team Diagnostic" ||
    raw.recommendedOffer === "Team Intervention" ||
    raw.recommendedOffer === "Ongoing Advisory" ||
    raw.recommendedOffer === "Paid Advisory Session"
  ) {
    return "restaurant";
  }
  return "speaking";
}

function inferResearchReadiness(raw: ParsedLead, totalScore: number): ResearchReadiness {
  if (raw.researchReadiness) return raw.researchReadiness;
  const hasUsableContact = raw.emailStatus === "verified_public" && Boolean(raw.contactEmail) && Boolean(raw.contactName || raw.contactTitle);
  if (hasUsableContact && totalScore >= 70) return "READY_TO_CONTACT";
  if (!hasUsableContact && totalScore >= 60) return "CONTACT_NEEDED";
  return "WATCH";
}

function inferOverallScore(raw: ParsedLead, totalScore: number) {
  if (typeof raw.overallScore === "number") return clampScore(raw.overallScore);
  return totalScore;
}

export function normalizeLead(input: ParsedLead | LeadInput): RawLead {
  const raw = rawLeadSchema.parse(input);
  const fitScore = clampScore(raw.fitScore || raw.commercialFitScore || raw.audienceFitScore || raw.offerFitScore || 0);
  const timingScore = clampScore(raw.timingScore || raw.needSignalScore || raw.strategicValueScore || 0);
  const contactScore = clampScore(raw.contactScore || raw.contactCertaintyScore || raw.decisionMakerScore || 0);
  const opportunityScore = clampScore(raw.opportunityScore || raw.needSignalScore || raw.paidPotentialScore || 0);
  const confidenceScore = clampScore(raw.confidenceScore || raw.researchConfidence || 0);
  const totalScore =
    typeof raw.totalScore === "number"
      ? clampScore(raw.totalScore)
      : typeof raw.overallScore === "number"
        ? clampScore(raw.overallScore)
      : calculateTotalScore({ fitScore, timingScore, opportunityScore, contactScore, confidence: confidenceScore });

  const emailIsUsable = raw.emailStatus !== "not_found" && Boolean(raw.contactEmail);
  const trigger = raw.trigger || raw.needSignalType || raw.opportunitySignal || null;
  const triggerDate = raw.triggerDate || raw.needSignalDate || raw.opportunityDate || null;
  const triggerExplanation = raw.triggerExplanation || raw.needSignalSummary || raw.whyNow || raw.opportunitySignal || raw.researchSummary;
  const sourceUrls = Array.from(
    new Set([...raw.sourceUrls, ...raw.needSignalEvidenceUrls, ...raw.opportunityEvidenceUrls, ...raw.paidPotentialEvidenceUrls])
  );
  const leadLane = inferLeadLane(raw);
  const overallScore = inferOverallScore(raw, totalScore);
  const researchReadiness = inferResearchReadiness(raw, overallScore);

  return {
    ...raw,
    leadLane,
    researchReadiness,
    overallScore,
    contactEmail: emailIsUsable ? raw.contactEmail : null,
    emailSourceUrl: emailIsUsable ? raw.emailSourceUrl : null,
    sourceUrls,
    trigger,
    triggerDate,
    triggerExplanation,
    recommendedOffer: inferRecommendedOffer(raw),
    recommendedOfferReason: inferRecommendedOfferReason(raw),
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
    followUpDate: review?.followUpDate || "",
    contactedAt: review?.contactedAt || null,
    interestedAt: review?.interestedAt || null,
    updatedAt: review?.updatedAt || null
  };
}

export function classifyScore(totalScore: number) {
  if (totalScore >= 90) return { label: "HIGH PRIORITY", tone: "priority" as const };
  if (totalScore >= 75) return { label: "STRONG", tone: "strong" as const };
  if (totalScore >= 60) return { label: "POSSIBLE", tone: "possible" as const };
  return { label: "LOW PRIORITY", tone: "low" as const };
}

export function emailStatusLabel(status: EmailStatus) {
  if (status === "verified_public") return "Verified";
  if (status === "found_unconfirmed") return "Needs verification";
  return "Not found";
}

export function organizationTypeLabel(type: OrganizationType) {
  return type
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
