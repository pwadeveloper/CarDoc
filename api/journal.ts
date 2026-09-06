import type { IncomingMessage, ServerResponse } from "node:http";
import { get, put } from "@vercel/blob";

type Request = IncomingMessage & { body?: unknown };

export interface JournalEntryPayload {
  id: string;
  date: string;
  mileage?: string;
  unit?: string;
  title: string;
  notes: string;
}

export interface ProfilePayload {
  market?: string;
  transmission?: string;
  mileage?: string;
  unit?: string;
  trim?: string;
  modifications?: string;
  lastServiceDate?: string;
  buildPeriod?: string;
  configurationRevision?: number;
}

export interface JournalDocument {
  entries: JournalEntryPayload[];
  profile?: ProfilePayload;
  updatedAt: string;
}

const BLOB_PATHNAME = "car-journal.json";

function parseRequestBody(req: Request): Promise<unknown> {
  if (req.body !== undefined) return Promise.resolve(req.body);
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 500_000) {
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

export default async function handler(req: Request, res: ServerResponse) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");

  const send = (status: number, body: unknown) => {
    res.statusCode = status;
    res.end(JSON.stringify(body));
  };

  const hasBlobToken = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  if (!hasBlobToken) {
    return send(503, {
      error: "Vercel Blob storage is not configured (missing BLOB_READ_WRITE_TOKEN).",
    });
  }

  // Reject suspicious cross-site origin requests
  if (req.headers["sec-fetch-site"] === "cross-site") {
    return send(403, { error: "Cross-site request rejected" });
  }

  if (req.method === "GET") {
    try {
      const blobResult = await get(BLOB_PATHNAME, { access: "public" });
      if (!blobResult || !blobResult.stream) {
        return send(200, {
          entries: [],
          profile: null,
          updatedAt: null,
          exists: false,
        });
      }

      const raw = await new Response(blobResult.stream).text();
      const parsed = JSON.parse(raw) as Partial<JournalDocument>;

      return send(200, {
        entries: Array.isArray(parsed.entries) ? parsed.entries : [],
        profile: parsed.profile ?? null,
        updatedAt: parsed.updatedAt ?? null,
        exists: true,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to read storage";
      return send(500, { error: message });
    }
  }

  if (req.method === "POST" || req.method === "PUT") {
    try {
      const body = (await parseRequestBody(req)) as {
        entries?: unknown;
        profile?: unknown;
      };

      if (!body || typeof body !== "object") {
        return send(400, { error: "Invalid JSON body" });
      }

      if (!Array.isArray(body.entries)) {
        return send(400, { error: "Missing or invalid 'entries' array" });
      }

      if (body.entries.length > 500) {
        return send(400, { error: "Too many entries (maximum 500 allowed)" });
      }

      const validEntries: JournalEntryPayload[] = [];
      for (const item of body.entries) {
        if (!item || typeof item !== "object") continue;
        const e = item as Record<string, unknown>;
        if (
          typeof e.id !== "string" ||
          typeof e.date !== "string" ||
          typeof e.title !== "string" ||
          typeof e.notes !== "string"
        ) {
          continue;
        }

        validEntries.push({
          id: e.id.trim().slice(0, 128),
          date: e.date.trim().slice(0, 32),
          mileage: typeof e.mileage === "string" ? e.mileage.trim().slice(0, 32) : "",
          unit: typeof e.unit === "string" ? e.unit.trim().slice(0, 16) : "mi",
          title: e.title.trim().slice(0, 256),
          notes: e.notes.trim().slice(0, 10000),
        });
      }

      let validProfile: ProfilePayload | undefined = undefined;
      if (body.profile && typeof body.profile === "object") {
        const p = body.profile as Record<string, unknown>;
        validProfile = {
          market: typeof p.market === "string" ? p.market.slice(0, 64) : undefined,
          transmission: typeof p.transmission === "string" ? p.transmission.slice(0, 64) : undefined,
          mileage: typeof p.mileage === "string" ? p.mileage.slice(0, 32) : undefined,
          unit: typeof p.unit === "string" ? p.unit.slice(0, 16) : undefined,
          trim: typeof p.trim === "string" ? p.trim.slice(0, 128) : undefined,
          modifications: typeof p.modifications === "string" ? p.modifications.slice(0, 2000) : undefined,
          lastServiceDate: typeof p.lastServiceDate === "string" ? p.lastServiceDate.slice(0, 32) : undefined,
          buildPeriod: typeof p.buildPeriod === "string" ? p.buildPeriod.slice(0, 64) : undefined,
          configurationRevision: typeof p.configurationRevision === "number" ? p.configurationRevision : undefined,
        };
      }

      const document: JournalDocument = {
        entries: validEntries,
        profile: validProfile,
        updatedAt: new Date().toISOString(),
      };

      const putResult = await put(BLOB_PATHNAME, JSON.stringify(document, null, 2), {
        access: "public",
        addRandomSuffix: false,
        contentType: "application/json",
      });

      return send(200, {
        ok: true,
        count: validEntries.length,
        url: putResult.url,
        updatedAt: document.updatedAt,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to write to storage";
      return send(500, { error: message });
    }
  }

  res.setHeader("Allow", "GET, POST, PUT");
  return send(405, { error: "Method not allowed" });
}
