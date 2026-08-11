"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  FileJson,
  Mail,
  RefreshCcw,
  Search,
  Settings,
  SlidersHorizontal,
  Trash2,
  X
} from "lucide-react";
import { leadsToCsv, reviewStateToJson } from "@/lib/csv";
import { loadLeadDataset } from "@/lib/data-source";
import { demoLeads } from "@/lib/demo-data";
import { buildResearchPrompt } from "@/lib/research-prompt";
import {
  defaultPreferences,
  preferenceStore,
  reviewStore,
  type Preferences
} from "@/lib/storage";
import {
  classifyScore,
  emailStatusLabel,
  emailStatuses,
  mergeReviewState,
  offers,
  organizationTypeLabel,
  organizationTypes,
  reviewStatuses,
  segments,
  type EmailStatus,
  type Lead,
  type LeadDataset,
  type Offer,
  type OrganizationType,
  type ResearchRequest,
  type ReviewStateMap,
  type ReviewStatus,
  type Segment
} from "@/lib/types";
import { compactLocation, createMailtoUrl, downloadText, shortDate } from "@/lib/utils";

type View = "dashboard" | "leads" | "approved" | "settings" | "research";

type Filters = {
  organizationType: "All" | OrganizationType;
  offer: "All" | Offer;
  status: "All" | ReviewStatus;
  score: "All" | "A" | "B" | "C" | "Low";
  state: string;
  hasEmail: boolean;
  emailStatus: "All" | EmailStatus;
  researchBatch: "All" | string;
  search: string;
  sort: "Highest Score" | "Newest" | "Fit" | "Timing" | "Organization Name";
};

const defaultFilters: Filters = {
  organizationType: "All",
  offer: "All",
  status: "All",
  score: "All",
  state: "",
  hasEmail: false,
  emailStatus: "All",
  researchBatch: "All",
  search: "",
  sort: "Highest Score"
};

const geographyOptions = ["United States", "Louisiana", "Texas", "California", "Florida", "New York", "Northeast", "Southeast", "Nationwide"];

export function OutreachApp({ initialView }: { initialView: View }) {
  const [view] = useState<View>(initialView);
  const [dataset, setDataset] = useState<LeadDataset | null>(null);
  const [reviewState, setReviewState] = useState<ReviewStateMap>({});
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [displayMode, setDisplayMode] = useState<"cards" | "table">("cards");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reviewInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [loadedDataset, storedPrefs, storedReviewState] = await Promise.all([
          loadLeadDataset(),
          Promise.resolve(preferenceStore.get()),
          Promise.resolve(reviewStore.all())
        ]);
        if (!active) return;
        setDataset(loadedDataset);
        setPreferences(storedPrefs);
        setReviewState(storedReviewState);
        if (loadedDataset.invalidRecords.length > 0) {
          setError(`${loadedDataset.invalidRecords.length} malformed lead record(s) were skipped. Check public/data/leads.json.`);
        }
      } catch (caught) {
        if (!active) return;
        setDataset({ version: "0.1", generatedAt: "Unavailable", leads: [], invalidRecords: [] });
        setPreferences(preferenceStore.get());
        setReviewState(reviewStore.all());
        setError(caught instanceof Error ? caught.message : "Unable to load public/data/leads.json.");
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  const rawLeads = useMemo(() => {
    const base = dataset?.leads || [];
    return preferences.showDemoData ? [...base, ...demoLeads] : base;
  }, [dataset, preferences.showDemoData]);

  const leads = useMemo(() => rawLeads.map((lead) => mergeReviewState(lead, reviewState[lead.id])), [rawLeads, reviewState]);
  const selectedLead = useMemo(() => leads.find((lead) => lead.id === selectedId) || null, [leads, selectedId]);
  const filteredLeads = useMemo(() => applyFilters(leads, filters, view), [leads, filters, view]);
  const batchSummaries = useMemo(() => summarizeBatches(leads), [leads]);
  const stats = useMemo(() => calculateStats(leads, dataset?.generatedAt || "Unavailable", batchSummaries), [leads, dataset, batchSummaries]);

  function updateReview(leadId: string, patch: Parameters<typeof reviewStore.update>[1]) {
    const next = reviewStore.update(leadId, patch);
    setReviewState(next);
  }

  async function copyEmail(lead: Lead) {
    await navigator.clipboard.writeText(`Subject: ${lead.editedSubject}\n\n${lead.editedBody}`);
    setNotice("Email copied to clipboard.");
  }

  function openEmail(lead: Lead) {
    if (!lead.contactEmail) return;
    window.location.href = createMailtoUrl({
      recipient: lead.contactEmail,
      subject: lead.editedSubject,
      body: lead.editedBody
    });
  }

  function resetDraft(lead: Lead) {
    updateReview(lead.id, {
      editedSubject: lead.emailSubject,
      editedBody: lead.emailBody
    });
    setNotice("Draft reset to the AI-generated version from leads.json.");
  }

  function exportFilteredCsv() {
    downloadText("bespoked-outreach-filtered-leads.csv", leadsToCsv(filteredLeads), "text/csv");
  }

  function exportAllCsv() {
    downloadText("bespoked-outreach-all-leads.csv", leadsToCsv(leads), "text/csv");
  }

  function exportReviewState() {
    downloadText("bespoked-outreach-review-state.json", reviewStateToJson(reviewState), "application/json");
  }

  async function importReviewState(file: File | undefined) {
    if (!file) return;
    try {
      const next = reviewStore.importJson(await file.text());
      setReviewState(next);
      setNotice("Review state imported.");
    } catch {
      setError("Review-state import failed. Use a JSON backup exported by this dashboard.");
    }
  }

  function resetReviewData() {
    if (!window.confirm("Reset all local review status, edited drafts and notes? This does not change leads.json.")) return;
    reviewStore.clear();
    setReviewState({});
    setSelectedId(null);
    setNotice("Local review data reset.");
  }

  function savePreferences(next: Preferences) {
    setPreferences(next);
    preferenceStore.save(next);
    setNotice("Preferences saved.");
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-charcoal/10 bg-porcelain/75 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 md:flex-row md:items-center md:justify-between">
          <Link href="/" className="group">
            <p className="sans text-[11px] uppercase tracking-[0.28em] text-brass">Bespoked Hospitality</p>
            <h1 className="text-3xl leading-tight text-charcoal md:text-4xl">Bespoked Outreach</h1>
          </Link>
          <nav className="sans flex flex-wrap gap-2 text-sm">
            <NavLink href="/" active={view === "dashboard"} label="Dashboard" />
            <NavLink href="/leads/" active={view === "leads"} label="Leads" />
            <NavLink href="/approved/" active={view === "approved"} label="Approved" />
            <NavLink href="/settings/" active={view === "settings"} label="Settings" />
          </nav>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-8 px-5 py-8 lg:grid-cols-[minmax(0,1fr)_410px]">
        <section className="min-w-0">
          {notice ? <Banner tone="notice" text={notice} onClose={() => setNotice(null)} /> : null}
          {error ? <Banner tone="error" text={error} onClose={() => setError(null)} /> : null}
          {view === "dashboard" ? (
            <Dashboard
              stats={stats}
              leads={leads}
              batchSummaries={batchSummaries}
              selectLead={setSelectedId}
            />
          ) : null}
          {view === "leads" || view === "approved" ? (
            <LeadsPage
              title={view === "approved" ? "Approved Leads" : "Leads"}
              leads={filteredLeads}
              allLeads={leads}
              batchSummaries={batchSummaries}
              filters={filters}
              setFilters={setFilters}
              displayMode={displayMode}
              setDisplayMode={setDisplayMode}
              selectLead={setSelectedId}
              updateReview={updateReview}
              exportFilteredCsv={exportFilteredCsv}
              exportAllCsv={exportAllCsv}
              exportReviewState={exportReviewState}
              requestImport={() => reviewInput.current?.click()}
            />
          ) : null}
          {view === "settings" ? (
            <SettingsPage
              preferences={preferences}
              savePreferences={savePreferences}
              dataset={dataset}
              reviewState={reviewState}
              exportReviewState={exportReviewState}
              requestImport={() => reviewInput.current?.click()}
              resetReviewData={resetReviewData}
            />
          ) : null}
          {view === "research" ? (
            <ResearchWorkflowPage preferences={preferences} setNotice={setNotice} />
          ) : null}
          <input
            ref={reviewInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => void importReviewState(event.target.files?.[0])}
          />
        </section>

        <aside className="min-w-0">
          <LeadDetail
            lead={selectedLead}
            updateReview={updateReview}
            copyEmail={copyEmail}
            openEmail={openEmail}
            resetDraft={resetDraft}
            close={() => setSelectedId(null)}
          />
        </aside>
      </main>
    </div>
  );
}

function NavLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={`focus-ring rounded-sm border px-3 py-2 transition ${
        active ? "border-charcoal bg-charcoal text-porcelain" : "border-charcoal/10 bg-transparent text-ink hover:border-charcoal/30"
      }`}
    >
      {label}
    </Link>
  );
}

function Banner({ tone, text, onClose }: { tone: "notice" | "error"; text: string; onClose: () => void }) {
  return (
    <div
      className={`sans mb-5 flex items-start justify-between gap-4 border px-4 py-3 text-sm ${
        tone === "error" ? "border-clay/40 bg-clay/10 text-charcoal" : "border-sage/30 bg-sage/10 text-charcoal"
      }`}
    >
      <span>{text}</span>
      <button type="button" onClick={onClose} className="focus-ring text-charcoal/70 hover:text-charcoal" aria-label="Close">
        <X size={16} />
      </button>
    </div>
  );
}

function Dashboard({
  stats,
  leads,
  batchSummaries,
  selectLead
}: {
  stats: ReturnType<typeof calculateStats>;
  leads: Lead[];
  batchSummaries: BatchSummary[];
  selectLead: (id: string) => void;
}) {
  const recent = [...leads].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  const priority = [...leads].sort((a, b) => b.totalScore - a.totalScore).slice(0, 5);

  return (
    <div className="space-y-8">
      <section>
        <p className="sans text-xs uppercase tracking-[0.28em] text-brass">Static research dashboard</p>
        <div className="mt-3 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <h2 className="max-w-3xl text-5xl leading-[0.98] text-charcoal md:text-7xl">Review the leads. Keep the judgment human.</h2>
            <p className="sans mt-5 max-w-2xl text-base leading-7 text-ink">
              Research is generated externally by ChatGPT or Codex, committed to <code>public/data/leads.json</code>, and reviewed here without API keys, SMTP credentials or a backend.
            </p>
          </div>
          <Link href="/research/" className="sans focus-ring border border-charcoal bg-charcoal px-5 py-3 text-sm font-semibold text-porcelain hover:bg-ink">
            Research Workflow
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Stat label="Total Leads" value={stats.total} />
        <Stat label="Priority A Leads" value={stats.priority} />
        <Stat label="Approved" value={stats.approved} />
        <Stat label="Contacted" value={stats.contacted} />
        <Stat label="Interested" value={stats.interested} />
        <Stat label="Average Lead Score" value={stats.averageScore} />
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <InfoPanel title="Newest research batch" value={stats.newestBatch || "None"} detail={`${batchSummaries[0]?.count || 0} leads in latest batch`} />
        <InfoPanel title="Last dataset update" value={shortDate(stats.generatedAt)} detail={stats.generatedAt} />
      </section>

      <BatchSummaryPanel batches={batchSummaries} />

      <LeadListSection title="Recent Leads" leads={recent} selectLead={selectLead} />
      <LeadListSection title="Highest Priority Leads" leads={priority} selectLead={selectLead} />
    </div>
  );
}

