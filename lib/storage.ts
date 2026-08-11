"use client";

import {
  reviewStateMapSchema,
  type ResearchRequest,
  type ReviewState,
  type ReviewStateMap,
  type Segment
} from "./types";

const REVIEW_KEY = "bespoked-outreach.review-state.v011";
const PREFS_KEY = "bespoked-outreach.preferences.v011";

export type Preferences = {
  defaultGeography: string;
  defaultSegment: Segment;
  defaultCount: 5 | 10 | 20;
  defaultSenderName: string;
  showDemoData: boolean;
};

export const defaultPreferences: Preferences = {
  defaultGeography: "United States",
  defaultSegment: "Hotels",
  defaultCount: 10,
  defaultSenderName: "Lucas Ketir",
  showDemoData: false
};

function isBrowser() {
  return typeof window !== "undefined";
}

export const reviewStore = {
  all(): ReviewStateMap {
    if (!isBrowser()) return {};
    const raw = window.localStorage.getItem(REVIEW_KEY);
    if (!raw) return {};
    try {
      return reviewStateMapSchema.parse(JSON.parse(raw));
    } catch {
      return {};
    }
  },
  saveAll(state: ReviewStateMap) {
    if (!isBrowser()) return;
    window.localStorage.setItem(REVIEW_KEY, JSON.stringify(state));
  },
  update(leadId: string, patch: Partial<Omit<ReviewState, "updatedAt">>) {
    const state = this.all();
    state[leadId] = {
      status: state[leadId]?.status || "NEW",
      editedSubject: state[leadId]?.editedSubject,
      editedBody: state[leadId]?.editedBody,
      notes: state[leadId]?.notes,
      ...patch,
      updatedAt: new Date().toISOString()
    };
    this.saveAll(state);
    return state;
  },
  clear() {
    if (!isBrowser()) return;
    window.localStorage.removeItem(REVIEW_KEY);
  },
  importJson(json: string) {
    const parsed = reviewStateMapSchema.parse(JSON.parse(json));
    this.saveAll(parsed);
    return parsed;
  }
};

export const preferenceStore = {
  get(): Preferences {
    if (!isBrowser()) return defaultPreferences;
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return defaultPreferences;
    try {
      return { ...defaultPreferences, ...JSON.parse(raw) };
    } catch {
      return defaultPreferences;
    }
  },
  save(preferences: Preferences) {
    if (!isBrowser()) return;
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(preferences));
  },
  toResearchRequest(preferences: Preferences): ResearchRequest {
    return {
      segment: preferences.defaultSegment,
      geography: preferences.defaultGeography,
      count: preferences.defaultCount,
      instructions: ""
    };
  }
};
