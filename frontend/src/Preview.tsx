import { ReactNode } from "react";
import { Link as RLink, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Box, Button, Checkbox, Chip, Container, FormControlLabel, Grid, Stack, TextField, Typography } from "@mui/material";
import { api } from "./api";
import { gradBtn } from "./theme";
import { Icon, Reveal, Spinner, Tilt } from "./ui";

/* Guest previews: show what a page contains, and ask for login only when the person tries to actually use it. */
const Wrap = ({ children, w = "lg" }: any) => <Container maxWidth={w} sx={{ py: 4 }}>{children}</Container>;
const Title = ({ a, b, sub }: any) => (<Box sx={{ mb: 3 }}><Typography variant="h3" sx={{ fontSize: { xs: 30, md: 40 } }}>{a} <span className="gtext">{b}</span></Typography>
  {sub && <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 720 }}>{sub}</Typography>}</Box>);
const SignIn = ({ next, children }: { next: string; children: ReactNode }) => (
  <Button component={RLink} to="/login" state={{ next }} size="large" sx={{ ...gradBtn, px: 4 }} endIcon={<Icon name="arrow" size={18} />}>{children}</Button>);
const Locked = ({ title, text }: { title: string; text: string }) => (
  <Box className="glass" sx={{ p: 2.5, height: "100%", boxSizing: "border-box", opacity: .9 }}><Box sx={{ color: "primary.main", mb: 1 }}><Icon name="lock" size={22} /></Box>
    <Typography fontWeight={700}>{title}</Typography><Typography variant="body2" color="text.secondary">{text}</Typography></Box>);
const Banner = ({ next, what }: { next: string; what: string }) => (
  <Box className="glass" sx={{ p: 2, mb: 3, display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
    <Icon name="lock" size={20} /><Typography sx={{ flexGrow: 1 }} variant="body2">You're previewing this page. Sign in or create a free account to {what}.</Typography>
    <Button component={RLink} to="/login" state={{ next }} size="small" sx={gradBtn}>Login</Button>
    <Button component={RLink} to="/register" size="small" color="inherit">Create account</Button></Box>);

const LIKERT = ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"];
const INTERESTS = ["Technology", "Medicine", "Business", "Design", "Law", "Finance", "Arts", "Research", "Engineering"];
const APTITUDE = ["Logical reasoning", "Numerical reasoning", "Verbal reasoning", "Problem solving"];

export function AssessmentPreview() {
  return (<Wrap w="md">
    <Reveal dir="zoom"><Box className="glass" sx={{ p: { xs: 3, md: 5 } }}>
      <Title a="Career" b="assessment" sub="Interest and aptitude questions in 5 short pages. Answer honestly; there is no pass or fail." />
      <Stack spacing={1} sx={{ mb: 3, color: "text.secondary" }}>
        <span>• 5 pages, about 7 questions each (35 questions, around 10 minutes)</span>
        <span>• Early pages ask how much you enjoy different activities; the last ones are short aptitude puzzles</span>
        <span>• Answer every question on a page to move on; you can go back and change answers</span>
        <span>• Results reflect only your answers. This is not a diagnosis or a validated test.</span></Stack>
      <SignIn next="/assessment">Start assessment</SignIn>
    </Box></Reveal>
    <Typography variant="h6" sx={{ mt: 4, mb: 1.5 }}>What it asks about</Typography>
    <Typography variant="overline" color="secondary">Interests</Typography>
    <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 2 }}>{INTERESTS.map((x) => <Chip key={x} label={x} variant="outlined" />)}</Stack>
    <Typography variant="overline" color="secondary">Aptitude</Typography>
    <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 4 }}>{APTITUDE.map((x) => <Chip key={x} label={x} variant="outlined" />)}</Stack>
    <Typography variant="h6" sx={{ mb: 1.5 }}>A sample question</Typography>
    <Box className="glass" sx={{ p: 2.5, mb: 4 }}><Typography sx={{ mb: 1.5, fontWeight: 600 }}>I like figuring out how apps, websites or gadgets work.</Typography>
      <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "1fr", sm: "repeat(5,1fr)" } }}>
        {LIKERT.map((o) => <label key={o} className="opt" style={{ fontSize: 14, textAlign: "center", cursor: "not-allowed", opacity: .8 }}><input type="radio" disabled />{o}</label>)}</Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>Sample only. Sign in to answer the real questions.</Typography></Box>
    <Typography variant="h6" sx={{ mb: 1.5 }}>What you get after finishing</Typography>
    <Grid container spacing={2} sx={{ mb: 4 }}>
      {[["Top career matches", "Your best-fit careers with a match score and reasons."], ["Strengths and skill gaps", "What you already do well and what to build next."], ["Charts", "Your interest and aptitude results at a glance."]].map(([t, d]) =>
        <Grid item xs={12} md={4} key={t}><Locked title={t} text={d} /></Grid>)}</Grid>
    <SignIn next="/assessment">Sign in to start</SignIn>
  </Wrap>);
}

