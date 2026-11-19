import { useEffect, useRef, useState } from "react";
import { Link as RLink, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Checkbox, Chip, Container, FormControlLabel, Grid, LinearProgress, MenuItem,
         Stack, Tab, Tabs, TextField, ToggleButton, ToggleButtonGroup, Typography, useTheme } from "@mui/material";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import ReactFlow, { Background, Controls, Edge, Node } from "reactflow";
import "reactflow/dist/style.css";
import { api, auth, home } from "./api";
import { gradBtn } from "./theme";
import { Icon, Reveal, Spinner, Tilt } from "./ui";

const Wrap = ({ children, w = "lg" }: any) => <Container maxWidth={w} sx={{ py: 4 }}>{children}</Container>;
const Err = ({ e }: any) => (e ? <Alert severity="error" sx={{ my: 1 }}>{e.message}</Alert> : null);
const Title = ({ a, b, sub }: any) => (<Box sx={{ mb: 3 }}><Typography variant="h3" sx={{ fontSize: { xs: 30, md: 40 } }}>{a} <span className="gtext">{b}</span></Typography>
  {sub && <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 720 }}>{sub}</Typography>}</Box>);

function Chart({ title, obj }: { title: string; obj?: Record<string, number> }) {
  const t = useTheme(); const rows = Object.entries(obj || {}).map(([name, value]) => ({ name, value })); const tick = { fill: t.palette.text.secondary, fontSize: 11 };
  return (<Box className="glass" sx={{ p: 2.5, height: "100%", boxSizing: "border-box" }}><Typography variant="h6" sx={{ mb: 1 }}>{title}</Typography>
    {rows.length ? <ResponsiveContainer width="100%" height={240}><BarChart data={rows}>
      <defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#A78BFA" /><stop offset="1" stopColor="#7C3AED" /></linearGradient></defs>
      <CartesianGrid stroke={t.palette.divider} vertical={false} /><XAxis dataKey="name" tick={tick} interval={0} angle={-25} textAnchor="end" height={60} />
      <YAxis domain={[0, 100]} tick={tick} /><Tooltip contentStyle={{ background: t.palette.background.paper, color: t.palette.text.primary, border: `1px solid ${t.palette.divider}`, borderRadius: 10 }} cursor={{ fill: t.palette.divider }} />
      <Bar dataKey="value" fill="url(#bg)" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>
      : <Typography color="text.secondary">No data yet.</Typography>}</Box>);
}

/* ---------- Login / Register ---------- */
export function Login({ register = false }: { register?: boolean }) {
  const nav = useNavigate(); const loc: any = useLocation(); const [f, setF] = useState({ username: "", email: "", password: "", first_name: "", role: "student" });
  const m = useMutation({
    mutationFn: async () => {
      if (register) await api("/auth/register", "POST", f);
      const t = await api("/auth/login", "POST", { username: f.username, password: f.password });
      auth.set(t.access, t.refresh, "student"); const me = await api("/auth/me"); localStorage.setItem("role", me.role); return me.role as string;
    },
    onSuccess: (r) => nav(loc.state?.next || (register && r === "student" ? "/profile" : home(r)), { replace: true }),
  });
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  return (
    <Container maxWidth="xs" sx={{ py: { xs: 4, md: 8 } }}><Reveal dir="zoom"><Box className="glass" sx={{ p: 4 }}>
      <Stack spacing={2} component="form" onSubmit={(e) => { e.preventDefault(); m.mutate(); }}>
        <Typography variant="h4">{register ? <>Create your <span className="gtext">account</span></> : <>Welcome <span className="gtext">back</span></>}</Typography>
        {loc.state?.next && <Alert severity="info">Please sign in to use this part of the app.</Alert>}
        {register && <TextField label="Name" value={f.first_name} onChange={set("first_name")} />}
        {register && <TextField label="Email" type="email" value={f.email} onChange={set("email")} autoComplete="email" required helperText="Used to reset your password" />}
        <TextField label={register ? "Username" : "Username or email"} value={f.username} onChange={set("username")} autoComplete="username" required />
        <TextField label="Password (8+ characters)" type="password" value={f.password} onChange={set("password")} autoComplete={register ? "new-password" : "current-password"} required />
        {register && <TextField select label="I am a" value={f.role} onChange={set("role")}><MenuItem value="student">Student</MenuItem><MenuItem value="parent">Parent</MenuItem></TextField>}
        <Err e={m.error} />
        <Button type="submit" size="large" sx={gradBtn} disabled={m.isPending}>{m.isPending ? "Please wait…" : register ? "Create account" : "Sign in"}</Button>
        {!register && <Button component={RLink} to="/forgot-password" color="inherit" size="small">Forgot password?</Button>}
        <Button component={RLink} to={register ? "/login" : "/register"} color="secondary">{register ? "I already have an account" : "Create an account"}</Button>
      </Stack></Box></Reveal></Container>);
}

export function ForgotPassword() {
  const [email, setEmail] = useState(""); const m = useMutation({ mutationFn: () => api("/auth/password-reset", "POST", { email }) });
  return (<Container maxWidth="xs" sx={{ py: { xs: 4, md: 8 } }}><Box className="glass" sx={{ p: 4 }}><Stack spacing={2} component="form" onSubmit={(e) => { e.preventDefault(); m.mutate(); }}>
    <Typography variant="h4">Forgot <span className="gtext">password</span></Typography>
    <Typography color="text.secondary" variant="body2">Enter your account email and we'll send a link to choose a new password.</Typography>
    <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
    <Err e={m.error} />{m.isSuccess && <Alert severity="success">{m.data.detail}</Alert>}
    <Button type="submit" size="large" sx={gradBtn} disabled={m.isPending || !email}>{m.isPending ? "Sending…" : "Send reset link"}</Button>
    <Button component={RLink} to="/login" color="secondary">Back to sign in</Button></Stack></Box></Container>);
}

