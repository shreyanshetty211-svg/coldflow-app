export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GROQ_API_KEY;
  console.log('GROQ_API_KEY exists:', !!apiKey);
  console.log('GROQ_API_KEY prefix:', apiKey ? apiKey.substring(0, 8) : 'MISSING');

  if (!apiKey) {
    return res.status(500).json({ error: 'GROQ_API_KEY is not set in Vercel environment variables' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch (e) {
    return res.status(400).json({ error: 'Malformed request body: ' + e.message });
  }

  const { prompt } = body || {};
  console.log('Prompt received:', !!prompt);

  if (!prompt) {
    return res.status(400).json({ error: 'Missing prompt in request body' });
  }

  const requestBody = {
    model: 'llama-3.1-8b-instant',
    messages: [
      {
        role: 'system',
        content: `You are an expert cold email copywriter who writes for freelancers, founders, and agencies. Your emails sound like they were written by a real human, not AI.

Rules you never break:
- Never write "I hope you're doing well" or any filler opener
- Never use buzzwords: synergy, leverage, innovative, cutting-edge, game-changer
- Never write more than 110 words in the email body
- Always open with something specific to the prospect or a curiosity hook
- Write in short punchy paragraphs, max 2 sentences each
- The CTA must be one simple low-friction question
- Subject lines must be 4-7 words, lowercase, curiosity-driven — never salesy
- Sound confident but not pushy, casual but not sloppy
- Write like a real person sending from their personal inbox`
      },
      { role: 'user', content: prompt }
    ],
    max_tokens: 400,
    temperature: 0.85
  };

  console.log('Sending to Groq model:', requestBody.model);

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    console.log('Groq response status:', response.status);

    const data = await response.json();
    console.log('Groq response body:', JSON.stringify(data).substring(0, 500));

    if (response.status === 401) {
      return res.status(401).json({ error: 'Invalid Groq API key. Check your GROQ_API_KEY in Vercel.', details: data });
    }
    if (response.status === 429) {
      return res.status(429).json({ error: 'Groq rate limit exceeded. Try again in a moment.', details: data });
    }
    if (response.status === 400) {
      return res.status(400).json({ error: 'Bad request to Groq (possibly invalid model name).', details: data });
    }
    if (!response.ok) {
      return res.status(response.status).json({ error: `Groq API error ${response.status}`, details: data });
    }

    if (!data.choices?.[0]?.message?.content) {
      return res.status(500).json({ error: 'Unexpected Groq response shape', details: data });
    }

    return res.status(200).json({ email: data.choices[0].message.content });

  } catch (error) {
    console.error('Caught error:', error.message);
    console.error('Stack:', error.stack);
    return res.status(500).json({ error: error.message, type: error.constructor.name });
  }
}
