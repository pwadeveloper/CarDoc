# CarDoc

An interactive companion manual for a **2012 Lexus IS 250 RWD**, built with React, TypeScript and Vite. A restrained green dashboard pairs an original sedan illustration with an interactive system diagram.

## What works

- Eight keyboard-accessible system hotspots with explanatory details.
- Multi-code lookup for 15 generic OBD-II codes: P0300–P0306, P0171, P0174, P0420, P0430, P0442, P0455, P0101 and P0128.
- Related systems highlighted on the diagram, possible causes, next checks and condition-dependent urgency. Unknown codes do not invent a diagnosis.
- Ten searchable, expandable companion guides with documentation links.
- Built-in question answering for supported codes and manual topics. This is deterministic retrieval, not an LLM or a complete repair database.
- Editable car configuration and service journal persisted in browser local storage. Records retain their original odometer unit when the profile unit changes.
- Optional server-side AI endpoint, with clear fallback when unconfigured or unavailable.
- Responsive desktop/mobile layout, reduced-motion support, accessible forms and dialog keyboard handling.

## Vehicle configuration

The supplied VIN decoded cleanly through NHTSA vPIC as a 2012 Lexus IS sedan, Japan-built, 2.5L 4GR-FSE, 4x2. The owner confirmed RWD, automatic transmission, an odometer reading of 171,713, use in Nigeria and four years of ownership. **Odometer units and original sales market remain unconfirmed.** Build country does not establish sales market. The full VIN is deliberately absent from the source, browser defaults and Git history.

The profile is a snapshot, not live vehicle telemetry. The app does not connect directly to a scanner. Enter scanner codes manually. There is no maintenance-due calculation without a verified market schedule and service history.

## Run

Requires Node 22.12+ (Node 24 LTS recommended).

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. No credentials are needed for the built-in features.

```sh
npm test
npm run build
npm run preview
```

## Hosting and optional AI

The static `dist/` output can be hosted on a normal static host. On a subpath, set Vite's `base` option accordingly. The optional API requires a serverless host; it does not run under plain `vite dev` or static hosting.

For Vercel, import this repository, use the Vite preset, build with `npm run build`, and publish `dist`. `api/ask.ts` becomes a serverless endpoint. For local full-stack testing, use `vercel dev` after connecting the project.

To enable optional AI, set these **server-side** variables in the hosting dashboard:

- `OPENAI_API_KEY`: your API credential.
- `CARDOC_AI_MODEL`: a model available to your account that supports Chat Completions and `max_completion_tokens`.

Do not use `VITE_` prefixes for secrets. `.env.example` is a template; actual environment files are ignored. Enable the “Use optional AI connection” checkbox inside Ask CarDoc. This sends the current question, retrieved guide and non-VIN vehicle configuration to the configured provider. Chat history is not sent or persisted. Failure returns the built-in answer.

Keep deployment access restricted when enabling a paid API: the endpoint includes input limits and cross-site browser checks, but no user authentication or durable rate limiting. Configure those at the hosting layer before making AI publicly accessible. Client-supplied context is treated as untrusted by the system prompt. AI output is plain text and cannot execute HTML or change the diagram's curated mappings.

## Knowledge scope and sources

This is an original companion guide, **not a reproduction of the factory owner's manual or a VIN-specific workshop repair manual**. No factory artwork is redistributed. The diagrams are original conceptual illustrations, not dimensionally accurate component locations, bank assignments or cylinder-numbering diagrams. Highlighted systems are areas to investigate, not confirmed failed parts. Exact repair procedures, wiring, torque values, fluid specifications and service intervals require the appropriate Lexus information.

References checked on September 6, 2026:

- [Lexus 2012 IS product information](https://pressroom.lexus.com/2012-lexus-is-250-350-product-specs/) — model reference.
- [Lexus 2012 IS press release](https://pressroom.lexus.com/?generate_pdf=54559) — engine and drivetrain context.
- [NHTSA VIN decoder](https://www.nhtsa.gov/vin-decoder) — vehicle identity. No VIN is stored here.
- [Autel scanner manual / DTC definitions](https://www.autel.com/u/cms/www/201910/151158279dbd.pdf) — generic code meanings, not Lexus-specific repair instructions.
- [New Jersey MVC owner education](https://www.nj.gov/mvc/pdf/inspections/OwnerEdBroch.pdf) — common code interpretation and diagnostic context.
- [Lexus owner resources](https://www.lexus.com/My-Lexus/resources) — owner-manual entry point; choose the correct year and market. Portal retrieval was not available during development.
- [Toyota / Lexus Technical Information System](https://techinfo.toyota.com/) — factory service-information entry point; repair content can require paid access and has not been imported into this application.

## Validation

Tests cover extraction, unsupported-code behavior, system mappings, misfire guidance, bounded question answering, multi-code UI flows, profile and journal persistence, manual search, and optional API success/failure handling. The production build typechecks client and API code.

The gstack browser could not launch in the development session because the macOS sandbox denied Chromium Mach-port registration. DOM interaction tests were used; real-browser visual verification remains outstanding. No live AI-provider call was made without credentials.

Data stays on the device and can be lost if browser storage is cleared. No backend account, cloud sync or backup is provided.