export function ResetPassword() {
  const [sp] = useSearchParams(); const [pw, setPw] = useState(""); const [pw2, setPw2] = useState("");
  const m = useMutation({ mutationFn: () => api("/auth/password-reset/confirm", "POST", { uid: sp.get("uid"), token: sp.get("token"), password: pw }) });
  const mismatch = pw2 !== "" && pw !== pw2;
  return (<Container maxWidth="xs" sx={{ py: { xs: 4, md: 8 } }}><Box className="glass" sx={{ p: 4 }}><Stack spacing={2} component="form" onSubmit={(e) => { e.preventDefault(); if (!mismatch) m.mutate(); }}>
    <Typography variant="h4">Choose a new <span className="gtext">password</span></Typography>
    <TextField label="New password (8+ characters)" type="password" value={pw} onChange={(e) => setPw(e.target.value)} required autoComplete="new-password" />
    <TextField label="Repeat new password" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} required autoComplete="new-password" error={mismatch} helperText={mismatch ? "Passwords don't match" : ""} />
    <Err e={m.error} />{m.isSuccess && <Alert severity="success">{m.data.detail}</Alert>}
    {m.isSuccess ? <Button component={RLink} to="/login" sx={gradBtn}>Go to sign in</Button> : <Button type="submit" size="large" sx={gradBtn} disabled={m.isPending || pw.length < 8 || mismatch}>{m.isPending ? "Saving…" : "Save new password"}</Button>}</Stack></Box></Container>);
}

/* ---------- Home (overview + dashboard in one page) ---------- */
export function Dashboard() {
  const { data, error } = useQuery({ queryKey: ["dash"], queryFn: () => api("/dashboard") });
  const recs = useQuery({ queryKey: ["recs"], queryFn: () => api("/recommendations") });
  if (error) return <Wrap><Err e={error} /></Wrap>; if (!data) return <Spinner label="Loading your home…" />;
  const cards: [string, any, string][] = [["Assessment score", data.assessment_score != null ? `${data.assessment_score}` : "—", "#A78BFA"], ["Top career", data.top_career ?? "—", "#22D3EE"],
    ["Career match", data.career_match != null ? `${data.career_match}%` : "—", "#F472B6"], ["Skills completed", `${data.skills_completed}/${data.skills_total}`, "#8B5CF6"],
    ["Roadmap progress", `${data.roadmap_progress}%`, "#34D399"]];
  const actions = [["clipboard", "Assessment", data.assessment ? "Retake or view results" : "Start: 5 short pages", data.assessment ? "/assessment/results" : "/assessment"],
    ["chart", "Careers & Pathways", "Streams, degrees and 40+ careers", "/careers"], ["route", "Roadmap", `${data.roadmap_progress}% complete`, "/roadmap"], ["bot", "Assistant", "Ask about careers and exams", "/assistant"]];
  return (<Wrap>
    <Title a="Welcome," b={data.name} sub="Your overview: progress, next steps and where to go." />
    {!data.assessment && <Reveal><Box className="glass" sx={{ p: 3, mb: 3, display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
      <Box sx={{ flexGrow: 1 }}><Typography variant="h6">Start with the assessment</Typography><Typography color="text.secondary">Five short pages unlock your career matches and charts.</Typography></Box>
      <Button component={RLink} to="/assessment" sx={gradBtn}>Take the assessment</Button></Box></Reveal>}
    <Grid container spacing={2} sx={{ mb: 3 }}>{cards.map(([l, v, c], i) => <Grid item xs={6} md={2.4} key={l}><Reveal delay={i * 70}>
      <Box className="glass" sx={{ p: 2.5, borderTop: `3px solid ${c}`, height: "100%", boxSizing: "border-box" }}><Typography variant="body2" color="text.secondary">{l}</Typography>
        <Typography variant="h5" sx={{ mt: .5, wordBreak: "break-word" }}>{v}</Typography></Box></Reveal></Grid>)}</Grid>
    <Typography variant="h5" sx={{ mb: 1.5 }}>Jump back in</Typography>
    <Grid container spacing={2} sx={{ mb: 4 }}>{actions.map(([ic, t, d, to], i) => <Grid item xs={12} sm={6} md={3} key={t}><Reveal delay={i * 80}><Tilt>
      <Box component={RLink} to={to} className="glass hover" sx={{ display: "block", p: 2.5, height: "100%", boxSizing: "border-box" }}>
        <Box sx={{ color: "primary.main", mb: 1 }}><Icon name={ic} size={30} /></Box><Typography variant="h6">{t}</Typography>
        <Typography variant="body2" color="text.secondary">{d}</Typography></Box></Tilt></Reveal></Grid>)}</Grid>
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}><Chart title="Subject performance" obj={data.subject_performance} /></Grid>
      <Grid item xs={12} md={6}><Chart title="Interest distribution" obj={data.assessment?.interest} /></Grid>
      <Grid item xs={12} md={6}><Chart title="Aptitude results" obj={data.assessment?.aptitude} /></Grid>
      <Grid item xs={12} md={6}><Chart title="Career comparison (match %)" obj={Object.fromEntries((recs.data || []).map((r: any) => [r.career, r.match_score]))} /></Grid>
    </Grid></Wrap>);
}

/* ---------- Assessment: 5 pages ---------- */
const TOTAL_PAGES = 5;
export function Assessment() {
  const qc = useQueryClient(); const nav = useNavigate();
  const [qs, setQs] = useState<any[]>([]); const [ans, setAns] = useState<Record<number, number>>({}); const [step, setStep] = useState(-1);
  const start = useMutation({ mutationFn: () => api("/assessment/start", "POST", { size: "standard" }), onSuccess: (d: any[]) => { setQs(d); setAns({}); setStep(0); window.scrollTo(0, 0); } });
  const submit = useMutation({ mutationFn: async () => { await api("/assessment/submit", "POST", { answers: ans }); return api("/recommendations/generate", "POST"); },
    onSuccess: () => { qc.invalidateQueries(); nav("/assessment/results"); } });
  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [step]);

  if (submit.isPending) return <Wrap w="sm"><Box className="glass" sx={{ p: 4 }}><Spinner label="Analysing your answers and finding your matches…" /><LinearProgress /></Box></Wrap>;
  if (step < 0) return (<Wrap w="md"><Reveal dir="zoom"><Box className="glass" sx={{ p: { xs: 3, md: 5 } }}>
    <Title a="Career" b="assessment" sub="Interest and aptitude questions in 5 short pages. Answer honestly; there is no pass or fail." />
    <Stack spacing={1} sx={{ mb: 3, color: "text.secondary" }}>
      <span>• 5 pages, about 7 questions each (35 questions, around 10 minutes)</span><span>• Pages 1 to 4 start with how much you enjoy different activities; the last ones are short aptitude puzzles</span>
      <span>• Answer every question on a page to move on; you can go back and change answers</span><span>• Results reflect only your answers. This is not a diagnosis or a validated test.</span></Stack>
    <Err e={start.error} />
    <Button size="large" sx={{ ...gradBtn, px: 4 }} onClick={() => start.mutate()} disabled={start.isPending} endIcon={<Icon name="arrow" size={18} />}>{start.isPending ? "Loading…" : "Start assessment"}</Button>
  </Box></Reveal></Wrap>);

  const per = Math.ceil(qs.length / TOTAL_PAGES); const page = qs.slice(step * per, (step + 1) * per);
  const answered = page.filter((q) => ans[q.id] !== undefined).length; const done = answered === page.length; const last = step === TOTAL_PAGES - 1;
  return (<Wrap w="md">
    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
      <Typography variant="h5" aria-live="polite">Page <span className="gtext">{step + 1}/{TOTAL_PAGES}</span></Typography>
      <Typography color="text.secondary">{answered}/{page.length} answered on this page</Typography></Stack>
    <LinearProgress variant="determinate" value={((step + (done ? 1 : answered / page.length)) / TOTAL_PAGES) * 100} sx={{ height: 8, borderRadius: 4, mb: 3, "& .MuiLinearProgress-bar": { background: "linear-gradient(90deg,#7C3AED,#0EA5E9)" } }} />
    <Box key={step} className="page">
      {page.map((q, i) => {
        const gi = step * per + i + 1; const newSec = i === 0 || page[i - 1].category !== q.category; const likert = q.category === "interest";
        return (<Box key={q.id}>
          {newSec && <Typography variant="overline" sx={{ color: "secondary.main", display: "block", mt: i ? 3 : 0 }}>{likert ? "How much do you agree?" : "Aptitude: choose the best answer"}</Typography>}
          <Reveal delay={i * 40}><Box className="glass" sx={{ p: 2.5, mb: 2 }} role="radiogroup" aria-label={q.text}>
            <Typography sx={{ mb: 1.5, fontWeight: 600 }}>{gi}. {q.text}</Typography>
            <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: likert ? { xs: "1fr", sm: "repeat(5,1fr)" } : { xs: "1fr", sm: "1fr 1fr" } }}>
              {q.options.map((o: string, k: number) => (<label key={k} className={`opt ${ans[q.id] === k ? "sel" : ""}`} style={{ fontSize: 14, textAlign: likert ? "center" : "left" }}>
                <input type="radio" name={`q${q.id}`} checked={ans[q.id] === k} onChange={() => setAns({ ...ans, [q.id]: k })} />{o}</label>))}
            </Box></Box></Reveal></Box>);
      })}
    </Box>
    <Err e={submit.error} />
    <Stack direction="row" justifyContent="space-between" sx={{ mt: 2 }}>
      <Button color="inherit" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</Button>
      {last ? <Button size="large" sx={gradBtn} disabled={!done} onClick={() => submit.mutate()}>Finish and see my matches</Button>
            : <Button size="large" sx={gradBtn} disabled={!done} onClick={() => setStep(step + 1)} endIcon={<Icon name="arrow" size={18} />}>Next</Button>}
    </Stack>
    {!done && <Typography variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "right", mt: 1 }}>Answer all questions on this page to continue.</Typography>}
  </Wrap>);
}

