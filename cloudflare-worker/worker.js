const MODEL = '@cf/meta/llama-3.1-8b-instruct';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    const { systemText, userText } = await request.json();
    if (!systemText || !userText) {
      return new Response(JSON.stringify({ error: 'Missing systemText or userText' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    if (!env.AI) {
      return new Response(JSON.stringify({ error: 'AI binding not configured — add an AI binding named "AI" in the Cloudflare dashboard' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    try {
      const result = await env.AI.run(MODEL, {
        messages: [
          { role: 'system', content: systemText },
          { role: 'user', content: userText },
        ],
        max_tokens: 4096,
      });

      const raw = result?.response ?? '';
      const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

      const normalized = text
        ? { candidates: [{ content: { parts: [{ text }] } }] }
        : { error: 'Empty response from AI' };

      return new Response(JSON.stringify(normalized), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: `AI failed: ${e.message}` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }
  },
};
