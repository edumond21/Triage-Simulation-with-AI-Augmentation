module.exports = async function (context, req) {
  const { systemText, userText } = req.body || {};

  if (!systemText || !userText) {
    context.res = { status: 400, body: { error: 'Missing systemText or userText' } };
    return;
  }

  const key = process.env.GEMINI_KEY;
  if (!key) {
    context.res = { status: 500, body: { error: 'GEMINI_KEY not configured in environment' } };
    return;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemText }] },
        contents: [{ parts: [{ text: userText }] }],
        generationConfig: { maxOutputTokens: 4096, responseMimeType: 'application/json' }
      })
    });

    const data = await response.json();
    context.res = {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
      body: data
    };
  } catch (e) {
    context.res = { status: 500, body: { error: e.message } };
  }
};
