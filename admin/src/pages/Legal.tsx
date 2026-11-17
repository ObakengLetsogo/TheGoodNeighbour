import { useEffect, useState } from 'react';
import { api } from '../api';
import { Card, ErrorBox, Loading, useLoad } from '../components/ui';
import { dateTime } from '../format';
import type { LegalDoc } from '../types';

export function LegalPage() {
  const list = useLoad(api.legalList);
  const [slug, setSlug] = useState('terms');
  return (
    <>
      <div className="page-head">
        <div><h1>Terms &amp; <span className="serif">Privacy</span></h1>
          <p className="muted">The text customers read and accept. Lines starting <code>## </code> are headings. Saving a change creates a new version, and each customer's acceptance is recorded against the version they saw.</p></div>
      </div>
      {list.loading ? <Loading /> : list.error ? <ErrorBox message={list.error} onRetry={list.reload} /> : (
        <>
          <div className="chips">{(list.data ?? []).map((d) => <button key={d.slug} className={`chip${d.slug === slug ? ' on' : ''}`} onClick={() => setSlug(d.slug)}>{d.title}{d.draft ? ' (draft)' : ''}</button>)}</div>
          <Editor key={slug} slug={slug} onSaved={list.reload} />
        </>
      )}
    </>
  );
}

function Editor({ slug, onSaved }: { slug: string; onSaved: () => void }) {
  const { data, error, loading, reload } = useLoad(() => api.legal(slug), [slug]);
  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorBox message={error} onRetry={reload} />;
  return data ? <Form initial={data} onSaved={onSaved} /> : null;
}

function Form({ initial, onSaved }: { initial: LegalDoc; onSaved: () => void }) {
  const [d, setD] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string }>();
  const [busy, setBusy] = useState(false);
  useEffect(() => setD(initial), [initial]);
  const save = async () => {
    setBusy(true); setMsg(undefined);
    try {
      const saved = await api.updateLegal(d.slug, d.title, d.body, d.draft);
      setD(saved); onSaved();
      setMsg({ ok: true, text: saved.version > initial.version ? `Saved as version ${saved.version}.` : 'Saved. The text is unchanged, so the version stays the same.' });
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); } finally { setBusy(false); }
  };
  return (
    <Card tab={`Version ${d.version}`} accent={d.draft ? 'gold' : 'olive'}>
      {d.draft ? <p className="small" style={{ color: 'var(--warning)', fontWeight: 600, marginTop: 0 }}>This is still draft wording. Customers see a "Draft" label. Replace it with text approved by your lawyer and underwriter, then untick Draft.</p> : null}
      <label className="f">Title<input value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} /></label>
      <label className="f" style={{ marginTop: 12 }}>Text<textarea style={{ height: 420, fontFamily: 'inherit', lineHeight: 1.5 }} value={d.body} onChange={(e) => setD({ ...d, body: e.target.value })} /></label>
      <div className="row" style={{ marginTop: 14 }}>
        <label className="row small"><input type="checkbox" style={{ width: 18, height: 18 }} checked={d.draft} onChange={(e) => setD({ ...d, draft: e.target.checked })} /> Still a draft</label>
        <span className="muted small">Last updated {dateTime(d.updatedAt)}</span>
        <div style={{ flex: 1 }} />
        {msg ? <span className={msg.ok ? 'ok-msg' : 'err'} role="status">{msg.text}</span> : null}
        <button onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
      </div>
    </Card>
  );
}
