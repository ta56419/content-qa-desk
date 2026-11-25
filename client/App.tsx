import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { Draft, Report, ReportSummary, Rule } from '../shared/types';
import { sampleDraft } from '../shared/sample';
import { request } from './api';

const rules: { id: Rule; label: string }[] = [
  { id: 'title', label: 'Title' },
  { id: 'meta', label: 'Meta description' },
  { id: 'h1', label: 'Main heading' },
  { id: 'alt', label: 'Image alt' },
  { id: 'link', label: 'Links' },
];
const blank: Draft = { title: '', metaDescription: '', html: '' };
const dateLabel = (date: string) =>
  new Date(date).toLocaleString('en-GB', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

export function App() {
  const [draft, setDraft] = useState<Draft>(sampleDraft);
  const [baseline, setBaseline] = useState<Draft>(sampleDraft);
  const [report, setReport] = useState<Report | null>(null);
  const [recent, setRecent] = useState<ReportSummary[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [historyError, setHistoryError] = useState('');
  const [historyLoading, setHistoryLoading] = useState(true);
  const [notice, setNotice] = useState(
    'Sample draft loaded. It has three deliberate findings.',
  );
  const unsaved =
    draft.title !== baseline.title ||
    draft.metaDescription !== baseline.metaDescription ||
    draft.html !== baseline.html;
  const changed = report !== null && unsaved;

  useEffect(() => {
    let active = true;
    request<ReportSummary[]>('')
      .then((items) => {
        if (active) setRecent(items);
      })
      .catch((err) => {
        if (active) setHistoryError((err as Error).message);
      })
      .finally(() => {
        if (active) setHistoryLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function refreshHistory() {
    setHistoryLoading(true);
    setHistoryError('');
    try {
      setRecent(await request<ReportSummary[]>(''));
    } catch (err) {
      setHistoryError((err as Error).message);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function runChecks(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await request<Report>('', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      setReport(result);
      setBaseline(result);
      setNotice(
        `Report #${result.id} saved. ${result.findings.length} findings.`,
      );
      await refreshHistory();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function openReport(id: number) {
    if (
      unsaved &&
      !window.confirm('Replace your unreviewed edits with this saved draft?')
    )
      return;
    setBusy(true);
    setError('');
    try {
      const saved = await request<Report>(`/${id}`);
      setDraft({
        title: saved.title,
        metaDescription: saved.metaDescription,
        html: saved.html,
      });
      setReport(saved);
      setBaseline(saved);
      setNotice(
        `Saved report #${id} opened. Edit the draft to run another check.`,
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function replaceDraft(next: Draft, message: string) {
    if (unsaved && !window.confirm('Replace your unreviewed edits?')) return;
    setDraft({ ...next });
    setBaseline(next);
    setReport(null);
    setError('');
    setNotice(message);
  }

  return (
    <>
      <a className="skip-link" href="#draft-title">
        Skip to draft editor
      </a>
      <header className="topbar">
        <div className="brand">
          <span className="brand-icon" aria-hidden="true">
            ✓
          </span>{' '}
          Content QA Desk
        </div>
        <span className="local-label">LOCAL WORKSPACE</span>
      </header>
      <main>
        <section className="intro" aria-labelledby="page-title">
          <div>
            <p className="eyebrow">THE EDITORIAL WORKBENCH</p>
            <h1 id="page-title">A second look, before publish.</h1>
            <p>Check the small details. Keep every review.</p>
          </div>
          <div className="scope-note">
            <strong>5 focused checks</strong>
            <span>Metadata · Structure · Accessibility</span>
          </div>
        </section>
        <div className="workspace">
          <section className="panel editor" aria-labelledby="editor-heading">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">DRAFT</p>
                <h2 id="editor-heading">Your article</h2>
              </div>
              <button
                className="text-button"
                disabled={busy}
                onClick={() =>
                  replaceDraft(
                    sampleDraft,
                    'Sample draft loaded. It has three deliberate findings.',
                  )
                }
              >
                Load sample
              </button>
            </div>
            <form onSubmit={runChecks}>
              <fieldset disabled={busy}>
                <label htmlFor="draft-title">
                  Article title <span>{draft.title.length}/300</span>
                </label>
                <input
                  id="draft-title"
                  maxLength={300}
                  value={draft.title}
                  placeholder="Give your article a title"
                  onChange={(e) =>
                    setDraft({ ...draft, title: e.target.value })
                  }
                />
                <label htmlFor="meta">
                  Meta description <span>Optional to check</span>
                </label>
                <textarea
                  id="meta"
                  className="meta-input"
                  maxLength={1000}
                  value={draft.metaDescription}
                  placeholder="A short summary for the search preview…"
                  onChange={(e) =>
                    setDraft({ ...draft, metaDescription: e.target.value })
                  }
                />
                <label htmlFor="html">
                  Article HTML <span>Paste source HTML</span>
                </label>
                <textarea
                  id="html"
                  className="code-input"
                  maxLength={100000}
                  spellCheck={false}
                  value={draft.html}
                  aria-describedby="html-help"
                  onChange={(e) => setDraft({ ...draft, html: e.target.value })}
                />
                <p id="html-help" className="helper">
                  HTML stays as text. Scripts and images are never rendered.
                </p>
                <div className="editor-actions">
                  <button className="primary" type="submit">
                    {busy ? 'Working…' : 'Run checks'}
                    <span aria-hidden="true">✓</span>
                  </button>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => replaceDraft(blank, 'Blank draft ready.')}
                  >
                    Clear draft
                  </button>
                  <span className="save-note">Each check is saved locally</span>
                </div>
              </fieldset>
            </form>
          </section>
          <section
            className="panel results"
            aria-labelledby="results-heading"
            aria-busy={busy}
          >
            <div className="panel-heading">
              <div>
                <p className="eyebrow">REVIEW</p>
                <h2 id="results-heading">Check results</h2>
              </div>
              {report && <span className="saved-tag">Saved #{report.id}</span>}
            </div>
            {error && (
              <div role="alert" className="error">
                {error}
              </div>
            )}
            {changed && (
              <div className="stale-note">
                Draft changed. Run checks again to update this report.
              </div>
            )}
            {report ? (
              <>
                <div
                  className={`result-summary ${report.findings.length === 0 ? 'clear' : ''}`}
                >
                  <span className="result-number">
                    {report.findings.length}
                  </span>
                  <div>
                    <h3>
                      {report.findings.length === 0
                        ? 'All five checks passed'
                        : `Finding${report.findings.length === 1 ? '' : 's'} to review`}
                    </h3>
                    <p>
                      {report.findings.length === 0
                        ? 'Ready for a human editorial review.'
                        : 'Small fixes for a more complete draft.'}
                    </p>
                  </div>
                </div>
                <ul className="rule-status" aria-label="Check summary">
                  {rules.map((rule) => {
                    const failed = report.findings.some(
                      (f) => f.rule === rule.id,
                    );
                    return (
                      <li
                        key={rule.id}
                        className={failed ? 'needs-review' : ''}
                      >
                        <span aria-hidden="true">{failed ? '!' : '✓'}</span>
                        {rule.label}
                        <span className="sr-only">
                          {failed ? ': review needed' : ': passed'}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <ol className="findings">
                  {report.findings.map((finding, index) => (
                    <li key={`${finding.rule}-${index}`}>
                      <span className="finding-index" aria-hidden="true">
                        {index + 1}
                      </span>
                      <div>
                        <h3>{finding.message}</h3>
                        <p className="context">{finding.context}</p>
                        <p className="suggestion">{finding.suggestion}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                <p className="report-footnote">
                  Checked {dateLabel(report.createdAt)} · Pasted HTML only
                </p>
              </>
            ) : (
              <div className="empty-state">
                <div className="empty-icon" aria-hidden="true">
                  ✓
                </div>
                <h3>A fresh pair of checks.</h3>
                <p>
                  Run a review to spot missing metadata, heading issues, image
                  alt attributes, and placeholder links.
                </p>
                <ul>
                  {rules.map((rule) => (
                    <li key={rule.id}>
                      <span aria-hidden="true">○</span> {rule.label}
                    </li>
                  ))}
                </ul>
                <p className="helper">
                  The sample is ready to try. Select “Run checks”.
                </p>
              </div>
            )}
            <p className="sr-only" role="status">
              {notice}
            </p>
          </section>
        </div>
        <section className="panel history" aria-labelledby="recent-heading">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">HISTORY</p>
              <h2 id="recent-heading">Recent checks</h2>
            </div>
            <span className="helper">Latest 20 · Stored on this computer</span>
          </div>
          {historyError ? (
            <div className="error" role="alert">
              {historyError}{' '}
              <button
                onClick={() => void refreshHistory()}
                disabled={historyLoading}
              >
                Retry history
              </button>
            </div>
          ) : historyLoading ? (
            <p className="history-empty">Loading saved reports…</p>
          ) : recent.length === 0 ? (
            <p className="history-empty">
              Your first report will appear here. Reopen it anytime to review or
              continue editing.
            </p>
          ) : (
            <ul className="history-list">
              {recent.map((item) => (
                <li key={item.id}>
                  <button
                    disabled={busy}
                    onClick={() => void openReport(item.id)}
                    aria-current={report?.id === item.id ? 'true' : undefined}
                  >
                    <span className="history-id">#{item.id}</span>
                    <span className="history-title">
                      {item.title.trim() || 'Untitled draft'}
                      <small>{dateLabel(item.createdAt)}</small>
                    </span>
                    <span
                      className={`count-badge ${item.findingCount === 0 ? 'zero' : ''}`}
                    >
                      {item.findingCount}{' '}
                      {item.findingCount === 1 ? 'finding' : 'findings'}
                    </span>
                    <span className="open-label">Open report</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <footer>
          <span>
            Content QA Desk <span aria-hidden="true">/</span> A small tool for
            thoughtful publishing.
          </span>
          <span>Deterministic checks. Human decisions.</span>
        </footer>
      </main>
    </>
  );
}
