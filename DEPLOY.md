# Deploying CareerPath AI: API on Render, website on Vercel

- **Render** runs the Django API and the Postgres database (`render.yaml`).
- **Vercel** hosts the React website (`frontend/`). Django does not fit Vercel, so the API stays on Render.

Order matters: **Render first, then Vercel, then tell Render the Vercel address.**

---

## 0. One-time clean-up before the first push (do this once)

Two problems were found in the repo. Fix both **before** you push.

**a) A real Groq API key was in `.env.example`** (a file that is committed). It is only in your *local, not yet pushed*
commit `env`, so you can still keep it off GitHub. `.env.example` is now clean in this update.

**b) `backend/.venv` (about 9,300 files) is tracked by git.** It is a Windows virtual environment, useless on Render and it
bloats the repo. `.gitignore` now ignores it; you also have to untrack it.

Run in PowerShell, from the project folder (after applying the update zip, see step 1):

```powershell
# a) undo the unpushed "env" commit. Your file changes are kept, only the commit is removed.
git reset --soft HEAD~1

# b) stop tracking the virtual environment (the folder stays on your disk)
git rm -r --cached backend/.venv -q

# stage everything (the clean .env.example, .gitignore, code changes, DEPLOY.md)
git add -A
git commit -m "Show/hide password, deploy fixes, clean env example, untrack .venv"

# SAFETY CHECK: this must print nothing. If it prints a line with gsk_, do NOT push.
git log origin/main..HEAD -p | Select-String "gsk_"
```

Then, as a precaution, create a **new** key at console.groq.com and delete the old one (the old key sat in a file meant to
be public, and it is also visible in your local `.env` and the zip you shared).

## 1. Apply the update zip

```powershell
.\update.ps1 "C:\path\to\careerpath-updated.zip"
```

It keeps your `.venv`, `node_modules`, `db.sqlite3` and `.env`. Then install the frontend test tools (they were missing from
your `node_modules`) and check locally:

```powershell
cd frontend
npm install
npm test            # vitest, includes the new show/hide password tests
npm run build       # same command Vercel runs
cd ..
```

## 2. Push

```powershell
git push
```

## 3. Create the API on Render

1. render.com, sign in with GitHub. **New +  ->  Blueprint**, pick `Priya-vl/CareerPath_AI`, branch `main`.
2. Render reads `render.yaml` and asks for four values:
   - `DJANGO_SUPERUSER_USERNAME`, `DJANGO_SUPERUSER_EMAIL`, `DJANGO_SUPERUSER_PASSWORD` (your `/admin` login)
   - `LLM_API_KEY` (paste the **new** Groq key, or leave empty for retrieval-only answers)
3. Click **Apply**. Wait until `careerpath-api` shows **Live** (the first build takes several minutes).
4. Copy the address at the top of the service page, like `https://careerpath-api-xxxx.onrender.com`.
5. Open `https://careerpath-api-xxxx.onrender.com/api/pathways` in a browser. You must see JSON. If you do, the API,
   database, migrations and seed data all worked.

## 4. Create the website on Vercel

1. vercel.com, sign in with GitHub. **Add New -> Project**, import `CareerPath_AI`.
2. **Root Directory:** click **Edit**, choose `frontend`. Framework Preset should say **Vite**. Leave Build Command
   (`npm run build`) and Output Directory (`dist`) as detected.
3. **Environment Variables:** add

   | Name | Value |
   |---|---|
   | `VITE_API_URL` | `https://careerpath-api-xxxx.onrender.com/api` |

   It **must end with `/api`** and have no trailing slash after it. Without it the site calls `localhost:8000` and login fails.
4. Click **Deploy**. Copy the website address, like `https://careerpath-ai.vercel.app`.

`frontend/vercel.json` already makes page refreshes on `/login`, `/careers` etc. work.

## 5. Tell the API where the website is (the only "placeholder" step)

Render -> `careerpath-api` -> **Environment** -> edit `FRONTEND_URL` and set it to your Vercel address, **no trailing `/`**:

```
https://careerpath-ai.vercel.app
```

Save. The API restarts (about a minute). This does two things: it allows the website to call the API (CORS) and it makes
password-reset links point at the right site.

Extra website addresses (custom domain, preview deployments) can be added with a comma-separated `CORS_ORIGINS` variable.

## 6. Check everything

1. Open the Vercel address. First request may take ~1 minute (free API wakes up).
2. Register, sign in, click the **eye icon** in the password box to show/hide.
3. Take the assessment, open Careers, Roadmap, Assistant.
4. `https://careerpath-api-xxxx.onrender.com/admin` with the superuser you chose.

## 7. Password-reset emails (optional, but read this)

Render **free** web services cannot send on SMTP ports 25, 465 and 587, so Gmail-style SMTP on 587 will not work there.
Brevo also accepts port **2525**, which is not blocked. Without these settings, reset links are only printed in the Render logs.

In Render -> `careerpath-api` -> Environment, add:

| Name | Value |
|---|---|
| `EMAIL_HOST` | `smtp-relay.brevo.com` |
| `EMAIL_PORT` | `2525` |
| `EMAIL_HOST_USER` | your Brevo SMTP login |
| `EMAIL_HOST_PASSWORD` | your Brevo SMTP key (not the API key) |
| `DEFAULT_FROM_EMAIL` | `CareerPath AI <your-verified-sender@example.com>` (sender must be verified in Brevo) |

Do not set `EMAIL_PORT` without `EMAIL_HOST`, and never leave `EMAIL_PORT` blank when `EMAIL_HOST` is set.
`EMAIL_TIMEOUT` is now 10 seconds, so a bad email setup fails fast instead of freezing the request.

## Optional settings

| Variable | Effect |
|---|---|
| `LLM_API_KEY` (+ `LLM_PROVIDER`, `LLM_MODEL`) | AI-written assistant answers and the LLM planner |
| `EMBED_API_KEY` (+ `EMBED_PROVIDER`) | neural embeddings for retrieval (default provider: Gemini) |
| `CELERY_BROKER_URL` (Redis) | background workers. Without it, tasks run inline, which is fine at this size |

## Free-tier limits (as documented by Render, re-check before relying on them)

- The free API spins down after 15 minutes without traffic; waking takes about a minute. Each wake re-runs migrate + seed
  (safe, it is idempotent, but it adds to the wait).
- **A free Postgres database expires 30 days after creation**, with a 14-day grace period to upgrade, then it is deleted
  with all student accounts. Upgrade the database before real use.
- 512 MB RAM on the free API. If it keeps restarting ("out of memory"), move it to a paid instance.

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| Browser console: CORS error, or login says "Failed to fetch" | `FRONTEND_URL` on Render is still the placeholder or has a typo/trailing `/`. Fix it (step 5). |
| Login calls `localhost:8000` | `VITE_API_URL` missing on Vercel. Add it, then **Redeploy** (it is baked in at build time). |
| API shows `DisallowedHost` / 400 | `ALLOWED_HOSTS` must include your host. Default `.onrender.com,localhost` covers Render addresses. |
| Render deploy fails on startup | Open the service **Logs**. Most often a missing `DJANGO_SECRET_KEY` (generated automatically by the blueprint) or the database not ready. |
| Reset email never arrives | Step 7. Check Render logs for the printed link. |
| Everything worked, then vanished after ~30 days | Free Render Postgres expired. Upgrade it. |

Every `git push` to `main` redeploys both automatically. Never commit a `.env` file.
