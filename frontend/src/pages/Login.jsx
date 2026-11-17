import AuthPhotoPanel from '../components/AuthPhotoPanel';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Icon } from '../components/ui';
import { AuthIllustration } from '../components/MedicalVisuals.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const go = (user) => {
    const target = '/' + user.role.toLowerCase();
    const from = location.state?.from;
    navigate(from && from.startsWith(target) ? from : target, { replace: true });
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const user = await login(form);
      go(user);
    } catch (err) {
      setError(err.message || 'Unable to sign in');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <div className="auth__card auth__card--split">
        <AuthPhotoPanel />

        <div className="auth__form">
          <h1>Welcome back</h1>
          <p className="muted">Sign in to your Meridian portal.</p>

          {location.state?.registered && <p role="status">{location.state?.pending ? 'Application submitted. A hospital administrator must approve your staff access before you can sign in.' : 'Account created. Sign in with your email and password.'}</p>}
          <form onSubmit={submit}>
            {error ? <div className="error-box" style={{ marginBottom: 16 }}>{error}</div> : null}
            <label className="field">
              <span>Email address</span>
              <input
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </label>
            <button type="submit" className="btn btn--primary btn--block btn--lg" disabled={busy}>
              {busy ? <><span className="spinner" /> Signing in…</> : 'Sign in'}
            </button>
          </form>

          <p className="auth__foot">
            New to Meridian? <Link to="/register">Create an account</Link>
          </p>
          <p className="auth__foot" style={{ marginTop: 4 }}>
            <Link to="/" className="muted">← Back to the hospital site</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
