document.getElementById('sendGeminiBtn')?.addEventListener('click', askGemini);
document.getElementById('geminiInput')?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') askGemini();
});

async function askGemini() {
  const input = document.getElementById('geminiInput');
  const responseBox = document.getElementById('geminiResponse');
  
  const promptText = input.value.trim();
  if (!promptText) return;
  
  // 1. Extraer KPIs Generales del Dashboard
  const totalCalls = document.getElementById('kpiTotalCalls')?.innerText || '--';
  const rpcCalls = document.getElementById('kpiRpc')?.innerText || '--';
  const ptpCommitments = document.getElementById('kpiPtp')?.innerText || '--';
  const avgConversion = document.getElementById('kpiConversion')?.innerText || '--';

  // 2. Extraer texto visible de la pestaña de Agent Performance
  const agentContainer = document.getElementById('agentTableContainer');
  let agentContextData = '';
  if (agentContainer) {
    // Captura el texto con el desglose de métricas por agente
    agentContextData = agentContainer.innerText.slice(0, 3000); // Límite para no saturar el prompt
  }

  const liveContext = `
    [REAL-TIME BOGOTA OPERATIONS DASHBOARD CONTEXT]:
    - Total Portfolio Calls: ${totalCalls}
    - RPC Calls: ${rpcCalls}
    - PTP Commitments: ${ptpCommitments}
    - Average Conversion Rate: ${avgConversion}

    [AGENT PERFORMANCE BREAKDOWN DATA]:
    ${agentContextData}

    SYSTEM INSTRUCTION: Always respond in professional executive English. Provide concise and clear data insights for management regarding agents and LOBs.
  `;

  // Mostrar spinner de carga
  responseBox.innerHTML = `
    <div class="d-flex align-items-center text-primary">
      <div class="spinner-border spinner-border-sm me-2" role="status"></div>
      Analyzing operational metrics with Gemini AI...
    </div>
  `;
  input.value = '';

  try {
    const res = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        prompt: `${liveContext}\n\nClient Query: ${promptText}` 
      })
    });
    
    const data = await res.json();

    if (!res.ok) {
      // Si la API devuelve un error 500 con detalles
      const errDetails = data.details?.error?.message || data.error || `HTTP ${res.status}`;
      responseBox.innerHTML = `
        <div class="alert alert-danger mb-0 small">
          <i class="fa-solid fa-triangle-exclamation me-1"></i>
          <strong>API Error (${res.status}):</strong> ${errDetails}
        </div>
      `;
      return;
    }
    
    if (data.candidates && data.candidates[0]) {
      const reply = data.candidates[0].content.parts[0].text;
      responseBox.innerHTML = `<strong>Gemini AI Assistant:</strong><br><br>${reply.replace(/\n/g, '<br>')}`;
    } else {
      responseBox.innerText = 'No valid response returned from Gemini AI.';
    }
  } catch (err) {
    console.error('Error connecting to Gemini API endpoint:', err);
    responseBox.innerHTML = `<span class="text-danger"><i class="fa-solid fa-triangle-exclamation me-1"></i> Connection error with /api/gemini endpoint.</span>`;
  }
}