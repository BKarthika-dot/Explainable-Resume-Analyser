# Inara — Screening Dossier UI

Frontend for the RAG-based explainable resume screening pipeline (`main.py` /
`modules/*`). Submits a target role + `.txt` resume to `POST
/api/screen-resume` and renders the result as a "case dossier": a trust-index
scorecard for the RAG triad audit, a numbered evidence ledger tying every claim
back to the retrieved chunk that supports it, and the two generated reports
(objective evaluation + guidance roadmap).

## Stack

Vite + React, Tailwind CSS, `react-markdown`. No UI kit — the visual system
(dossier/ledger metaphor, exhibit numbering, verification stamps) is custom
and lives entirely in `src/components`. No backend code was touched.

## 1. Configure the API URL

```
cp .env.example .env
```

Edit `.env` and set `VITE_API_URL` to wherever `main.py` is running, e.g.
`http://127.0.0.1:8000` locally, or your deployed API's public URL in
production.

**Important:** the FastAPI backend's CORS allow-list (`FRONTEND_ORIGINS` env
var in `main.py`) must include the origin this frontend is served from, or the
browser will block every request. Locally that's usually already covered
(`http://localhost:3000`/`5173` — add `5173` if you keep Vite's default dev
port).

## 2. Install & run locally

```
npm install
npm run dev
```

Visit the printed local URL (default `http://localhost:5173`).

## 3. Build for production

```
npm run build
```

Output goes to `dist/` — a static bundle, deployable anywhere that serves
static files with SPA fallback routing (all paths → `index.html`).

## 4. Deploy

**Vercel / Netlify** — point either at this repo. Build command
`npm run build`, output directory `dist`. Set `VITE_API_URL` as an environment
variable in the project settings (build-time, not runtime — Vite inlines it).

**Docker / any container host:**

```
docker build --build-arg VITE_API_URL=https://your-api.example.com -t inara-ui .
docker run -p 8080:80 inara-ui
```

**Any static host (S3+CloudFront, GitHub Pages, nginx box, etc.):** copy the
contents of `dist/` after running `npm run build`, and make sure unknown paths
fall back to `index.html` (see `nginx.conf` for the one-line rule).

## Notes on the current API contract

- Only `.txt` resumes are accepted, matching the `.txt`-only validation
  currently in `main.py`.
- The pipeline runs synchronously and can take up to a minute or so (multiple
  LLM calls plus deliberate rate-limit pauses in `retriever.py`). The
  processing view shows staged progress copy, but it's illustrative — the
  request is a single blocking call, not a real stream, so exact timing will
  vary.
- `analyser.py` also produces a `vector_map_url` (the PCA retrieval-space plot
  from `visualize_space.py`), but the current `/api/screen-resume` handler in
  `main.py` doesn't pass it through in the response. If you add
  `"vector_map_url": screening_results.get("vector_map_url")` to that
  response dict, it's easy to surface here — ask if you want that panel added.
