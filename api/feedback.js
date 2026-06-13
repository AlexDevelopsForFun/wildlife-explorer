// Visitor feedback sink — bug reports, suggestions, and park-data corrections
// from the in-app Contact form.
//
// Delivery (no Google account involved):
//   • If WEB3FORMS_KEY is set in the Vercel env, the message is relayed to
//     Web3Forms, which emails it to the address that key is bound to
//     (set up contact@wildlifeexplorer.us → get a free access key at
//     web3forms.com → add it as WEB3FORMS_KEY). The key stays server-side here.
//   • Always also console.log'd as [feedback] so nothing is ever lost — it
//     shows in the Vercel runtime logs even before the key is configured.
//
// Hardened: POST-only, body clamped, honeypot, fields whitelisted + truncated.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  try {
    let raw = req.body;
    if (typeof raw !== 'string') raw = JSON.stringify(raw ?? {});
    if (raw.length > 8192) return res.status(413).json({ error: 'too long' });
    const b = JSON.parse(raw || '{}');

    // Honeypot: real users never fill the hidden "company" field.
    if (b.company) return res.status(200).json({ ok: true });

    const clamp = (v, n) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
    const category = clamp(b.category, 40) || 'feedback';
    const park = clamp(b.park, 120);
    const message = clamp(b.message, 4000);
    const replyTo = clamp(b.email, 160);
    if (message.length < 3) return res.status(400).json({ error: 'message required' });

    const summary = { category, park, message, replyTo, ts: new Date().toISOString() };
    console.log('[feedback]', JSON.stringify(summary));

    // Accept the canonical name plus common casings so a mis-typed Vercel env
    // var still works (env vars are case-sensitive).
    const key = process.env.WEB3FORMS_KEY || process.env.Web3FormsKey
      || process.env.WEB3FORMSKEY || process.env.WEB3FORMS_ACCESS_KEY;
    let relayed = false, relayMsg = key ? '' : 'no WEB3FORMS_KEY env var found';
    if (key) {
      try {
        const w3 = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            access_key: key,
            subject: `[Wildlife Explorer] ${category}${park ? ` — ${park}` : ''}`,
            from_name: 'Wildlife Explorer feedback',
            email: replyTo || 'no-reply@wildlifeexplorer.us',
            message: `Category: ${category}\nPark: ${park || '(none)'}\nReply-to: ${replyTo || '(none)'}\n\n${message}`,
          }),
          signal: AbortSignal.timeout(10000),
        });
        const j = await w3.json().catch(() => ({}));
        relayed = w3.ok && j.success === true;
        relayMsg = `${w3.status}: ${j.message ?? '(no message)'}`;
        console.log('[feedback] relay', w3.status, 'success=' + j.success, j.message ? `msg=${j.message}` : '');
      } catch (e) { relayMsg = 'relay error: ' + String(e?.message || e); console.log('[feedback]', relayMsg); }
    } else {
      console.log('[feedback] relay skipped — no WEB3FORMS_KEY env var found');
    }
    // relayMsg is a generic Web3Forms status string (e.g. "please verify your
    // email") — not the key — so it's safe to expose for self-diagnosis.
    return res.status(200).json({ ok: true, relayed, relayMsg });
  } catch {
    return res.status(400).json({ error: 'bad request' });
  }
}
