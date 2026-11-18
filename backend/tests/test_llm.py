from unittest import mock
from django.test import SimpleTestCase
from assistant import llm
from assistant.grounding import check_citations, build_messages, student_context
from .test_api import Base

CALL = "assistant.views.chat_completion"

class Citations(SimpleTestCase):
    def test_check(self):
        self.assertEqual(check_citations("NEET-UG is needed [1][2].", 3), {1, 2})
        self.assertIsNone(check_citations("NEET-UG is needed.", 3))          # uncited
        self.assertIsNone(check_citations("Needed [7].", 3))                  # citation to a non-existent source
        self.assertEqual(check_citations("I couldn't find this in my sources.", 3), set())

class Config(SimpleTestCase):
    def test_disabled_without_key(self):
        with mock.patch.dict("os.environ", {"LLM_API_KEY": ""}):
            self.assertIsNone(llm.config()); self.assertIsNone(llm.chat_completion([]))
    def test_presets_and_override(self):
        with mock.patch.dict("os.environ", {"LLM_API_KEY": "k", "LLM_PROVIDER": "gemini"}, clear=False):
            self.assertIn("generativelanguage", llm.config()["base"])
        with mock.patch.dict("os.environ", {"LLM_API_KEY": "k", "LLM_PROVIDER": "openrouter"}, clear=False):
            self.assertIsNone(llm.config())   # openrouter needs an explicit model

class Chat(Base):
    Q = {"message": "Which entrance exam is needed for admission to nursing programmes?"}
    def test_llm_answer_with_citation_is_used(self):
        self.student()
        with mock.patch(CALL, return_value="NEET-UG is the exam [1]."), mock.patch.dict("os.environ", {"LLM_API_KEY": "k"}):
            d = self.client.post("/api/assistant/chat", self.Q, format="json").data
        self.assertEqual(d["mode"], "llm"); self.assertEqual([s["n"] for s in d["sources"]], [1])
    def test_uncited_llm_answer_falls_back(self):
        self.student()
        with mock.patch(CALL, return_value="You need a high rank."):
            d = self.client.post("/api/assistant/chat", self.Q, format="json").data
        self.assertEqual(d["mode"], "extractive"); self.assertTrue(d["sources"])
    def test_llm_failure_falls_back(self):
        self.student()
        with mock.patch(CALL, return_value=None):
            self.assertEqual(self.client.post("/api/assistant/chat", self.Q, format="json").data["mode"], "extractive")
    def test_llm_not_called_without_sources(self):
        self.student()
        with mock.patch(CALL) as m:
            d = self.client.post("/api/assistant/chat", {"message": "zxqv blorp"}, format="json").data
        m.assert_not_called(); self.assertEqual(d["mode"], "no_sources")
    def test_no_identity_sent_to_provider(self):
        u = self.student("secretname"); u.first_name = "Priya"; u.email = "p@x.com"; u.save()
        self.client.put("/api/profile", {"grade": 10, "board": "CBSE"}, format="json")
        hits = [{"title": "T", "text": "x"}]
        blob = str(build_messages("q", hits, [], student_context(u)))
        for s in ("secretname", "Priya", "p@x.com"):
            self.assertNotIn(s, blob)
        self.assertIn("grade 10", blob)

class Tools(Base):
    def ask(self, m):
        self.student(); return self.client.post("/api/assistant/chat", {"message": m}, format="json").data
    def test_pcm(self):
        d = self.ask("What careers can I pursue with PCM?"); self.assertEqual(d["mode"], "tools"); self.assertIn("Software Engineer", d["answer"])
    def test_compare(self):
        d = self.ask("What is the difference between AI engineering and data science?")
        self.assertEqual(d["mode"], "tools"); self.assertIn("AI Engineer", d["answer"]); self.assertIn("Data Scientist", d["answer"])
    def test_after10(self):
        d = self.ask("What should I do after class 10?"); self.assertEqual(d["mode"], "tools"); self.assertIn("Commerce", d["answer"])
    def test_become(self):
        d = self.ask("What should I study to become a data scientist?"); self.assertIn("Statistics", d["answer"]); self.assertTrue(d["sources"])
    def test_skills_without_data(self):
        d = self.ask("Which skills should I learn?"); self.assertIn("assessment", d["answer"])
    def test_unknown_not_invented(self):
        self.assertEqual(self.ask("zxqv blorp")["mode"], "no_sources")
