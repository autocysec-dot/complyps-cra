# ComplyPS — Website & CRA Tool (frontend)

Public site for **ComplyPS** (Comply Product Security). Hosted on GitHub Pages.

- **`/`** — the ComplyPS landing page (`website/index.html`).
- **`/complyps-cra/`** — the CRA compliance tool UI (a React app built from `frontend/`).

> This repository contains only the public website and the **frontend** of the CRA tool. The
> frontend has no compliance logic — it calls a separate backend service for all classification and
> data. The backend is proprietary and is **not** part of this repository.

## Structure

```
website/                 ComplyPS landing page (static HTML + Tailwind CDN)
  index.html
frontend/                CRA tool UI (React + Vite)
  src/ ...
.github/workflows/
  deploy-pages.yml       builds & deploys: landing at /, tool at /complyps-cra/
```

## Local development

```bash
# CRA tool UI
cd frontend
npm install
npm run dev            # http://localhost:5173

# Landing page (any static server), e.g.
npx serve website
```

The tool's backend URL is configurable in the app's **Settings** screen (defaults to
`http://localhost:4000`).

## Deployment

Automated via GitHub Actions on every push to `main`. The workflow builds the React app and
assembles the site so the landing page is served at the root and the tool at `/complyps-cra/`.

Live (until the custom domain is connected): https://autocysec-dot.github.io/
Custom domain (planned): https://complyps.com/

## Roadmap

The site is structured to host more tools and regulations over time (e.g. NIS2, RED), each under its
own path alongside `/complyps-cra/`.
