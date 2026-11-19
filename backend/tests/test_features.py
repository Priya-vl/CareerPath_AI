import json
import zlib
from unittest import mock
from django.core import mail
from django.core.management import call_command
from rest_framework.test import APITestCase
from accounts.models import User
from assessments.models import Question
from careers.models import Career
from rag import embeddings, vectorstore
from rag.models import DocumentChunk
from rag.retrieval import retrieve
from recommendations import ml
from recommendations.models import MLModel, RecommendationFeedback
from .test_api import Base
from config.celery import run
from accounts.tasks import send_reset_email

def fake_embed(texts):
    """Tiny deterministic 'embedding': hashed bag of words. Only for testing the plumbing."""
    out = []
    for t in texts:
        v = [0.0] * 2048
        for w in t.lower().split(): v[zlib.crc32(w.strip(".,?:;()").encode()) % 2048] += 1
        out.append(embeddings.normalize(v))
    return out

class PasswordReset(Base):
    def reg(self, name="ann", email="ann@example.com"):
        return self.client.post("/api/auth/register", {"username": name, "email": email, "password": "pass12345!", "role": "student"})
    def test_register_requires_unique_email(self):
        self.assertEqual(self.client.post("/api/auth/register", {"username": "x", "password": "pass12345!"}).status_code, 400)
        self.assertEqual(self.reg().status_code, 201)
        self.assertEqual(self.reg("bob", "ANN@example.com").status_code, 400)
    def test_login_with_email(self):
        self.reg(); r = self.client.post("/api/auth/login", {"username": "ann@example.com", "password": "pass12345!"})
        self.assertEqual(r.status_code, 200)
    def _link(self):
        self.reg(); mail.outbox.clear()
        self.assertEqual(self.client.post("/api/auth/password-reset", {"email": "ann@example.com"}).status_code, 200)
        self.assertEqual(len(mail.outbox), 1)
        link = [l for l in mail.outbox[0].body.splitlines() if "reset-password" in l][0]
        q = dict(p.split("=") for p in link.split("?")[1].split("&")); return q
    def test_full_reset_flow(self):
        q = self._link()
        bad = self.client.post("/api/auth/password-reset/confirm", {**q, "password": "12345678"})
        self.assertEqual(bad.status_code, 400)                                   # too common
        ok = self.client.post("/api/auth/password-reset/confirm", {**q, "password": "brand-new-pass-9"})
        self.assertEqual(ok.status_code, 200)
        self.assertEqual(self.client.post("/api/auth/login", {"username": "ann", "password": "brand-new-pass-9"}).status_code, 200)
        self.assertEqual(self.client.post("/api/auth/login", {"username": "ann", "password": "pass12345!"}).status_code, 401)
        again = self.client.post("/api/auth/password-reset/confirm", {**q, "password": "another-pass-77"})
        self.assertEqual(again.status_code, 400)                                 # token is single-use (password hash changed)
    def test_no_account_enumeration(self):
        self.reg(); mail.outbox.clear()
        a = self.client.post("/api/auth/password-reset", {"email": "ann@example.com"}); b = self.client.post("/api/auth/password-reset", {"email": "nobody@example.com"})
        self.assertEqual(a.data, b.data); self.assertEqual(len(mail.outbox), 1)
    def test_bad_token(self):
        self.assertEqual(self.client.post("/api/auth/password-reset/confirm", {"uid": "zz", "token": "x", "password": "brand-new-pass-9"}).status_code, 400)

class Celery(Base):
    def test_eager_task_runs_inline(self):
        mail.outbox.clear(); run(send_reset_email, "a@b.co", "http://x/y"); self.assertEqual(len(mail.outbox), 1)

class Vectors(Base):
    def test_embed_store_and_hybrid_search(self):
        with mock.patch.dict("os.environ", {"EMBED_API_KEY": "k", "EMBED_PROVIDER": "gemini"}), mock.patch("rag.embeddings.embed", side_effect=fake_embed):
            n = vectorstore.embed_missing(); self.assertEqual(n, DocumentChunk.objects.count())
            self.assertEqual(vectorstore.embed_missing(), 0)                      # already embedded: nothing to do
            top = vectorstore.search(fake_embed(["Entrance exams for Doctor: NEET-UG"])[0], k=1)[0][1]
            self.assertIn("NEET", top.text)
            hits = retrieve("Which entrance exam is needed for admission to nursing programmes?")
            self.assertTrue(hits and all(h["cosine"] is not None for h in hits))
    def test_falls_back_to_tfidf_when_embedding_fails(self):
        with mock.patch.dict("os.environ", {"EMBED_API_KEY": "k"}), mock.patch("rag.embeddings.embed", return_value=None):
            self.assertEqual(vectorstore.embed_missing(), 0)
            hits = retrieve("entrance exam for nursing"); self.assertTrue(hits and hits[0]["cosine"] is None)
    def test_disabled_without_key(self):
        with mock.patch.dict("os.environ", {"EMBED_API_KEY": ""}):
            self.assertIsNone(embeddings.embed(["x"])); self.assertEqual(vectorstore.embed_missing(), 0)
    def test_seed_is_idempotent_and_keeps_embeddings(self):
        with mock.patch.dict("os.environ", {"EMBED_API_KEY": "k"}), mock.patch("rag.embeddings.embed", side_effect=fake_embed):
            vectorstore.embed_missing(); before = DocumentChunk.objects.filter(embedding_model__gt="").count()
            call_command("seed_data", verbosity=0); self.assertEqual(DocumentChunk.objects.filter(embedding_model__gt="").count(), before)

