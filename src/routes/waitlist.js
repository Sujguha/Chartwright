/** Waitlist sign-ups for chartwright.de, stored in D1 (table: waitlist). */
const PLANS = ['Pro', 'Enterprise'];
const TOOLS = ['Jira', 'Jira Service Management', 'ServiceNow', 'SAP Cloud ALM', 'SAP Solution Manager', 'Azure DevOps'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export async function handleWaitlist(request, env) {
  if (request.method !== 'POST') return json({ ok: false, error: 'Use POST.' }, 405);
  if (!env.DB) return json({ ok: false, error: 'The waitlist is not set up yet.' }, 503);

  let data;
  try {
    const type = request.headers.get('Content-Type') || '';
    if (type.includes('application/json')) {
      data = await request.json();
    } else {
      const form = await request.formData();
      data = Object.fromEntries(form);
      data.tools = form.getAll('tools');
    }
  } catch {
    return json({ ok: false, error: 'The form data could not be read.' }, 400);
  }

  // Spam trap: real visitors never fill in this hidden field
  if (data['company-website']) return json({ ok: true });

  const email = String(data.email || '').trim().toLowerCase();
  if (email.length > 254 || !EMAIL_RE.test(email)) return json({ ok: false, error: 'Enter a valid email address.' }, 400);
  if (!(data.consent === true || data.consent === 'yes' || data.consent === 'true')) {
    return json({ ok: false, error: 'Consent is required to join the waitlist.' }, 400);
  }
  const plan = PLANS.includes(data.plan) ? data.plan : 'Pro';
  const tools = (Array.isArray(data.tools) ? data.tools : String(data.tools || '').split(','))
    .map((t) => String(t).trim())
    .filter((t) => TOOLS.includes(t));
  const now = new Date().toISOString();

  try {
    await env.DB.prepare(
      `INSERT INTO waitlist (email, plan, tools, consent_at, created_at)
       VALUES (?1, ?2, ?3, ?4, ?4)
       ON CONFLICT(email) DO UPDATE SET plan = excluded.plan, tools = excluded.tools, consent_at = excluded.consent_at`
    ).bind(email, plan, tools.join(', '), now).run();
  } catch (err) {
    console.error('Waitlist insert failed', err);
    return json({ ok: false, error: 'The waitlist is temporarily unavailable. Please try again later.' }, 500);
  }
  return json({ ok: true });
}