export function AssessmentResults() {
  const res = useQuery({ queryKey: ["aresults"], queryFn: () => api("/assessment/results"), retry: false });
  const recs = useQuery({ queryKey: ["recs"], queryFn: () => api("/recommendations") });
  const [rated, setRated] = useState<Record<number, boolean>>({});
  const fb = useMutation({ mutationFn: (v: any) => api("/recommendations/feedback", "POST", { career_id: v.id, liked: v.liked }), onSuccess: (_d, v: any) => setRated((r) => ({ ...r, [v.id]: v.liked })) });
  if (res.isLoading) return <Spinner label="Loading results…" />;
  if (res.error) return <Wrap w="sm"><Box className="glass" sx={{ p: 4, textAlign: "center" }}><Typography variant="h5">No assessment yet</Typography>
    <Button component={RLink} to="/assessment" sx={{ ...gradBtn, mt: 2 }}>Take the assessment</Button></Box></Wrap>;
  return (<Wrap>
    <Title a="Your" b="results" sub={res.data.note} />
    <Grid container spacing={2} sx={{ mb: 4 }}><Grid item xs={12} md={6}><Chart title="Interest areas" obj={res.data.scores.interest} /></Grid>
      <Grid item xs={12} md={6}><Chart title="Aptitude" obj={res.data.scores.aptitude} /></Grid></Grid>
    <Typography variant="h5" sx={{ mb: 2 }}>Your top career matches</Typography>
    <Grid container spacing={2}>{(recs.data || []).map((r: any, i: number) => (
      <Grid item xs={12} md={6} key={r.career_id}><Reveal delay={i * 100}><Tilt><Box className="glass hover" sx={{ p: 3, height: "100%", boxSizing: "border-box" }}>
        <Stack direction="row" justifyContent="space-between"><Typography variant="h6">{r.career}</Typography><Typography variant="h5" className="gtext">{r.match_score}%</Typography></Stack>
        <LinearProgress variant="determinate" value={r.match_score} sx={{ my: 1.5, height: 6, borderRadius: 3 }} />
        <Typography variant="body2" color="text.secondary">{r.reasons.join(" · ")}</Typography>
        <Typography variant="caption" sx={{ display: "block", mt: 1.5, color: "secondary.main", fontWeight: 700 }}>SKILL GAPS</Typography>
        <Stack direction="row" gap={.8} flexWrap="wrap" sx={{ mt: .5 }}>{r.skill_gaps.map((s: string) => <Chip key={s} size="small" label={s} variant="outlined" />)}</Stack>
        <Stack direction="row" gap={1} sx={{ mt: 2 }}><Button size="small" component={RLink} to={`/careers/${r.career_id}`} color="inherit">Details</Button>
          <Button size="small" component={RLink} to={`/roadmap?career=${r.career_id}`} sx={gradBtn}>Create roadmap</Button></Stack>
        <Stack direction="row" gap={1} alignItems="center" sx={{ mt: 1.5 }}><Typography variant="caption" color="text.secondary">Was this useful?</Typography>
          <Button size="small" variant={rated[r.career_id] === true ? "contained" : "outlined"} aria-pressed={rated[r.career_id] === true} onClick={() => fb.mutate({ id: r.career_id, liked: true })}>Useful</Button>
          <Button size="small" variant={rated[r.career_id] === false ? "contained" : "outlined"} color="inherit" aria-pressed={rated[r.career_id] === false} onClick={() => fb.mutate({ id: r.career_id, liked: false })}>Not for me</Button></Stack>
      </Box></Tilt></Reveal></Grid>))}</Grid>
    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 3 }}>Match scores are heuristic guidance based on your inputs, not a scientific prediction.</Typography>
    <Button component={RLink} to="/assessment" color="secondary" sx={{ mt: 1 }}>Retake assessment</Button>
  </Wrap>);
}

