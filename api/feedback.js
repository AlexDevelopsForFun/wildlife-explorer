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

    // Backup record only. Email delivery happens CLIENT-side (browser →
    // Web3Forms direct) because Web3Forms 403s server-to-server calls from
    // datacenter IPs. This just preserves a copy in the Vercel runtime logs
    // (filter "[feedback]") in case a browser submission's delivery is missed.
    console.log('[feedback]', JSON.stringify({ category, park, message, replyTo, ts: new Date().toISOString() }));
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(400).json({ error: 'bad request' });
  }
}
