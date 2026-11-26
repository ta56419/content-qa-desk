# Content QA Desk

Content QA Desk checks article HTML before publishing. It flags missing titles and descriptions, H1 issues, images without an alt attribute, and placeholder links. Each check is saved locally so you can reopen it later.

## Run locally

Requires Node.js **24.14+ (24.x)** with npm.

```sh
git clone https://github.com/ta56419/content-qa-desk.git
cd content-qa-desk
npm ci
npm run dev
```

Open http://127.0.0.1:5173. This starts the frontend and API on ports 5173 and 3001. Stop with Ctrl+C. No API keys or separate database server are needed; the app works offline after installation.

Reports are stored in `data/reports.sqlite`, created automatically. They survive refreshes and server restarts. Unchecked edits are not autosaved. Recent checks shows the latest 20 reports. Set `DB_PATH` to use a different database file.

## Try it

1. Run checks on the loaded sample: it has **3 findings**.
2. Add a meta description and run again: the new report has **2 findings**.
3. Refresh and open the latest report under **Recent checks**.
4. Add an alt attribute to the first image and replace `href="#"` with `/checklist`. Run again: **0 findings**. The app does not check whether that destination exists.

## Checks

- Missing or whitespace-only title and meta description: two separate rules.
- Zero or multiple H1 elements: one rule. Some CMS templates supply the H1 separately, so check the template before editing.
- Images without an `alt` attribute. Empty `alt=""` is accepted for decorative images.
- Links with missing, empty, whitespace-only, or `#` href values. Named fragments such as `#section` are accepted.

Each finding includes relevant text or an image source where available, plus a suggested fix.

## Stack

- **React, TypeScript and Vite** for the editor and reports screen.
- **NestJS on Node.js** for the REST API and input validation.
- **Cheerio** to parse submitted HTML.
- **SQLite**, using Node's built-in `node:sqlite` and parameterized SQL, to store drafts and findings in one table.

`POST /api/reports` runs checks and saves a report. `GET /api/reports` lists recent reports; `GET /api/reports/:id` returns one saved draft and its findings.

## Verification and metrics

Verified locally on 25 November 2026:

| Check | Result |
| --- | --- |
| QA rules | 5 |
| Unit tests | 14/14 passed |
| API and database integration tests | 5/5 passed |
| Chromium browser tests | 3/3 passed |
| Total automated tests | 22/22 passed |
| Build and lint | Passed |
| Labelled fixtures | 9 drafts, including 2 clean drafts |
| Expected findings | 15/15 caught, 0 missed, 0 false positives |

The expected findings in [`shared/fixtures.ts`](shared/fixtures.ts) were labelled before running the checker. They cover the sample, clean drafts, decorative images, missing metadata, H1 issues, placeholder links, HTML entities, and malformed markup. The result is **100% fixture recall (15 ÷ 15 × 100)** on this small synthetic set, not production accuracy.

Integration tests include persistence after an API restart. Browser tests cover editing, rerunning checks, refreshing and reopening reports at desktop and mobile widths, plus escaped HTML snippets and API error recovery. The sample workflow was also checked manually in Chrome.

Reproduce from the project root; stop the development servers before running browser tests:

```sh
npm ci
npm run build
npm run lint
npm test
npx playwright install chromium
npm run test:e2e
npm run metrics
```

Tests use temporary or in-memory databases. The metrics command checks the fixtures and measures 30 local API requests after 5 warmups. The recorded median was **4.24 ms** for a 570-byte HTML draft (671-byte JSON request), including parsing, a SQLite insert, and response decoding. Environment: Windows x64, Node.js 24.22.3, Intel Core i5-12450H. This is a local measurement with no comparison baseline.

## Limits

The app checks pasted HTML only. It does not connect to WordPress, visit links, assess writing or alt-text quality, rewrite content, or perform a full accessibility audit.

Submitted HTML stays as text in the editor, and React escapes report snippets. Scripts are not executed and submitted images are not loaded. This is not an HTML sanitizer.

Input limits are 300 characters for the title, 1,000 for the description, and 100,000 for HTML. The servers bind to loopback and have no accounts or authentication. This version is intended for local use.
