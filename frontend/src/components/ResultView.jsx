// Renders a classification result returned by the backend.
export default function ResultView({ result }) {
  if (!result) return null;

  if (!result.inScope) {
    return (
      <div className="card">
        <span className="badge out">Out of scope</span>
        <h2 style={{ marginTop: 12 }}>Likely not covered by the CRA</h2>
        <p>{result.reason}</p>
        {result.matchedExclusions && (
          <ul className="clean">
            {result.matchedExclusions.map((m, i) => <li key={i}>{m}</li>)}
          </ul>
        )}
        {result.notes?.length > 0 && (
          <ul className="clean muted small">
            {result.notes.map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        )}
        <Disclaimer text={result.disclaimer} />
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <span className={`badge ${result.tier}`}>{result.tierLabel}</span>
        {result.matchedCategories?.length > 0 && (
          <>
            <h2 style={{ marginTop: 16 }}>Matched categories</h2>
            <ul className="clean">
              {result.matchedCategories.map((c) => <li key={c.id}>{c.label}</li>)}
            </ul>
          </>
        )}
        {result.matchedCategories?.length === 0 && (
          <p className="muted" style={{ marginTop: 12 }}>
            No Annex III / IV category matched — treated as a default product with digital elements.
          </p>
        )}
      </div>

      <div className="card">
        <h2>Available conformity-assessment routes</h2>
        <ul className="clean">
          {result.conformityRoutes.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
        {result.notes?.length > 0 && (
          <ul className="clean muted small">
            {result.notes.map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        )}
      </div>

      <div className="card">
        <h2>Your key obligations</h2>
        <ul className="clean">
          {result.obligations.map((o, i) => <li key={i}>{o}</li>)}
        </ul>
      </div>

      {result.keyDates && (
        <div className="card">
          <h2>Key dates</h2>
          <div className="dates">
            <div className="date-pill"><strong>Entered into force</strong>{result.keyDates.entryIntoForce}</div>
            <div className="date-pill"><strong>Reporting obligations apply</strong>{result.keyDates.reportingObligationsApply}</div>
            <div className="date-pill"><strong>Main obligations apply</strong>{result.keyDates.mainObligationsApply}</div>
          </div>
        </div>
      )}

      <Disclaimer text={result.disclaimer} />
    </div>
  );
}

function Disclaimer({ text }) {
  if (!text) return null;
  return <p className="muted small" style={{ marginTop: 12 }}>⚠️ {text}</p>;
}
