import type { Profile } from "./profile";

export interface Entry {
  id: string;
  date: string;
  mileage: string;
  unit: string;
  title: string;
  notes: string;
}

export type SyncStatus = "idle" | "syncing" | "synced" | "offline" | "error";

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
): Promise<{ ok: boolean; updatedAt?: string; error?: string }> {
  try {
    const res = await fetch("/api/journal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ entries, profile }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Failed to save" }));
      return { ok: false, error: err.error || "Save failed" };
    }

    const data = await res.json();
    return { ok: true, updatedAt: data.updatedAt };
  } catch {
    return { ok: false, error: "Network error" };
  }
}
