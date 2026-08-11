import type { Lead, RawLead } from "./types";

export function compactLocation(lead: Pick<Lead | RawLead, "city" | "state" | "country">) {
  return [lead.city, lead.state, lead.country].filter(Boolean).join(", ") || "Location unknown";
}

export function shortDate(value: string | null) {
  if (!value) return "Unknown";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function downloadText(filename: string, text: string, type = "text/plain") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function createMailtoUrl(input: { recipient: string | null; subject: string; body: string }) {
  const params = new URLSearchParams({
    subject: input.subject,
    body: input.body
  });
  return `mailto:${encodeURIComponent(input.recipient || "")}?${params.toString()}`;
}
