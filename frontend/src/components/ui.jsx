import { useEffect } from 'react';
import { money, statusLabel } from '../utils/format';

const PATHS = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  activity: <path d="M22 12h-4l-3 8L9 4l-3 8H2" />,
  building: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M9 21v-4h6v4M8 7h.01M12 7h.01M16 7h.01M8 11h.01M12 11h.01M16 11h.01" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 2h12a1 1 0 0 1 1 1v19l-3-2-3 2-3-2-3 2V3a1 1 0 0 1 1-1Z" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </>
  ),
  pill: (
    <>
      <path d="M10.5 20.5a5 5 0 0 1-7-7l7-7a5 5 0 0 1 7 7l-7 7Z" />
      <path d="m8 8 8 8" />
    </>
  ),
  flask: (
    <>
      <path d="M9 3h6M10 3v6l-5.5 9.5A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-2.5L14 9V3" />
      <path d="M7 15h10" />
    </>
  ),
  bed: (
    <>
      <path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20" />
      <path d="M6 8V6h6v2" />
    </>
  ),
  shield: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5M21 12H9" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  download: <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />,
  chevronLeft: <path d="m15 18-6-6 6-6" />,
  chevronRight: <path d="m9 18 6-6-6-6" />,
  check: <path d="m20 6-11 11-5-5" />,
  close: <path d="M18 6 6 18M6 6l12 12" />,
  menu: <path d="M3 6h18M3 12h18M3 18h18" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  alert: (
    <>
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  edit: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </>
  ),
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  file: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6M9 13h6M9 17h6" />
    </>
  ),
  heart: <path d="M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 22l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />,
  package: (
    <>
      <path d="m21 8-9-5-9 5 9 5 9-5Z" />
      <path d="M3 8v8l9 5 9-5V8M12 13v8" />
    </>
  ),
  sparkles: <path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" />,
};

export function Icon({ name, size = 18, className = '' }) {
  const path = PATHS[name] || PATHS.dashboard;
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {path}
    </svg>
  );
}

const TONES = {
  completed: 'success', paid: 'success', approved: 'success', dispensed: 'success', available: 'success',
  active: 'success', collected: 'warning', ordered: 'warning', booked: 'warning', pending: 'warning',
  partially_paid: 'warning', urgent: 'warning', maintenance: 'warning', cancelled: 'danger',
  void: 'danger', no_show: 'danger', rejected: 'danger', inactive: 'danger', occupied: 'info',
  admitted: 'info', discharged: 'muted',
};

export function Badge({ status, children, tone }) {
  const value = status || children;
  const resolved = tone || TONES[status] || 'muted';
  return (
    <span className={`badge badge--${resolved}`}>
      {typeof value === 'string' ? statusLabel(value) : value}
    </span>
  );
}

export function Stat({ label, value, hint, icon, tone = 'primary', onClick }) {
  const content = (
    <>
      <span>{label}</span>
      <strong>{value}</strong>
      {hint ? <em>{hint}</em> : null}
      {icon ? <span className={`stat__icon stat__icon--${tone}`}><Icon name={icon} size={18} /></span> : null}
    </>
  );
  if (onClick) {
    return (
      <button type="button" className={`stat stat--${tone} stat--button`} onClick={onClick}>
        {content}
      </button>
    );
  }
  return <div className={`stat stat--${tone}`}>{content}</div>;
}

export function PageHead({ eyebrow, title, description, actions }) {
  return (
    <header className="page__head">
      <div>
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        <h2>{title}</h2>
        {description ? <p className="muted">{description}</p> : null}
      </div>
      {actions ? <div className="page__actions">{actions}</div> : null}
    </header>
  );
}