class MLModelTests(Base):
    def _feedback(self, n_per=18):
        """Synthetic feedback with a clear pattern, used ONLY to test the training mechanics."""
        import random; random.seed(1)
        names = [q for q in ml.NAMES]; cars = {"Software Engineer": "Technology", "Doctor": "Medicine", "Lawyer": "Law"}
        for i in range(n_per * 3):
            cname = list(cars)[i % 3]; v = [random.uniform(30, 60) for _ in names]; v[names.index(cars[cname])] = random.uniform(85, 100)
            u = User.objects.create_user(f"s{i}", password="x" * 12, email=f"s{i}@e.com")
            RecommendationFeedback.objects.create(student=u, career=Career.objects.get(name=cname), liked=True, features=v)
    def test_no_model_with_too_little_data(self):
        r = ml.train(); self.assertFalse(r["trained"]); self.assertEqual(MLModel.objects.count(), 0)
    def test_trains_when_data_has_signal_and_is_used(self):
        self._feedback(); r = ml.train(); self.assertTrue(r["trained"], r); self.assertGreater(r["cv_accuracy"], r["baseline"] + 0.09)
        u = self.student("me"); self.client.put("/api/profile", {"marks": {"Mathematics": 60}}, format="json")
        ans = {str(q.id): (4 if q.dimension == "Medicine" else 0) if q.category == "interest" else q.correct_index for q in Question.objects.all()}
        self.client.post("/api/assessment/submit", {"answers": ans}, format="json")
        recs = self.client.post("/api/recommendations/generate").data
        self.assertTrue(any("ml_probability" in r for r in recs)); self.assertTrue(any("baseline_score" in r for r in recs))
    def test_noise_does_not_produce_a_model(self):
        import random; random.seed(3)
        for i in range(60):
            u = User.objects.create_user(f"n{i}", password="x" * 12, email=f"n{i}@e.com")
            RecommendationFeedback.objects.create(student=u, career=Career.objects.get(name=["Doctor", "Lawyer", "Teacher"][i % 3]), liked=True,
                                                  features=[random.uniform(0, 100) for _ in ml.NAMES])
        self.assertFalse(ml.train()["trained"])
    def test_feedback_endpoint(self):
        self.student("kid"); cid = Career.objects.first().id
        self.assertEqual(self.client.post("/api/recommendations/feedback", {"career_id": cid, "liked": "yes"}, format="json").status_code, 400)
        self.assertEqual(self.client.post("/api/recommendations/feedback", {"career_id": cid, "liked": True}, format="json").status_code, 200)
        self.assertEqual(self.client.post("/api/recommendations/feedback", {"career_id": cid, "liked": False}, format="json").status_code, 200)
        self.assertEqual(RecommendationFeedback.objects.count(), 1)              # updated, not duplicated

class Agent(Base):
    def setup_student(self):
        self.student("pl"); self.client.put("/api/profile", {"marks": {"Mathematics": 92, "Science": 88}, "strengths": ["Python"]}, format="json")
        ans = {str(q.id): (4 if q.dimension == "Technology" else 1) if q.category == "interest" else q.correct_index for q in Question.objects.all()}
        self.client.post("/api/assessment/submit", {"answers": ans}, format="json")
    def test_rules_plan_uses_all_tools(self):
        self.setup_student(); d = self.client.post("/api/agent/plan", {"goal": "I want to become an AI engineer"}, format="json").data
        self.assertEqual(d["mode"], "rules"); tools = {s["tool"] for s in d["steps"]}
        self.assertEqual(tools, {"assessment_analyzer", "recommendation_engine", "career_search", "course_search", "skill_gap_analyzer", "roadmap_generator"})
        self.assertIn("AI Engineer", d["answer"]); self.assertEqual(len(d["roadmap_preview"]["items"]), 12); self.assertEqual(d["roadmap_preview"]["career"], "AI Engineer")
        self.assertFalse(self.client.get("/api/roadmaps").data)                  # nothing saved by planning
    def test_unknown_goal_asks_which_career(self):
        self.setup_student(); d = self.client.post("/api/agent/plan", {"goal": "help me"}, format="json").data
        self.assertIn("Tell me which career", d["answer"]); self.assertIsNone(d["roadmap_preview"])
    def test_llm_tool_loop(self):
        self.setup_student()
        script = [{"content": None, "tool_calls": [{"id": "1", "function": {"name": "career_search", "arguments": json.dumps({"query": "Data Scientist"})}},
                                                  {"id": "2", "function": {"name": "roadmap_generator", "arguments": json.dumps({"career": "Data Scientist", "weeks": 12})}},
                                                  {"id": "3", "function": {"name": "no_such_tool", "arguments": "{}"}}]},
                  {"content": "Here is your plan [from tools]."}]
        with mock.patch.dict("os.environ", {"LLM_API_KEY": "k"}), mock.patch("assistant.agent.chat_raw", side_effect=script):
            d = self.client.post("/api/agent/plan", {"goal": "plan data scientist"}, format="json").data
        self.assertEqual(d["mode"], "llm"); self.assertEqual([s["tool"] for s in d["steps"]], ["career_search", "roadmap_generator", "no_such_tool"])
        self.assertIn("error", d["steps"][2]["summary"]); self.assertEqual(d["roadmap_preview"]["career"], "Data Scientist"); self.assertIn("guidance", d["answer"])
    def test_llm_without_tool_use_or_failure_falls_back(self):
        self.setup_student()
        for resp in ({"content": "Just trust me."}, None):
            with mock.patch.dict("os.environ", {"LLM_API_KEY": "k"}), mock.patch("assistant.agent.chat_raw", return_value=resp):
                d = self.client.post("/api/agent/plan", {"goal": "I want to become a doctor"}, format="json").data
            self.assertEqual(d["mode"], "rules")
    def test_agent_requires_student(self):
        self.assertEqual(self.client.post("/api/agent/plan", {"goal": "x"}, format="json").status_code, 401)