/* ---------- Careers & Pathways (one page) ---------- */
export function Careers() {
  const { id } = useParams(); const nav = useNavigate(); const [q, setQ] = useState(""); const [sp, setSp] = useSearchParams(); const stream = sp.get("stream") || "all";
  const list = useQuery({ queryKey: ["careers", ""], queryFn: () => api("/careers?search=") });
  const paths = useQuery({ queryKey: ["pathways"], queryFn: () => api("/pathways") });
  const detail = useQuery({ queryKey: ["career", id], queryFn: () => api(`/careers/${id}`), enabled: !!id });
  const mk = useMutation({ mutationFn: (weeks: number) => api("/roadmaps/generate", "POST", { career_id: Number(id), weeks }), onSuccess: () => nav("/roadmap") });
  const streamsOf: Record<number, any[]> = {};
  (paths.data || []).forEach((s: any) => s.degrees.forEach((d: any) => d.careers.forEach((c: any) => { (streamsOf[c.id] ||= []); if (!streamsOf[c.id].some((x) => x.id === s.id)) streamsOf[c.id].push(s); })));
  if (id) {
    if (!detail.data) return detail.error ? <Wrap><Err e={detail.error} /></Wrap> : <Spinner />;
    const c = detail.data;
    return (<Wrap w="md"><Button onClick={() => nav("/careers")} color="inherit" sx={{ mb: 1 }}>← Careers & pathways</Button>
      <Title a={c.name} b="" sub={c.description} />
      <Stack direction="row" gap={1} sx={{ mb: 3 }}>{(streamsOf[c.id] || []).map((s) => <Chip key={s.id} label={s.name} component={RLink} to={`/careers?stream=${s.id}`} clickable sx={{ bgcolor: s.color, color: "#0B0720" }} />)}</Stack>
      <Grid container spacing={2}>{([["Subjects", c.required_subjects], ["Skills", c.skills], ["Degrees", c.degree_options], ["Entrance exams", c.entrance_exams], ["Industries", c.industries], ["Job roles", c.job_roles], ["Related careers", c.related_careers]] as [string, string[]][]).map(([l, v], i) => (
        <Grid item xs={12} md={6} key={l}><Reveal delay={i * 50}><Box className="glass" sx={{ p: 2.5, height: "100%", boxSizing: "border-box" }}>
          <Typography variant="overline" sx={{ color: "secondary.main" }}>{l}</Typography><Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 1 }}>{v.map((x) => <Chip key={x} label={x} />)}</Stack></Box></Reveal></Grid>))}</Grid>
      <Typography variant="body2" color="text.secondary" sx={{ my: 3 }}>Starter data for guidance only. Confirm details with official sources.</Typography>
      <Typography variant="h6" sx={{ mb: 1 }}>Build a roadmap</Typography>
      <Stack direction="row" gap={1} flexWrap="wrap">{[12, 24, 52].map((w) => <Button key={w} sx={gradBtn} disabled={mk.isPending} onClick={() => mk.mutate(w)}>{w === 52 ? "1-year" : `${w}-week`} roadmap</Button>)}</Stack>
      <Err e={mk.error} /></Wrap>);
  }
  const cur = (paths.data || []).find((s: any) => s.id === stream);
  const rows = (list.data || []).filter((c: any) => (stream === "all" || (streamsOf[c.id] || []).some((s) => s.id === stream)) && (!q || (c.name + c.description).toLowerCase().includes(q.toLowerCase())));
  const pick = (v: string) => setSp(v === "all" ? {} : { stream: v });
  return (<Wrap>
    <Title a="Careers &" b="pathways" sub="Choose a stream to see its subjects and degree routes, then browse the careers it leads to. All in one place." />
    <Stack direction="row" gap={1.2} flexWrap="wrap" sx={{ mb: 3 }}>
      <Chip label="All streams" clickable onClick={() => pick("all")} color={stream === "all" ? "primary" : "default"} sx={{ py: 2.2 }} />
      {(paths.data || []).map((s: any) => <Chip key={s.id} label={s.name} clickable onClick={() => pick(s.id)} sx={{ py: 2.2, border: `2px solid ${s.color}`, bgcolor: stream === s.id ? s.color : "transparent", color: stream === s.id ? "#0B0720" : "text.primary" }} />)}</Stack>
    {cur && <Box key={cur.id} className="page" sx={{ mb: 4 }}>
      <Box className="glass" sx={{ p: 3, mb: 2.5, borderLeft: `6px solid ${cur.color}` }}><Typography variant="h5">{cur.name}</Typography><Typography color="text.secondary">{cur.summary}</Typography>
        <Typography sx={{ mt: 1.5 }}><b>Class 11–12 subjects:</b> {cur.subjects.join(", ")}</Typography><Typography sx={{ mt: .5 }}><b>After Class 10:</b> {cur.after10}</Typography></Box>
      <Typography variant="h6" sx={{ mb: 1.5 }}>Degree routes</Typography>
      <Grid container spacing={2}>{cur.degrees.map((d: any, i: number) => (<Grid item xs={12} md={6} key={d.name}><Reveal delay={i * 60}><Box className="glass hover" sx={{ p: 2.5, height: "100%", boxSizing: "border-box" }}>
        <Stack direction="row" justifyContent="space-between" gap={1}><Typography variant="subtitle1" fontWeight={700}>{d.name}</Typography><Chip size="small" label={d.duration} sx={{ bgcolor: cur.color, color: "#0B0720" }} /></Stack>
        {d.note && <Typography variant="body2" color="text.secondary" sx={{ mt: .8 }}>{d.note}</Typography>}
        <Stack direction="row" gap={.8} flexWrap="wrap" sx={{ mt: 1.5 }}>{d.careers.map((c: any) => <Chip key={c.id} size="small" component={RLink} to={`/careers/${c.id}`} clickable label={c.name} variant="outlined" />)}</Stack></Box></Reveal></Grid>))}</Grid></Box>}
    <Typography variant="h6" sx={{ mb: 1.5 }}>{cur ? `Careers in ${cur.name}` : "All careers"} <Chip size="small" label={rows.length} sx={{ ml: 1 }} /></Typography>
    <TextField fullWidth label="Search careers" value={q} onChange={(e) => setQ(e.target.value)} sx={{ mb: 2 }} />
    {list.isLoading && <Spinner />}
    <Grid container spacing={2}>{rows.map((c: any, i: number) => (
      <Grid item xs={12} sm={6} md={4} key={c.id}><Reveal delay={(i % 6) * 60}><Tilt><Box component={RLink} to={`/careers/${c.id}`} className="glass hover" sx={{ display: "block", p: 2.5, height: "100%", boxSizing: "border-box" }}>
        <Stack direction="row" gap={.6} sx={{ mb: 1 }}>{(streamsOf[c.id] || []).map((s) => <Box key={s.id} title={s.name} sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: s.color }} />)}</Stack>
        <Typography variant="h6">{c.name}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: .5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{c.description}</Typography></Box></Tilt></Reveal></Grid>))}</Grid>
    {!list.isLoading && !rows.length && <Typography color="text.secondary">No careers match your filters.</Typography>}
  </Wrap>);
}

