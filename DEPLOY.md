# Deploying CareerPath AI on Render (free tier)

Render reads `render.yaml` from this repo and creates: a Postgres database, the Django API, and the React site.

## 1. Push the code
```powershell
git add .
git commit -m "Add deployment config"
git push
```

## 2. Create the services
1. Sign in at render.com with GitHub.
2. **New → Blueprint**, pick `Priya-vl/CareerPath_AI`, branch `main`.
3. Render asks for the values marked `sync: false`. For the first deploy enter:
   - `DJANGO_SUPERUSER_USERNAME`, `DJANGO_SUPERUSER_EMAIL`, `DJANGO_SUPERUSER_PASSWORD`: your admin login (the password is only stored in Render).
   - `CORS_ORIGINS`, `CSRF_TRUSTED_ORIGINS`, `VITE_API_URL`: type `placeholder` for now.
   - `LLM_API_KEY`: your free Groq key, or leave empty.
4. Click **Apply**. Wait for both services to finish deploying.

## 3. Connect frontend and API (one time)
Open each service in the Render dashboard and copy its URL. Then set:
- API service → Environment: `CORS_ORIGINS` = frontend URL (e.g. `https://careerpath-web.onrender.com`), `CSRF_TRUSTED_ORIGINS` = API URL. The API restarts by itself.
- Frontend service → Environment: `VITE_API_URL` = API URL + `/api` (e.g. `https://careerpath-api.onrender.com/api`). Then **Manual Deploy → Clear build cache & deploy**, because this value is baked in at build time.

## 4. Check
- `https://<api>/api/pathways` shows JSON.
- The frontend loads, you can register, take the assessment, and open `https://<api>/admin` with your superuser.

## Free-tier limits (verify on Render's pricing page; they change)
- The free API sleeps after about 15 minutes idle; the first request afterwards takes around a minute.
- A free Postgres database expires 30 days after creation (14-day grace, then deleted). **Student accounts would be lost.** Upgrade the database to a paid plan before real use. Careers and questions are re-created automatically on every start.
- The free API has 512 MB RAM. If it restarts for running out of memory, move it to a paid instance.

## Notes
- Teachers/counsellors/parents are linked to students in `/admin` (see README).
- Never commit a `.env` file. Secrets live in Render's Environment tab.
- Every `git push` to `main` redeploys automatically.
