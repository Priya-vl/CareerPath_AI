import { Link as RLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Box, Button, Container, Grid, Stack, Typography, useTheme } from "@mui/material";
import { api, auth } from "./api";
import { gradBtn } from "./theme";
import { CountUp, Icon, Reveal, Tilt, Typing, useParallax } from "./ui";

const FEATURES = [
  { icon: "clipboard", title: "Career Assessment", text: "Five short pages on your interests and aptitude. No diagnosis, just useful signals.", to: "/assessment", c: "#C084FC" },
  { icon: "chart", title: "Career Recommendations", text: "See your top matches with reasons, strengths and skill gaps.", to: "/careers", c: "#22D3EE" },
  { icon: "route", title: "Learning Roadmaps", text: "12-week, 24-week or 1-year plans you can tick off as you go.", to: "/roadmap", c: "#F472B6" },
  { icon: "bot", title: "AI Career Assistant", text: "Ask about streams, degrees, exams and skills. It shows its sources.", to: "/assistant", c: "#A78BFA" },
];
const STEPS = [
  ["Create your profile", "Add your grade, board, marks, interests and skills."], ["Take the assessment", "5 pages, about 7 questions each, in order."],
  ["See your matches", "Match scores, reasons and skill gaps for each career."], ["Follow your roadmap", "Weekly topics, practice and projects with progress tracking."],
];
const LIGHTC = ["#6D28D9", "#0E7490", "#BE185D", "#5B21B6"];
const TILES = [["code", "12%", "28%"], ["flask", "86%", "26%"], ["heart", "10%", "72%"], ["globe", "88%", "74%"], ["spark", "50%", "6%"]];

