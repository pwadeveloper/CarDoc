import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import handler from "../api/journal";

vi.mock("@vercel/blob", () => {
  return {
    get: vi.fn(),
    put: vi.fn(),
  };
});

import { get, put } from "@vercel/blob";

function mockResponse() {
  let output = "";
  return {
    statusCode: 0,
    setHeader: vi.fn(),
    end: vi.fn((data?: string) => {
      if (data) output = data;
    }),
    getJson: () => (output ? JSON.parse(output) : null),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("BLOB_READ_WRITE_TOKEN", "mock-token");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Journal API endpoint", () => {
  it("rejects unsupported HTTP methods", async () => {
    const res = mockResponse();
    await handler({ method: "DELETE", headers: {} } as never, res as never);
    expect(res.statusCode).toBe(405);
    expect(res.getJson()).toEqual({ error: "Method not allowed" });
  });

  it("returns 503 if BLOB_READ_WRITE_TOKEN is missing", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    const res = mockResponse();
    await handler({ method: "GET", headers: {} } as never, res as never);
    expect(res.statusCode).toBe(503);
    expect(res.getJson().error).toMatch(/missing BLOB_READ_WRITE_TOKEN/i);
  });

  it("rejects cross-site requests", async () => {
    const res = mockResponse();
    await handler(
      {
        method: "POST",
        headers: { "sec-fetch-site": "cross-site" },
        body: { entries: [] },
      } as never,
      res as never,
    );
    expect(res.statusCode).toBe(403);
    expect(res.getJson()).toEqual({ error: "Cross-site request rejected" });
  });

  it("GET returns empty array if no blob exists yet", async () => {
    vi.mocked(get).mockResolvedValueOnce(null as never);
    const res = mockResponse();
    await handler({ method: "GET", headers: {} } as never, res as never);
    expect(res.statusCode).toBe(200);
    expect(res.getJson()).toEqual({
      entries: [],
      profile: null,
      updatedAt: null,
      exists: false,
    });
  });

  it("GET returns existing journal entries and profile", async () => {
    const mockData = {
      entries: [
        {
          id: "srv-1",
          date: "2026-08-23",
          mileage: "171713",
          unit: "mi",
          title: "Oil change",
          notes: "5W-30 synthetic",
        },
      ],
      profile: { mileage: "171713", unit: "mi" },
      updatedAt: "2026-09-01T10:00:00.000Z",
    };

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(JSON.stringify(mockData)));
        controller.close();
      },
    });

    vi.mocked(get).mockResolvedValueOnce({
      statusCode: 200,
      stream,
    } as never);

    const res = mockResponse();
    await handler({ method: "GET", headers: {} } as never, res as never);
    expect(res.statusCode).toBe(200);
    const json = res.getJson();
    expect(json.exists).toBe(true);
    expect(json.entries).toHaveLength(1);
    expect(json.entries[0].title).toBe("Oil change");
    expect(json.profile.mileage).toBe("171713");
  });

  it("POST validates that entries is an array", async () => {
    const res = mockResponse();
    await handler(
      {
        method: "POST",
        headers: {},
        body: { entries: "not-an-array" },
      } as never,
      res as never,
    );
    expect(res.statusCode).toBe(400);
    expect(res.getJson().error).toMatch(/Missing or invalid 'entries'/);
  });

  it("POST validates and saves entries and profile to Blob", async () => {
    vi.mocked(put).mockResolvedValueOnce({
      url: "https://blob.vercel-storage.com/car-journal.json",
    } as never);

    const res = mockResponse();
    const payload = {
      entries: [
        {
          id: "entry-1",
          date: "2026-09-01",
          mileage: "172000",
          unit: "mi",
          title: "Brake Fluid Flush",
          notes: "DOT 4 synthetic",
        },
      ],
      profile: {
        mileage: "172000",
        market: "Japan",
      },
    };

    await handler(
      {
        method: "POST",
        headers: {},
        body: payload,
      } as never,
      res as never,
    );

    expect(res.statusCode).toBe(200);
    expect(vi.mocked(put)).toHaveBeenCalledTimes(1);
    const [pathname, bodyString, options] = vi.mocked(put).mock.calls[0];
    expect(pathname).toBe("car-journal.json");
    expect(options).toMatchObject({
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    const savedDoc = JSON.parse(bodyString as string);
    expect(savedDoc.entries).toHaveLength(1);
    expect(savedDoc.entries[0].title).toBe("Brake Fluid Flush");
    expect(savedDoc.profile.mileage).toBe("172000");
    expect(res.getJson().ok).toBe(true);
    expect(res.getJson().count).toBe(1);
  });
});

// The journal is written to one fixed pathname, so every save after the first
// is an overwrite. A mock that always resolves hides that: production froze at
// its first write because `put` rejects an existing blob unless asked to
// overwrite. This mock enforces the real rule.
describe("overwriting the stored journal", () => {
  it("asks Blob to overwrite, so the second save is not rejected", async () => {
    const stored = new Set<string>();
    vi.mocked(put).mockImplementation((async (
      pathname: string,
      _body: unknown,
      options: { allowOverwrite?: boolean },
    ) => {
      if (stored.has(pathname) && !options?.allowOverwrite) {
        throw new Error(
          "Vercel Blob: This blob already exists, use `allowOverwrite: true`",
        );
      }
      stored.add(pathname);
      return { url: `https://blob.vercel-storage.com/${pathname}` };
    }) as never);

    const payload = {
      entries: [
        {
          id: "entry-1",
          date: "2026-09-07",
          mileage: "172500",
          unit: "mi",
          title: "Oil change",
          notes: "",
        },
      ],
    };
    for (const attempt of [1, 2]) {
      const res = mockResponse();
      await handler(
        { method: "POST", headers: {}, body: payload } as never,
        res as never,
      );
      expect(res.statusCode, `save #${attempt} should succeed`).toBe(200);
    }
    expect(vi.mocked(put)).toHaveBeenCalledTimes(2);
  });
});
