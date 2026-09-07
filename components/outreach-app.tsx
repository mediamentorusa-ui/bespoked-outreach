"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  CalendarClock,
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
import { defaultPreferences, preferenceStore, reviewStore, type Preferences } from "@/lib/storage";
import {
  classifyScore,
  emailStatusLabel,
  mergeReviewState,
  segments,
  type EmailStatus,
  type InterventionModule,
  type Lead,
  type LeadDataset,
  type LeadLane,
  type Offer,
  type PaidPotential,
  type RecommendedStage,
  type RecommendedTalk,
  type ResearchReadiness,
  type ResearchRequest,
  type ReviewStateMap,
  type ReviewStatus,
  type Segment,
  type SpeakingGeographyType
} from "@/lib/types";
import { compactLocation, createMailtoUrl, downloadText, shortDate } from "@/lib/utils";

type View = "new" | "ready" | "parked" | "contacted" | "follow-up" | "interested" | "settings" | "research";
type LaneFilter = "all" | "restaurant" | "speaking";
type EmailFilter = "All" | "Ready" | "Needs verification" | "Not found";
type RestaurantGeoFilter = "All" | "San Diego" | "Southern California" | "California" | "Other";
type PriorityFilter = "All" | "High Priority" | "Strong" | "Possible" | "Low Priority";

type Filters = {
  lane: LaneFilter;
  status: "All" | ReviewStatus;
  readiness: "All" | "READY_TO_CONTACT" | "PARKED";
  restaurantGeography: RestaurantGeoFilter;
  speakingGeography: "All" | SpeakingGeographyType;
  recommendedStage: "All" | RecommendedStage;
  offer: "All" | Offer;
  intervention: "All" | InterventionModule;
  talk: "All" | RecommendedTalk;
  paidPotential: "All" | PaidPotential;
  email: EmailFilter;
  priority: PriorityFilter;
  researchBatch: "All" | string;
  search: string;
  sort: "Highest Priority" | "Newest" | "Why Now" | "Organization";
};

const defaultFilters: Filters = {
  lane: "restaurant",
  status: "All",
  readiness: "All",
  restaurantGeography: "All",
  speakingGeography: "All",
  recommendedStage: "All",
  offer: "All",
  intervention: "All",
  talk: "All",
  paidPotential: "All",
  email: "All",
  priority: "All",
  researchBatch: "All",
  search: "",
  sort: "Highest Priority"
};

