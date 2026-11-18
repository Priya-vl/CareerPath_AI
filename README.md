# CareerPath AI

Career guidance for students (grades 8–12 and early college): subjects → careers → skill gaps → a weekly roadmap.

> CareerPath AI provides guidance, not guaranteed career outcomes. Recommendations are based on the profile and assessment
> information provided. Students and parents should consult teachers, counsellors and official education sources before major decisions.

## What is implemented (and what isn't)

| Area | Status |
|---|---|
| Auth (JWT, hashed passwords, register/login/refresh), roles, throttling, audit log | Implemented |
| Student profile (grade, board, state, marks, interests, strengths…) with validation | Implemented |
| Assessment: interest (9 areas × 2 questions) and aptitude (4 questions, 1 per area) with scoring | Implemented, 77-question bank (45 interest, 32 aptitude); quick/standard/full sampling via `POST /api/assessment/start {"size": ...}`. Self-written, **not a standardised or validated instrument** |
| Academic scores | Taken from marks entered in the profile (no separate academic quiz) |
| Recommendation engine: weighted scoring, reasons, strengths, skill gaps, subjects, degrees | Implemented (heuristic, **not validated**) |
| ML classifier (logistic regression / random forest) | **Not implemented** — no real labelled outcome data exists to train on; training on data generated from the weighted model would be fake |
| Career database | **43 careers** across 5 streams, plus a public Pathways explorer (stream → degree → career) at `/pathways`; schema is extensible (`extra` JSON field). Content is general guidance, not an official source |
| Roadmaps: 12 / 24 / 52 weeks, progress tracking | Implemented, **template-based**: resources are search suggestions, not curated links |
| RAG | Chunking + TF-IDF retrieval + source metadata over documents (starter careers are ingested). **No neural embeddings, no vector DB, no LLM** |
| AI assistant | Works without an LLM: common questions (careers for PCM, what after Class 10/12, X vs Y, what to study for a career, skills to learn) are answered directly from the career/pathway data; other questions use retrieval. With `LLM_API_KEY` set, a free-tier LLM writes the answer from retrieved sources only (see below); without a key it returns the retrieved text with sources |
| Career planning agent with tools | **Not implemented** |
| Mind map (React Flow) | Student → stream → degree → career, from the pathway data (click a career for details). Skills/jobs levels not drawn |
| Web UI | Light and dark themes (toggle in the top bar, remembered per browser). Glassmorphism design: public landing page (overview, animated hero, feature cards), then login/register to use the app. After login, Home is the overview and dashboard in one page, and Careers & Pathways is one page (stream, degrees, careers). Animations respect `prefers-reduced-motion` |
| Assessment flow | 35 questions in exactly 5 pages (7 each), answered in order 1/5 to 5/5; results page with charts and matches |
| Roadmap page | Create (career + 12/24/52 weeks), tick weeks off, see next-up item and progress |
| Dashboards (student, parent, teacher/counsellor) | Implemented; parent/teacher see only students linked by an admin; parents don't see marks |
| Celery | Not used (nothing needs background processing yet) |
| Frontend tests, onboarding wizard (uses profile page), separate `/progress` page | Not implemented / aliases |

## LLM (free API)
Set `LLM_PROVIDER` (`groq` default, `gemini`, or `openrouter` with `LLM_MODEL` set to a `:free` model) and `LLM_API_KEY` in `.env`. Any OpenAI-compatible
API works via `LLM_BASE_URL` + `LLM_MODEL`. How answers stay grounded:
1. Retrieval runs first; if no source is found the LLM is **not called** and the assistant says it couldn't find the answer.
2. The prompt tells the model to use only the numbered sources, cite `[n]`, and refuse otherwise.
3. The reply is accepted only if it cites valid source numbers; otherwise (or if the API fails or is rate-limited) the assistant falls back to the extractive answer.
4. Only grade, board, top career names and self-reported skills are sent as context. Name, email and username are never sent.
5. Chat is limited to 20 requests/min per user to protect the free quota.
Limits: citation checking proves a source *number* was cited, not that every sentence is faithful, so the UI labels LLM answers "check important details". Free-tier limits, model ids and data-use terms change and differ by provider: check the provider's current terms (some free tiers may keep or use prompts) before using real student data. The live API call has **not been tested** here (no key); the logic is covered by mocked tests.

## Architecture
`backend/` Django + DRF (apps: accounts incl. profile, careers, assessments, recommendations, roadmaps, rag, assistant, analytics).
`frontend/` React + TS + Vite + MUI + TanStack Query + React Hook Form + Zod + Recharts + React Flow. PostgreSQL in Docker (SQLite only for local tests).

## Recommendation system
For each career: `match = Σ(weight × feature) / Σ(weight)` over features the student has data for (academic marks, interest scores,
aptitude scores; weights live in `Career.weights`). Missing data is skipped and reported as `coverage`. Skill gaps = career skills not listed
in the student's self-reported skills. Weights were set by hand and are **not scientifically validated**.

## Updating to a newer zip (no deleting)
From this folder: `.\update.ps1 "C:\path\to\new.zip"`. It overwrites changed files and keeps `.venv`, `node_modules`, the database and `.env`.
Files that were deleted in a newer version are not removed automatically; the update notes say when to delete one.

## Run
```bash
cp .env.example .env
docker compose up --build        # frontend :5173, API :8000
# admin: docker compose exec backend python manage.py createsuperuser  (/admin)
```
Teachers/counsellors are created in the admin; link them (and parents) to students via `StudentProfile.counsellors` / `.guardians`.

## Tests
```bash
cd backend && pip install -r requirements.txt && python manage.py test tests   # 33 tests: auth, profile, scoring, recommendations, roadmaps, RAG, assistant, LLM grounding, RBAC
```
The backend tests pass. The frontend type-checks and builds for production (`npm run build`). It has **not been tested in a browser by me**, so expect small visual/behaviour fixes.

## Known limitations / security notes
- Tokens are stored in `localStorage` (XSS risk); httpOnly cookies would be safer. Rate limiting uses Django's default per-process cache; use Redis in production.
- Aptitude scores come from only 1-8 questions per area (fewer in quick mode), so they are rough indicators.
- Entrance-exam/degree details are general and some are marked "varies"; verify with official sources.
- No screenshots included.

## Future improvements
Larger vetted question bank; real outcome data + ML model with evaluation; embeddings + pgvector, sentence-level faithfulness checks, official documents;
planning agent with tools; full mind-map hierarchy; curated resources; frontend tests; email/password reset; Celery.
