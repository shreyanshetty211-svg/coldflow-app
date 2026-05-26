export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Log 1: API key check
  const apiKey = process.env.GROQ_API_KEY;
  console.log('GROQ_API_KEY exists:', !!apiKey);
  console.log('GROQ_API_KEY prefix:', apiKey ? apiKey.substring(0, 8) : 'MISSING');

  if (!apiKey) {
    return res.status(500).json({ error: 'GROQ_API_KEY is not set in environment variables' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { prompt } = body || {};

  // Log 2: Request body check
  console.log('Prompt received:', !!prompt);

  if (!prompt) {
    return res.status(400).json({ error: 'Missing prompt in request body' });
  }

  const requestBody = {
    model: 'llama-3.1-8b-instant',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 400
  };

  // Log 3: What we're sending to Groq
  console.log('Sending to Groq:', JSON.stringify(requestBody).substring(0, 200));

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    // Log 4: Groq response status
    console.log('Groq response status:', response.status);

    const data = await response.json();

    // Log 5: Full Groq response
    console.log('Groq response body:', JSON.stringify(data).substring(0, 500));

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Groq API error',
        status: response.status,
        details: data
      });
    }

    if (!data.choices?.[0]?.message?.content) {
      return res.status(500).json({
        error: 'Unexpected Groq response shape',
        details: data
      });
    }

    return res.status(200).json({ email: data.choices[0].message.content });

  } catch (error) {
    // Log 6: Caught error
    console.error('Caught error:', error.message);
    console.error('Error stack:', error.stack);
    return res.status(500).json({
      error: error.message,
      type: error.constructor.name
    });
  }
}
