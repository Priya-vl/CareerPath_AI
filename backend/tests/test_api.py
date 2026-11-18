from django.core.management import call_command
from rest_framework.test import APITestCase
from accounts.models import User, StudentProfile
from assessments.models import Question
from assessments.scoring import score_answers
from rag.retrieval import retrieve

from django.core.cache import cache

class Base(APITestCase):
    def setUp(self):
        cache.clear()   # reset throttle counters between tests
    @classmethod
    def setUpTestData(cls):
        call_command("seed_data", verbosity=0)
    def login(self, username, password="pass12345!"):
        r = self.client.post("/api/auth/login", {"username": username, "password": password})
        self.assertEqual(r.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION="Bearer " + r.data["access"])
    def student(self, name="stu"):
        r = self.client.post("/api/auth/register", {"username": name, "password": "pass12345!", "role": "student"})
        self.assertEqual(r.status_code, 201); self.login(name); return User.objects.get(username=name)

class AuthProfile(Base):
    def test_register_login_profile(self):
        self.student()
        r = self.client.put("/api/profile", {"grade": 11, "board": "CBSE", "marks": {"Mathematics": 90}}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(self.client.get("/api/profile").data["marks"]["Mathematics"], 90)
    def test_cannot_self_register_as_teacher(self):
        r = self.client.post("/api/auth/register", {"username": "t", "password": "pass12345!", "role": "teacher"})
        self.assertEqual(r.status_code, 400)
    def test_invalid_marks_rejected(self):
        self.student()
        self.assertEqual(self.client.put("/api/profile", {"marks": {"Mathematics": 140}}, format="json").status_code, 400)
    def test_unauthenticated_blocked(self):
        self.assertEqual(self.client.get("/api/profile").status_code, 401)

class Scoring(Base):
    def test_scoring(self):
        t = list(Question.objects.filter(dimension="Technology"))[:2]; n = Question.objects.filter(dimension="Numerical reasoning").first()
        qs = t + [n]
        ans = {str(t[0].id): 4, str(t[1].id): 4, str(n.id): n.correct_index}
        s = score_answers(qs, ans)
        self.assertEqual(s["interest"]["Technology"], 100.0)
        self.assertEqual(s["aptitude"]["Numerical reasoning"], 100.0)
    def test_start_hides_answers(self):
        self.student()
        r = self.client.post("/api/assessment/start")
        self.assertTrue(r.data and "correct_index" not in r.data[0])

class Pipeline(Base):
    def test_recommend_and_roadmap(self):
        u = self.student()
        self.client.put("/api/profile", {"marks": {"Mathematics": 95, "Science": 90}, "strengths": ["Python"]}, format="json")
        qs = Question.objects.all()
        ans = {str(q.id): (4 if q.dimension == "Technology" else 0) if q.category == "interest" else q.correct_index for q in qs}
        self.assertEqual(self.client.post("/api/assessment/submit", {"answers": ans}, format="json").status_code, 201)
        recs = self.client.post("/api/recommendations/generate").data
        self.assertIn(recs[0]["career"], {"Data Scientist", "AI Engineer", "Software Engineer", "Machine Learning Engineer", "Cybersecurity Analyst", "Game Developer", "Robotics Engineer", "Data Analyst"})
        self.assertNotIn("Python", recs[0]["skill_gaps"] if recs[0]["career"] != "Software Engineer" else [])
        rm = self.client.post("/api/roadmaps/generate", {"career_id": recs[0]["career_id"], "weeks": 12}, format="json").data
        self.assertEqual(len(rm["items"]), 12)
        r = self.client.put(f"/api/roadmaps/{rm['id']}/progress", {"item_id": rm["items"][0]["id"], "completed": True}, format="json")
        self.assertGreater(r.data["progress"], 0)
        self.assertEqual(self.client.get("/api/dashboard").data["top_career"], recs[0]["career"])
    def test_no_data_no_recommendation(self):
        self.student()
        self.assertEqual(self.client.post("/api/recommendations/generate").status_code, 400)
    def test_bad_roadmap_length(self):
        self.student()
        self.assertEqual(self.client.post("/api/roadmaps/generate", {"career_id": 1, "weeks": 7}, format="json").status_code, 400)

class RagAndAssistant(Base):
    def test_retrieval_has_sources(self):
        hits = retrieve("Which entrance exam is needed for MBBS?")
        self.assertTrue(hits and "NEET" in hits[0]["text"] and hits[0]["source"])
    def test_chat_refuses_unknown(self):
        self.student()
        r = self.client.post("/api/assistant/chat", {"message": "zxqv blorp"}, format="json")
        self.assertEqual(r.data["sources"], [])
    def test_chat_grounded(self):
        self.student()
        r = self.client.post("/api/assistant/chat", {"message": "entrance exam for doctor"}, format="json")
        self.assertTrue(r.data["sources"])

class RBAC(Base):
    def test_student_blocked_from_staff_and_parent_views(self):
        self.student()
        self.assertEqual(self.client.get("/api/teacher/students").status_code, 403)
        self.assertEqual(self.client.get("/api/parent/children").status_code, 403)
    def test_teacher_sees_only_assigned_students(self):
        a = self.student("a"); self.student("b")
        t = User.objects.create_user("teach", password="pass12345!", role="teacher")
        StudentProfile.objects.get(user=a).counsellors.add(t)
        self.login("teach")
        data = self.client.get("/api/teacher/students").data
        self.assertEqual([d["id"] for d in data], [a.id])
    def test_parent_sees_only_linked_child_without_marks(self):
        a = self.student("kid"); self.student("other")
        p = User.objects.create_user("mom", password="pass12345!", role="parent")
        prof = StudentProfile.objects.get(user=a); prof.marks = {"Mathematics": 50}; prof.save(); prof.guardians.add(p)
        self.login("mom")
        data = self.client.get("/api/parent/children").data
        self.assertEqual(len(data), 1); self.assertNotIn("subject_performance", data[0])

class Dataset(Base):
    def test_nineteen_careers_with_valid_weights(self):
        from careers.models import Career
        cs = Career.objects.all(); self.assertEqual(cs.count(), 43)
        valid = {"academic": {"Mathematics", "Science", "English", "Social Science", "Commerce"},
                 "interest": {d for d in __import__("assessments.bank", fromlist=["x"]).INTEREST},
                 "aptitude": {"Logical reasoning", "Numerical reasoning", "Verbal reasoning", "Problem solving"}}
        for c in cs:
            self.assertTrue(c.skills and c.degree_options and c.entrance_exams, c.name)
            for g, ws in c.weights.items():
                self.assertTrue(set(ws) <= valid[g], (c.name, g, set(ws) - valid[g]))
    def test_question_bank_integrity(self):
        from assessments.bank import INTEREST, APTITUDE
        self.assertEqual(len(INTEREST), 9); self.assertTrue(all(len(v) >= 5 for v in INTEREST.values()))
        self.assertTrue(all(0 <= i < len(o) and len(set(o)) == len(o) for _, _, o, i in APTITUDE))
        texts = [t for ts in INTEREST.values() for t in ts] + [t for _, t, _, _ in APTITUDE]
        self.assertEqual(len(set(texts)), len(texts))   # texts are the sync key, so must be unique
        self.assertEqual({d for d, *_ in APTITUDE}, {"Logical reasoning", "Numerical reasoning", "Verbal reasoning", "Problem solving"})
        self.assertEqual(Question.objects.count(), 45 + len(APTITUDE))
    def test_start_sizes(self):
        self.student()
        sizes = {s: len(self.client.post("/api/assessment/start", {"size": s}, format="json").data) for s in ["quick", "standard", "full"]}
        self.assertEqual(sizes, {"quick": 22, "standard": 35, "full": 77})
        self.assertEqual(self.client.post("/api/assessment/start", {"size": "huge"}, format="json").status_code, 400)

    def test_pathways_public_and_consistent(self):
        from careers.models import Career
        from careers.pathways import STREAMS
        names = set(Career.objects.values_list("name", flat=True))
        used = {c for st in STREAMS for d in st["degrees"] for c in d["careers"]}
        self.assertEqual(used - names, set())          # every pathway career exists
        self.assertEqual(names - used, set())          # every career is reachable from some pathway
        r = self.client.get("/api/pathways")           # no login needed
        self.assertEqual(r.status_code, 200); self.assertEqual(len(r.data), 5)
        self.assertTrue(all("id" in c for st in r.data for d in st["degrees"] for c in d["careers"]))
