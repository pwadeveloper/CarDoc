# CarDoc

Interactive companion for a **2012 Lexus IS 250 RWD**, using React, TypeScript and Vite.

## Features

- Eight interactive system hotspots and original conceptual car illustrations.
- **31 generic OBD-II code entries**, including misfire, lean/rich mixture, catalyst, EVAP, airflow, cooling, ignition-coil and injector-circuit codes. Highlighting identifies systems to investigate, never a confirmed repair or unverified cylinder location.
- Ten companion guides plus **40 English topic shortcuts into official Lexus Japan PDFs**.
- Downloadable original owner manuals, an embedded PDF viewer, factory illustrations and links with both printed and PDF page numbers.
- **676 indexed pages** across two production editions: 336 pages for July 2011–June 2012 and 340 pages for July 2012–April 2013.
- AI answers (powered by Google Gemini or OpenAI) receive relevant original Japanese pages and recent conversation history. The prompt requests English explanations and page citations; citation links are validated against known manuals.
- **Versioned JSON conversation storage**, export, import and clear. Restores previous chat on reload; saves the latest 200 messages locally. Only up to 12 recent messages / 24,000 characters enter an AI request.
- Editable vehicle profile, local service journal, and migration of the previous unknown-market profile.

## Vehicle profile

Owner-reported: Japan market, six-speed automatic, RWD, 171,713 **miles**, standard equipment, used in Nigeria, owned for four years. The last service was reported as “two weeks ago” on September 6, 2026: **approximately August 23, 2026**. Work performed, parts changed and mileage at service are unspecified. No overdue-maintenance calculation is inferred from that date.

The VIN decoder established a 2012 Lexus IS sedan, 2.5L 4GR-FSE, Japan build country and 4x2. Japan sales market is an owner report, not a VIN-verified conclusion. The full VIN is absent from source and default storage. Exact production month remains unknown, so both manual editions are available. Select a period in Vehicle details when confirmed from the build label.

## Run and validate

Requires Node **22.13+**, with Node 24 LTS used in CI.

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

Before dev, tests or builds, `scripts/prepare-manuals.mjs` downloads the two official PDFs if needed, verifies pinned SHA-256 hashes and page counts, then extracts Japanese text with PDF.js CMaps. Failed downloads or changed documents fail the preparation step rather than silently using corrupt content. Subsequent runs use cached PDFs and the index.

Generated files are ignored by Git:

- `public/manuals/`: original PDFs, copied into `dist/manuals/` for viewing and downloading.
- `server/generated/manual-pages.json`: complete page text, imported **only on the server**, never into the browser JavaScript bundle.

A fresh checkout needs internet access on its first preparation run. The build includes original Lexus documents; copyright remains with Lexus. The repository contains source URLs and hashes, not PDF binaries or full extracted manual text.

## AI setup (Google Gemini / OpenAI)

Copy `.env.example` to `.env.local` for local development, or set server environment variables on the host:

```dotenv
GEMINI_API_KEY=your-gemini-api-key
CARDOC_AI_MODEL=gemini-3.8-flash
```

Or for OpenAI:
```dotenv
OPENAI_API_KEY=your-server-side-key
CARDOC_AI_MODEL=gpt-4o-mini
```

Never prefix secrets with `VITE_`. Restart the dev server after changing credentials. The Vite development server handles `/api/ask`; `npm run preview` is static and does not run the API.

For Vercel, use the Vite preset, `npm run build`, and output `dist`; `api/ask.ts` supplies the serverless endpoint. Other static hosts support the manual, built-in Q&A and JSON persistence, but need a separate backend for AI. Paths currently assume hosting at `/`.

Enable “Use optional AI connection” inside Ask CarDoc. The server retrieves source pages itself, ignoring client-supplied document context. Requests include the latest question, bounded previous turns and non-VIN vehicle fields. The application does not automatically upload chat JSON files to AI providers; imported history enters requests only when AI is enabled. Network or provider failures display a labeled built-in fallback.

Before exposing a paid endpoint publicly, configure hosting authentication and durable rate limiting. Input limits and cross-site checks are not a substitute for access control. There is no cloud chat storage or user account system.

## Conversation JSON

The `cardoc-conversation-v1` local-storage key uses this structure:

```json
{
  "schemaVersion": 1,
  "id": "conversation-uuid",
  "createdAt": "2026-09-06T12:00:00.000Z",
  "updatedAt": "2026-09-06T12:01:00.000Z",
  "messages": [
    {
      "id": "message-uuid",
      "role": "user",
      "text": "What does P0301 mean?",
      "createdAt": "2026-09-06T12:00:00.000Z"
    }
  ]
}
```

Assistant messages also carry `source` (`built-in`, `gemini`, or `openai`) and optional validated `citations`. Imports accept only supported versions, user/assistant roles, bounded message sizes and known manual citation URLs. Importing replaces the current chat after an in-app confirmation; export first to preserve it. Clearing browser storage removes local records; export is the backup mechanism. No API keys or VIN are added to exported metadata, though anything the user types remains in message text.

## Sources and limits

Verified September 6, 2026:

