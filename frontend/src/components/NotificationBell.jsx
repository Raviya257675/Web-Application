import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationApi } from '../api';
import { Icon } from './ui';
import { relative } from '../utils/format';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const boxRef = useRef(null);

  const loadCount = () => {
    notificationApi.unreadCount()
      .then(({ data }) => setCount(data?.count || 0))
      .catch(() => {});
  };

  useEffect(() => {
    loadCount();
    const interval = window.setInterval(loadCount, 60000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    setLoading(true);
    notificationApi.list()
      .then(({ data }) => setItems(data || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
    const onDown = (event) => {
      if (boxRef.current && !boxRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const openItem = async (item) => {
    if (!item.read) {
      try {
        await notificationApi.markRead(item.id);
        setItems((current) => current.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
        setCount((c) => Math.max(0, c - 1));
      } catch {
        /* non-critical */
      }
    }
    setOpen(false);
    if (item.link) navigate(item.link);
  };

  const markAll = async () => {
    try {
      await notificationApi.markAllRead();
      setItems((current) => current.map((n) => ({ ...n, read: true })));
      setCount(0);
    } catch {
      /* non-critical */
    }
  };

  return (
    <div className="notif" ref={boxRef}>
      <button
        type="button"
        className="icon-btn notif__trigger"
        aria-label="Notifications"
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name="bell" />
        {count > 0 ? <span className="notif__dot">{count > 9 ? '9+' : count}</span> : null}
      </button>
      {open ? (
        <div className="notif__panel">
          <div className="notif__head">
            <strong>Notifications</strong>
            {items.some((item) => !item.read) ? (
              <button type="button" className="link-btn" onClick={markAll}>Mark all read</button>
            ) : null}
          </div>
          <div className="notif__list">
            {loading ? <div className="loader-inline">Loading…</div> : null}
            {!loading && items.length === 0 ? <div className="notif__empty">You are all caught up.</div> : null}
            {items.slice(0, 8).map((item) => (
              <button
                key={item.id}
                type="button"
                className={`notif__item ${item.read ? '' : 'notif__item--unread'}`}
                onClick={() => openItem(item)}
              >
                <span className={`notif__type notif__type--${(item.type || 'system').toLowerCase()}`} />
                <span className="notif__body">
                  <strong>{item.title}</strong>
                  <span>{item.message}</span>
                  <em>{relative(item.createdAt)}</em>
                </span>
              </button>
            ))}
          </div>
          <div className="notif__foot">
            <button type="button" className="link-btn" onClick={() => { setOpen(false); navigate('/notifications'); }}>
              View all notifications
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
