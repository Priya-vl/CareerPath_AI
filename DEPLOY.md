# Deploying CareerPath AI: API on Render, website on Vercel

- **Render** runs the Django API and the Postgres database (`render.yaml`).
- **Vercel** hosts the React website (free, never sleeps). Django does not fit Vercel, so the API stays on Render.

You only have to type a URL once, and only after both sites exist (step 4).

## 1. Push the code
```powershell
git add .
git commit -m "Update"
git push
```

## 2. Create the API on Render
1. Sign in at render.com with GitHub. **New → Blueprint** → pick `Priya-vl/CareerPath_AI`, branch `main`.
2. It asks only for: `DJANGO_SUPERUSER_USERNAME`, `DJANGO_SUPERUSER_EMAIL`, `DJANGO_SUPERUSER_PASSWORD` (your `/admin` login) and optionally `LLM_API_KEY`. No URLs.
3. Click **Apply** and wait until `careerpath-api` is **Live**.
4. Copy its address from the top of the page, like `https://careerpath-api-xxxx.onrender.com`. Test `https://<that address>/api/pathways`: you should see JSON.

## 3. Create the website on Vercel
1. Sign in at vercel.com with GitHub → **Add New → Project** → import `CareerPath_AI`.
2. **Root Directory:** click Edit and choose `frontend`. Framework should show **Vite**.
3. **Environment Variables:** add `VITE_API_URL` = `https://<your render address>/api` (it must end with `/api`).
4. **Deploy.** Copy the website address Vercel gives you, like `https://careerpath-ai.vercel.app`.

## 4. Tell the API where the website is (the only "placeholder" step)
In Render → `careerpath-api` → **Environment** → change `FRONTEND_URL` to your Vercel address (no trailing `/`) → **Save**. The API restarts. This allows the website to call the API and makes password-reset links point to the right place.

If you later change `VITE_API_URL` in Vercel, redeploy there (it is baked in at build time).

## 5. Check
Open the Vercel address, register, take the assessment. `https://<render address>/admin` is the admin site.

## Optional settings (Render → Environment, then save)
| Variable | Effect |
|---|---|
| `LLM_API_KEY` (+ `LLM_PROVIDER`, `LLM_MODEL`) | AI-written assistant answers and the LLM planner |
| `EMBED_API_KEY` (+ `EMBED_PROVIDER`) | neural embeddings for retrieval (default provider: Gemini) |
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `DEFAULT_FROM_EMAIL` | real password-reset emails. **Without these, reset emails are only printed in the Render logs.** |
| `CELERY_BROKER_URL` (Redis) | background workers. Without it, tasks run inline, which is fine for this size |

## Free-tier limits (verify on Render's pricing page; they change)
- The free API sleeps after about 15 minutes idle; the first request afterwards takes around a minute.
- A free Postgres database expires 30 days after creation (14-day grace, then deleted). **Student accounts would be lost.** Upgrade it before real use.
- 512 MB RAM on the free API. If it keeps restarting, move it to a paid instance.

Every `git push` to `main` redeploys both automatically. Never commit a `.env` file.