export function CareersPreview() {
  const nav = useNavigate(); const [sp, setSp] = useSearchParams(); const { data } = useQuery({ queryKey: ["pathways"], queryFn: () => api("/pathways") });
  if (!data) return <Spinner label="Loading pathways…" />;
  const s = data.find((x: any) => x.id === sp.get("stream")) || data[0]; const total = new Set(data.flatMap((x: any) => x.degrees.flatMap((d: any) => d.careers.map((c: any) => c.id)))).size;
  return (<Wrap>
    <Title a="Careers &" b="pathways" sub={`Choose a stream to see its subjects and degree routes, then the careers it leads to. ${total} careers in total.`} />
    <Banner next="/careers" what={`search all ${total} careers and open full details: skills, exams, industries and roadmaps`} />
    <Stack direction="row" gap={1.2} flexWrap="wrap" sx={{ mb: 3 }}>{data.map((x: any) => <Chip key={x.id} label={x.name} clickable onClick={() => setSp({ stream: x.id })}
      sx={{ py: 2.2, border: `2px solid ${x.color}`, bgcolor: x.id === s.id ? x.color : "transparent", color: x.id === s.id ? "#0B0720" : "text.primary" }} />)}</Stack>
    <Box key={s.id} className="page">
      <Box className="glass" sx={{ p: 3, mb: 2.5, borderLeft: `6px solid ${s.color}` }}><Typography variant="h5">{s.name}</Typography><Typography color="text.secondary">{s.summary}</Typography>
        <Typography sx={{ mt: 1.5 }}><b>Class 11–12 subjects:</b> {s.subjects.join(", ")}</Typography><Typography sx={{ mt: .5 }}><b>After Class 10:</b> {s.after10}</Typography></Box>
      <Typography variant="h6" sx={{ mb: 1.5 }}>Degree routes</Typography>
      <Grid container spacing={2}>{s.degrees.map((d: any, i: number) => (<Grid item xs={12} md={6} key={d.name}><Reveal delay={i * 60}><Tilt><Box className="glass hover" sx={{ p: 2.5, height: "100%", boxSizing: "border-box" }}>
        <Stack direction="row" justifyContent="space-between" gap={1}><Typography variant="subtitle1" fontWeight={700}>{d.name}</Typography><Chip size="small" label={d.duration} sx={{ bgcolor: s.color, color: "#0B0720" }} /></Stack>
        {d.note && <Typography variant="body2" color="text.secondary" sx={{ mt: .8 }}>{d.note}</Typography>}
        <Stack direction="row" gap={.8} flexWrap="wrap" sx={{ mt: 1.5 }}>{d.careers.map((c: any) => <Chip key={c.id} size="small" variant="outlined" clickable label={c.name}
          icon={<Icon name="lock" size={12} />} onClick={() => nav("/login", { state: { next: `/careers/${c.id}` } })} />)}</Stack></Box></Tilt></Reveal></Grid>))}</Grid>
    </Box>
    <Box sx={{ mt: 4 }}><SignIn next={`/careers?stream=${s.id}`}>Sign in to explore all careers</SignIn></Box>
  </Wrap>);
}

export function RoadmapPreview() {
  const ex = [["Week 1", "Python (part 1 of 3)", "Practise Python for 3–4 short sessions this week."], ["Week 2", "Python (part 2 of 3)", "Practise Python and note what you found hard."],
    ["Week 3", "Python (part 3 of 3)", "Finish with a small project that uses Python."], ["Week 4", "Statistics (part 1 of 3)", "Practise Statistics for 3–4 short sessions."]];
  return (<Wrap w="md">
    <Title a="Learning" b="roadmaps" sub="Pick a career and a length. You get a week-by-week plan you can tick off as you go." />
    <Banner next="/roadmap" what="create your own roadmap and track your progress" />
    <Grid container spacing={2} sx={{ mb: 3 }}>{[["1", "Choose a career", "Your top matches are listed first."], ["2", "Choose a length", "12 weeks, 24 weeks or 1 year."], ["3", "Tick off each week", "See what's next and your progress."]].map(([n, t, d]) =>
      <Grid item xs={12} md={4} key={n}><Box className="glass" sx={{ p: 2.5, height: "100%", boxSizing: "border-box" }}><Typography variant="h4" className="gtext">{n}</Typography><Typography fontWeight={700}>{t}</Typography>
        <Typography variant="body2" color="text.secondary">{d}</Typography></Box></Grid>)}</Grid>
    <Typography variant="h6" sx={{ mb: 1.5 }}>Example of how a roadmap looks</Typography>
    <Box className="glass" sx={{ p: 3, mb: 4 }}><Chip size="small" label="Example only" sx={{ mb: 1.5 }} />
      {ex.map(([w, t, p]) => <Box key={w} sx={{ mb: 1 }}><FormControlLabel control={<Checkbox disabled />} label={<b>{w}: {t}</b>} /><Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>{p}</Typography></Box>)}</Box>
    <SignIn next="/roadmap">Create my roadmap</SignIn>
  </Wrap>);
}

const ASK = ["What careers can I pursue with PCM?", "What should I study to become a data scientist?", "What is the difference between AI engineering and data science?",
  "Which skills should I learn?", "What degree options are available for a doctor?", "What should I do after class 10?"];
export function AssistantPreview() {
  const nav = useNavigate(); const go = () => nav("/login", { state: { next: "/assistant" } });
  return (<Wrap w="md">
    <Title a="Career" b="assistant" sub="Ask about streams, degrees, exams and skills. Answers come from the career database and documents, with sources. If it doesn't know, it says so." />
    <Banner next="/assistant" what="chat with the assistant" />
    <Typography variant="h6" sx={{ mb: 1.5 }}>Things you can ask</Typography>
    <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 4 }}>{ASK.map((q) => <Chip key={q} label={q} clickable onClick={go} variant="outlined" icon={<Icon name="lock" size={14} />} sx={{ height: "auto", py: .8, "& .MuiChip-label": { whiteSpace: "normal" } }} />)}</Stack>
    <Stack direction="row" spacing={1} sx={{ mb: 3 }}><TextField fullWidth disabled label="Sign in to ask your own question…" /><Button sx={{ ...gradBtn, minWidth: 56 }} onClick={go} aria-label="Sign in to chat"><Icon name="send" size={20} /></Button></Stack>
    <SignIn next="/assistant">Sign in to chat</SignIn>
  </Wrap>);
}
