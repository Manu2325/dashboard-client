export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ 
      error: 'GEMINI_API_KEY is not defined in Vercel environment variables.' 
    });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Google API Error:', data);
      return res.status(response.status).json({ 
        error: 'Google Gemini API Rejected Request', 
        details: data 
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Serverless Execution Error:', error);
    return res.status(500).json({ 
      error: 'Failed to communicate with Gemini API', 
      details: error.message 
    });
  }
}