const geographyOptions = ["San Diego", "San Diego County", "Southern California", "California", "United States", "Nationwide"];
const humanStatusOptions: ReviewStatus[] = ["NEW", "APPROVED", "CONTACTED", "FOLLOW_UP", "INTERESTED", "WON", "LOST", "DISMISSED"];

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
        setFilters((current) => ({ ...current, lane: storedPrefs.defaultLane }));
        if (loadedDataset.invalidRecords.length > 0) {
          setError(`${loadedDataset.invalidRecords.length} lead record(s) could not be shown. The rest of the dashboard is safe to use.`);
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
  const stats = useMemo(() => calculateStats(leads, dataset?.generatedAt || "Unavailable"), [leads, dataset]);

  function updateReview(leadId: string, patch: Parameters<typeof reviewStore.update>[1]) {
    const current = reviewState[leadId];
    const now = new Date().toISOString();
    const timestampPatch = { ...patch };
    if (patch.status === "CONTACTED" && !current?.contactedAt) timestampPatch.contactedAt = now;
    if (patch.status === "INTERESTED" && !current?.interestedAt) timestampPatch.interestedAt = now;
    const next = reviewStore.update(leadId, timestampPatch);
    setReviewState(next);
  }

  async function copyEmail(lead: Lead) {
    await navigator.clipboard.writeText(`Subject: ${lead.editedSubject}\n\n${lead.editedBody}`);
    setNotice("Email copied.");
  }

  function openEmail(lead: Lead) {
    if (!canOpenEmail(lead)) return;
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
    setNotice("Draft reset to the research draft.");
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
      setNotice("Review data imported.");
    } catch {
      setError("Review data import failed. Use a JSON backup exported by this dashboard.");
    }
  }

  function resetReviewData() {
    if (!window.confirm("Reset local statuses, edited drafts, follow-up dates and notes? This does not change leads.json.")) return;
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
      <header className="border-b border-charcoal/10 bg-porcelain/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 md:flex-row md:items-center md:justify-between">
          <Link href="/" className="group">
            <p className="sans text-[11px] uppercase tracking-[0.28em] text-brass">Bespoked Hospitality</p>
            <h1 className="text-3xl leading-tight text-charcoal md:text-4xl">Bespoked Outreach</h1>
          </Link>
          <nav className="sans flex flex-wrap gap-2 text-sm">
            <NavLink href="/" active={view === "new"} label="New" />
            <NavLink href="/ready/" active={view === "ready"} label="Ready to Contact" />
            <NavLink href="/parked/" active={view === "parked"} label="Parked" />
            <NavLink href="/contacted/" active={view === "contacted"} label="Contacted" />
            <NavLink href="/follow-up/" active={view === "follow-up"} label="Follow Up" />
            <NavLink href="/interested/" active={view === "interested"} label="Interested" />
            <NavLink href="/settings/" active={view === "settings"} label="Settings" quiet />
          </nav>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-8 px-5 py-8 lg:grid-cols-[minmax(0,1fr)_420px]">
        <section className="min-w-0">
          {notice ? <Banner tone="notice" text={notice} onClose={() => setNotice(null)} /> : null}
          {error ? <Banner tone="error" text={error} onClose={() => setError(null)} /> : null}

          {view === "new" ? (
            <HomeDashboard
              stats={stats}
              leads={leads}
              lane={filters.lane}
              setLane={(lane) => setFilters({ ...filters, lane })}
              selectLead={setSelectedId}
            />
          ) : null}

          {["ready", "parked", "contacted", "follow-up", "interested"].includes(view) ? (
            <LeadLanePage
              view={view}
              leads={filteredLeads}
              allLeads={leads}
              batchSummaries={batchSummaries}
              filters={filters}
              setFilters={setFilters}
              displayMode={displayMode}
              setDisplayMode={setDisplayMode}
              selectLead={setSelectedId}
              updateReview={updateReview}
              openEmail={openEmail}
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

          {view === "research" ? <ResearchWorkflowPage preferences={preferences} setNotice={setNotice} /> : null}

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

function NavLink({ href, active, label, quiet = false }: { href: string; active: boolean; label: string; quiet?: boolean }) {
  return (
    <Link
      href={href}
      className={`focus-ring rounded-sm border px-3 py-2 transition ${
        active
          ? "border-charcoal bg-charcoal text-porcelain"
          : quiet
            ? "border-transparent bg-transparent text-ink hover:border-charcoal/20"
            : "border-charcoal/10 bg-transparent text-ink hover:border-charcoal/30"
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

function HomeDashboard({
  stats,
  leads,
  lane,
  setLane,
  selectLead
}: {
  stats: ReturnType<typeof calculateStats>;
  leads: Lead[];
  lane: LaneFilter;
  setLane: (lane: LaneFilter) => void;
  selectLead: (id: string) => void;
}) {
  const scoped = lane === "all" ? leads : leads.filter((lead) => getLeadLane(lead) === lane);
  const topPriority = sortByPriority(scoped.filter((lead) => visibleInReady(lead))).slice(0, 5);
  const newThisWeek = sortByPriority(scoped.filter((lead) => isNewThisWeek(lead.createdAt) && lead.status === "NEW")).slice(0, 5);
  const recentlyContacted = scoped
    .filter((lead) => lead.status === "CONTACTED")
    .sort((a, b) => (b.contactedAt || b.updatedAt || "").localeCompare(a.contactedAt || a.updatedAt || ""))
    .slice(0, 4);

  return (
    <div className="space-y-8">
      <section>
        <p className="sans text-xs uppercase tracking-[0.28em] text-brass">Need-signal dashboard</p>
        <h2 className="mt-3 max-w-3xl text-5xl leading-[0.98] text-charcoal md:text-7xl">Who should Lucas contact next?</h2>
        <p className="sans mt-5 max-w-2xl text-base leading-7 text-ink">
          The dashboard keeps the research underneath and brings the next action forward: why now, who to contact, and what Bespoked could offer.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Ready to Contact" value={stats.ready} />
        <Stat label="New This Week" value={stats.newThisWeek} />
        <Stat label="Follow Up" value={stats.followUp} />
        <Stat label="Interested" value={stats.interested} />
        <Stat label="Contacted This Week" value={stats.contactedThisWeek} />
      </section>

      <LaneSwitch lane={lane} setLane={setLane} />

      <LeadListSection title="Top Priority" leads={topPriority} selectLead={selectLead} />
      <LeadListSection title="New This Week" leads={newThisWeek} selectLead={selectLead} />
      <LeadListSection title="Recently Contacted" leads={recentlyContacted} selectLead={selectLead} />
    </div>
  );
}

function LaneSwitch({ lane, setLane }: { lane: LaneFilter; setLane: (lane: LaneFilter) => void }) {
  return (
    <div className="sans inline-flex border border-charcoal/15 bg-porcelain text-sm">
      {[
        ["restaurant", "Restaurants"],
        ["speaking", "Speaking"],
        ["all", "All"]
      ].map(([value, label]) => (
        <button
          key={value}
          type="button"
          onClick={() => setLane(value as LaneFilter)}
          className={`px-4 py-2 ${lane === value ? "bg-charcoal text-porcelain" : "text-charcoal hover:bg-paper"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function LeadListSection({ title, leads, selectLead }: { title: string; leads: Lead[]; selectLead: (id: string) => void }) {
  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="sans text-xs uppercase tracking-[0.24em] text-brass">{title}</p>
          <h3 className="mt-1 text-3xl">Next best conversations</h3>
        </div>
        <Link href="/ready/" className="sans focus-ring border border-charcoal/20 px-3 py-2 text-sm hover:border-charcoal">
          Ready list
        </Link>
      </div>
      <div className="grid gap-3">
        {leads.map((lead) => (
          <LeadRow key={lead.id} lead={lead} onOpen={() => selectLead(lead.id)} />
        ))}
        {leads.length === 0 ? <EmptyState text="Nothing here yet." /> : null}
      </div>
    </section>
  );
}

function LeadLanePage(props: {
  view: View;
  leads: Lead[];
  allLeads: Lead[];
  batchSummaries: BatchSummary[];
  filters: Filters;
  setFilters: (filters: Filters) => void;
  displayMode: "cards" | "table";
  setDisplayMode: (mode: "cards" | "table") => void;
  selectLead: (id: string) => void;
  updateReview: (id: string, patch: Parameters<typeof reviewStore.update>[1]) => void;
  openEmail: (lead: Lead) => void;
  exportFilteredCsv: () => void;
  exportAllCsv: () => void;
  exportReviewState: () => void;
  requestImport: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="sans text-xs uppercase tracking-[0.24em] text-brass">{viewSubtitle(props.view)}</p>
          <h2 className="mt-1 text-5xl">{viewTitle(props.view)}</h2>
        </div>
        <div className="sans flex flex-wrap gap-2">
          <IconButton icon={<Download size={16} />} label="Filtered CSV" onClick={props.exportFilteredCsv} />
          <IconButton icon={<Download size={16} />} label="All CSV" onClick={props.exportAllCsv} />
          <IconButton icon={<FileJson size={16} />} label="Export Reviews" onClick={props.exportReviewState} />
          <IconButton icon={<FileJson size={16} />} label="Import Reviews" onClick={props.requestImport} />
        </div>
      </div>

      <FiltersPanel filters={props.filters} setFilters={props.setFilters} batchSummaries={props.batchSummaries} />

      <div className="sans flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink">{props.leads.length} of {props.allLeads.length} leads shown</p>
        <div className="flex border border-charcoal/15">
          <button
            type="button"
            onClick={() => props.setDisplayMode("cards")}
            className={`px-3 py-2 text-sm ${props.displayMode === "cards" ? "bg-charcoal text-porcelain" : "bg-porcelain text-charcoal"}`}
          >
            Cards
          </button>
          <button
            type="button"
            onClick={() => props.setDisplayMode("table")}
            className={`px-3 py-2 text-sm ${props.displayMode === "table" ? "bg-charcoal text-porcelain" : "bg-porcelain text-charcoal"}`}
          >
            Table
          </button>
        </div>
      </div>

      {props.displayMode === "cards" ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {props.leads.map((lead) =>
            getLeadLane(lead) === "restaurant" ? (
              <RestaurantCard key={lead.id} lead={lead} selectLead={props.selectLead} updateReview={props.updateReview} openEmail={props.openEmail} />
            ) : (
              <SpeakingCard key={lead.id} lead={lead} selectLead={props.selectLead} updateReview={props.updateReview} openEmail={props.openEmail} />
            )
          )}
        </div>
      ) : (
        <LeadTable leads={props.leads} selectLead={props.selectLead} updateReview={props.updateReview} />
      )}
      {props.leads.length === 0 ? <EmptyState text="No leads match this view yet." /> : null}
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
        <Field label="Lane">
          <select className="input" value={filters.lane} onChange={(event) => setFilters({ ...filters, lane: event.target.value as LaneFilter })}>
            <option value="all">All</option>
            <option value="restaurant">Restaurants</option>
            <option value="speaking">Speaking</option>
          </select>
        </Field>
        <Field label="Status">
          <select className="input" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value as Filters["status"] })}>
            <option>All</option>
            {humanStatusOptions.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </Field>
        <Field label="Ready / parked">
          <select className="input" value={filters.readiness} onChange={(event) => setFilters({ ...filters, readiness: event.target.value as Filters["readiness"] })}>
            <option>All</option>
            <option value="READY_TO_CONTACT">Ready</option>
            <option value="PARKED">Parked</option>
          </select>
        </Field>
        <Field label="Restaurant location">
          <select className="input" value={filters.restaurantGeography} onChange={(event) => setFilters({ ...filters, restaurantGeography: event.target.value as RestaurantGeoFilter })}>
            {["All", "San Diego", "Southern California", "California", "Other"].map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </Field>
        <Field label="Speaking reach">
          <select className="input" value={filters.speakingGeography} onChange={(event) => setFilters({ ...filters, speakingGeography: event.target.value as Filters["speakingGeography"] })}>
            {["All", "LOCAL", "REGIONAL", "NATIONAL", "INTERNATIONAL"].map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </Field>
        <Field label="Stage">
          <select className="input" value={filters.recommendedStage} onChange={(event) => setFilters({ ...filters, recommendedStage: event.target.value as Filters["recommendedStage"] })}>
            {["All", "DIAGNOSE", "INTERVENE", "REINFORCE", "ADVISORY_SESSION"].map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </Field>
        <Field label="Approach">
          <select className="input" value={filters.offer} onChange={(event) => setFilters({ ...filters, offer: event.target.value as Filters["offer"] })}>
            {["All", "Team Diagnostic", "Team Intervention", "Ongoing Advisory", "Paid Advisory Session", "Keynote", "Workshop / Masterclass", "A Life in Hospitality", "Exceptional Teams"].map((offer) => (
              <option key={offer}>{offer}</option>
            ))}
          </select>
        </Field>
        <Field label="Intervention">
          <select className="input" value={filters.intervention} onChange={(event) => setFilters({ ...filters, intervention: event.target.value as Filters["intervention"] })}>
            {["All", "LEADER_OPERATING_RHYTHM", "STANDARDS_FLOW_PRESSURE", "DIFFICULT_GUESTS_RECOVERY", "HIRING_ONBOARDING"].map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </Field>
        <Field label="Talk">
          <select className="input" value={filters.talk} onChange={(event) => setFilters({ ...filters, talk: event.target.value as Filters["talk"] })}>
            {["All", "A_LIFE_IN_HOSPITALITY", "EXCEPTIONAL_TEAMS"].map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </Field>
        <Field label="Paid potential">
          <select className="input" value={filters.paidPotential} onChange={(event) => setFilters({ ...filters, paidPotential: event.target.value as Filters["paidPotential"] })}>
            {["All", "HIGH", "MEDIUM", "LOW", "UNKNOWN"].map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </Field>
        <Field label="Email">
          <select className="input" value={filters.email} onChange={(event) => setFilters({ ...filters, email: event.target.value as EmailFilter })}>
            {["All", "Ready", "Needs verification", "Not found"].map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </Field>
        <Field label="Priority">
          <select className="input" value={filters.priority} onChange={(event) => setFilters({ ...filters, priority: event.target.value as PriorityFilter })}>
            {["All", "High Priority", "Strong", "Possible", "Low Priority"].map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </Field>
        <Field label="Batch">
          <select className="input" value={filters.researchBatch} onChange={(event) => setFilters({ ...filters, researchBatch: event.target.value })}>
            <option>All</option>
            {batchSummaries.map((batch) => (
              <option key={batch.name}>{batch.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Sort">
          <select className="input" value={filters.sort} onChange={(event) => setFilters({ ...filters, sort: event.target.value as Filters["sort"] })}>
            {["Highest Priority", "Newest", "Why Now", "Organization"].map((sort) => (
              <option key={sort}>{sort}</option>
            ))}
          </select>
        </Field>
      </div>
    </section>
  );
}

function RestaurantCard({
  lead,
  selectLead,
  updateReview,
  openEmail
}: {
  lead: Lead;
  selectLead: (id: string) => void;
  updateReview: (id: string, patch: Parameters<typeof reviewStore.update>[1]) => void;
  openEmail: (lead: Lead) => void;
}) {
  return (
    <article className="border border-charcoal/15 bg-porcelain p-5 shadow-quiet">
      <CardHeader lead={lead} eyebrow={lead.restaurantFormat || "Restaurant opportunity"} />
      <CardBlock label="Why now" value={lead.needSignalSummary || lead.whyNow || lead.triggerExplanation} />
      <CardBlock label="Suggested approach" value={restaurantApproach(lead)} />
      <CardContact lead={lead} />
      <CardActions lead={lead} selectLead={selectLead} updateReview={updateReview} openEmail={openEmail} />
    </article>
  );
}

function SpeakingCard({
  lead,
  selectLead,
  updateReview,
  openEmail
}: {
  lead: Lead;
  selectLead: (id: string) => void;
  updateReview: (id: string, patch: Parameters<typeof reviewStore.update>[1]) => void;
  openEmail: (lead: Lead) => void;
}) {
  return (
    <article className="border border-charcoal/15 bg-porcelain p-5 shadow-quiet">
      <CardHeader lead={lead} eyebrow={lead.eventOrProgramName || "Speaking opportunity"} />
      <div className="sans mt-2 flex flex-wrap gap-2">
        <SmallPill>{speakingReachLabel(lead.speakingGeographyType)}</SmallPill>
        <SmallPill>{paidPotentialLabel(lead.paidPotential)}</SmallPill>
      </div>
      <CardBlock label="Why now" value={lead.opportunitySignal || lead.whyNow || lead.triggerExplanation} />
      <CardBlock label="Suggested talk" value={`${talkLabel(lead.recommendedTalk)} · ${formatLabel(lead.recommendedFormat)}`} />
      <CardContact lead={lead} />
      <CardActions lead={lead} selectLead={selectLead} updateReview={updateReview} openEmail={openEmail} />
    </article>
  );
}

function CardHeader({ lead, eyebrow }: { lead: Lead; eyebrow: string }) {
  const classification = classifyScore(priorityScore(lead));
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {lead.demo ? <Badge text="DEMO DATA" tone="demo" /> : null}
        <Badge text={classification.label} tone={classification.tone} />
        <ReadinessBadge readiness={getReadiness(lead)} />
      </div>
      <p className="sans mt-3 text-xs uppercase tracking-[0.18em] text-brass">{eyebrow}</p>
      <h3 className="mt-1 text-3xl leading-tight">{lead.organizationName}</h3>
      <p className="sans mt-1 text-sm text-ink">{compactLocation(lead)} · {laneLabel(getLeadLane(lead))}</p>
    </div>
  );
}

function CardBlock({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="sans mt-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-charcoal/55">{label}</p>
      <p className="mt-1 text-sm leading-6 text-ink">{value || "Not clear yet."}</p>
    </div>
  );
}

function CardContact({ lead }: { lead: Lead }) {
  return (
    <div className="sans mt-4 border-t border-charcoal/10 pt-4 text-sm text-ink">
      <p><span className="font-semibold text-charcoal">Contact:</span> {lead.contactName || "Contact needed"}{lead.contactTitle ? `, ${lead.contactTitle}` : ""}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <EmailBadge status={lead.emailStatus} />
        <span>{lead.contactEmail || lead.preferredContactRoute || "Email not found"}</span>
      </div>
    </div>
  );
}

function CardActions({
  lead,
  selectLead,
  updateReview,
  openEmail
}: {
  lead: Lead;
  selectLead: (id: string) => void;
  updateReview: (id: string, patch: Parameters<typeof reviewStore.update>[1]) => void;
  openEmail: (lead: Lead) => void;
}) {
  return (
    <div className="sans mt-4 flex flex-wrap gap-2">
      <IconButton icon={<Search size={16} />} label="View" onClick={() => selectLead(lead.id)} />
      <button
        type="button"
        disabled={!canOpenEmail(lead)}
        onClick={() => openEmail(lead)}
        className="focus-ring inline-flex items-center justify-center gap-2 border border-charcoal bg-charcoal px-3 py-2 text-sm text-porcelain transition hover:bg-ink disabled:cursor-not-allowed disabled:border-charcoal/10 disabled:bg-charcoal/10 disabled:text-charcoal/45"
        title={canOpenEmail(lead) ? "Open your email client" : "Contact needed"}
      >
        <Mail size={16} />
        {canOpenEmail(lead) ? "Contact" : "Contact needed"}
      </button>
      <IconButton icon={<Archive size={16} />} label="Park / Dismiss" onClick={() => updateReview(lead.id, { status: "DISMISSED" })} />
      {lead.website ? (
        <a className="button-lite" href={lead.website} target="_blank" rel="noreferrer">
          <ExternalLink size={16} />
          Website
        </a>
      ) : null}
    </div>
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
      <table className="sans min-w-[1080px] text-left text-sm">
        <thead className="bg-charcoal text-porcelain">
          <tr>
            {["Lead", "Lane", "Why now", "Approach", "Priority", "Status", "Contact", "Email", ""].map((heading) => (
              <th key={heading} className="px-3 py-3 font-medium">{heading}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id} className="border-b border-charcoal/10">
              <td className="px-3 py-3 font-semibold">{lead.organizationName}</td>
              <td className="px-3 py-3">{laneLabel(getLeadLane(lead))}</td>
              <td className="max-w-72 px-3 py-3">{lead.needSignalSummary || lead.opportunitySignal || lead.trigger}</td>
              <td className="px-3 py-3">{approachLabel(lead)}</td>
              <td className="px-3 py-3">{classifyScore(priorityScore(lead)).label}</td>
              <td className="px-3 py-3">
                <select className="input min-w-36" value={lead.status} onChange={(event) => updateReview(lead.id, { status: event.target.value as ReviewStatus })}>
                  {humanStatusOptions.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </td>
              <td className="px-3 py-3">{lead.contactName || lead.contactTitle || "Contact needed"}</td>
              <td className="px-3 py-3">{emailStatusLabel(lead.emailStatus)}</td>
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

function LeadRow({ lead, onOpen }: { lead: Lead; onOpen: () => void }) {
  const classification = classifyScore(priorityScore(lead));
  return (
    <button type="button" onClick={onOpen} className="w-full border border-charcoal/10 bg-porcelain p-4 text-left shadow-quiet transition hover:border-charcoal/30">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap gap-2">
            <Badge text={classification.label} tone={classification.tone} />
            <ReadinessBadge readiness={getReadiness(lead)} />
          </div>
          <p className="text-2xl leading-tight">{lead.organizationName}</p>
          <p className="sans mt-1 text-sm text-ink">{compactLocation(lead)} · {approachLabel(lead)}</p>
        </div>
        <p className="sans text-sm text-ink">{lead.contactName || "Contact needed"}</p>
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
        <h2 className="mt-2 text-3xl text-charcoal">Select a lead</h2>
        <p className="sans mt-3 text-sm leading-6">Open a lead to see why it matters, edit the email, add notes and track what happens next.</p>
      </div>
    );
  }

  const lane = getLeadLane(lead);
  const classification = classifyScore(priorityScore(lead));
  return (
    <div className="sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto border border-charcoal/10 bg-porcelain p-5 shadow-quiet">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="sans text-xs uppercase tracking-[0.24em] text-brass">{laneLabel(lane)} lead</p>
          <h2 className="mt-2 text-3xl leading-tight">{lead.organizationName}</h2>
          <p className="sans mt-2 text-sm text-ink">{compactLocation(lead)}</p>
        </div>
        <button type="button" onClick={props.close} className="focus-ring text-charcoal/70 hover:text-charcoal" aria-label="Close lead detail">
          <X size={18} />
        </button>
      </div>

      <div className="sans mt-4 flex flex-wrap gap-2">
        <Badge text={classification.label} tone={classification.tone} />
        <ReadinessBadge readiness={getReadiness(lead)} />
        <EmailBadge status={lead.emailStatus} />
      </div>

      {lane === "restaurant" ? <RestaurantDetail lead={lead} /> : <SpeakingDetail lead={lead} />}

      <EmailDraftSection lead={lead} updateReview={props.updateReview} copyEmail={props.copyEmail} openEmail={props.openEmail} resetDraft={props.resetDraft} />
      <SourcesSection lead={lead} />
      <ActivitySection lead={lead} updateReview={props.updateReview} />
      <NotesSection lead={lead} updateReview={props.updateReview} />
      <ResearchDetails lead={lead} />
    </div>
  );
}

function RestaurantDetail({ lead }: { lead: Lead }) {
  return (
    <>
      <DetailSection title="Why this one">
        <p className="font-semibold text-charcoal">{lead.needSignalSummary || lead.trigger || "Signal still being clarified"}</p>
        <p className="mt-2 leading-6">{lead.whyNow || lead.triggerExplanation}</p>
        {lead.scaleSummary ? <p className="mt-2 leading-6">{lead.scaleSummary}</p> : null}
      </DetailSection>
      <DetailSection title="What Bespoked could help with">
        <KeyValue label="Recommended stage" value={stageLabel(lead.recommendedStage)} />
        <KeyValue label="Suggested approach" value={restaurantApproach(lead)} />
        {lead.recommendedInterventionModule ? <KeyValue label="Likely intervention" value={moduleLabel(lead.recommendedInterventionModule)} /> : null}
        <p className="mt-3 leading-6">{lead.recommendedOfferReason}</p>
      </DetailSection>
      <ContactSection lead={lead} />
    </>
  );
}

function SpeakingDetail({ lead }: { lead: Lead }) {
  return (
    <>
      <DetailSection title="Why this opportunity">
        <p className="font-semibold text-charcoal">{lead.eventOrProgramName || lead.opportunitySignal || lead.trigger || "Opportunity still being clarified"}</p>
        <p className="mt-2 leading-6">{lead.whyNow || lead.triggerExplanation}</p>
      </DetailSection>
      <DetailSection title="Why Bespoked">
        <p className="leading-6">{lead.whyBespoked}</p>
      </DetailSection>
      <DetailSection title="Suggested talk">
        <KeyValue label="Talk" value={talkLabel(lead.recommendedTalk)} />
        <KeyValue label="Format" value={formatLabel(lead.recommendedFormat)} />
        <p className="mt-3 leading-6">{lead.talkFitReason || lead.recommendedOfferReason}</p>
      </DetailSection>
      <DetailSection title="Paid potential">
        <KeyValue label="Assessment" value={paidPotentialLabel(lead.paidPotential)} />
        <p className="mt-2 leading-6">{lead.paidPotentialReason || "Payment is not confirmed by the research."}</p>
      </DetailSection>
      <ContactSection lead={lead} />
    </>
  );
}

function ContactSection({ lead }: { lead: Lead }) {
  return (
    <DetailSection title="Who to contact">
      <KeyValue label="Name" value={lead.contactName || "Contact still needed"} />
      <KeyValue label="Role" value={lead.contactTitle || "Unknown"} />
      <KeyValue label="Email" value={lead.contactEmail || "Email not found"} />
      <KeyValue label="Email status" value={emailStatusLabel(lead.emailStatus)} />
      {lead.preferredContactRoute ? <KeyValue label="Preferred route" value={lead.preferredContactRoute} /> : null}
      {lead.emailSourceUrl ? (
        <a href={lead.emailSourceUrl} target="_blank" rel="noreferrer" className="mt-2 block break-all text-brass underline decoration-brass/30 underline-offset-4">
          Email source
        </a>
      ) : null}
      {!canOpenEmail(lead) ? <p className="mt-3 border border-brass/30 bg-brass/10 p-3 text-charcoal">Contact still needed before opening an email draft.</p> : null}
    </DetailSection>
  );
}

function EmailDraftSection(props: {
  lead: Lead;
  updateReview: (id: string, patch: Parameters<typeof reviewStore.update>[1]) => void;
  copyEmail: (lead: Lead) => void;
  openEmail: (lead: Lead) => void;
  resetDraft: (lead: Lead) => void;
}) {
  return (
    <DetailSection title="Email draft">
      <Field label="Subject">
        <input className="input" value={props.lead.editedSubject} onChange={(event) => props.updateReview(props.lead.id, { editedSubject: event.target.value })} />
      </Field>
      <Field label="Body" className="mt-3">
        <textarea className="input min-h-80 resize-y leading-6" value={props.lead.editedBody} onChange={(event) => props.updateReview(props.lead.id, { editedBody: event.target.value })} />
      </Field>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <IconButton icon={<Copy size={16} />} label="Copy" onClick={() => void props.copyEmail(props.lead)} />
        <IconButton icon={<RefreshCcw size={16} />} label="Reset to Research Draft" onClick={() => props.resetDraft(props.lead)} />
        <button
          type="button"
          disabled={!canOpenEmail(props.lead)}
          onClick={() => props.openEmail(props.lead)}
          className="focus-ring inline-flex items-center justify-center gap-2 border border-charcoal bg-charcoal px-3 py-2 text-sm text-porcelain disabled:cursor-not-allowed disabled:border-charcoal/10 disabled:bg-charcoal/10 disabled:text-charcoal/45 sm:col-span-2"
        >
          <Mail size={16} />
          {canOpenEmail(props.lead) ? "Open Email" : "Contact needed"}
        </button>
      </div>
    </DetailSection>
  );
}

function SourcesSection({ lead }: { lead: Lead }) {
  const sourceGroups = [
    ["Need / opportunity", [...(lead.needSignalEvidenceUrls || []), ...(lead.opportunityEvidenceUrls || [])]],
    ["Paid potential", lead.paidPotentialEvidenceUrls || []],
    ["Email", lead.emailSourceUrl ? [lead.emailSourceUrl] : []],
    ["Other sources", lead.sourceUrls || []]
  ] as const;

  return (
    <DetailSection title="Sources">
      <div className="space-y-3">
        {sourceGroups.map(([label, urls]) => {
          const uniqueUrls = Array.from(new Set(urls));
          if (uniqueUrls.length === 0) return null;
          return (
            <div key={label}>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-charcoal/55">{label}</p>
              <ul className="mt-1 space-y-1">
                {uniqueUrls.map((url) => (
                  <li key={`${label}-${url}`}>
                    <a href={url} target="_blank" rel="noreferrer" className="break-all text-brass underline decoration-brass/30 underline-offset-4">
                      {url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </DetailSection>
  );
}

function ActivitySection({ lead, updateReview }: { lead: Lead; updateReview: (id: string, patch: Parameters<typeof reviewStore.update>[1]) => void }) {
  function saveFollowUpDate(value: string) {
    updateReview(lead.id, { followUpDate: value, status: value ? "FOLLOW_UP" : lead.status });
  }

  return (
    <DetailSection title="Activity">
      <Field label="Status">
        <select className="input" value={lead.status} onChange={(event) => updateReview(lead.id, { status: event.target.value as ReviewStatus })}>
          {humanStatusOptions.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
      </Field>
      <Field label="Follow-up date" className="mt-3">
        <input
          className="input"
          type="date"
          value={lead.followUpDate}
          onInput={(event) => saveFollowUpDate(event.currentTarget.value)}
          onChange={(event) => saveFollowUpDate(event.currentTarget.value)}
        />
      </Field>
      {lead.followUpDate ? <p className={`mt-2 ${isOverdue(lead.followUpDate) ? "text-clay" : "text-ink"}`}>{followUpText(lead.followUpDate)}</p> : null}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <IconButton icon={<Check size={16} />} label="Mark Contacted" onClick={() => updateReview(lead.id, { status: "CONTACTED" })} />
        <IconButton icon={<CalendarClock size={16} />} label="Follow Up" onClick={() => updateReview(lead.id, { status: "FOLLOW_UP" })} />
        <IconButton icon={<Check size={16} />} label="Interested" onClick={() => updateReview(lead.id, { status: "INTERESTED" })} />
        <IconButton icon={<Archive size={16} />} label="Dismiss" onClick={() => updateReview(lead.id, { status: "DISMISSED" })} />
      </div>
    </DetailSection>
  );
}

function NotesSection({ lead, updateReview }: { lead: Lead; updateReview: (id: string, patch: Parameters<typeof reviewStore.update>[1]) => void }) {
  return (
    <DetailSection title="Notes">
      <textarea
        className="input min-h-32 resize-y"
        value={lead.notes}
        onChange={(event) => updateReview(lead.id, { notes: event.target.value })}
        placeholder="Replied, asked me to call next week."
      />
    </DetailSection>
  );
}

function ResearchDetails({ lead }: { lead: Lead }) {
  return (
    <details className="sans mt-5 border-t border-charcoal/10 pt-4 text-sm text-ink">
      <summary className="cursor-pointer font-semibold text-charcoal">Research details</summary>
      <div className="mt-3 grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          {getLeadLane(lead) === "restaurant" ? (
            <>
              <ScoreMetric label="Commercial fit" value={lead.commercialFitScore ?? lead.fitScore} />
              <ScoreMetric label="Need signal" value={lead.needSignalScore ?? lead.timingScore} />
              <ScoreMetric label="Geography" value={lead.geographicFitScore ?? 0} />
              <ScoreMetric label="Decision maker" value={lead.decisionMakerScore ?? lead.contactScore} />
              <ScoreMetric label="Contact" value={lead.contactCertaintyScore ?? lead.contactScore} />
              <ScoreMetric label="Approach" value={lead.offerFitScore ?? lead.opportunityScore} />
            </>
          ) : (
            <>
              <ScoreMetric label="Audience fit" value={lead.audienceFitScore ?? lead.fitScore} />
              <ScoreMetric label="Timing" value={lead.timingScore} />
              <ScoreMetric label="Decision maker" value={lead.decisionMakerScore ?? lead.contactScore} />
              <ScoreMetric label="Contact" value={lead.contactCertaintyScore ?? lead.contactScore} />
              <ScoreMetric label="Paid potential" value={lead.paidPotentialScore ?? lead.opportunityScore} />
              <ScoreMetric label="Strategic value" value={lead.strategicValueScore ?? lead.opportunityScore} />
            </>
          )}
          <ScoreMetric label="Overall" value={priorityScore(lead)} />
        </div>
        <KeyValue label="Research batch" value={lead.researchBatch} />
        <KeyValue label="Created" value={shortDate(lead.createdAt)} />
        <p className="leading-6">{lead.researchSummary}</p>
        {lead.likelyFrameworkDimensions.length > 0 ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-charcoal/55">Likely framework dimensions</p>
            <p className="mt-1">{lead.likelyFrameworkDimensions.join(", ")}</p>
          </div>
        ) : null}
      </div>
    </details>
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
        <ConfigRow label="Skipped records" value={String(dataset?.invalidRecords.length || 0)} />
      </SettingsBlock>
      <SettingsBlock icon={<SlidersHorizontal size={17} />} title="Preferences">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Default lane">
            <select className="input" value={draft.defaultLane} onChange={(event) => setDraft({ ...draft, defaultLane: event.target.value as Preferences["defaultLane"] })}>
              <option value="restaurant">Restaurants</option>
              <option value="speaking">Speaking</option>
              <option value="all">All</option>
            </select>
          </Field>
          <Field label="Default restaurant geography">
            <select className="input" value={draft.defaultRestaurantGeography} onChange={(event) => setDraft({ ...draft, defaultRestaurantGeography: event.target.value as Preferences["defaultRestaurantGeography"] })}>
              {["San Diego", "Southern California", "California", "Other"].map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </Field>
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
            <input type="checkbox" checked={draft.showDemoData} onChange={(event) => setDraft({ ...draft, showDemoData: event.target.checked })} />
            Show demo data
          </label>
        </div>
        <button type="button" className="button-dark mt-4" onClick={() => savePreferences(draft)}>
          Save Preferences
        </button>
      </SettingsBlock>
      <SettingsBlock icon={<FileJson size={17} />} title="Review Data Backup">
        <p className="mb-3">Review data lives in this browser only. Back it up before switching devices or clearing browser data.</p>
        <ConfigRow label="Reviewed leads" value={String(Object.keys(reviewState).length)} />
        <div className="mt-4 flex flex-wrap gap-2">
          <IconButton icon={<FileJson size={16} />} label="Export Review Data" onClick={exportReviewState} />
          <IconButton icon={<FileJson size={16} />} label="Import Review Data" onClick={requestImport} />
          <IconButton icon={<Trash2 size={16} />} label="Reset Review Data" onClick={resetReviewData} danger />
        </div>
      </SettingsBlock>
      <SettingsBlock icon={<Copy size={17} />} title="Research Workflow">
        <p>Use the research workflow page to copy the prompt for ChatGPT or Codex. The dashboard does not run research itself.</p>
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

function KeyValue({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <p className="py-1">
      <span className="font-semibold text-charcoal">{label}:</span> {value || "Unknown"}
    </p>
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

function ReadinessBadge({ readiness }: { readiness: ResearchReadiness }) {
  if (readiness === "READY_TO_CONTACT") return <Badge text="READY" tone="strong" />;
  if (readiness === "CONTACT_NEEDED") return <Badge text="CONTACT NEEDED" tone="possible" />;
  return <Badge text="WATCH" tone="low" />;
}

function SmallPill({ children }: { children: React.ReactNode }) {
  return <span className="border border-charcoal/10 bg-paper px-2 py-1 text-xs text-ink">{children}</span>;
}

function IconButton({ icon, label, onClick, danger = false }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
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
  let next = leads.filter((lead) => belongsToView(lead, view));
  if (filters.lane !== "all") next = next.filter((lead) => getLeadLane(lead) === filters.lane);
  if (filters.status !== "All") next = next.filter((lead) => lead.status === filters.status);
  if (filters.readiness === "READY_TO_CONTACT") next = next.filter((lead) => getReadiness(lead) === "READY_TO_CONTACT");
  if (filters.readiness === "PARKED") next = next.filter((lead) => getReadiness(lead) !== "READY_TO_CONTACT");
  if (filters.restaurantGeography !== "All") next = next.filter((lead) => restaurantGeoBucket(lead) === filters.restaurantGeography);
  if (filters.speakingGeography !== "All") next = next.filter((lead) => lead.speakingGeographyType === filters.speakingGeography);
  if (filters.recommendedStage !== "All") next = next.filter((lead) => lead.recommendedStage === filters.recommendedStage);
  if (filters.offer !== "All") next = next.filter((lead) => lead.recommendedOffer === filters.offer);
  if (filters.intervention !== "All") next = next.filter((lead) => lead.recommendedInterventionModule === filters.intervention);
  if (filters.talk !== "All") next = next.filter((lead) => lead.recommendedTalk === filters.talk);
  if (filters.paidPotential !== "All") next = next.filter((lead) => lead.paidPotential === filters.paidPotential);
  if (filters.email !== "All") {
    next = next.filter((lead) => {
      if (filters.email === "Ready") return canOpenEmail(lead);
      if (filters.email === "Needs verification") return lead.emailStatus === "found_unconfirmed";
      return lead.emailStatus === "not_found";
    });
  }
  if (filters.priority !== "All") {
    next = next.filter((lead) => {
      const score = priorityScore(lead);
      if (filters.priority === "High Priority") return score >= 90;
      if (filters.priority === "Strong") return score >= 75 && score < 90;
      if (filters.priority === "Possible") return score >= 60 && score < 75;
      return score < 60;
    });
  }
  if (filters.researchBatch !== "All") next = next.filter((lead) => lead.researchBatch === filters.researchBatch);
  if (filters.search.trim()) {
    const query = filters.search.toLowerCase();
    next = next.filter((lead) =>
      [
        lead.organizationName,
        lead.organizationType,
        lead.contactName,
        lead.contactTitle,
        lead.contactEmail,
        lead.city,
        lead.state,
        lead.country,
        lead.needSignalSummary,
        lead.opportunitySignal,
        lead.trigger,
        lead.whyBespoked,
        lead.researchBatch,
        ...lead.tags
      ]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(query))
    );
  }
  return sortLeads(next, filters.sort);
}

function belongsToView(lead: Lead, view: View) {
  if (view === "ready") return visibleInReady(lead);
  if (view === "parked") return lead.status === "DISMISSED" || lead.status === "REJECTED" || getReadiness(lead) !== "READY_TO_CONTACT";
  if (view === "contacted") return lead.status === "CONTACTED";
  if (view === "follow-up") return lead.status === "FOLLOW_UP";
  if (view === "interested") return lead.status === "INTERESTED";
  return lead.status === "NEW" || lead.status === "APPROVED";
}

function visibleInReady(lead: Lead) {
  return getReadiness(lead) === "READY_TO_CONTACT" && !["CONTACTED", "FOLLOW_UP", "INTERESTED", "WON", "LOST", "DISMISSED", "REJECTED"].includes(lead.status);
}

function sortLeads(leads: Lead[], sort: Filters["sort"]) {
  const sorted = [...leads];
  if (sort === "Newest") return sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (sort === "Why Now") return sorted.sort((a, b) => (b.needSignalScore || b.timingScore) - (a.needSignalScore || a.timingScore));
  if (sort === "Organization") return sorted.sort((a, b) => a.organizationName.localeCompare(b.organizationName));
  return sortByPriority(sorted);
}

function sortByPriority(leads: Lead[]) {
  return [...leads].sort((a, b) => {
    if (getLeadLane(a) !== getLeadLane(b)) return getLeadLane(a) === "restaurant" ? -1 : 1;
    return priorityScore(b) - priorityScore(a);
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
      averageScore: Math.round(batchLeads.reduce((sum, lead) => sum + priorityScore(lead), 0) / batchLeads.length)
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

function calculateStats(leads: Lead[], generatedAt: string) {
  return {
    ready: leads.filter(visibleInReady).length,
    newThisWeek: leads.filter((lead) => lead.status === "NEW" && isNewThisWeek(lead.createdAt)).length,
    followUp: leads.filter((lead) => lead.status === "FOLLOW_UP").length,
    interested: leads.filter((lead) => lead.status === "INTERESTED").length,
    contactedThisWeek: leads.filter((lead) => lead.status === "CONTACTED" && isNewThisWeek(lead.contactedAt || lead.updatedAt || "")).length,
    generatedAt
  };
}

function getLeadLane(lead: Lead): LeadLane {
  return lead.leadLane || (lead.organizationType === "restaurant_group" || lead.organizationType === "hotel" ? "restaurant" : "speaking");
}

function getReadiness(lead: Lead): ResearchReadiness {
  return lead.researchReadiness || (canOpenEmail(lead) ? "READY_TO_CONTACT" : "CONTACT_NEEDED");
}

function priorityScore(lead: Lead) {
  return Math.round(lead.overallScore ?? lead.totalScore);
}

function canOpenEmail(lead: Lead) {
  return Boolean(lead.contactEmail && lead.emailStatus === "verified_public");
}

function isNewThisWeek(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);
  return date >= sevenDaysAgo;
}

function isOverdue(value: string) {
  const date = new Date(`${value}T23:59:59`);
  return !Number.isNaN(date.getTime()) && date < new Date();
}

function followUpText(value: string) {
  return isOverdue(value) ? `Follow-up overdue since ${shortDate(value)}` : `Follow up on ${shortDate(value)}`;
}

function restaurantGeoBucket(lead: Lead): RestaurantGeoFilter {
  if (lead.geographicTier === "TIER_1_LOCAL_CORE") return "San Diego";
  if (lead.geographicTier === "TIER_2_REGIONAL") return "Southern California";
  if (lead.geographicTier === "TIER_3_CALIFORNIA_OPPORTUNITY") return "California";
  const location = `${lead.city || ""} ${lead.state || ""} ${lead.country || ""}`.toLowerCase();
  if (location.includes("san diego")) return "San Diego";
  if (["los angeles", "orange", "ventura", "riverside", "san bernardino", "southern california"].some((place) => location.includes(place))) return "Southern California";
  if (location.includes("california") || lead.state === "California") return "California";
  return "Other";
}

function laneLabel(lane: LeadLane) {
  return lane === "restaurant" ? "Restaurant" : "Speaking";
}

function approachLabel(lead: Lead) {
  return getLeadLane(lead) === "restaurant" ? restaurantApproach(lead) : lead.recommendedTalk ? talkLabel(lead.recommendedTalk) : lead.recommendedOffer;
}

function restaurantApproach(lead: Lead) {
  if (lead.recommendedInterventionModule) return moduleLabel(lead.recommendedInterventionModule);
  if (lead.recommendedStage === "DIAGNOSE") return "Team Diagnostic";
  if (lead.recommendedStage === "INTERVENE") return "Team Intervention";
  if (lead.recommendedStage === "REINFORCE") return "Ongoing Advisory";
  if (lead.recommendedStage === "ADVISORY_SESSION") return "Paid Advisory Session";
  if (lead.recommendedOffer === "Hospitality Health Check") return "Team Diagnostic";
  if (lead.recommendedOffer === "On-Site Training") return "Team Intervention";
  if (lead.recommendedOffer === "Consulting / Transformation") return "Ongoing Advisory";
  if (lead.recommendedOffer === "Advisory Session") return "Paid Advisory Session";
  return lead.recommendedOffer;
}

function stageLabel(stage?: RecommendedStage) {
  if (stage === "DIAGNOSE") return "Diagnose";
  if (stage === "INTERVENE") return "Intervene";
  if (stage === "REINFORCE") return "Reinforce";
  if (stage === "ADVISORY_SESSION") return "Advisory";
  return "Unknown";
}

function moduleLabel(module?: InterventionModule) {
  if (module === "LEADER_OPERATING_RHYTHM") return "Leader Operating Rhythm";
  if (module === "STANDARDS_FLOW_PRESSURE") return "Standards, Flow & Pressure";
  if (module === "DIFFICULT_GUESTS_RECOVERY") return "Difficult Guests & Recovery";
  if (module === "HIRING_ONBOARDING") return "Hiring & Onboarding";
  return "Team Intervention";
}

function talkLabel(talk?: RecommendedTalk) {
  if (talk === "A_LIFE_IN_HOSPITALITY") return "A Life in Hospitality";
  if (talk === "EXCEPTIONAL_TEAMS") return "Exceptional Teams";
  return "Hospitality talk";
}

function formatLabel(format?: string) {
  if (!format) return "Format flexible";
  return format
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function speakingReachLabel(reach?: SpeakingGeographyType) {
  if (!reach) return "Reach unknown";
  return formatLabel(reach);
}

function paidPotentialLabel(value?: PaidPotential) {
  if (value === "HIGH") return "High paid potential";
  if (value === "MEDIUM") return "Possible paid opportunity";
  if (value === "LOW") return "Likely unpaid / low-budget";
  return "Payment unknown";
}

function viewTitle(view: View) {
  if (view === "ready") return "Ready to Contact";
  if (view === "parked") return "Parked";
  if (view === "contacted") return "Contacted";
  if (view === "follow-up") return "Follow Up";
  if (view === "interested") return "Interested";
  return "New";
}

function viewSubtitle(view: View) {
  if (view === "ready") return "Usable contact path";
  if (view === "parked") return "Contact needed or watch";
  if (view === "contacted") return "Already reached";
  if (view === "follow-up") return "Next touch";
  if (view === "interested") return "Positive signal";
  return "Fresh research";
}
