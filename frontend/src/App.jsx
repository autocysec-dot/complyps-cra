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
import ItemDetail from './pages/ItemDetail.jsx';
import CvdPolicy from './pages/CvdPolicy.jsx';
import Settings from './pages/Settings.jsx';
import RequestAccess from './pages/RequestAccess.jsx';
import Admin from './pages/Admin.jsx';
import Account from './pages/Account.jsx';
import GapAssessment from './pages/GapAssessment.jsx';
import Demo from './pages/Demo.jsx';

function Nav() {
  const { user, logout, isAdmin, isDemo } = useAuth();
  const navigate = useNavigate();
  return (
    <nav className="nav">
      {/* Leave the SPA and go back up to the ComplyPS site. The tool is served
          at /complyps-cra/app/, so ../../ is the ComplyPS home and ../ is the
          CRA solution page. */}
      <a href="../../" className="muted small" title="Back to ComplyPS">← ComplyPS</a>
      <span className="muted small" style={{ opacity: 0.4 }}>/</span>
      <a href="../" className="brand" title="ComplyCRA">ComplyCRA</a>
      {user && <NavLink to="/overview">Overview</NavLink>}
      {user && <NavLink to="/assessments">Projects</NavLink>}
      <NavLink to="/" end>New product</NavLink>
      {user && <NavLink to="/register">Register</NavLink>}
      {user && <NavLink to="/cvd-policy">CVD policy</NavLink>}
      {isAdmin && <NavLink to="/admin">Administration</NavLink>}
      <div className="spacer" />
      {user ? (
        <>
          {isDemo && <span className="badge" style={{ background: 'var(--amber)', color: '#1e293b' }}>demo · read-only</span>}
          <NavLink to="/account" className="muted small" title="Account & password">{user.name}</NavLink>
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

function DemoBanner() {
  const { isDemo } = useAuth();
  if (!isDemo) return null;
  return (
    <div style={{ background: '#fef3c7', color: '#92400e', textAlign: 'center', padding: '8px 12px', fontSize: 14 }}>
      You're exploring a <strong>read-only demo</strong> with a sample project. Changes are disabled.{' '}
      <a href="#/request-access" style={{ color: '#92400e', fontWeight: 600, textDecoration: 'underline' }}>Request your own account →</a>
    </div>
  );
}

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="center spinner">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RequireAdmin({ children }) {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <div className="center spinner">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/overview" replace />;
  return children;
}

export default function App() {
  return (
    <>
      <Nav />
      <DemoBanner />
      <Routes>
        <Route path="/" element={<Classifier />} />
        <Route path="/login" element={<Login />} />
        <Route path="/request-access" element={<RequestAccess />} />
        <Route path="/demo" element={<Demo />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/account" element={<RequireAuth><Account /></RequireAuth>} />
        <Route path="/admin" element={<RequireAdmin><Admin /></RequireAdmin>} />
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
          path="/register/vulnerabilities/:id"
          element={<RequireAuth><ItemDetail kind="vulnerability" /></RequireAuth>}
        />
        <Route
          path="/register/incidents/:id"
          element={<RequireAuth><ItemDetail kind="incident" /></RequireAuth>}
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
        <Route
          path="/assessments/:id/gap"
          element={<RequireAuth><GapAssessment /></RequireAuth>}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
