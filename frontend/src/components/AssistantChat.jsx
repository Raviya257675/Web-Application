import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { request } from '../api/client';
import { useAuth } from '../context/AuthContext';
import './assistant-chat.css';

const GUIDES = [
  ['Book a visit', 'Patient portal → Book a visit → choose a consultant, date and available time → confirm on the booking page.'],
  ['Invoices & payments', 'Patients: open Invoices. Administrators: Billing. Receptionists: Payments & receipts. Check the amount and available actions on that page.'],
  ['Staff access', 'Choose your role when registering. Staff applications need administrator approval before access. Administrators review these under Staff approvals.'],
  ['Find my records', 'Patients: use Medical records, Prescriptions, Lab results or Admissions in your sidebar. The assistant cannot read your private records.'],
];
const WELCOME = { role: 'assistant', content: 'Hi! I’m Meridian Assistant. Ask me how to use appointments, billing, records or your dashboard. English questions give the clearest answers.', local: true };

function ChatIcon() { return <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M20 11.5a8 8 0 0 1-8 8H5l-3 2v-10a9 9 0 0 1 18 0Z"/><path d="M7 10h8M7 14h5"/></svg>; }

export default function AssistantChat() {
  const { user, role } = useAuth();
  return <ChatSession key={`${user?.id || user?.email || 'visitor'}:${role || 'visitor'}`} role={role} />;
}

function ChatSession({ role }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState(null);
  const [guide, setGuide] = useState(null);
  const input = useRef(null), launcher = useRef(null), log = useRef(null), active = useRef(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; active.current?.abort(); }; }, []);
  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const controller = new AbortController();
    request({ url: '/public/assistant/status', signal: controller.signal }).then(({ data }) => setStatus(data))
      .catch(() => { if (!controller.signal.aborted) setStatus({ configured: false, offline: true }); });
    return () => controller.abort();
  }, [open]);
  useEffect(() => { if (log.current) log.current.scrollTop = log.current.scrollHeight; }, [messages, busy, error, open]);

  const close = () => { setOpen(false); launcher.current?.focus(); };
  const cancel = () => { active.current?.abort(); active.current = null; setBusy(false); setError('Reply stopped. You can retry your last question.'); };
  const send = async (retry = false) => {
    if (active.current || (!retry && !draft.trim())) return;
    const next = retry ? messages : [...messages, { role: 'user', content: draft.trim() }];
    if (next.at(-1)?.role !== 'user') return;
    setMessages(next); setDraft(''); setError(''); setBusy(true);
    const controller = new AbortController(); active.current = controller;
    try {
      const history = next.filter(m => !m.local).slice(-12).map(({ role, content }) => ({ role, content: content.slice(0, 2000) }));
      const { data } = await request({ method: 'post', url: '/public/assistant/chat', data: { messages: history }, signal: controller.signal, timeout: 135000 });
      if (!mounted.current || controller.signal.aborted) return;
      if (!data?.reply) throw new Error('No reply was received. Please retry.');
      setMessages([...next, { role: 'assistant', content: data.reply }]);
      setStatus(previous => ({ ...previous, configured: true, offline: false }));
    } catch (e) {
      if (mounted.current && !controller.signal.aborted) setError(e.message || 'Unable to reach the assistant. Please retry.');
    } finally {
      if (active.current === controller) { active.current = null; if (mounted.current) setBusy(false); }
    }
  };
  const clear = () => { active.current?.abort(); active.current = null; setMessages([WELCOME]); setError(''); setDraft(''); setBusy(false); setGuide(null); input.current?.focus(); };
  return <div className="meridian-chat">
    {open && <section className="meridian-chat__panel" role="dialog" aria-label="Meridian Assistant" onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } }}>
      <header className="meridian-chat__header"><div className="meridian-chat__avatar"><ChatIcon /></div><div><h2>Meridian Assistant</h2><p>{status?.provider === 'ollama' ? 'Local AI · no API fees' : status?.configured ? 'AI application guide' : 'Application help'}</p></div><button onClick={close} aria-label="Close assistant" title="Close assistant">×</button></header>
      <div className="meridian-chat__tools"><span>{role ? `${role.toLowerCase().replaceAll('_', ' ')} workspace` : 'Welcome to Meridian'}</span><button onClick={clear}>New chat</button></div>
      <div className="meridian-chat__log" ref={log} role="log" aria-live="polite" aria-relevant="additions" aria-label="Conversation">
        {messages.map((message, i) => <div key={i} className={`meridian-chat__message meridian-chat__message--${message.role}`}><span>{message.role === 'user' ? 'You' : 'Meridian'}</span><p>{message.content}</p></div>)}
        {busy && <div className="meridian-chat__thinking" role="status"><i /><i /><i /><span>Preparing your answer…</span></div>}
      </div>
      {status && !status.configured && <p className="meridian-chat__notice">{status.offline ? 'Chat service is unavailable. Quick guides still work.' : 'AI is not connected yet. Quick guides are available below.'}</p>}
      {error && <div className="meridian-chat__error" role="alert"><p>{error}</p><button onClick={() => send(true)} disabled={busy}>Retry question</button></div>}
      <details className="meridian-chat__guides"><summary>Quick guides · always available</summary><div className="meridian-chat__chips">{GUIDES.map(([title, text]) => <button key={title} onClick={() => setGuide(text)}>{title}</button>)}</div>{guide && <p>{guide}</p>}<Link to={role ? `/${role.toLowerCase()}` : '/login'} onClick={close}>{role ? 'Open my dashboard' : 'Sign in to your portal'} ↗</Link></details>
      <form className="meridian-chat__form" onSubmit={e => { e.preventDefault(); send(); }}>
        <label className="meridian-chat__input-label" htmlFor="assistant-question">Your message</label>
        <div><textarea id="assistant-question" ref={input} value={draft} onChange={e => setDraft(e.target.value)} maxLength={2000} rows={2} placeholder="Ask about Meridian…" onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }} />{busy ? <button type="button" onClick={cancel} aria-label="Stop reply">■</button> : <button type="submit" disabled={!draft.trim()} aria-label="Send message">↑</button>}</div>
        <small>AI can make mistakes. Don’t share passwords or private health details.{status?.provider === 'ollama' ? ' Replies run on the server PC.' : status?.configured && status.provider === 'openai' ? ' Messages are sent to OpenAI.' : ''}</small>
      </form>
    </section>}
    <button ref={launcher} className="meridian-chat__launcher" onClick={() => open ? close() : setOpen(true)} aria-label={open ? 'Close Meridian Assistant' : 'Chat with Meridian Assistant'} aria-expanded={open}><ChatIcon /><span>Ask Meridian</span></button>
  </div>;
}
