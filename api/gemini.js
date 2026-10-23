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

  // Lista de modelos ordenados por prioridad/disponibilidad para fallback automático
  const modelCandidates = [
    { version: 'v1beta', name: 'gemini-1.5-flash' },
    { version: 'v1beta', name: 'gemini-1.5-pro' },
    { version: 'v1', name: 'gemini-1.5-flash' }
  ];

  let lastErrorDetails = null;

  for (const model of modelCandidates) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/${model.version}/models/${model.name}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        }
      );

      const data = await response.json();

      if (response.ok) {
        return res.status(200).json(data);
      }

      lastErrorDetails = { status: response.status, data };
      console.warn(`Model ${model.name} failed (${response.status}). Trying next fallback...`);
    } catch (err) {
      lastErrorDetails = { status: 500, message: err.message };
    }
  }

  // Si todos los modelos fallaron por demanda alta (503) u otros motivos
  return res.status(lastErrorDetails?.status || 500).json({
    error: 'Google Gemini Service High Demand',
    details: lastErrorDetails
  });
}