- [Official Lexus Japan IS manual catalogue](https://manual.lexus.jp/is/) — production-period applicability.
- [M53A85, July 2011–June 2012](https://manual.lexus.jp/pdf/is/IS350-IS250_OM_JP_M53A85_1_1108.pdf) — 336-page Japanese owner's manual.
- [M53B60, July 2012–April 2013](https://manual.lexus.jp/pdf/is/IS350-IS250_OM_JP_M53B60_1_1208.pdf) — 340-page Japanese owner's manual.
- [Autel DTC reference](https://www.autel.com/u/cms/www/201910/151158279dbd.pdf) — generic code definitions, including additional coil/injector and EVAP entries.
- [Lexus 2012 IS product information](https://pressroom.lexus.com/2012-lexus-is-250-350-product-specs/) and [NHTSA VIN decoder](https://www.nhtsa.gov/vin-decoder) — model identity context.
- [Toyota / Lexus TIS](https://techinfo.toyota.com/) — separate factory workshop information; not imported.

Retrieval uses English topic keywords and Japanese text matching, selecting at most six pages. It is not a semantic vector search and may miss unusual phrasing. Built-in answers provide guides and page links, not automatic translations of the entire manual. OpenAI translation and generation still need checking. An index of every page does not guarantee an answer to every question.

The official documents are **owner manuals**, not full workshop repair manuals, wiring books or complete DTC diagnostic trees. The navigation-system manual is separate. Optional equipment may be illustrated even when not fitted. Factory diagrams provide accurate references within their stated scope; the interactive top-view schematic remains approximate. No bank or cylinder layout was invented. Older U.S. misfire bulletins found during research were not imported as Japan-market 2012 instructions because their applicability did not match.

No scan is assumed current. Enter the exact codes, module, symptoms and freeze-frame information when the next scan is available.

## Validation

Automated tests cover code mappings, unknown codes, profile migration, service-report seeding, saved chat restoration, JSON validation, bounded history, manual page retrieval, production-edition selection, PDF page links and API grounding. `npm run build` typechecks client and server code.

Original PDF illustrations were rendered and visually checked (hood release, jacking points and fuse boxes). Full real-browser UI visual verification remains blocked by the development sandbox's Chromium restrictions. Live OpenAI output has not been tested without credentials; mocked provider behavior and the unconfigured local endpoint are tested.

### English owner’s manual

The manual library links to the English 2012 IS 250 / IS 350 owner’s manual,
OM53A87U, hosted by Car Manuals Online. It is a North American reference, not
a translation of the Japan-market edition. Equipment and specifications may
vary. The English PDF is not bundled because its download hosts rejected
access; AI retrieval continues to use the downloaded Japanese Lexus originals.

### Translation of the uploaded Japan-market manual

`knowledge/sources/is250-jp-early.pdf` is the user-supplied, hash-verified
336-page M53A85 original. `knowledge/translations/jp-early.en.json` stores
English translations with PDF page numbers, source text hashes, provenance,
review status and translation notes. The initial three translated pages are
PDF 238–240 (printed 234–236); **333 pages remain untranslated**. These are
unofficial AI translations, not Lexus-certified or independently reviewed.
The English reader shows exact coverage and missing-page states, searches
available English text and links to the original diagrams. The AI receives
English alongside Japanese only when edition and source hashes match.

To translate the remaining pages, configure a vision-capable Gemini or OpenAI model
with structured output support in the gitignored `.env`:

```sh
GEMINI_API_KEY=your-key
CARDOC_TRANSLATION_MODEL=your-gemini-model-id
```

Then run:

```sh
npm run prebuild
npm run translate:manual -- --check   # coverage only; no API request
npm run translate:manual -- --limit 1 # optional one-page trial
npm run translate:manual             # all remaining pages; uses paid API calls
npm test
npm run build
```

The runner sends each rendered Japanese page plus extracted text to the selected provider,
requests a full translation including diagram labels, and saves each result
atomically. Truncated, refused or self-reported incomplete responses stop the
run without marking that page complete. Re-run after an error to resume.
Generation is never part of normal builds or chat requests. It does not
translate diagrams into new artwork; the original PDF preserves their visual
geometry. Notes must be checked, especially tables, warnings and numerical
specifications. Schema validation does not establish translation accuracy.

A lock prevents simultaneous writers. If a process is forcibly terminated,
remove `knowledge/translations/jp-early.en.json.lock` only after confirming no
translation process is running. Completed JSON pages remain intact. Commit
the updated translation JSON after review; this makes English pages available
without requiring API calls to read them. The later Japanese edition is not
included in this translation workflow.

Translation uses Gemini when `GEMINI_API_KEY` is present, matching chat.
`CARDOC_TRANSLATION_MODEL` overrides the shared `CARDOC_AI_MODEL`. To use
OpenAI explicitly when both keys exist, set `CARDOC_TRANSLATION_PROVIDER=openai`,
`OPENAI_API_KEY` and an OpenAI `CARDOC_TRANSLATION_MODEL`. The runner does not
use web search or silently switch providers after errors. Neither key is
required to read the saved translations.
