import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Login from './pages/Login.jsx';
import Classifier from './pages/Classifier.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Overview from './pages/Overview.jsx';
import AssessmentDetail from './pages/AssessmentDetail.jsx';
import SelfAssessment from './pages/SelfAssessment.jsx';
import Declaration from './pages/Declaration.jsx';
import TechDoc from './pages/TechDoc.jsx';
import Sbom from './pages/Sbom.jsx';
import SupportPeriod from './pages/SupportPeriod.jsx';
import Package from './pages/Package.jsx';
import Register from './pages/Register.jsx';
import CvdPolicy from './pages/CvdPolicy.jsx';
import Settings from './pages/Settings.jsx';

function Nav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <nav className="nav">
      {/* Leave the SPA and go back up to the ComplyPS site. The tool is served
          at /complyps-cra/app/, so ../../ is the ComplyPS home and ../ is the
          CRA solution page. */}
      <a href="../../" className="brand" title="Back to ComplyPS">
        Comply<span>PS</span>
      </a>
      <a href="../" className="muted small" title="CRA solution page">← CRA</a>
      {user && <NavLink to="/overview">Overview</NavLink>}
      {user && <NavLink to="/assessments">Projects</NavLink>}
      <NavLink to="/" end>New product</NavLink>
      {user && <NavLink to="/register">Register</NavLink>}
      {user && <NavLink to="/cvd-policy">CVD policy</NavLink>}
      <div className="spacer" />
      {user ? (
        <>
          <span className="muted small">{user.name}</span>
          <button className="btn secondary" onClick={() => { logout(); navigate('/'); }}>
            Log out
          </button>
        </>
      ) : (
        <NavLink to="/login">Log in</NavLink>
      )}
    </nav>
  );
}

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="center spinner">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <>
      <Nav />
      <Routes>
        <Route path="/" element={<Classifier />} />
        <Route path="/login" element={<Login />} />
        <Route path="/settings" element={<Settings />} />
        <Route
          path="/overview"
          element={<RequireAuth><Overview /></RequireAuth>}
        />
        <Route
          path="/assessments"
          element={<RequireAuth><Dashboard /></RequireAuth>}
        />
        <Route
          path="/register"
          element={<RequireAuth><Register /></RequireAuth>}
        />
        <Route
          path="/cvd-policy"
          element={<RequireAuth><CvdPolicy /></RequireAuth>}
        />
        <Route
          path="/assessments/:id"
          element={<RequireAuth><AssessmentDetail /></RequireAuth>}
        />
        <Route
          path="/assessments/:id/self-assessment"
          element={<RequireAuth><SelfAssessment /></RequireAuth>}
        />
        <Route
          path="/assessments/:id/declaration"
          element={<RequireAuth><Declaration /></RequireAuth>}
        />
        <Route
          path="/assessments/:id/techdoc"
          element={<RequireAuth><TechDoc /></RequireAuth>}
        />
        <Route
          path="/assessments/:id/sbom"
          element={<RequireAuth><Sbom /></RequireAuth>}
        />
        <Route
          path="/assessments/:id/support"
          element={<RequireAuth><SupportPeriod /></RequireAuth>}
        />
        <Route
          path="/assessments/:id/package"
          element={<RequireAuth><Package /></RequireAuth>}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
