import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { label } from '../format';

const DOT: Record<string, string> = { olive: 'var(--olive)', ember: 'var(--ember)', gold: 'var(--gold)', berry: 'var(--berry)' };

/** The TGN folder-tab card. */
export function Card({ tab, accent = 'olive', children, style, tint }: { tab?: string; accent?: keyof typeof DOT; children: ReactNode; style?: CSSProperties; tint?: boolean }) {
  return (
    <section className={`card${tint ? ' tinted' : ''}`} data-accent={accent} style={{ ...style, ['--dot' as string]: DOT[accent] }}>
      {tab ? <span className="tab">{tab}</span> : null}
      {children}
    </section>
  );
}

const TONE: Record<string, string> = {
  active: 'ok', approved: 'ok', delivered: 'ok', under_review: 'ok',
  pending_review: 'warn', submitted: 'warn', lapsed: 'warn', open: 'warn', in_progress: 'ok', resolved: 'money',
  declined: 'bad', cancelled: 'bad',
};
export const STATUS_LABEL: Record<string, string> = {
  pending_review: 'Pending Review', approved: 'Approved', active: 'Active', lapsed: 'Lapsed', declined: 'Declined', cancelled: 'Cancelled',
  submitted: 'Submitted', under_review: 'Under Review', delivered: 'Provisions Delivered', open: 'Open', in_progress: 'In Progress', resolved: 'Resolved',
};
export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge ${TONE[status] ?? ''}`}>{STATUS_LABEL[status] ?? label(status)}</span>;
}

export function Loading() {
  return <div aria-busy="true" aria-label="Loading">{[70, 90, 55].map((w) => <div key={w} className="skeleton" style={{ width: `${w}%` }} />)}</div>;
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card tab="Something went wrong" accent="ember">
      <p className="err" role="alert">{message}</p>
      {onRetry ? <button className="secondary" onClick={onRetry}>Try Again</button> : null}
    </Card>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}

/** Loads data, tracking loading and error state. */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(() => {
    setLoading(true);
    fn().then((d) => { setData(d); setError(undefined); }).catch((e: Error) => setError(e.message)).finally(() => setLoading(false));
  }, deps);
  useEffect(run, [run]);
  return { data, error, loading, reload: run, setData };
}