function LeadListSection({ title, leads, selectLead }: { title: string; leads: Lead[]; selectLead: (id: string) => void }) {
  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="sans text-xs uppercase tracking-[0.24em] text-brass">{title}</p>
          <h3 className="mt-1 text-3xl">Review queue</h3>
        </div>
        <Link href="/leads/" className="sans focus-ring border border-charcoal/20 px-3 py-2 text-sm hover:border-charcoal">
          View all
        </Link>
      </div>
      <div className="grid gap-3">
        {leads.map((lead) => (
          <LeadRow key={lead.id} lead={lead} onOpen={() => selectLead(lead.id)} compact />
        ))}
        {leads.length === 0 ? <EmptyState text="No leads in public/data/leads.json yet." /> : null}
      </div>
    </section>
  );
}

function BatchSummaryPanel({ batches }: { batches: BatchSummary[] }) {
  return (
    <section className="border border-charcoal/10 bg-porcelain p-5 shadow-quiet">
      <div className="mb-4">
        <p className="sans text-xs uppercase tracking-[0.24em] text-brass">Research Batches</p>
        <h3 className="mt-1 text-3xl">Dataset runs</h3>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {batches.slice(0, 4).map((batch) => (
          <div key={batch.name} className="sans border border-charcoal/10 bg-paper p-4 text-sm">
            <p className="font-semibold text-charcoal">{batch.name}</p>
            <p className="mt-1 text-ink">{shortDate(batch.date)} · {batch.count} leads · avg {batch.averageScore}</p>
          </div>
        ))}
        {batches.length === 0 ? <p className="sans text-sm text-ink">No research batches yet.</p> : null}
      </div>
    </section>
  );
}

function LeadsPage(props: {
  title: string;
  leads: Lead[];
  allLeads: Lead[];
  batchSummaries: BatchSummary[];
  filters: Filters;
  setFilters: (filters: Filters) => void;
  displayMode: "cards" | "table";
  setDisplayMode: (mode: "cards" | "table") => void;
  selectLead: (id: string) => void;
  updateReview: (id: string, patch: Parameters<typeof reviewStore.update>[1]) => void;
  exportFilteredCsv: () => void;
  exportAllCsv: () => void;
  exportReviewState: () => void;
  requestImport: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="sans text-xs uppercase tracking-[0.24em] text-brass">Pipeline</p>
          <h2 className="mt-1 text-5xl">{props.title}</h2>
        </div>
        <div className="sans flex flex-wrap gap-2">
          <IconButton icon={<Download size={16} />} label="Export Filtered CSV" onClick={props.exportFilteredCsv} />
          <IconButton icon={<Download size={16} />} label="Export All CSV" onClick={props.exportAllCsv} />
          <IconButton icon={<FileJson size={16} />} label="Export Review JSON" onClick={props.exportReviewState} />
          <IconButton icon={<FileJson size={16} />} label="Import Review JSON" onClick={props.requestImport} />
        </div>
      </div>
      <FiltersPanel filters={props.filters} setFilters={props.setFilters} batchSummaries={props.batchSummaries} />
      <div className="sans flex items-center justify-between">
        <p className="text-sm text-ink">{props.leads.length} of {props.allLeads.length} leads shown</p>
        <div className="flex border border-charcoal/15">
          <button
            type="button"
            onClick={() => props.setDisplayMode("cards")}
            className={`px-3 py-2 text-sm ${props.displayMode === "cards" ? "bg-charcoal text-porcelain" : "bg-porcelain text-charcoal"}`}
          >
            Card View
          </button>
          <button
            type="button"
            onClick={() => props.setDisplayMode("table")}
            className={`px-3 py-2 text-sm ${props.displayMode === "table" ? "bg-charcoal text-porcelain" : "bg-porcelain text-charcoal"}`}
          >
            Table View
          </button>
        </div>
      </div>
      {props.displayMode === "cards" ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {props.leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} selectLead={props.selectLead} updateReview={props.updateReview} />
          ))}
        </div>
      ) : (
        <LeadTable leads={props.leads} selectLead={props.selectLead} updateReview={props.updateReview} />
      )}
      {props.leads.length === 0 ? <EmptyState text="No leads match these filters." /> : null}
    </div>
  );
}

