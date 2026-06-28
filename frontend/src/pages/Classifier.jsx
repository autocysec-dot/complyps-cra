import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import ResultView from '../components/ResultView.jsx';

export default function Classifier() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [questionnaire, setQuestionnaire] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [productName, setProductName] = useState('');
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    api.questionnaire().then(setQuestionnaire).catch((e) => setLoadError(e.message));
  }, []);

  if (loadError) {
    return (
      <div className="container">
        <div className="card">
          <h1>Can't load the questionnaire</h1>
          <div className="error">{loadError}</div>
          <p className="muted small">
            Make sure the backend is running on your laptop, then check the URL on the{' '}
            <a href="#/settings">Settings</a> page.
          </p>
        </div>
      </div>
    );
  }
  if (!questionnaire) return <div className="center spinner">Loading questionnaire…</div>;

  const steps = questionnaire.steps;
  const current = steps[step];
  const isLast = step === steps.length - 1;

  function setSingle(qid, value) {
    setAnswers({ ...answers, [qid]: value });
  }
  function toggleMulti(qid, value) {
    const arr = answers[qid] || [];
    const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
    setAnswers({ ...answers, [qid]: next });
  }

  async function next() {
    if (isLast) {
      setBusy(true);
      try {
        const { result } = await api.classify(answers);
        setResult(result);
      } catch (e) {
        setLoadError(e.message);
      } finally {
        setBusy(false);
      }
    } else {
      setStep(step + 1);
    }
  }

  function restart() {
    setAnswers({});
    setResult(null);
    setStep(0);
    setProductName('');
    setSaveMsg('');
  }

  async function save() {
    setSaveMsg('');
    if (!productName.trim()) { setSaveMsg('Enter a product name first.'); return; }
    try {
      const { assessment } = await api.saveAssessment({ productName, answers });
      navigate(`/assessments/${assessment.id}`);
    } catch (e) {
      setSaveMsg(e.message);
    }
  }

  if (result) {
    return (
      <div className="container">
        <h1>Classification result</h1>
        <ResultView result={result} />
        <div className="card">
          <h2>Save this assessment</h2>
          {user ? (
            <>
              <label>Product name</label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g. Acme Router X1"
              />
              {saveMsg && <div className="error">{saveMsg}</div>}
              <div className="btn-row">
                <button className="btn" onClick={save}>Save assessment</button>
                <button className="btn secondary" onClick={restart}>Start over</button>
              </div>
            </>
          ) : (
            <>
              <p className="muted">Log in to save this assessment and revisit it later.</p>
              <div className="btn-row">
                <button className="btn" onClick={() => navigate('/login')}>Log in to save</button>
                <button className="btn secondary" onClick={restart}>Start over</button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>CRA scope &amp; risk classifier</h1>
      <p className="muted">
        Answer a few questions to see whether your product falls under the EU Cyber Resilience Act,
        its risk class, and what that means for you.
      </p>

      <div className="progress">
        {steps.map((s, i) => <div key={s.id} className={`dot ${i <= step ? 'done' : ''}`} />)}
      </div>

      <div className="card">
        <h2>{current.title}</h2>
        {current.questions.map((q) => (
          <div key={q.id} style={{ marginBottom: 20 }}>
            <label>{q.label}</label>
            {q.help && <div className="help">{q.help}</div>}
            {q.options.map((opt) => {
              const selected =
                q.type === 'multi'
                  ? (answers[q.id] || []).includes(opt.value)
                  : answers[q.id] === opt.value;
              return (
                <label key={opt.value} className={`option ${selected ? 'selected' : ''}`}>
                  <input
                    type={q.type === 'multi' ? 'checkbox' : 'radio'}
                    name={q.id}
                    checked={selected}
                    onChange={() =>
                      q.type === 'multi' ? toggleMulti(q.id, opt.value) : setSingle(q.id, opt.value)
                    }
                  />
                  <span className="opt-label">{opt.label}</span>
                </label>
              );
            })}
          </div>
        ))}

        <div className="btn-row">
          {step > 0 && (
            <button className="btn secondary" onClick={() => setStep(step - 1)}>Back</button>
          )}
          <button className="btn" onClick={next} disabled={busy}>
            {busy ? 'Calculating…' : isLast ? 'See result' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
