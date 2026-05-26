export default function handler(req, res) {
  const key = process.env.GROQ_API_KEY || '';
  res.status(200).json({
    hasKey: !!key,
    keyPrefix: key.slice(0, 6),
    keyLength: key.length,
    nodeEnv: process.env.NODE_ENV
  });
}
