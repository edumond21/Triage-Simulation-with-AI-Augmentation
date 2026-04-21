const MODEL = 'llama-3.3-70b-versatile';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

async function callGroqWithRetry(key, body, maxRetries = 3) {
  let lastResponse;
  let delay = 2000;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, delay));

    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify(body),
    });

    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after');
      delay = retryAfter ? parseFloat(retryAfter) * 1000 : delay * 2;
      lastResponse = response;
      continue;
    }

    return response;
  }

  return lastResponse;
}

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

    const groqBody = {
      model: MODEL,
      messages: [
        { role: 'system', content: systemText },
        { role: 'user', content: userText },
      ],
      max_tokens: 8192,
    };

    const response = await callGroqWithRetry(env.GROQ_KEY, groqBody);
    const data = await response.json();

    // Normalize to Gemini-style response so the frontend needs no changes
    const raw = data.choices?.[0]?.message?.content;
    const text = raw ? raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim() : null;
    const normalized = text
      ? { candidates: [{ content: { parts: [{ text }] } }] }
      : data;

    return new Response(JSON.stringify(normalized), {
      status: response.status,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  },
};
