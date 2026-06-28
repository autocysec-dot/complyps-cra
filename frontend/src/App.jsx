import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Login from './pages/Login.jsx';
import Classifier from './pages/Classifier.jsx';
import Dashboard from './pages/Dashboard.jsx';
import AssessmentDetail from './pages/AssessmentDetail.jsx';
import SelfAssessment from './pages/SelfAssessment.jsx';
import Settings from './pages/Settings.jsx';

function Nav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <nav className="nav">
      <div className="brand">CRA<span>·</span>Compliance</div>
      <NavLink to="/" end>Classify</NavLink>
      {user && <NavLink to="/assessments">My assessments</NavLink>}
      <NavLink to="/settings">Settings</NavLink>
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
          path="/assessments/:id"
          element={<RequireAuth><AssessmentDetail /></RequireAuth>}
        />
        <Route
          path="/assessments/:id/self-assessment"
          element={<RequireAuth><SelfAssessment /></RequireAuth>}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
