document.getElementById('sendGeminiBtn')?.addEventListener('click', askGemini);

async function askGemini() {
  const input = document.getElementById('geminiInput');
  const responseBox = document.getElementById('geminiResponse');
  
  if (!input.value.trim()) return;
  
  const prompt = input.value;
  responseBox.innerText = 'Analizando con Gemini AI...';

  try {
    const res = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: `Analiza esta consulta del cliente sobre la operación: ${prompt}` })
    });
    
    const data = await res.json();
    
    if (data.candidates && data.candidates[0]) {
      responseBox.innerText = data.candidates[0].content.parts[0].text;
    } else {
      responseBox.innerText = 'No se obtuvo respuesta de Gemini.';
    }
  } catch (err) {
    responseBox.innerText = 'Error de conexión con el servidor.';
  }
}