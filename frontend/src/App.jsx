import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Login from './pages/Login.jsx';
import Classifier from './pages/Classifier.jsx';
import Dashboard from './pages/Dashboard.jsx';
import AssessmentDetail from './pages/AssessmentDetail.jsx';
import SelfAssessment from './pages/SelfAssessment.jsx';
import Declaration from './pages/Declaration.jsx';
import TechDoc from './pages/TechDoc.jsx';
import Register from './pages/Register.jsx';
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
      <NavLink to="/" end>Classify</NavLink>
      {user && <NavLink to="/assessments">My assessments</NavLink>}
      {user && <NavLink to="/register">Register</NavLink>}
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
          path="/assessments"
          element={<RequireAuth><Dashboard /></RequireAuth>}
        />
        <Route
          path="/register"
          element={<RequireAuth><Register /></RequireAuth>}
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