/* ---------- Mind map (stream -> degree -> career) ---------- */
export function MindMap() {
  const { data } = useQuery({ queryKey: ["pathways"], queryFn: () => api("/pathways") }); const [sid, setSid] = useState("pcm"); const [sel, setSel] = useState<any>(null);
  if (!data) return <Spinner />;
  const s = data.find((x: any) => x.id === sid) || data[0]; const careers: any[] = []; s.degrees.forEach((d: any) => d.careers.forEach((c: any) => { if (!careers.some((x) => x.id === c.id)) careers.push(c); }));
  const st = (bg: string): any => ({ background: bg, color: "#fff", border: "1px solid rgba(255,255,255,.25)", borderRadius: 12, width: 190, fontSize: 13, padding: 8 });
  const mid = Math.max(s.degrees.length * 100, careers.length * 62) / 2;
  const nodes: Node[] = [{ id: "me", position: { x: 0, y: mid }, data: { label: "Student" }, style: { ...st("#7C3AED"), width: 110 } },
    { id: "st", position: { x: 170, y: mid }, data: { label: s.name }, style: st(s.color + "CC") },
    ...s.degrees.map((d: any, i: number) => ({ id: `d${i}`, position: { x: 420, y: i * 100 + 10 }, data: { label: `${d.name} (${d.duration})` }, style: st("#312070") })),
    ...careers.map((c, j) => ({ id: `c${c.id}`, position: { x: 700, y: j * 62 }, data: { label: c.name, c }, style: st("#1F3A5F") }))];
  const edges: Edge[] = [{ id: "e0", source: "me", target: "st", animated: true }, ...s.degrees.map((_: any, i: number) => ({ id: `es${i}`, source: "st", target: `d${i}`, animated: true })),
    ...s.degrees.flatMap((d: any, i: number) => d.careers.map((c: any) => ({ id: `ed${i}-${c.id}`, source: `d${i}`, target: `c${c.id}` })))].map((e: any) => ({ ...e, style: { stroke: s.color, strokeWidth: 1.5 } }));
  return (<Wrap>
    <Title a="Career" b="mind map" sub="Student → stream → degree → career. Click a career to see more." />
    <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 2 }}>{data.map((x: any) => <Chip key={x.id} label={x.name} clickable onClick={() => { setSid(x.id); setSel(null); }}
      sx={{ border: `2px solid ${x.color}`, bgcolor: x.id === sid ? x.color : "transparent", color: x.id === sid ? "#0B0720" : "text.primary" }} />)}</Stack>
    <Box className="glass" sx={{ height: 600, overflow: "hidden" }}><ReactFlow key={sid} nodes={nodes} edges={edges} fitView nodesDraggable={false} onNodeClick={(_, n: any) => setSel(n.data.c || null)}>
      <Background color="#6D4BD8" gap={26} /><Controls showInteractive={false} /></ReactFlow></Box>
    {sel && <Box className="glass page" sx={{ p: 3, mt: 2 }}><Typography variant="h6">{sel.name}</Typography>
      <Button component={RLink} to={`/careers/${sel.id}`} sx={{ ...gradBtn, mt: 1.5 }}>Open career details</Button></Box>}
  </Wrap>);
}

