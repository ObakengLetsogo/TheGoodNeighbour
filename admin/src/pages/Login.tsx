import { useState, type FormEvent } from 'react';
import { useAuth } from '../auth';
import { Card } from '../components/ui';

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try { await login(email, password); } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="center">
      <form className="login" onSubmit={submit}>
        <div>
          <h1>TGN <span className="serif">Admin</span></h1>
          <p className="muted">Staff sign in.</p>
        </div>
        <Card tab="Sign in">
          <div className="grid" style={{ gap: 14 }}>
            <label className="f">Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required /></label>
            <label className="f">Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /></label>
            {error ? <div className="err" role="alert">{error}</div> : null}
            <button type="submit" disabled={busy}>{busy ? 'Signing In…' : 'Sign In'}</button>
          </div>
        </Card>
      </form>
    </div>
  );
}
