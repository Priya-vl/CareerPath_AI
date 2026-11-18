"""Study pathways: stream -> degree -> careers. Static, extensible data (career names must exist in the Career table; a test checks this).
General guidance, not an official source. Durations and routes can change; verify with official bodies."""
def D(name, years, careers, note=""):
    return {"name": name, "duration": years, "careers": careers, "note": note}

STREAMS = [
 {"id": "pcm", "name": "Science (PCM)", "color": "#3B5BFF", "subjects": ["Physics", "Chemistry", "Mathematics", "Computer Science or English"],
  "summary": "For engineering, technology, data, architecture and research.",
  "after10": "Choose Science with Physics, Chemistry and Mathematics in Class 11-12.",
  "degrees": [
   D("B.Tech / B.E.", "4 years", ["Software Engineer", "AI Engineer", "Machine Learning Engineer", "Data Scientist", "Cybersecurity Analyst", "Game Developer",
      "Robotics Engineer", "Civil Engineer", "Mechanical Engineer", "Electrical Engineer", "Chemical Engineer", "Aerospace Engineer"], "Entrance: JEE Main / state CETs (JEE Advanced for IITs)."),
   D("B.Arch", "5 years", ["Architect"], "Entrance: NATA or JEE Main Paper 2."),
   D("B.Sc (Maths / Physics / Statistics / CS)", "3 years", ["Data Analyst", "Data Scientist", "Actuary", "Research Scientist"], "Often followed by a Master's."),
   D("BCA", "3 years", ["Software Engineer", "Game Developer", "Data Analyst", "Cybersecurity Analyst"]),
   D("Integrated BS-MS (research institutes)", "5 years", ["Research Scientist"], "Entrance varies, e.g. IISER Aptitude Test."),
   D("Commercial pilot training (DGCA CPL)", "varies", ["Commercial Pilot"], "Needs Physics and Mathematics in Class 12 and medical fitness."),
  ]},
 {"id": "pcb", "name": "Science (PCB)", "color": "#00A88F", "subjects": ["Physics", "Chemistry", "Biology", "English"],
  "summary": "For medicine, health care, life sciences and animal care.",
  "after10": "Choose Science with Physics, Chemistry and Biology in Class 11-12.",
  "degrees": [
   D("MBBS", "5.5 years incl. internship", ["Doctor"], "Entrance: NEET-UG."),
   D("BDS", "5 years", ["Dentist"], "Entrance: NEET-UG."),
   D("BVSc & AH", "about 5.5 years", ["Veterinarian"], "Entrance: NEET-UG."),
   D("B.Sc Nursing", "4 years", ["Nurse"], "Admission route varies by state/institution."),
   D("B.Pharm / D.Pharm", "4 years / 2 years", ["Pharmacist"], "Admission route varies by state/institution."),
   D("BPT (Physiotherapy)", "about 4.5 years", ["Physiotherapist"], "Admission route varies by state/institution."),
   D("B.Sc Biotechnology / Life Sciences", "3 years", ["Biotechnologist", "Research Scientist", "Environmental Scientist"]),
   D("B.Sc Nutrition & Dietetics", "3 years", ["Dietitian"]),
   D("B.Sc / BA Psychology", "3 years", ["Psychologist"], "A Master's is needed for most professional practice."),
  ]},
 {"id": "commerce", "name": "Commerce", "color": "#FFB400", "subjects": ["Accountancy", "Business Studies", "Economics", "Mathematics (optional but helpful)"],
  "summary": "For finance, accounting, business, management and law-adjacent careers.",
  "after10": "Choose Commerce in Class 11-12; take Mathematics if you may want finance, economics or actuarial paths.",
  "degrees": [
   D("B.Com", "3 years", ["Chartered Accountant", "Financial Analyst", "Company Secretary", "Data Analyst"]),
   D("BBA / BMS", "3 years", ["Marketing Manager", "HR Manager", "Entrepreneur", "Financial Analyst"], "MBA/PGDM is a common next step."),
   D("B.A / B.Sc Economics", "3 years", ["Economist", "Financial Analyst", "Actuary", "Data Analyst"]),
   D("Professional courses (CA / CS)", "varies", ["Chartered Accountant", "Company Secretary"], "Entrance: CA Foundation (ICAI), CSEET (ICSI)."),
   D("BHM (Hotel Management)", "3-4 years", ["Hotel Management Professional"], "Entrance: NCHM JEE and institute tests."),
  ]},
 {"id": "humanities", "name": "Humanities & Arts", "color": "#F0476C", "subjects": ["History", "Political Science", "Psychology / Sociology", "English"],
  "summary": "For law, public service, media, design, teaching and social impact.",
  "after10": "Choose Humanities/Arts in Class 11-12, or pair design interests with a portfolio.",
  "degrees": [
   D("BA (History / Pol. Science / Sociology / English)", "3 years", ["Civil Services Officer", "Journalist", "Social Worker", "Teacher", "Economist", "Psychologist"]),
   D("BA LLB / BBA LLB", "5 years", ["Lawyer"], "Entrance: CLAT and other law entrances."),
   D("B.Des", "4 years", ["UX Designer", "Animator", "Fashion Designer", "Game Developer"], "Entrance: UCEED, NID DAT, NIFT (fashion)."),
   D("BJMC / BA Journalism", "3 years", ["Journalist"]),
   D("B.Ed (after a degree)", "2 years", ["Teacher"], "Teacher Eligibility Tests (CTET/state TET) apply."),
   D("BSW / MSW", "3 years + 2 years", ["Social Worker"]),
   D("BHM (Hotel Management)", "3-4 years", ["Hotel Management Professional"]),
  ]},
 {"id": "skills", "name": "Skills & Diploma", "color": "#8A5CF6", "subjects": ["Hands-on technical skills", "Mathematics and Science basics"],
  "summary": "Start earlier with a diploma or build skills and a portfolio; keep higher-study options open.",
  "after10": "After Class 10: polytechnic diploma, ITI trades, or skill programmes.",
  "degrees": [
   D("Polytechnic diploma (after Class 10)", "3 years", ["Civil Engineer", "Mechanical Engineer", "Electrical Engineer"], "Lateral entry to B.Tech (2nd year) is possible in many states."),
   D("Self-study + portfolio", "ongoing", ["Software Engineer", "UX Designer", "Entrepreneur"], "Employers often check projects; a degree can still open more doors."),
  ]},
]