/* ---------- Roadmap ---------- */
export function Roadmap() {
  const qc = useQueryClient(); const [sp] = useSearchParams();
  const careers = useQuery({ queryKey: ["careers", ""], queryFn: () => api("/careers?search=") });
  const recs = useQuery({ queryKey: ["recs"], queryFn: () => api("/recommendations") });
  const maps = useQuery({ queryKey: ["roadmaps"], queryFn: () => api("/roadmaps") });
  const [cid, setCid] = useState(sp.get("career") || ""); const [weeks, setWeeks] = useState(12);
  useEffect(() => { if (!cid && recs.data?.length) setCid(String(recs.data[0].career_id)); }, [recs.data]);
  const gen = useMutation({ mutationFn: () => api("/roadmaps/generate", "POST", { career_id: Number(cid), weeks }), onSuccess: () => qc.invalidateQueries({ queryKey: ["roadmaps"] }) });
  const tick = useMutation({ mutationFn: (v: any) => api(`/roadmaps/${v.rid}/progress`, "PUT", { item_id: v.id, completed: v.completed }), onSuccess: () => qc.invalidateQueries({ queryKey: ["roadmaps"] }) });
  const recIds = new Set((recs.data || []).map((r: any) => r.career_id));
  return (<Wrap>
    <Title a="Learning" b="roadmaps" sub="Pick a career and a length. You get a week-by-week plan you can tick off as you go." />
    <Box className="glass" sx={{ p: 3, mb: 4 }}><Grid container spacing={2} alignItems="center">
      <Grid item xs={12} md={5}><TextField select fullWidth label="Career" value={cid} onChange={(e) => setCid(e.target.value)}>
        {(recs.data || []).map((r: any) => <MenuItem key={`r${r.career_id}`} value={String(r.career_id)}>★ {r.career} ({r.match_score}% match)</MenuItem>)}
        {(careers.data || []).filter((c: any) => !recIds.has(c.id)).map((c: any) => <MenuItem key={c.id} value={String(c.id)}>{c.name}</MenuItem>)}</TextField></Grid>
      <Grid item xs={12} md={4}><ToggleButtonGroup exclusive fullWidth value={weeks} onChange={(_, v) => v && setWeeks(v)} aria-label="Roadmap length">
        <ToggleButton value={12}>12 weeks</ToggleButton><ToggleButton value={24}>24 weeks</ToggleButton><ToggleButton value={52}>1 year</ToggleButton></ToggleButtonGroup></Grid>
      <Grid item xs={12} md={3}><Button fullWidth size="large" sx={gradBtn} disabled={!cid || gen.isPending} onClick={() => gen.mutate()}>{gen.isPending ? "Creating…" : "Create roadmap"}</Button></Grid></Grid>
      <Err e={gen.error} />{!recs.data?.length && <Typography variant="caption" color="text.secondary">Tip: take the assessment to see ★ recommended careers first.</Typography>}</Box>
    {maps.isLoading && <Spinner />}
    {maps.data && !maps.data.length && <Alert severity="info">No roadmap yet. Create your first one above.</Alert>}
    {(maps.data || []).map((r: any) => {
      const next = r.items.find((i: any) => !i.completed); const blocks: any[][] = []; for (let i = 0; i < r.items.length; i += 4) blocks.push(r.items.slice(i, i + 4));
      return (<Reveal key={r.id}><Box className="glass" sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" flexWrap="wrap" gap={1}><Typography variant="h5">{r.career} <Chip size="small" label={r.weeks === 52 ? "1 year" : `${r.weeks} weeks`} sx={{ ml: 1 }} /></Typography>
          <Typography className="gtext" variant="h5">{r.progress}%</Typography></Stack>
        <Typography color="text.secondary" sx={{ mb: 1 }}>{r.goal}</Typography>
        <LinearProgress variant="determinate" value={r.progress} sx={{ height: 8, borderRadius: 4, mb: 2, "& .MuiLinearProgress-bar": { background: "linear-gradient(90deg,#7C3AED,#0EA5E9)" } }} />
        {next ? <Alert severity="info" icon={<Icon name="spark" size={20} />} sx={{ mb: 2 }}>Next up: Week {next.week}, {next.topic}</Alert> : <Alert severity="success" sx={{ mb: 2 }}>Roadmap complete. Well done!</Alert>}
        {blocks.map((b, bi) => (<Accordion key={bi} defaultExpanded={b.some((i) => i.id === next?.id)} disableGutters sx={{ mb: 1 }}>
          <AccordionSummary expandIcon={<span>⌄</span>}><Typography fontWeight={700}>Weeks {b[0].week}–{b[b.length - 1].week}</Typography>
            <Typography color="text.secondary" sx={{ ml: 2 }}>{b.filter((i) => i.completed).length}/{b.length} done</Typography></AccordionSummary>
          <AccordionDetails>{b.map((i) => (<Box key={i.id} sx={{ mb: 1.5 }}>
            <FormControlLabel control={<Checkbox checked={i.completed} onChange={(e) => tick.mutate({ rid: r.id, id: i.id, completed: e.target.checked })} />} label={<b>Week {i.week}: {i.topic}</b>} />
            <Box sx={{ ml: 4, color: "text.secondary", fontSize: 14 }}><div>Practice: {i.practice}</div><div>Resources: {i.resources}</div>
              {i.project && <div>Project: {i.project}</div>}<div>Outcome: {i.expected_outcome}</div></Box></Box>))}</AccordionDetails></Accordion>))}
      </Box></Reveal>);
    })}
    <Typography variant="caption" color="text.secondary">Roadmaps are template-based from the career's skill list. Ask a teacher or counsellor to confirm good resources.</Typography>
  </Wrap>);
}

