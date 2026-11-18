import { useState } from "react";
import { Link as RLink, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { AppBar, Box, Button, Drawer, IconButton, List, ListItemButton, Toolbar, Typography } from "@mui/material";
import { auth } from "./api";
import { gradBtn } from "./theme";
import { useMode } from "./mode";
import { Icon } from "./ui";
import Landing from "./Landing";
import { AssessmentPreview, AssistantPreview, CareersPreview, RoadmapPreview } from "./Preview";
import { Login, Dashboard, Assessment, AssessmentResults, Careers, Roadmap, Assistant, Profile, MindMap, Staff } from "./pages";

const STUDENT: [string, string][] = [["/", "Home"], ["/assessment", "Assessment"], ["/careers", "Careers & Pathways"], ["/roadmap", "Roadmap"], ["/assistant", "Assistant"], ["/mindmap", "Mind map"], ["/profile", "Profile"]];
const GUEST: [string, string][] = [["/", "Home"], ["/assessment", "Assessment"], ["/careers", "Careers & Pathways"], ["/roadmap", "Roadmap"], ["/assistant", "Assistant"]];
const navFor = (loggedIn: boolean, role: string): [string, string][] => (!loggedIn ? GUEST : role === "student" ? STUDENT : [["/", "Home"]]);

export default function App() {
  const nav = useNavigate(); const loc = useLocation(); const [open, setOpen] = useState(false); const { mode, toggle } = useMode();
  const loggedIn = !!auth.get(); const role = auth.role(); const items = navFor(loggedIn, role);
  const guard = (el: JSX.Element) => (loggedIn ? el : <Navigate to="/login" state={{ next: loc.pathname + loc.search }} replace />);
  const out = () => { auth.clear(); setOpen(false); nav("/"); };
  const homeEl = !loggedIn ? <Landing /> : role === "student" ? <Dashboard /> : <Staff kind={role === "parent" ? "parent" : "teacher"} />;
  const link = (to: string, label: string) => (
    <NavLink key={to} to={to} end={to === "/"} onClick={() => setOpen(false)} style={({ isActive }) => ({ padding: "8px 14px", borderRadius: 999, fontWeight: 600, fontSize: 14,
      color: isActive ? "var(--tx)" : "var(--mut)", background: isActive ? "var(--navact)" : "transparent", whiteSpace: "nowrap" })}>{label}</NavLink>);
  return (
    <>
      <AppBar position="sticky" elevation={0} sx={{ bgcolor: "var(--bar)", color: "text.primary", backdropFilter: "blur(16px)", borderBottom: "1px solid var(--line)", backgroundImage: "none", borderRadius: 0 }}>
        <Toolbar sx={{ gap: 1, maxWidth: 1300, width: "100%", mx: "auto" }}>
          <Box component={RLink} to="/" sx={{ display: "flex", alignItems: "center", gap: 1, mr: 2, color: "primary.main" }}>
            <Icon name="cap" size={30} /><Typography variant="h6" sx={{ color: "text.primary" }}>CareerPath <span className="gtext">AI</span></Typography></Box>
          <Box sx={{ display: { xs: "none", lg: "flex" }, gap: .5, flexGrow: 1 }}>{items.map(([t, l]) => link(t, l))}</Box>
          <Box sx={{ flexGrow: 1, display: { lg: "none" } }} />
          <IconButton onClick={toggle} aria-label={`Switch to ${mode === "dark" ? "light" : "dark"} theme`} title={`${mode === "dark" ? "Light" : "Dark"} theme`} sx={{ color: "text.primary", border: "1px solid var(--line)" }}>
            <Icon name={mode === "dark" ? "sun" : "moon"} size={20} /></IconButton>
          {loggedIn
            ? <Button onClick={out} variant="outlined" color="inherit" sx={{ borderColor: "var(--line)", display: { xs: "none", sm: "inline-flex" } }}>Sign out</Button>
            : <><Button component={RLink} to="/register" color="inherit" sx={{ display: { xs: "none", sm: "inline-flex" } }}>Create account</Button>
                <Button component={RLink} to="/login" sx={{ ...gradBtn, px: 3 }}>Login</Button></>}
          <IconButton aria-label="Open menu" onClick={() => setOpen(true)} sx={{ display: { lg: "none" }, color: "text.primary" }}><Icon name="menu" /></IconButton>
        </Toolbar>
      </AppBar>
      <Drawer anchor="right" open={open} onClose={() => setOpen(false)} PaperProps={{ sx: { width: 250, bgcolor: "var(--drawer)", borderRadius: 0 } }}>
        <List sx={{ display: "grid", gap: .5, p: 2 }}>
          {items.map(([t, l]) => <ListItemButton key={t} sx={{ p: 0 }}>{link(t, l)}</ListItemButton>)}
          {loggedIn ? <Button onClick={out} color="inherit">Sign out</Button> : <Button component={RLink} to="/register" onClick={() => setOpen(false)} color="inherit">Create account</Button>}
        </List></Drawer>
      <Box key={loc.pathname} className="page" component="main">
        <Routes>
          <Route path="/" element={homeEl} />
          <Route path="/login" element={loggedIn ? <Navigate to="/" replace /> : <Login />} />
          <Route path="/register" element={loggedIn ? <Navigate to="/" replace /> : <Login register />} />
          <Route path="/profile" element={guard(<Profile />)} /><Route path="/onboarding" element={guard(<Profile />)} />
          <Route path="/assessment" element={loggedIn ? <Assessment /> : <AssessmentPreview />} /><Route path="/assessment/results" element={guard(<AssessmentResults />)} />
          <Route path="/careers" element={loggedIn ? <Careers /> : <CareersPreview />} /><Route path="/careers/:id" element={guard(<Careers />)} />
          <Route path="/mindmap" element={guard(<MindMap />)} />
          <Route path="/roadmap" element={loggedIn ? <Roadmap /> : <RoadmapPreview />} /><Route path="/progress" element={loggedIn ? <Roadmap /> : <RoadmapPreview />} />
          <Route path="/assistant" element={loggedIn ? <Assistant /> : <AssistantPreview />} />
          <Route path="/pathways" element={<Navigate to={"/careers" + loc.search} replace />} />
          <Route path="/dashboard" element={<Navigate to="/" replace />} /><Route path="/parent" element={<Navigate to="/" replace />} /><Route path="/teacher" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Box>
       </>);
}
