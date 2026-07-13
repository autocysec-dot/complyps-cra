import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';

// In-app user guide, styled as a docs page: sticky table-of-contents with
// scroll-spy on the left, readable content on the right. Login-only: the
// content is fetched from the backend at view time and never shipped in this
// static build, so it can't be reached without a valid session.
export default function Help() {
  const [state, setState] = useState({ loading: true, error: '', html: '', updatedAt: '' });
  const [toc, setToc] = useState([]);
  const [active, setActive] = useState('');
  const contentRef = useRef(null);

  useEffect(() => {
    let alive = true;
    api.helpUserGuide()
      .then((d) => { if (alive) setState({ loading: false, error: '', html: d.html, updatedAt: d.updatedAt }); })
      .catch((e) => { if (alive) setState({ loading: false, error: e.message, html: '', updatedAt: '' }); });
    return () => { alive = false; };
  }, []);

  // Build the TOC from the rendered <h2> sections and highlight the last one
  // scrolled past (deterministic — reliable in both scroll directions).
  useEffect(() => {
    if (!state.html || !contentRef.current) return;
    const heads = Array.from(contentRef.current.querySelectorAll('h2')).filter((h) => h.id);
    setToc(heads.map((h) => ({ id: h.id, text: h.textContent })));
    const onScroll = () => {
      // At the very bottom, force the last section active (short pages can't
      // scroll the final headings up to the trigger line).
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
        setActive(heads[heads.length - 1]?.id || '');
        return;
      }
      let current = heads[0]?.id || '';
      for (const h of heads) {
        if (h.getBoundingClientRect().top - 100 <= 0) current = h.id;
        else break;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [state.html]);

  function jump(e, id) {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 72, behavior: 'smooth' });
      setActive(id);
    }
  }

  return (
    <div className="container wide">
      <div className="help-hero">
        <h1>Help &amp; user guide</h1>
        <p className="muted">Everything you need to use ComplyCRA, step by step.</p>
      </div>

      {state.loading && <div className="center spinner">Loading…</div>}
      {state.error && <div className="error">{state.error}</div>}

      {!state.loading && !state.error && (
        <div className="help-layout">
          <aside className="help-toc">
            <div className="help-toc-title">On this page</div>
            <nav>
              {toc.map((t) => (
                <a key={t.id} href={`#${t.id}`} className={active === t.id ? 'active' : ''} onClick={(e) => jump(e, t.id)}>
                  {t.text}
                </a>
              ))}
            </nav>
            {state.updatedAt && <div className="help-toc-meta">Updated {new Date(state.updatedAt).toLocaleDateString()}</div>}
          </aside>

          <div className="help-main">
            <article className="help-content card" ref={contentRef} dangerouslySetInnerHTML={{ __html: state.html }} />
            <div className="help-footer">
              Still stuck? Email <a href="mailto:complyps@outlook.com">complyps@outlook.com</a> and we'll help.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
