# Local Mac Launch

The local launcher is retained for Mac use and development.

## One-Time Setup

Make the launcher executable:

```bash
chmod +x launch-local.command
```

Install dependencies manually if preferred:

```bash
npm install
```

## Launch Options

Double-click:

```text
launch-local.command
```

Or run from Terminal:

```bash
./launch-local.command
```

You can also run the Vite server directly:

```bash
npm install
npm run dev
```

## What The Launcher Does

The launcher:

- changes into the app directory;
- installs dependencies if `node_modules/` is missing;
- stops any existing local server on port `5173`;
- starts the Vite development server at `127.0.0.1:5173`;
- opens a cache-busted local URL such as:

```text
http://127.0.0.1:5173/?launch=<timestamp>
```

The timestamp helps avoid stale local browser bundles while developing.

## Notes

The launcher is local-only. GitHub Pages deployment uses the static build and the GitHub Actions workflow.
