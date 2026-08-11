import type { RawLead } from "./types";
import { normalizeLead } from "./types";

const now = "2026-08-11T09:00:00.000Z";

export const demoLeads: RawLead[] = [
  normalizeLead({
    id: "demo-university-hospitality-program",
    organizationName: "Crescent State University Hospitality Program",
    organizationType: "university",
    website: "https://example.edu/hospitality",
    city: "New Orleans",
    state: "Louisiana",
    country: "United States",
    contactName: null,
    contactTitle: "Program Director",
    contactEmail: null,
    emailStatus: "not_found",
    emailSourceUrl: null,
    sourceUrls: ["https://example.edu/hospitality", "https://example.edu/events"],
    trigger: "Upcoming fall speaker series planning",
    triggerDate: null,
    triggerExplanation:
      "DEMO DATA: The program appears to be planning outside industry sessions for students. The specific decision maker and email are intentionally not represented as verified.",
    whyBespoked:
      "The hospitality vs service point of view fits student and emerging-leader education without sounding like a generic career talk.",
    recommendedOffer: "Workshop / Masterclass",
    recommendedOfferReason:
      "An interactive masterclass would let students work through practical guest-experience and leadership behaviors.",
    fitScore: 84,
    timingScore: 78,
    contactScore: 48,
    opportunityScore: 68,
    confidenceScore: 55,
    totalScore: undefined,
    researchSummary:
      "DEMO DATA: A hospitality program looking for external industry perspective, with a likely education-oriented trigger.",
    emailSubject: "Hospitality culture session for your students",
    emailBody:
      "I noticed your hospitality program is building industry-facing student sessions this fall.\n\nAt Bespoked, we focus on the part of hospitality that sits between service standards and how guests actually feel: culture, ownership, leadership and the habits that show up in the room.\n\nLucas Ketir brings about 15 years of hands-on international hospitality experience, including high-level hotel and restaurant environments. A practical workshop on hospitality vs service could give students a grounded view of what strong guest experience looks like in real operations.\n\nWould it be useful to share a short outline?",
    createdAt: now,
    researchBatch: "demo-2026-08-11",
    tags: ["demo", "education"],
    demo: true
  }),
  normalizeLead({
    id: "demo-conference-speaker-program",
    organizationName: "Independent Lodging Leadership Forum",
    organizationType: "conference",
    website: "https://example.com/lodging-forum",
    city: "Austin",
    state: "Texas",
    country: "United States",
    contactName: null,
    contactTitle: "Programming Director",
    contactEmail: null,
    emailStatus: "not_found",
    emailSourceUrl: null,
    sourceUrls: ["https://example.com/lodging-forum/speakers"],
    trigger: "Speaker programming appears open for the next forum",
    triggerDate: null,
    triggerExplanation:
      "DEMO DATA: A conference with active programming is a natural timing signal for a keynote or leadership session.",
    whyBespoked:
      "Bespoked can bring a practical, operator-led perspective on hospitality culture rather than a software or generic management angle.",
    recommendedOffer: "Keynote",
    recommendedOfferReason:
      "The audience likely benefits from a clear point of view on hospitality culture, leadership and consistency across teams.",
    fitScore: 80,
    timingScore: 86,
    contactScore: 45,
    opportunityScore: 72,
    confidenceScore: 58,
    totalScore: undefined,
    researchSummary:
      "DEMO DATA: A conference prospect where the strongest reason to contact is timely speaker programming.",
    emailSubject: "Possible keynote for the lodging forum",
    emailBody:
      "I saw that the lodging forum is shaping its speaker program, and the timing caught my attention.\n\nBespoked works with hospitality teams on the human side of consistency: how culture, leadership and standards become visible in the guest experience. Lucas Ketir's background is operational and international, so the talk is practical rather than abstract.\n\nA keynote around hospitality vs service, or leadership without title, could fit an audience of operators and emerging leaders.\n\nWould you be open to a brief speaker outline?",
    createdAt: now,
    researchBatch: "demo-2026-08-11",
    tags: ["demo", "speaking"],
    demo: true
  }),
  normalizeLead({
    id: "demo-hotel-group-expansion",
    organizationName: "Harbor House Collection",
    organizationType: "hotel",
    website: "https://example.com/harbor-house",
    city: "Charleston",
    state: "South Carolina",
    country: "United States",
    contactName: null,
    contactTitle: "Director of Operations",
    contactEmail: null,
    emailStatus: "not_found",
    emailSourceUrl: null,
    sourceUrls: ["https://example.com/harbor-house/news"],
    trigger: "Planned new boutique property",
    triggerDate: null,
    triggerExplanation:
      "DEMO DATA: Expansion can expose inconsistent standards, leadership gaps and uneven guest experience across properties.",
    whyBespoked:
      "Bespoked is well matched to boutique hospitality groups where brand feeling and day-to-day operations have to stay aligned.",
    recommendedOffer: "Hospitality Health Check",
    recommendedOfferReason:
      "A health check is a practical first step before recommending a larger operational or culture project.",
    fitScore: 88,
    timingScore: 82,
    contactScore: 52,
    opportunityScore: 82,
    confidenceScore: 62,
    totalScore: undefined,
    researchSummary:
      "DEMO DATA: A boutique hotel group expansion scenario with clear operational and culture relevance.",
    emailSubject: "A practical check before the next opening",
    emailBody:
      "I came across the planned new property and thought the timing was worth a note.\n\nGrowth often makes small hospitality inconsistencies visible: the standards may be written down, but the guest still feels the gaps in leadership rhythm, team ownership and service habits.\n\nAt Bespoked, we help hotel teams look at that layer with a practical operator's eye. A focused hospitality health check before opening could identify where the experience is strong and where habits may need tightening before they scale.\n\nWould a short conversation be useful?",
    createdAt: now,
    researchBatch: "demo-2026-08-11",
    tags: ["demo", "hotel"],
    demo: true
  })
];
