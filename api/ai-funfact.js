/**
 * Vercel serverless function — AI fun-fact generator
 *
 * Accepts: POST { animalName, parkName, parkState, animalType }
 * Returns: { description: string }
 *
 * Calls the Anthropic API server-side so the API key is never exposed to the
 * browser. Results are cached in localStorage by the client (descriptionService.js)
 * so this endpoint is only hit once per animal per park per device.
 *
 * Environment variable required:
 *   ANTHROPIC_API_KEY  — Anthropic API key (set in Vercel Dashboard → Settings → Environment Variables)
 */

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL             = 'claude-haiku-4-5-20251001';

// System prompt captures the exact tone of the hand-written fun facts.
const SYSTEM_PROMPT = `You write wildlife fun facts for a US national park wildlife app.
Style rules — follow them exactly:
- 2 sentences only, sometimes 3 if a vivid second detail adds real value
- Present tense throughout ("Bald eagles nest…", "Ospreys dive…")
- Specific to the exact park named — mention a real trail, valley, lake, or habitat by name when possible
- Focus on behavior, ecology, or a striking local detail a visitor would remember
- Written like a knowledgeable park ranger speaking to a curious visitor
- No "Did you know…" openers. No encyclopedic tone. No hedging ("may", "can sometimes").
- Concrete and sensory — make the reader picture the animal in that place

Good example (Harbor Seal, Acadia):
"Harbor seals haul out on Acadia's offshore ledges by the hundreds. They're most visible at low tide from the Bass Harbor Head Lighthouse area and on ledges off Schoodic Peninsula."

Good example (Common Loon, Acadia):
"Common loons nest on Acadia's freshwater ponds, raising chicks that often ride on their parents' backs for the first weeks of life. Their haunting wail echoing over Eagle Lake at dusk is one of the park's most iconic sounds."

Return only the fun fact text — no quotes, no labels, no extra commentary.`;

export default async function handler(req, res) {
  // CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  const { animalName, parkName, parkState, animalType } = req.body ?? {};
  if (!animalName || !parkName) {
    return res.status(400).json({ error: 'animalName and parkName are required' });
  }

  const typeLabel = animalType ? ` (${animalType})` : '';
  const userPrompt = `Write a wildlife fun fact about the ${animalName}${typeLabel} at ${parkName}${parkState ? `, ${parkState}` : ''}.`;

  try {
    const upstream = await fetch(ANTHROPIC_API_URL, {
      method:  'POST',
      headers: {
        'anthropic-version': '2023-06-01',
        'x-api-key':         apiKey,
        'content-type':      'application/json',
      },
      body: JSON.stringify({
        model:      MODEL,
        max_tokens: 300,
        system:     SYSTEM_PROMPT,
        messages:   [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      console.error('[ai-funfact] Anthropic error', upstream.status, errText);
      return res.status(502).json({ error: `Anthropic API error ${upstream.status}` });
    }

    const data        = await upstream.json();
    const description = data?.content?.[0]?.text?.trim() ?? null;

    if (!description) return res.status(502).json({ error: 'Empty response from Anthropic' });

    return res.status(200).json({ description });
  } catch (err) {
    console.error('[ai-funfact] fetch error:', err.message);
    return res.status(502).json({ error: 'Failed to reach Anthropic API' });
  }
}
