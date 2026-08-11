import { datasetSchema, normalizeLead, rawLeadSchema, type LeadDataset } from "./types";

function basePath() {
  return process.env.NEXT_PUBLIC_BASE_PATH || "";
}

export async function loadLeadDataset(): Promise<LeadDataset> {
  const response = await fetch(`${basePath()}/data/leads.json`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Unable to load lead dataset (${response.status}).`);
  }

  const parsed = datasetSchema.parse(await response.json());
  const leads: LeadDataset["leads"] = [];
  const invalidRecords: LeadDataset["invalidRecords"] = [];

  parsed.leads.forEach((item, index) => {
    const result = rawLeadSchema.safeParse(item);
    if (result.success) {
      leads.push(normalizeLead(result.data));
    } else {
      invalidRecords.push({
        index,
        reason: result.error.issues.map((issue) => `${issue.path.join(".") || "record"}: ${issue.message}`).join("; ")
      });
    }
  });

  return {
    version: parsed.version,
    generatedAt: parsed.generatedAt,
    leads,
    invalidRecords
  };
}