function FiltersPanel({
  filters,
  setFilters,
  batchSummaries
}: {
  filters: Filters;
  setFilters: (filters: Filters) => void;
  batchSummaries: BatchSummary[];
}) {
  return (
    <section className="sans border border-charcoal/10 bg-porcelain p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <SlidersHorizontal size={16} />
        Filters
      </div>
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
        <Field label="Search">
          <input className="input" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} />
        </Field>
        <Field label="Organization Type">
          <select className="input" value={filters.organizationType} onChange={(event) => setFilters({ ...filters, organizationType: event.target.value as Filters["organizationType"] })}>
            <option>All</option>
            {organizationTypes.map((type) => (
              <option key={type} value={type}>{organizationTypeLabel(type)}</option>
            ))}
          </select>
        </Field>
        <Field label="Recommended Offer">
          <select className="input" value={filters.offer} onChange={(event) => setFilters({ ...filters, offer: event.target.value as Filters["offer"] })}>
            <option>All</option>
            {offers.map((offer) => (
              <option key={offer}>{offer}</option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select className="input" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value as Filters["status"] })}>
            <option>All</option>
            {reviewStatuses.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </Field>
        <Field label="Total Score">
          <select className="input" value={filters.score} onChange={(event) => setFilters({ ...filters, score: event.target.value as Filters["score"] })}>
            {["All", "A", "B", "C", "Low"].map((score) => (
              <option key={score}>{score}</option>
            ))}
          </select>
        </Field>
        <Field label="State / Region">
          <input className="input" value={filters.state} onChange={(event) => setFilters({ ...filters, state: event.target.value })} />
        </Field>
        <Field label="Email Verification">
          <select className="input" value={filters.emailStatus} onChange={(event) => setFilters({ ...filters, emailStatus: event.target.value as Filters["emailStatus"] })}>
            <option>All</option>
            {emailStatuses.map((status) => (
              <option key={status} value={status}>{emailStatusLabel(status)}</option>
            ))}
          </select>
        </Field>
        <Field label="Research Batch">
          <select className="input" value={filters.researchBatch} onChange={(event) => setFilters({ ...filters, researchBatch: event.target.value })}>
            <option>All</option>
            {batchSummaries.map((batch) => (
              <option key={batch.name}>{batch.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Sort">
          <select className="input" value={filters.sort} onChange={(event) => setFilters({ ...filters, sort: event.target.value as Filters["sort"] })}>
            {["Highest Score", "Newest", "Fit", "Timing", "Organization Name"].map((sort) => (
              <option key={sort}>{sort}</option>
            ))}
          </select>
        </Field>
        <label className="mt-6 flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={filters.hasEmail}
            onChange={(event) => setFilters({ ...filters, hasEmail: event.target.checked })}
          />
          Has email
        </label>
      </div>
    </section>
  );
}

function LeadCard({
  lead,
  selectLead,
  updateReview
}: {
  lead: Lead;
  selectLead: (id: string) => void;
  updateReview: (id: string, patch: Parameters<typeof reviewStore.update>[1]) => void;
}) {
  const classification = classifyScore(lead.totalScore);
  return (
    <article className={`border bg-porcelain p-5 shadow-quiet ${lead.totalScore < 60 ? "border-charcoal/10 opacity-75" : "border-charcoal/15"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {lead.demo ? <Badge text="DEMO DATA" tone="demo" /> : null}
            <Badge text={classification.label} tone={classification.tone} />
            <EmailBadge status={lead.emailStatus} />
          </div>
          <h3 className="mt-3 text-3xl leading-tight">{lead.organizationName}</h3>
          <p className="sans mt-1 text-sm text-ink">{organizationTypeLabel(lead.organizationType)} · {compactLocation(lead)}</p>
        </div>
        <ScoreCircle score={lead.totalScore} />
      </div>
      <div className="sans mt-4 grid gap-2 text-sm text-ink">
        <p><span className="font-semibold text-charcoal">Contact:</span> {lead.contactName || "Unknown"} · {lead.contactTitle || "Role unknown"}</p>
        <p><span className="font-semibold text-charcoal">Email:</span> {lead.contactEmail || "Email not found"}</p>
        <p><span className="font-semibold text-charcoal">Trigger:</span> {lead.trigger || "Trigger unknown"}</p>
      </div>
      <p className="sans mt-4 text-sm leading-6 text-ink">{lead.whyBespoked}</p>
      <div className="mt-4 border-t border-charcoal/10 pt-4">
        <p className="sans text-xs uppercase tracking-[0.18em] text-brass">Offer</p>
        <p className="mt-1 text-xl">{lead.recommendedOffer}</p>
      </div>
      <div className="sans mt-4 flex flex-wrap gap-2">
        <IconButton icon={<Search size={16} />} label="View Details" onClick={() => selectLead(lead.id)} />
        <IconButton icon={<Check size={16} />} label="Approve" onClick={() => updateReview(lead.id, { status: "APPROVED" })} />
        <IconButton icon={<X size={16} />} label="Reject" onClick={() => updateReview(lead.id, { status: "REJECTED" })} />
        {lead.website ? (
          <a className="button-lite" href={lead.website} target="_blank" rel="noreferrer">
            <ExternalLink size={16} />
            Website
          </a>
        ) : null}
      </div>
    </article>
  );
}

function LeadTable({
  leads,
  selectLead,
  updateReview
}: {
  leads: Lead[];
  selectLead: (id: string) => void;
  updateReview: (id: string, patch: Parameters<typeof reviewStore.update>[1]) => void;
}) {
  return (
    <div className="overflow-x-auto border border-charcoal/10 bg-porcelain">
      <table className="sans min-w-[1050px] text-left text-sm">
        <thead className="bg-charcoal text-porcelain">
          <tr>
            {["Organization", "Type", "Offer", "Score", "Status", "Contact", "Email", "Batch", ""].map((heading) => (
              <th key={heading} className="px-3 py-3 font-medium">{heading}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id} className="border-b border-charcoal/10">
              <td className="px-3 py-3 font-semibold">{lead.organizationName}</td>
              <td className="px-3 py-3">{organizationTypeLabel(lead.organizationType)}</td>
              <td className="px-3 py-3">{lead.recommendedOffer}</td>
              <td className="px-3 py-3">{lead.totalScore}</td>
              <td className="px-3 py-3">
                <select className="input min-w-32" value={lead.status} onChange={(event) => updateReview(lead.id, { status: event.target.value as ReviewStatus })}>
                  {reviewStatuses.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </td>
              <td className="px-3 py-3">{lead.contactName || lead.contactTitle || "Unknown"}</td>
              <td className="px-3 py-3">{lead.contactEmail || "Not found"}</td>
              <td className="px-3 py-3">{lead.researchBatch}</td>
              <td className="px-3 py-3">
                <button type="button" onClick={() => selectLead(lead.id)} className="button-lite">
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LeadRow({ lead, onOpen, compact = false }: { lead: Lead; onOpen: () => void; compact?: boolean }) {
  return (
    <button type="button" onClick={onOpen} className="w-full border border-charcoal/10 bg-porcelain p-4 text-left shadow-quiet transition hover:border-charcoal/30">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-2xl">{lead.organizationName}</p>
          <p className="sans mt-1 text-sm text-ink">{compactLocation(lead)} · {lead.recommendedOffer} · {lead.status}</p>
        </div>
        <ScoreCircle score={lead.totalScore} small={compact} />
      </div>
    </button>
  );
}

function LeadDetail(props: {
  lead: Lead | null;
  updateReview: (id: string, patch: Parameters<typeof reviewStore.update>[1]) => void;
  copyEmail: (lead: Lead) => void;
  openEmail: (lead: Lead) => void;
  resetDraft: (lead: Lead) => void;
  close: () => void;
}) {
  const lead = props.lead;
  if (!lead) {
    return (
      <div className="sticky top-6 border border-charcoal/10 bg-porcelain p-6 text-ink shadow-quiet">
        <p className="sans text-xs uppercase tracking-[0.24em] text-brass">Lead Detail</p>
        <h2 className="mt-2 text-3xl text-charcoal">Select a prospect</h2>
        <p className="sans mt-3 text-sm leading-6">Open a lead to inspect sources, edit the draft, add notes and move it through review.</p>
      </div>
    );
  }

  return (
    <div className="sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto border border-charcoal/10 bg-porcelain p-5 shadow-quiet">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="sans text-xs uppercase tracking-[0.24em] text-brass">Lead Detail</p>
          <h2 className="mt-2 text-3xl leading-tight">{lead.organizationName}</h2>
        </div>
        <button type="button" onClick={props.close} className="focus-ring text-charcoal/70 hover:text-charcoal" aria-label="Close lead detail">
          <X size={18} />
        </button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <ScoreMetric label="Fit" value={lead.fitScore} />
        <ScoreMetric label="Timing" value={lead.timingScore} />
        <ScoreMetric label="Contact" value={lead.contactScore} />
        <ScoreMetric label="Opportunity" value={lead.opportunityScore} />
        <ScoreMetric label="Confidence" value={lead.confidenceScore} />
        <ScoreMetric label="Total" value={lead.totalScore} />
      </div>

      <DetailSection title="Organization">
        <p><span className="font-semibold text-charcoal">Name:</span> {lead.organizationName}</p>
        <p><span className="font-semibold text-charcoal">Type:</span> {organizationTypeLabel(lead.organizationType)}</p>
        <p><span className="font-semibold text-charcoal">Location:</span> {compactLocation(lead)}</p>
        <p><span className="font-semibold text-charcoal">Batch:</span> {lead.researchBatch}</p>
        {lead.website ? (
          <a href={lead.website} target="_blank" rel="noreferrer" className="button-lite mt-2 inline-flex">
            <ExternalLink size={16} />
            Open Website
          </a>
        ) : null}
      </DetailSection>

      <DetailSection title="Contact">
        <p><span className="font-semibold text-charcoal">Name:</span> {lead.contactName || "Unknown"}</p>
        <p><span className="font-semibold text-charcoal">Title:</span> {lead.contactTitle || "Unknown"}</p>
        <p><span className="font-semibold text-charcoal">Email:</span> {lead.contactEmail || "Email not found"}</p>
        <div className="mt-2"><EmailBadge status={lead.emailStatus} /></div>
        {lead.emailSourceUrl ? (
          <a href={lead.emailSourceUrl} target="_blank" rel="noreferrer" className="mt-2 block break-all text-brass underline decoration-brass/30 underline-offset-4">
            {lead.emailSourceUrl}
          </a>
        ) : null}
      </DetailSection>

      <DetailSection title="Why Now">
        <p className="font-semibold">{lead.trigger || "Trigger unknown"}</p>
        <p className="mt-1">Trigger date: {shortDate(lead.triggerDate)}</p>
        <p className="mt-2 leading-6">{lead.triggerExplanation}</p>
      </DetailSection>

      <DetailSection title="Why Bespoked">
        <p className="leading-6">{lead.whyBespoked}</p>
      </DetailSection>

      <DetailSection title="Recommended Offer">
        <p className="text-lg text-charcoal">{lead.recommendedOffer}</p>
        <p className="mt-2 leading-6">{lead.recommendedOfferReason}</p>
      </DetailSection>

      <DetailSection title="Research Summary">
        <p className="leading-6">{lead.researchSummary}</p>
      </DetailSection>

      <DetailSection title="Sources">
        <ul className="space-y-2">
          {lead.sourceUrls.map((url) => (
            <li key={url}>
              <a href={url} target="_blank" rel="noreferrer" className="break-all text-brass underline decoration-brass/30 underline-offset-4">
                {url}
              </a>
            </li>
          ))}
        </ul>
      </DetailSection>

      <DetailSection title="Outreach Draft">
        <Field label="Subject">
          <input className="input" value={lead.editedSubject} onChange={(event) => props.updateReview(lead.id, { editedSubject: event.target.value })} />
        </Field>
        <Field label="Body" className="mt-2">
          <textarea className="input min-h-56 resize-y leading-6" value={lead.editedBody} onChange={(event) => props.updateReview(lead.id, { editedBody: event.target.value })} />
        </Field>
        <button type="button" className="button-lite mt-3" onClick={() => props.resetDraft(lead)}>
          <RefreshCcw size={16} />
          Reset to AI Draft
        </button>
      </DetailSection>

      <DetailSection title="Internal Notes">
        <textarea
          className="input min-h-24 resize-y"
          value={lead.notes}
          onChange={(event) => props.updateReview(lead.id, { notes: event.target.value })}
          placeholder="Lucas knows this person. Follow up in September."
        />
      </DetailSection>

      <DetailSection title="Status">
        <select className="input" value={lead.status} onChange={(event) => props.updateReview(lead.id, { status: event.target.value as ReviewStatus })}>
          {reviewStatuses.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
      </DetailSection>

      <div className="sans mt-5 grid grid-cols-2 gap-2">
        <IconButton icon={<Copy size={16} />} label="Copy Email" onClick={() => void props.copyEmail(lead)} />
        <IconButton icon={<Check size={16} />} label="Approve" onClick={() => props.updateReview(lead.id, { status: "APPROVED" })} />
        <IconButton icon={<X size={16} />} label="Reject" onClick={() => props.updateReview(lead.id, { status: "REJECTED" })} />
        <IconButton icon={<Mail size={16} />} label="Mark Contacted" onClick={() => props.updateReview(lead.id, { status: "CONTACTED" })} />
        <button
          type="button"
          disabled={!lead.contactEmail}
          onClick={() => props.openEmail(lead)}
          className="focus-ring col-span-2 inline-flex items-center justify-center gap-2 border border-charcoal bg-charcoal px-3 py-2 text-sm text-porcelain disabled:cursor-not-allowed disabled:border-charcoal/10 disabled:bg-charcoal/10 disabled:text-charcoal/45"
          title={lead.contactEmail ? "Open your email client with this draft" : "Email not found"}
        >
          <Mail size={16} />
          Open Email
        </button>
      </div>
    </div>
  );
}

function SettingsPage({
  preferences,
  savePreferences,
  dataset,
  reviewState,
  exportReviewState,
  requestImport,
  resetReviewData
}: {
  preferences: Preferences;
  savePreferences: (preferences: Preferences) => void;
  dataset: LeadDataset | null;
  reviewState: ReviewStateMap;
  exportReviewState: () => void;
  requestImport: () => void;
  resetReviewData: () => void;
}) {
  const [draft, setDraft] = useState(preferences);

  useEffect(() => {
    const timer = window.setTimeout(() => setDraft(preferences), 0);
    return () => window.clearTimeout(timer);
  }, [preferences]);

  return (
    <div className="space-y-5">
      <div>
        <p className="sans text-xs uppercase tracking-[0.24em] text-brass">Settings</p>
        <h2 className="mt-1 text-5xl">Local dashboard settings</h2>
      </div>
      <SettingsBlock icon={<Settings size={17} />} title="Dataset">
        <ConfigRow label="Source" value="public/data/leads.json" />
        <ConfigRow label="Version" value={dataset?.version || "Unavailable"} />
        <ConfigRow label="Generated at" value={dataset?.generatedAt || "Unavailable"} />
        <ConfigRow label="Valid leads" value={String(dataset?.leads.length || 0)} />
        <ConfigRow label="Skipped invalid records" value={String(dataset?.invalidRecords.length || 0)} />
      </SettingsBlock>
      <SettingsBlock icon={<SlidersHorizontal size={17} />} title="Bespoked Preferences">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Default geography">
            <input className="input" value={draft.defaultGeography} onChange={(event) => setDraft({ ...draft, defaultGeography: event.target.value })} />
          </Field>
          <Field label="Default segment">
            <select className="input" value={draft.defaultSegment} onChange={(event) => setDraft({ ...draft, defaultSegment: event.target.value as Segment })}>
              {segments.map((segment) => (
                <option key={segment}>{segment}</option>
              ))}
            </select>
          </Field>
          <Field label="Default research count">
            <select className="input" value={draft.defaultCount} onChange={(event) => setDraft({ ...draft, defaultCount: Number(event.target.value) as 5 | 10 | 20 })}>
              {[5, 10, 20].map((count) => (
                <option key={count}>{count}</option>
              ))}
            </select>
          </Field>
          <Field label="Default sender name">
            <input className="input" value={draft.defaultSenderName} onChange={(event) => setDraft({ ...draft, defaultSenderName: event.target.value })} />
          </Field>
          <label className="sans flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={draft.showDemoData}
              onChange={(event) => setDraft({ ...draft, showDemoData: event.target.checked })}
            />
            Show demo data
          </label>
        </div>
        <button type="button" className="button-dark mt-4" onClick={() => savePreferences(draft)}>
          Save Preferences
        </button>
      </SettingsBlock>
      <SettingsBlock icon={<FileJson size={17} />} title="Review Data Backup">
        <p className="mb-3">Review state lives in this browser only. Back it up before switching devices or clearing browser data.</p>
        <ConfigRow label="Reviewed lead records" value={String(Object.keys(reviewState).length)} />
        <div className="mt-4 flex flex-wrap gap-2">
          <IconButton icon={<FileJson size={16} />} label="Export Review Data" onClick={exportReviewState} />
          <IconButton icon={<FileJson size={16} />} label="Import Review Data" onClick={requestImport} />
          <IconButton icon={<Trash2 size={16} />} label="Reset Review Data" onClick={resetReviewData} danger />
        </div>
      </SettingsBlock>
      <SettingsBlock icon={<Copy size={17} />} title="Research Workflow">
        <p>Use the research workflow page to copy a prompt for ChatGPT or Codex. The dashboard will not run web research itself.</p>
        <Link href="/research/" className="button-lite mt-3 inline-flex">
          Research Workflow
        </Link>
      </SettingsBlock>
    </div>
  );
}

function ResearchWorkflowPage({ preferences, setNotice }: { preferences: Preferences; setNotice: (notice: string) => void }) {
  const [request, setRequest] = useState<ResearchRequest>(preferenceStore.toResearchRequest(preferences));
  const prompt = useMemo(() => buildResearchPrompt(request), [request]);

  useEffect(() => {
    const timer = window.setTimeout(() => setRequest(preferenceStore.toResearchRequest(preferences)), 0);
    return () => window.clearTimeout(timer);
  }, [preferences]);

  async function copyPrompt() {
    await navigator.clipboard.writeText(prompt);
    setNotice("Research prompt copied.");
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="sans text-xs uppercase tracking-[0.24em] text-brass">Research Workflow</p>
        <h2 className="mt-1 text-5xl">Generate leads outside the dashboard</h2>
        <p className="sans mt-4 max-w-3xl text-base leading-7 text-ink">
          Use ChatGPT or Codex to research prospects, update <code>public/data/leads.json</code>, commit and push. GitHub Pages then rebuilds the static dashboard.
        </p>
      </div>
      <section className="border border-charcoal/10 bg-porcelain p-5 shadow-quiet">
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Segment">
            <select className="input" value={request.segment} onChange={(event) => setRequest({ ...request, segment: event.target.value as Segment })}>
              {segments.map((segment) => (
                <option key={segment}>{segment}</option>
              ))}
            </select>
          </Field>
          <Field label="Geography">
            <input list="geographies" className="input" value={request.geography} onChange={(event) => setRequest({ ...request, geography: event.target.value })} />
            <datalist id="geographies">
              {geographyOptions.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </Field>
          <Field label="Number of leads">
            <select className="input" value={request.count} onChange={(event) => setRequest({ ...request, count: Number(event.target.value) as 5 | 10 | 20 })}>
              {[5, 10, 20].map((count) => (
                <option key={count}>{count}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Optional instructions" className="mt-3">
          <textarea className="input min-h-24 resize-y" value={request.instructions} onChange={(event) => setRequest({ ...request, instructions: event.target.value })} />
        </Field>
        <button type="button" className="button-dark mt-4" onClick={() => void copyPrompt()}>
          <Copy size={16} />
          Copy Research Prompt
        </button>
      </section>
      <section className="border border-charcoal/10 bg-porcelain p-5 shadow-quiet">
        <h3 className="text-3xl">Expected workflow</h3>
        <ol className="sans mt-4 grid gap-2 text-sm leading-6 text-ink">
          {[
            "Research organizations.",
            "Check existing leads for duplicates.",
            "Identify decision maker.",
            "Verify sources.",
            "Find email if publicly available.",
            "Identify trigger.",
            "Match Bespoked offer.",
            "Score lead.",
            "Draft email.",
            "Write results to public/data/leads.json.",
            "Commit and push."
          ].map((step, index) => (
            <li key={step}>{index + 1}. {step}</li>
          ))}
        </ol>
      </section>
      <section className="border border-charcoal/10 bg-porcelain p-5 shadow-quiet">
        <h3 className="text-3xl">Prompt preview</h3>
        <pre className="sans mt-4 max-h-96 overflow-auto whitespace-pre-wrap border border-charcoal/10 bg-paper p-4 text-xs leading-5 text-ink">{prompt}</pre>
      </section>
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`sans block text-sm text-ink ${className}`}>
      <span className="mb-1 block text-xs uppercase tracking-[0.16em] text-charcoal/60">{label}</span>
      {children}
    </label>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="sans mt-5 border-t border-charcoal/10 pt-4 text-sm text-ink">
      <h3 className="font-semibold text-charcoal">{title}</h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function SettingsBlock({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="border border-charcoal/10 bg-porcelain p-5 shadow-quiet">
      <h3 className="sans flex items-center gap-2 text-base font-semibold">
        {icon}
        {title}
      </h3>
      <div className="sans mt-4 text-sm text-ink">{children}</div>
    </section>
  );
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-charcoal/10 py-3 last:border-b-0">
      <span className="text-charcoal/60">{label}</span>
      <span className="text-right font-semibold text-charcoal">{value}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-charcoal/10 bg-porcelain p-5 shadow-quiet">
      <p className="sans text-xs uppercase tracking-[0.18em] text-brass">{label}</p>
      <p className="sans mt-3 text-4xl font-semibold text-charcoal">{value}</p>
    </div>
  );
}

function InfoPanel({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <div className="border border-charcoal/10 bg-porcelain p-5 shadow-quiet">
      <p className="sans text-xs uppercase tracking-[0.18em] text-brass">{title}</p>
      <p className="sans mt-3 text-xl font-semibold text-charcoal">{value}</p>
      <p className="sans mt-1 text-sm text-ink">{detail}</p>
    </div>
  );
}

function ScoreCircle({ score, small = false }: { score: number; small?: boolean }) {
  return (
    <div className={`sans grid shrink-0 place-items-center rounded-full border border-brass/40 bg-brass/10 font-semibold text-charcoal ${small ? "h-12 w-12 text-lg" : "h-16 w-16 text-2xl"}`}>
      {score}
    </div>
  );
}

function ScoreMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="sans border border-charcoal/10 bg-paper p-3">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.14em] text-charcoal/60">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="mt-2 h-2 bg-charcoal/10">
        <div className="h-2 bg-brass" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function Badge({ text, tone }: { text: string; tone: "priority" | "strong" | "possible" | "low" | "demo" }) {
  const styles = {
    priority: "border-clay/40 bg-clay/10 text-clay",
    strong: "border-sage/40 bg-sage/10 text-sage",
    possible: "border-brass/40 bg-brass/10 text-brass",
    low: "border-charcoal/20 bg-charcoal/5 text-charcoal/60",
    demo: "border-charcoal/30 bg-charcoal text-porcelain"
  };
  return <span className={`sans border px-2 py-1 text-[11px] uppercase tracking-[0.16em] ${styles[tone]}`}>{text}</span>;
}

function EmailBadge({ status }: { status: EmailStatus }) {
  const styles = {
    verified_public: "border-sage/40 bg-sage/10 text-sage",
    found_unconfirmed: "border-brass/40 bg-brass/10 text-brass",
    not_found: "border-charcoal/20 bg-charcoal/5 text-charcoal/60"
  };
  return <span className={`sans border px-2 py-1 text-[11px] uppercase tracking-[0.16em] ${styles[status]}`}>{emailStatusLabel(status)}</span>;
}

function IconButton({
  icon,
  label,
  onClick,
  danger = false
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`focus-ring inline-flex items-center justify-center gap-2 border px-3 py-2 text-sm transition ${
        danger ? "border-clay/30 text-clay hover:border-clay" : "border-charcoal/15 text-charcoal hover:border-charcoal/50"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="sans border border-charcoal/10 bg-porcelain p-8 text-center text-sm text-ink">{text}</div>;
}

function applyFilters(leads: Lead[], filters: Filters, view: View) {
  let next = view === "approved" ? leads.filter((lead) => lead.status !== "NEW" && lead.status !== "REJECTED") : [...leads];
  if (filters.organizationType !== "All") next = next.filter((lead) => lead.organizationType === filters.organizationType);
  if (filters.offer !== "All") next = next.filter((lead) => lead.recommendedOffer === filters.offer);
  if (filters.status !== "All") next = next.filter((lead) => lead.status === filters.status);
  if (filters.emailStatus !== "All") next = next.filter((lead) => lead.emailStatus === filters.emailStatus);
  if (filters.hasEmail) next = next.filter((lead) => Boolean(lead.contactEmail));
  if (filters.researchBatch !== "All") next = next.filter((lead) => lead.researchBatch === filters.researchBatch);
  if (filters.state.trim()) {
    const query = filters.state.toLowerCase();
    next = next.filter((lead) => [lead.state, lead.city, lead.country].filter(Boolean).some((value) => value?.toLowerCase().includes(query)));
  }
  if (filters.search.trim()) {
    const query = filters.search.toLowerCase();
    next = next.filter((lead) =>
      [
        lead.organizationName,
        lead.organizationType,
        lead.contactName,
        lead.contactTitle,
        lead.contactEmail,
        lead.trigger,
        lead.whyBespoked,
        lead.researchBatch,
        ...lead.tags
      ]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(query))
    );
  }
  if (filters.score !== "All") {
    next = next.filter((lead) => {
      if (filters.score === "A") return lead.totalScore >= 90;
      if (filters.score === "B") return lead.totalScore >= 75 && lead.totalScore < 90;
      if (filters.score === "C") return lead.totalScore >= 60 && lead.totalScore < 75;
      return lead.totalScore < 60;
    });
  }
  return next.sort((a, b) => {
    if (filters.sort === "Newest") return b.createdAt.localeCompare(a.createdAt);
    if (filters.sort === "Fit") return b.fitScore - a.fitScore;
    if (filters.sort === "Timing") return b.timingScore - a.timingScore;
    if (filters.sort === "Organization Name") return a.organizationName.localeCompare(b.organizationName);
    return b.totalScore - a.totalScore;
  });
}

type BatchSummary = {
  name: string;
  date: string;
  count: number;
  averageScore: number;
};

function summarizeBatches(leads: Lead[]): BatchSummary[] {
  const byBatch = new Map<string, Lead[]>();
  leads.forEach((lead) => byBatch.set(lead.researchBatch, [...(byBatch.get(lead.researchBatch) || []), lead]));
  return Array.from(byBatch.entries())
    .map(([name, batchLeads]) => ({
      name,
      date: batchLeads.map((lead) => lead.createdAt).sort().at(-1) || "",
      count: batchLeads.length,
      averageScore: Math.round(batchLeads.reduce((sum, lead) => sum + lead.totalScore, 0) / batchLeads.length)
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

function calculateStats(leads: Lead[], generatedAt: string, batchSummaries: BatchSummary[]) {
  const total = leads.length;
  return {
    total,
    priority: leads.filter((lead) => lead.totalScore >= 90).length,
    approved: leads.filter((lead) => lead.status === "APPROVED").length,
    contacted: leads.filter((lead) => lead.status === "CONTACTED").length,
    interested: leads.filter((lead) => lead.status === "INTERESTED").length,
    averageScore: total ? Math.round(leads.reduce((sum, lead) => sum + lead.totalScore, 0) / total) : 0,
    newestBatch: batchSummaries[0]?.name || "",
    generatedAt
  };
}
