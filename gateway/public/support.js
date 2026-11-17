(() => {
  'use strict';
  const el = (id) => document.getElementById(id);
  const notice = el('notice');
  let token = null;
  let person = null;

  function alertText(message, error = false) {
    notice.textContent = message;
    notice.className = `notice ${error ? 'error' : 'ok'}`;
  }

  async function request(path, opts = {}) {
    const response = await fetch(path, {
      ...opts,
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body?.error?.message || `Request failed (${response.status})`);
    return body.data;
  }

  function make(tag, text, cls) {
    const n = document.createElement(tag);
    if (text !== undefined) n.textContent = String(text);
    if (cls) n.className = cls;
    return n;
  }

  async function loadTickets() {
    const container = el('ticket-list');
    container.replaceChildren(make('p', 'Loading requests...'));
    try {
      const tickets = await request(person.role === 'ADMIN' ? '/engage/feedback' : '/engage/feedback/mine');
      container.replaceChildren();
      if (!tickets.length) container.append(make('p', 'No support requests yet.'));
      for (const t of tickets) {
        const card = make('article', undefined, 'ticket');
        const top = make('div', undefined, 'ticket-top');
        const status = make('span', t.status.replaceAll('_', ' '), `status ${t.status.toLowerCase().replaceAll('_', '-')}`);
        top.append(make('span', t.category, 'meta'), status);
        card.append(top, make('h3', t.subject), make('p', t.message));
        card.append(make('div', `${t.userName} · ${new Date(t.createdAt).toLocaleString()}`, 'meta'));
        if (person.role === 'ADMIN') {
          const select = make('select', undefined, 'status-select');
          select.setAttribute('aria-label', `Status for ${t.subject}`);
          for (const value of ['OPEN', 'IN_PROGRESS', 'RESOLVED']) {
            const option = make('option', value.replaceAll('_', ' '));
            option.value = value;
            select.append(option);
          }
          select.value = t.status;
          select.addEventListener('change', async () => {
            try {
              await request(`/engage/feedback/${encodeURIComponent(t.id)}`, {
                method: 'PATCH', body: JSON.stringify({ status: select.value }),
              });
              alertText('Support ticket status updated.');
              await loadTickets();
            } catch (error) { alertText(error.message, true); select.value = t.status; }
          });
          card.append(select);
        }
        container.append(card);
      }
    } catch (error) { container.replaceChildren(make('p', error.message)); alertText(error.message, true); }
  }

  async function init() {
    try {
      token = JSON.parse(localStorage.getItem('meridian.hms.session') || 'null')?.accessToken;
    } catch { /* missing session */ }
    if (!token) { el('signed-out').classList.remove('hidden'); return; }
    try {
      person = await request('/api/auth/me');
      el('main-panel').classList.remove('hidden');
      el('identity-label').textContent = person.role;
      if (person.role === 'ADMIN') {
        el('queue-label').textContent = 'ADMIN SUPPORT QUEUE';
        el('queue-title').textContent = 'All support requests';
      }
      await loadTickets();
    } catch (error) {
      el('signed-out').classList.remove('hidden');
      alertText(`Session unavailable: ${error.message}`, true);
    }
  }

  el('reload').addEventListener('click', loadTickets);
  el('feedback-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = el('submit');
    button.disabled = true;
    try {
      await request('/engage/feedback', {
        method: 'POST', body: JSON.stringify({
          category: el('category').value,
          subject: el('subject').value,
          message: el('message').value,
        }),
      });
      el('feedback-form').reset();
      alertText('Thank you! Your support request was saved successfully.');
      await loadTickets();
    } catch (error) { alertText(error.message, true); }
    finally { button.disabled = false; }
  });
  init();
})();
