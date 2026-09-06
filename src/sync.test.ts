// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  saveCloudJournal,
  flushPendingJournal,
  hasPendingJournal,
  readPending,
  PENDING_KEY,
  type Entry,
} from "./sync";

const entry: Entry = {
  id: "e1",
  date: "2026-09-06",
  mileage: "171713",
  unit: "mi",
  title: "Oil change",
  notes: "5W-30 synthetic",
};

function respond(status: number, body: unknown = {}) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

beforeEach(() => window.localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("journal writes without a connection", () => {
  it("queues the journal when the network is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    const res = await saveCloudJournal([entry]);
    expect(res).toMatchObject({ ok: false, pending: true });
    expect(hasPendingJournal()).toBe(true);
    expect(readPending()?.entries[0].title).toBe("Oil change");
  });

  it("keeps only the newest attempt, because the whole journal is one document", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    await saveCloudJournal([entry]);
    await saveCloudJournal([entry, { ...entry, id: "e2", title: "Brakes" }]);
    expect(readPending()?.entries).toHaveLength(2);
  });

  it("clears the queue once a save succeeds", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    await saveCloudJournal([entry]);
    vi.stubGlobal("fetch", respond(200, { updatedAt: "2026-09-06T00:00:00Z" }));
    const res = await saveCloudJournal([entry]);
    expect(res.ok).toBe(true);
    expect(hasPendingJournal()).toBe(false);
  });

  it("survives a reload, so a queued journal is not lost with the tab", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    await saveCloudJournal([entry]);
    expect(window.localStorage.getItem(PENDING_KEY)).toContain("Oil change");
  });
});

describe("flushPendingJournal", () => {
  it("does nothing when there is nothing queued", async () => {
    const fetchMock = respond(200);
    vi.stubGlobal("fetch", fetchMock);
    expect(await flushPendingJournal()).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("pushes the queued journal and empties the queue", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    await saveCloudJournal([entry]);
    const fetchMock = respond(200, { updatedAt: "2026-09-06T00:00:00Z" });
    vi.stubGlobal("fetch", fetchMock);
    const res = await flushPendingJournal();
    expect(res?.ok).toBe(true);
    expect(hasPendingJournal()).toBe(false);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.entries[0].id).toBe("e1");
  });

  it("keeps the journal queued when the retry also fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    await saveCloudJournal([entry]);
    const res = await flushPendingJournal();
    expect(res?.pending).toBe(true);
    expect(hasPendingJournal()).toBe(true);
  });
});

describe("failures that retrying cannot fix", () => {
  it("stops queuing when the deployment has no Blob store", async () => {
    vi.stubGlobal("fetch", respond(503, { error: "not configured" }));
    const res = await saveCloudJournal([entry]);
    expect(res).toMatchObject({ ok: false, unconfigured: true });
    expect(hasPendingJournal()).toBe(false);
  });

  it("drops a payload the server rejects rather than retrying it forever", async () => {
    vi.stubGlobal("fetch", respond(400, { error: "Too many entries" }));
    const res = await saveCloudJournal([entry]);
    expect(res.ok).toBe(false);
    expect(res.pending).toBeUndefined();
    expect(hasPendingJournal()).toBe(false);
  });

  it("queues a server error, which may just be a bad moment", async () => {
    vi.stubGlobal("fetch", respond(500, { error: "Blob unavailable" }));
    expect((await saveCloudJournal([entry])).pending).toBe(true);
    expect(hasPendingJournal()).toBe(true);
  });
});

describe("corrupt queue state", () => {
  it("ignores unparseable queued data instead of throwing on load", () => {
    window.localStorage.setItem(PENDING_KEY, "{not json");
    expect(hasPendingJournal()).toBe(false);
    expect(readPending()).toBeNull();
  });

  it("ignores queued data that is not a journal", () => {
    window.localStorage.setItem(PENDING_KEY, JSON.stringify({ entries: "no" }));
    expect(readPending()).toBeNull();
  });
});
