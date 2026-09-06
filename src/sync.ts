import type { Profile } from "./profile";

export interface Entry {
  id: string;
  date: string;
  mileage: string;
  unit: string;
  title: string;
  notes: string;
}

export type SyncStatus =
  "idle" | "syncing" | "synced" | "pending" | "offline" | "error";

export interface CloudJournalPayload {
  entries: Entry[];
  profile?: Profile;
}

export interface CloudJournalResponse {
  entries: Entry[];
  profile: Profile | null;
  updatedAt: string | null;
  exists: boolean;
}

export interface SaveResult {
  ok: boolean;
  updatedAt?: string;
  error?: string;
  /** Queued for a later retry because the network was unreachable. */
  pending?: boolean;
  /** The deployment has no Blob store, so this device stays local-only. */
  unconfigured?: boolean;
}

export const PENDING_KEY = "cardoc-journal-pending";

// The whole journal travels in one document, so the newest attempt supersedes
// any earlier queued one. Last write wins; there is nothing to merge.
export function readPending(): CloudJournalPayload | null {
  try {
    const raw = window.localStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.entries))
      return null;
    return parsed as CloudJournalPayload;
  } catch {
    return null;
  }
}

function writePending(payload: CloudJournalPayload | null) {
  try {
    if (payload) {
      window.localStorage.setItem(PENDING_KEY, JSON.stringify(payload));
    } else {
      window.localStorage.removeItem(PENDING_KEY);
    }
  } catch {
    // A full or blocked storage quota must not break saving on this device.
  }
}

export function hasPendingJournal(): boolean {
  return readPending() !== null;
}

export async function fetchCloudJournal(): Promise<CloudJournalResponse | null> {
  try {
    const res = await fetch("/api/journal", {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as CloudJournalResponse;
    return data;
  } catch {
    return null;
  }
}

export async function saveCloudJournal(
  entries: Entry[],
  profile?: Profile,
): Promise<SaveResult> {
  const payload: CloudJournalPayload = { entries, profile };
  try {
    const res = await fetch("/api/journal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (res.status === 503) {
      // No Blob store is configured, so retrying can never succeed. Drop the
      // queue and let the device run on local storage alone.
      writePending(null);
      return { ok: false, unconfigured: true, error: "Cloud storage is off" };
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Failed to save" }));
      // A rejected payload is a bug, not a connectivity problem; queuing it
      // would retry the same failure forever.
      if (res.status >= 400 && res.status < 500) {
        writePending(null);
        return { ok: false, error: err.error || "Save rejected" };
      }
      writePending(payload);
      return { ok: false, pending: true, error: err.error || "Save failed" };
    }

    const data = await res.json();
    writePending(null);
    return { ok: true, updatedAt: data.updatedAt };
  } catch {
    writePending(payload);
    return { ok: false, pending: true, error: "Network error" };
  }
}

/**
 * Push a journal that was written while offline. Safe to call on every load
 * and on every `online` event; it is a no-op when nothing is queued.
 */
export async function flushPendingJournal(): Promise<SaveResult | null> {
  const pending = readPending();
  if (!pending) return null;
  return saveCloudJournal(pending.entries, pending.profile);
}
