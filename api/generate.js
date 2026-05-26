export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { prompt } = body || {};
  if (!prompt) return res.status(400).json({ error: 'Missing prompt in request body' });

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: 'GROQ_API_KEY environment variable is not set' });
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 400
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Groq API error', details: data });
    }

    if (!data.choices?.[0]?.message?.content) {
      return res.status(500).json({ error: 'Unexpected response from Groq', details: data });
    }

    return res.status(200).json({ email: data.choices[0].message.content });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}