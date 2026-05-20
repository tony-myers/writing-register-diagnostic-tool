# Deployment Checklist

## Repository

- Recommended repository name: `writing-register-diagnostic-tool`
- Production base path for that repository: `/writing-register-diagnostic-tool/`
- Proposed GitHub Pages URL: `https://<your-github-username>.github.io/writing-register-diagnostic-tool/`

## Before First Commit

- Confirm `.gitignore` excludes `node_modules/`, `dist/`, logs, temporary files, raw corpus data, brms model objects, R analysis outputs, private/local corpus folders and old register-reference material.
- Confirm only public-safe app assets are staged.
- Confirm no raw AI response corpus files are staged.
- Confirm no private local writing corpus files are staged.
- Confirm no `.rds`, `.RData`, analysis output folders or local document files are staged.

## Local Validation

Run:

```bash
npm install
npm run build
npm run validate:ai-profiles
npm run validate:public-output
```

Confirm the app remains client-side only:

- no backend;
- no API calls;
- no analytics;
- no tracking;
- no external text upload.

Confirm supported uploads:

- TXT;
- MD;
- DOCX;
- text-based PDF.

Confirm scanned/image-only PDFs show a readable extraction warning.

## Public UI Check

The default rendered app must not contain:

- Evaluative register sample
- Research register sample
- Email register sample
- Closest reference profile
- Distance from selected register reference
- Legacy generic AI-style reference
- Metric value comparison
- Normalised register profile comparison
- Rule-based report
- Paragraph flags
- About these reference profiles

## GitHub Pages

- Confirm `.github/workflows/pages.yml` is present.
- Confirm Pages is configured to use GitHub Actions.
- Confirm the workflow runs on `main` and `workflow_dispatch`.
- Confirm the workflow builds `dist/` and deploys it as the Pages artifact.

## Do Not Publish

Do not publish:

- raw AI response corpus;
- brms fit objects;
- R analysis outputs;
- private/local writing corpus;
- unpublished model-review files;
- old local/register-reference profile data;
- documents used to build the corpus unless explicitly approved.
