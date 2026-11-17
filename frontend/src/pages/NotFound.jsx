import { Link } from 'react-router-dom';
import { Icon } from '../components/ui';

export default function NotFound() {
  return (
    <div className="auth">
      <div className="auth__card" style={{ textAlign: 'center', maxWidth: 460 }}>
        <span className="brand__mark" style={{ margin: '0 auto 16px' }}>M</span>
        <h1>Page not found</h1>
        <p className="muted" style={{ marginTop: 8 }}>
          The page you were looking for has moved or never existed.
        </p>
        <div className="row-gap" style={{ justifyContent: 'center', marginTop: 24 }}>
          <Link className="btn btn--primary" to="/"><Icon name="arrowRight" size={16} /> Back to the site</Link>
          <Link className="btn" to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
