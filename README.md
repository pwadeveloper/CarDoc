# CarDoc

Interactive companion for a **2012 Lexus IS 250 RWD**, using React, TypeScript and Vite.

## Features

- Eight interactive system hotspots and original conceptual car illustrations.
- **31 generic OBD-II code entries**, including misfire, lean/rich mixture, catalyst, EVAP, airflow, cooling, ignition-coil and injector-circuit codes. Highlighting identifies systems to investigate, never a confirmed repair or unverified cylinder location.
- Ten companion guides plus **40 English topic shortcuts into official Lexus Japan PDFs**.
- Downloadable original owner manuals, an embedded PDF viewer, factory illustrations and links with both printed and PDF page numbers.
- **676 indexed pages** across two production editions: 336 pages for July 2011–June 2012 and 340 pages for July 2012–April 2013.
- OpenAI answers receive relevant original Japanese pages and recent conversation history. The prompt requests English explanations and page citations; citation links are validated against known manuals.
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

## OpenAI setup

Copy `.env.example` to `.env.local` for local development, or set server environment variables on the host:

```dotenv
OPENAI_API_KEY=your-server-side-key
CARDOC_AI_MODEL=your-supported-chat-completions-model
```

Use a model supporting Chat Completions and `max_completion_tokens`. Never prefix secrets with `VITE_`. Restart the dev server after changing credentials. The Vite development server now handles `/api/ask`; `npm run preview` is static and does not run the API.

For Vercel, use the Vite preset, `npm run build`, and output `dist`; `api/ask.ts` supplies the serverless endpoint. Other static hosts support the manual, built-in Q&A and JSON persistence, but need a separate backend for OpenAI. Paths currently assume hosting at `/`.

Enable “Use optional AI connection” inside Ask CarDoc. The server retrieves source pages itself, ignoring client-supplied document context. Requests include the latest question, bounded previous turns and non-VIN vehicle fields. The application does not automatically upload chat JSON files to OpenAI; imported history enters requests only when AI is enabled. Network or provider failures display a labeled built-in fallback.

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

Assistant messages also carry `source` (`built-in` or `openai`) and optional validated `citations`. Imports accept only supported versions, user/assistant roles, bounded message sizes and known manual citation URLs. Importing replaces the current chat after an in-app confirmation; export first to preserve it. Clearing browser storage removes local records; export is the backup mechanism. No API keys or VIN are added to exported metadata, though anything the user types remains in message text.

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