export default function Landing() {
  const loggedIn = !!auth.get(); const y = useParallax(0.12); const dark = useTheme().palette.mode === "dark";
  const { data } = useQuery({ queryKey: ["pathways"], queryFn: () => api("/pathways") });
  const careerCount = data ? new Set(data.flatMap((s: any) => s.degrees.flatMap((d: any) => d.careers.map((c: any) => c.id)))).size : 0;
  const routes = data ? data.reduce((n: number, s: any) => n + s.degrees.length, 0) : 0;
  return (
    <Box>
      <Container maxWidth="lg" sx={{ pt: { xs: 4, md: 8 }, pb: 6 }}>
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={6}>
            <Reveal dir="left">
              <Typography variant="h2" sx={{ fontWeight: 800, fontSize: { xs: 38, md: 56 }, lineHeight: 1.1 }}>
                Discover the Right Career for <span className="gtext">Your Future</span>
              </Typography>
            </Reveal>
            <Reveal delay={150}><Typography sx={{ mt: 2.5, fontSize: 18, color: "text.secondary", maxWidth: 520 }}>
              AI-powered assessments, personalised recommendations and interactive career roadmaps for students in grades 8 to 12 and early college.</Typography></Reveal>
            <Reveal delay={250}><Box className="glass" sx={{ mt: 3, px: 2.5, py: 1.4, maxWidth: 380, fontWeight: 600, color: "text.primary" }}>
              <Typing phrases={["Find your career…", "Which stream after Class 10?", "What should I study for AI?", "Build my 12-week roadmap…"]} /></Box></Reveal>
            <Reveal delay={350}><Stack direction="row" spacing={2} sx={{ mt: 3.5 }} flexWrap="wrap" useFlexGap>
              <Button component={RLink} to={loggedIn ? "/dashboard" : "/register"} size="large" sx={{ ...gradBtn, px: 3.5 }} endIcon={<Icon name="arrow" size={18} />}>
                {loggedIn ? "Go to dashboard" : "Get Started"}</Button>
              <Button href="#how" size="large" variant="outlined" color="inherit" sx={{ px: 3, borderColor: "var(--line)" }}>See how it works</Button>
              <Button component={RLink} to="/careers" size="large" color="secondary">Explore careers & pathways</Button>
            </Stack></Reveal>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box style={{ transform: `translateY(${y}px)` }}>
              <div className="orbit">
                <div className="ring" /><div className="ring r2" />
                <div className="core float"><Icon name="cap" size={110} /></div>
                {TILES.map(([ic, l, t], i) => <div key={ic} className="tile glass float" style={{ left: l, top: t, animationDelay: `${i * 0.7}s` }}><Icon name={ic} size={30} /></div>)}
              </div>
            </Box>
          </Grid>
        </Grid>
      </Container>

      <Container maxWidth="lg" sx={{ py: 5 }}>
        <Grid container spacing={2.5}>
          {FEATURES.map((f, i) => (
            <Grid item xs={12} sm={6} md={3} key={f.title}>
              <Reveal delay={i * 120} dir="zoom" sx={{ height: "100%" }}>
                <Tilt><Box component={RLink} to={f.to} className="glass hover" sx={{ display: "block", p: 3, height: "100%", boxSizing: "border-box" }}>
                  <Box className="bounce" sx={{ color: dark ? f.c : LIGHTC[i], mb: 1.5, animationDelay: `${i * 0.4}s`, display: "inline-block" }}><Icon name={f.icon} size={40} /></Box>
                  <Typography variant="h6">{f.title}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>{f.text}</Typography>
                  <Box sx={{ color: dark ? f.c : LIGHTC[i], display: "flex", alignItems: "center", gap: 1, fontWeight: 700, fontSize: 14 }}>{loggedIn ? "Open" : "See what's inside"} <Icon name="arrow" size={16} /></Box>
                </Box></Tilt>
              </Reveal>
            </Grid>))}
        </Grid>
      </Container>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Grid container spacing={2}>
          {[["Careers", careerCount], ["Study streams", data?.length || 0], ["Degree routes", routes], ["Assessment pages", 5]].map(([l, n]: any, i) => (
            <Grid item xs={6} md={3} key={l}><Reveal delay={i * 100}><Box className="glass" sx={{ p: 3, textAlign: "center" }}>
              <Typography variant="h3" className="gtext"><CountUp to={n} /></Typography><Typography color="text.secondary">{l}</Typography></Box></Reveal></Grid>))}
        </Grid>
      </Container>

      <Container maxWidth="lg" id="how" sx={{ py: 6, scrollMarginTop: 90 }}>
        <Reveal><Typography variant="h4" sx={{ mb: 3 }}>How it <span className="gtext">works</span></Typography></Reveal>
        <Grid container spacing={2.5}>
          {STEPS.map(([t, d], i) => (
            <Grid item xs={12} md={6} key={t}><Reveal dir={i % 2 ? "right" : "left"} delay={i * 80}>
              <Box className="glass hover" sx={{ p: 3, display: "flex", gap: 2.5, alignItems: "center" }}>
                <Typography variant="h3" className="gtext" sx={{ minWidth: 48 }}>{i + 1}</Typography>
                <Box><Typography variant="h6">{t}</Typography><Typography color="text.secondary">{d}</Typography></Box></Box></Reveal></Grid>))}
        </Grid>
      </Container>

      <Container maxWidth="lg" sx={{ py: 5 }}>
        <Reveal><Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Typography variant="h4">Pick a <span className="gtext">stream</span> to explore</Typography>
          <Button component={RLink} to="/careers" color="secondary">All careers & pathways</Button></Stack></Reveal>
        <Grid container spacing={2}>
          {(data || []).map((s: any, i: number) => (
            <Grid item xs={12} sm={6} md={4} key={s.id}><Reveal delay={i * 90}><Tilt>
              <Box component={RLink} to={`/careers?stream=${s.id}`} className="glass hover" sx={{ display: "block", p: 3, borderTop: `4px solid ${s.color}`, height: "100%", boxSizing: "border-box" }}>
                <Typography variant="h6">{s.name}</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{s.summary}</Typography>
                <Typography variant="caption" sx={{ color: s.color, mt: 1.5, display: "block", fontWeight: 700 }}>{s.degrees.length} degree routes</Typography></Box></Tilt></Reveal></Grid>))}
        </Grid>
      </Container>

      <Container maxWidth="md" sx={{ py: 7, textAlign: "center" }}>
        <Reveal dir="zoom"><Box className="glass" sx={{ p: { xs: 3, md: 5 } }}>
          <Typography variant="h4">Ready to find <span className="gtext">your path</span>?</Typography>
          <Typography color="text.secondary" sx={{ my: 2 }}>Create a free account to unlock the assessment, career matches, roadmaps and the assistant.</Typography>
          <Button component={RLink} to={loggedIn ? "/dashboard" : "/register"} size="large" sx={{ ...gradBtn, px: 4 }}>{loggedIn ? "Open dashboard" : "Create my account"}</Button>
          <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 3 }}>
            CareerPath AI offers guidance, not guaranteed career outcomes. Suggestions use only the information you provide. Please talk with teachers, counsellors and official education sources before major decisions.</Typography>
        </Box></Reveal>
      </Container>
    </Box>);
}