export function Tabs({ tabs, value, onChange, className = '' }) {
  return (
    <div className={`tabs ${className}`} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={value === tab.value}
          className={`tab ${value === tab.value ? 'is-active' : ''}`}
          onClick={() => onChange(tab.value)}
        >
          {tab.label}
          {tab.count !== undefined ? <span className="tab__count">{tab.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function Modal({ open, onClose, title, description, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={onClose} role="presentation">
      <div className={`modal modal--${size}`} onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal__head">
          <div>
            <h3>{title}</h3>
            {description ? <p className="muted">{description}</p> : null}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </div>
        <div className="modal__body">{children}</div>
        {footer ? <div className="modal__foot">{footer}</div> : null}
      </div>
    </div>
  );
}

export function Empty({ title = 'Nothing here yet', message, action, icon = 'file' }) {
  return (
    <div className="empty-box">
      <span className="empty-box__icon"><Icon name={icon} size={22} /></span>
      <strong>{title}</strong>
      {message ? <p>{message}</p> : null}
      {action}
    </div>
  );
}

export function Loader({ label = 'Loading…' }) {
  return (
    <div className="loader-block">
      <span className="spinner" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="error-box error-box--stack">
      <span>{error?.message || 'Something went wrong.'}</span>
      {error?.details?.length ? (
        <ul className="error-box__list">
          {error.details.map((detail) => <li key={detail}>{detail}</li>)}
        </ul>
      ) : null}
      {onRetry ? <button type="button" className="btn btn--sm" onClick={onRetry}>Try again</button> : null}
    </div>
  );
}

export function Avatar({ name = '', size = 'md' }) {
  const letters = name
    .replace(/^Dr\.?\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
  return <span className={`avatar avatar--${size}`}>{letters || '?'}</span>;
}

export function BarChart({ data = [], valueKey = 'value', labelKey = 'label', formatter, height = 140 }) {
  const max = Math.max(1, ...data.map((item) => Number(item[valueKey] || 0)));
  return (
    <div className="chart" style={{ height }}>
      {data.map((item) => {
        const value = Number(item[valueKey] || 0);
        return (
          <div className="chart__col" key={`${item[labelKey]}-${item.date || ''}`}>
            <span className="chart__value">{formatter ? formatter(value) : value}</span>
            <div
              className={`chart__bar ${value === 0 ? 'chart__bar--empty' : ''}`}
              style={{ height: `${Math.max(4, (value / max) * 100)}%` }}
              title={`${item[labelKey]}: ${value}`}
            />
            <span className="chart__label">{item[labelKey]}</span>
          </div>
        );
      })}
    </div>
  );
}

export function Progress({ value, max = 100, tone = 'primary', label }) {
  const pct = max === 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="progress">
      <div className="progress__track">
        <div className={`progress__fill progress__fill--${tone}`} style={{ width: `${pct}%` }} />
      </div>
      {label ? <span className="progress__label">{label}</span> : null}
    </div>
  );
}

export function Field({ label, hint, children, className = '' }) {
  return (
    <label className={`field ${className}`}>
      <span>{label}</span>
      {children}
      {hint ? <em className="field__hint">{hint}</em> : null}
    </label>
  );
}

export function SearchBar({ value, onChange, placeholder = 'Search…', onSubmit }) {
  return (
    <form
      className="searchbar"
      onSubmit={(event) => { event.preventDefault(); onSubmit?.(); }}
      role="search"
    >
      <Icon name="search" size={16} />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
    </form>
  );
}

export function Money({ value, className = '' }) {
  return <span className={`money ${className}`}>{money(value)}</span>;
}

export function Detail({ label, children, className = '' }) {
  return (
    <div className={`detail ${className}`}>
      <span>{label}</span>
      <strong>{children ?? '—'}</strong>
    </div>
  );
}

export function Alert({ tone = 'warning', title, children }) {
  return (
    <div className={`notice notice--${tone}`}>
      <Icon name={tone === 'danger' ? 'alert' : 'sparkles'} size={17} />
      <div>
        {title ? <strong>{title}</strong> : null}
        <div>{children}</div>
      </div>
    </div>
  );
}