/* ---------- Assistant ---------- */
const SUGGEST = ["What careers can I pursue with PCM?", "What should I study to become a data scientist?", "What is the difference between AI engineering and data science?",
  "Which skills should I learn?", "What degree options are available for a doctor?", "What should I do after class 10?"];
const MODE: Record<string, string> = { tools: "Answered from the career database", llm: "AI-written from these sources (check important details)", extractive: "Passages from my documents", no_sources: "" };
function AssistantChat() {
  const [msgs, setMsgs] = useState<any[]>([]); const [text, setText] = useState(""); const [sid, setSid] = useState<number>(); const end = useRef<HTMLDivElement>(null);
  const send = useMutation({ mutationFn: (m: string) => api("/assistant/chat", "POST", { message: m, session_id: sid }),
    onMutate: (m: string) => { setMsgs((x) => [...x, { r: "me", t: m }]); setText(""); },
    onSuccess: (d: any) => { setSid(d.session_id); setMsgs((x) => [...x, { r: "ai", t: d.answer, s: d.sources, mode: d.mode }]); },
    onError: (e: any) => setMsgs((x) => [...x, { r: "ai", t: `Sorry, something went wrong: ${e.message}`, s: [] }]) });
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs, send.isPending]);
  const ask = (m: string) => { if (m.trim() && !send.isPending) send.mutate(m.trim()); };
  return (<>
    <Typography color="text.secondary" sx={{ mb: 2 }}>Ask about streams, degrees, exams and skills. Answers come from the career database and documents, with sources. If it doesn't know, it says so.</Typography>
    <Box className="glass" sx={{ p: { xs: 2, md: 3 }, minHeight: 360 }}>
      {!msgs.length && <><Typography color="text.secondary" sx={{ mb: 2 }}>Try one of these:</Typography>
        <Stack direction="row" gap={1} flexWrap="wrap">{SUGGEST.map((s) => <Chip key={s} label={s} clickable onClick={() => ask(s)} variant="outlined" sx={{ height: "auto", py: .8, "& .MuiChip-label": { whiteSpace: "normal" } }} />)}</Stack></>}
      <Stack spacing={2} aria-live="polite">{msgs.map((m, i) => (<Box key={i} className="page" sx={{ alignSelf: m.r === "me" ? "flex-end" : "flex-start", maxWidth: "88%", ml: m.r === "me" ? "auto" : 0 }}>
        <Box className="bubble" sx={{ p: 2, borderRadius: 3, background: m.r === "me" ? "linear-gradient(90deg,#7C3AED,#C026D3)" : "var(--glass)", color: m.r === "me" ? "#fff" : "text.primary", border: m.r === "me" ? "none" : "1px solid var(--line)" }}>{m.t}</Box>
        {m.r === "ai" && m.mode && MODE[m.mode] && <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: .5 }}>{MODE[m.mode]}{m.s?.length ? `: ${[...new Set(m.s.map((x: any) => x.title))].join(", ")}` : ""}</Typography>}
      </Box>))}
        {send.isPending && <Box className="dots" role="status" aria-label="Assistant is typing"><span /><span /><span /></Box>}</Stack>
      <div ref={end} /></Box>
    <Stack direction="row" spacing={1} sx={{ mt: 2 }} component="form" onSubmit={(e) => { e.preventDefault(); ask(text); }}>
      <TextField fullWidth value={text} onChange={(e) => setText(e.target.value)} label="Ask about careers, degrees, exams…" />
      <Button type="submit" sx={{ ...gradBtn, minWidth: 56 }} disabled={!text.trim() || send.isPending} aria-label="Send"><Icon name="send" size={20} /></Button></Stack>
  </>);
}


function PlanTab() {
  const nav = useNavigate(); const [goal, setGoal] = useState("I want to become an AI engineer");
  const plan = useMutation({ mutationFn: () => api("/agent/plan", "POST", { goal }) });
  const save = useMutation({ mutationFn: (r: any) => api("/roadmaps/generate", "POST", { career_id: r.career_id, weeks: r.weeks }), onSuccess: () => nav("/roadmap") });
  const d = plan.data;
  return (<>
    <Typography color="text.secondary" sx={{ mb: 2 }}>Tell me a career goal. The planner reads your profile and assessment, looks up the career and courses, checks your skill gaps and drafts a roadmap. Nothing is saved until you choose.</Typography>
    <Stack direction="row" spacing={1} component="form" onSubmit={(e) => { e.preventDefault(); if (goal.trim()) plan.mutate(); }}>
      <TextField fullWidth value={goal} onChange={(e) => setGoal(e.target.value)} label="Your goal" />
      <Button type="submit" sx={{ ...gradBtn, minWidth: 150 }} disabled={!goal.trim() || plan.isPending}>Make my plan</Button></Stack>
    {plan.isPending && <Spinner label="Planning…" />}<Err e={plan.error} />
    {d && <Box className="page" sx={{ mt: 3 }}>
      <Typography variant="overline" color="secondary">{d.mode === "llm" ? "Planned by an AI model using these tools" : "Planned by rules using these tools"}</Typography>
      <Stack spacing={.5} sx={{ mb: 2 }}>{d.steps.map((s: any, i: number) => <Typography key={i} variant="body2" color="text.secondary">✓ <b>{s.tool}</b>: {s.summary}</Typography>)}</Stack>
      <Box className="glass bubble" sx={{ p: 3, mb: 2 }}>{d.answer}</Box>
      {d.roadmap_preview && <Box className="glass" sx={{ p: 3 }}><Typography variant="h6">{d.roadmap_preview.weeks}-week roadmap preview: {d.roadmap_preview.career}</Typography>
        {d.roadmap_preview.items.map((i: any) => <Typography key={i.week} variant="body2" color="text.secondary">Week {i.week}: {i.topic}</Typography>)}
        <Button sx={{ ...gradBtn, mt: 2 }} disabled={save.isPending} onClick={() => save.mutate(d.roadmap_preview)}>Save this roadmap</Button><Err e={save.error} /></Box>}
    </Box>}
  </>);
}

