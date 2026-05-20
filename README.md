# Writing Register Diagnostic Tool

A static Vite, React and TypeScript app for examining measurable writing features in a submitted document and comparing selected features with curated corpus-derived AI-style comparison profiles.

The app runs entirely in the browser. It has no backend, no API calls, no analytics, no tracking and no external text upload.

## What The Tool Does

- Computes document-level writing metrics such as word count, sentence count, paragraph count, article-opener percentage, hedges per 1,000 words, sentence-length variability, type-token ratio and paragraph mean words.
- Uses the selected writing task to choose the relevant curated AI-style comparison profile.
- Shows corpus-derived AI-style comparison plots and profile bands for selected metrics.
- Supports local file upload for `.txt`, `.md`, `.docx` and text-based `.pdf` files.
- Keeps all text processing client-side in the browser.

## What The Tool Does Not Do

These profiles are corpus-derived AI-style comparison benchmarks. They are not AI detectors, not authorship classifiers, not plagiarism tools, and not universal averages of AI writing.

The tool does not:

- report an AI probability;
- classify a document as AI-written or human-written;
- classify authorship;
- detect plagiarism;
- judge writing quality;
- compare submitted text with local author/register profiles;
- use local writing corpora as public-facing benchmarks.

## Upload Support

The upload control accepts:

- `.txt`
- `.md`
- `.docx`
- text-based `.pdf`

PDF support is text-stream based. Scanned or image-only PDFs do not contain extractable text for this app and will show a clear extraction warning instead of being analysed.

## Privacy

All analysis is local to the browser session. The app does not send the submitted text to a server or third-party service.

## Local Development

Install dependencies:

```bash
npm install
```

Run the local Vite server:

```bash
npm run dev
```

The local development URL is:

```text
http://127.0.0.1:5173/
```

Build the static site:

```bash
npm run build
```

Run validation checks:

```bash
npm run validate:ai-profiles
npm run validate:public-output
```

## Local Mac Launch

The local Mac launcher is retained for double-click use.

Make it executable once:

```bash
chmod +x launch-local.command
```

Then either double-click `launch-local.command` in Finder or run:

```bash
./launch-local.command
```

The launcher:

- changes into this project directory;
- installs dependencies if `node_modules/` is missing;
- stops any existing local server on port `5173`;
- starts Vite at `127.0.0.1:5173`;
- opens a cache-busted local URL such as:

```text
http://127.0.0.1:5173/?launch=<timestamp>
```

The timestamp avoids stale browser bundles during local development.

## GitHub Pages Deployment

This repository is intended to be deployed as a static GitHub Pages site.

If the repository is named `writing-register-diagnostic-tool`, production builds use:

```text
/writing-register-diagnostic-tool/
```

The proposed Pages URL is:

```text
https://<your-github-username>.github.io/writing-register-diagnostic-tool/
```

The Vite configuration preserves local development at `/` while using the GitHub Pages base path for production builds.

The included GitHub Actions workflow at `.github/workflows/pages.yml`:

1. checks out the repository;
2. installs dependencies with `npm ci`;
3. validates the curated AI-style profile data;
4. builds the static app;
5. validates the public rendered output;
6. deploys `dist/` to GitHub Pages.

To enable Pages:

1. Push the repository to GitHub.
2. Open the repository settings.
3. Go to Pages.
4. Choose GitHub Actions as the source.
5. Push to `main` or run the workflow manually.

For a different repository name, set `VITE_BASE_PATH` when building:

```bash
VITE_BASE_PATH=/your-repository-name/ npm run build
```

For a root user or organisation Pages site, use:

```bash
VITE_BASE_PATH=/ npm run build
```

## Public-Safe Assets

The public repository should include:

- app source code;
- curated public AI-style profile JSON;
- documentation;
- the local Mac launcher;
- GitHub Pages deployment workflow;
- package and lock files.

The public repository should not include:

- raw AI response corpus files;
- brms fit objects;
- private local writing corpora;
- old local/register-reference profile data;
- unpublished analysis outputs;
- documents used to build the AI corpus unless explicitly approved.

## Linking From AI Education/Research Websites

Writing Register Diagnostic Tool  
A client-side tool for comparing a document's measurable writing features with curated AI-style comparison profiles. It supports TXT, MD, DOCX and text-based PDF uploads. The tool is not an AI detector, authorship classifier or plagiarism tool.

Suggested short link text:

```text
Writing Register Diagnostic Tool
```

Suggested description:

```text
Explore how a document compares with corpus-derived AI-style benchmarks on selected writing features such as article openers, hedging and sentence-length variability.
```