export function Assistant() {
  const [tab, setTab] = useState(0);
  return (<Wrap w="md"><Title a="Career" b="assistant" />
    <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }} aria-label="Assistant mode"><Tab label="Ask a question" /><Tab label="Plan my path" /></Tabs>
    {tab === 0 ? <AssistantChat /> : <PlanTab />}</Wrap>);
}

/* ---------- Profile ---------- */
const SUBJ = ["Mathematics", "Science", "English", "Social Science", "Commerce"];
const pct = z.string().refine((v) => v === "" || (!isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 100), "Enter 0 to 100");
const schema = z.object({ name: z.string().max(60), grade: z.coerce.number().int().min(5, "Grade 5 to 16").max(16, "Grade 5 to 16"), board: z.string(), state: z.string().max(60),
  m0: pct, m1: pct, m2: pct, m3: pct, m4: pct, strengths: z.string(), interests: z.string() });
export function Profile() {
  const { data } = useQuery({ queryKey: ["profile"], queryFn: () => api("/profile") });
  const { register, handleSubmit, formState: { errors } } = useForm<any>({ resolver: zodResolver(schema), values: data && {
    name: data.name || "", grade: data.grade ?? 10, board: data.board || "CBSE", state: data.state || "", ...Object.fromEntries(SUBJ.map((s, i) => [`m${i}`, data.marks?.[s] != null ? String(data.marks[s]) : ""])),
    strengths: (data.strengths || []).join(", "), interests: (data.interests || []).join(", ") } });
  const list = (v: string) => v.split(",").map((s) => s.trim()).filter(Boolean);
  const save = useMutation({ mutationFn: (v: any) => api("/profile", "PUT", { name: v.name, grade: v.grade, board: v.board, state: v.state,
    marks: Object.fromEntries(SUBJ.map((s, i) => [s, v[`m${i}`]]).filter(([, x]) => x !== "").map(([s, x]) => [s, Number(x)])), strengths: list(v.strengths), interests: list(v.interests) }) });
  if (!data) return <Spinner />;
  return (<Wrap w="sm"><Box className="glass" sx={{ p: 4 }}><Stack spacing={2} component="form" onSubmit={handleSubmit((v) => save.mutate(v))}>
    <Typography variant="h4">Your <span className="gtext">profile</span></Typography>
    <Typography color="text.secondary" variant="body2">Marks and skills help improve your career matches. Nothing here is shared outside your teachers/parents linked by an admin.</Typography>
    <TextField label="Name" {...register("name")} /><TextField label="Grade" type="number" {...register("grade")} error={!!errors.grade} helperText={errors.grade?.message as string} />
    <TextField select label="Board" defaultValue={data.board || "CBSE"} {...register("board")}>{["Karnataka", "Tamil Nadu", "CBSE", "ICSE", "IGCSE"].map((b) => <MenuItem key={b} value={b}>{b}</MenuItem>)}</TextField>
    <TextField label="State" {...register("state")} />
    <Typography variant="overline" color="secondary">Marks (%), leave blank if not applicable</Typography>
    <Grid container spacing={1.5}>{SUBJ.map((s, i) => <Grid item xs={6} key={s}><TextField fullWidth label={s} {...register(`m${i}`)} error={!!errors[`m${i}`]} helperText={errors[`m${i}`]?.message as string} inputProps={{ inputMode: "decimal" }} /></Grid>)}</Grid>
    <TextField label="Skills you already have (comma separated)" {...register("strengths")} /><TextField label="Interests (comma separated)" {...register("interests")} />
    <Err e={save.error} />{save.isSuccess && <Alert severity="success">Saved. Next: take the assessment.</Alert>}
    <Button type="submit" size="large" sx={gradBtn} disabled={save.isPending}>Save profile</Button></Stack></Box></Wrap>);
}

/* ---------- Parent / Teacher ---------- */
export function Staff({ kind }: { kind: "parent" | "teacher" }) {
  const { data, error } = useQuery({ queryKey: [kind], queryFn: () => api(kind === "parent" ? "/parent/children" : "/teacher/students") });
  if (error) return <Wrap><Err e={error} /></Wrap>; if (!data) return <Spinner />;
  return (<Wrap><Title a={kind === "parent" ? "Your" : "Your"} b={kind === "parent" ? "children" : "students"} />
    {!data.length && <Alert severity="info">No students linked yet. An administrator links accounts.</Alert>}
    <Grid container spacing={2}>{data.map((s: any, i: number) => <Grid item xs={12} md={6} key={i}><Reveal delay={i * 80}><Box className="glass" sx={{ p: 3 }}>
      <Typography variant="h6">{s.name} (Grade {s.grade ?? "—"})</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Top career: {s.top_career ?? "—"} {s.career_match != null && `(${s.career_match}%)`} · Roadmap {s.roadmap_progress}%</Typography>
      <Typography variant="body2">Strengths: {s.strengths.join(", ") || "—"}</Typography><Typography variant="body2">Skill gaps: {s.skill_gaps.join(", ") || "—"}</Typography></Box></Reveal></Grid>)}</Grid></Wrap>);
}
