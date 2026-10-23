document.getElementById('sendGeminiBtn')?.addEventListener('click', askGemini);
document.getElementById('geminiInput')?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') askGemini();
});

async function askGemini() {
  const input = document.getElementById('geminiInput');
  const responseBox = document.getElementById('geminiResponse');
  
  const promptText = input.value.trim();
  if (!promptText) return;
  
  // Extraer contexto del Dashboard
  const totalCalls = document.getElementById('kpiTotalCalls')?.innerText || '--';
  const rpcCalls = document.getElementById('kpiRpc')?.innerText || '--';
  const ptpCommitments = document.getElementById('kpiPtp')?.innerText || '--';
  const avgConversion = document.getElementById('kpiConversion')?.innerText || '--';

  const agentContainer = document.getElementById('agentTableContainer');
  let agentContextData = '';
  if (agentContainer) {
    agentContextData = agentContainer.innerText.slice(0, 3000);
  }

  const liveContext = `
    [REAL-TIME BOGOTA OPERATIONS DASHBOARD CONTEXT]:
    - Total Portfolio Calls: ${totalCalls}
    - RPC Calls: ${rpcCalls}
    - PTP Commitments: ${ptpCommitments}
    - Average Conversion Rate: ${avgConversion}

    [AGENT PERFORMANCE DATA]:
    ${agentContextData}

    SYSTEM INSTRUCTION: Always respond in professional executive English. Provide concise operational data insights.
  `;

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
      if (res.status === 503 || res.status === 429) {
        responseBox.innerHTML = `
          <div class="alert alert-warning mb-0 border-0 shadow-sm p-3">
            <h6 class="fw-bold mb-1 text-dark"><i class="fa-solid fa-server me-2 text-warning"></i>High Demand on AI Provider</h6>
            <p class="small text-muted mb-0">Google's Gemini servers are currently experiencing peak global traffic. The system automatically retried across back-up models, but traffic remains high. Please try your request again in a few moments.</p>
          </div>
        `;
      } else {
        const errMsg = data.details?.data?.error?.message || data.error || `HTTP Status ${res.status}`;
        responseBox.innerHTML = `
          <div class="alert alert-danger mb-0 small">
            <i class="fa-solid fa-triangle-exclamation me-1"></i>
            <strong>API Status (${res.status}):</strong> ${errMsg}
          </div>
        `;
      }
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
    responseBox.innerHTML = `<span class="text-danger"><i class="fa-solid fa-triangle-exclamation me-1"></i> Connection error with serverless endpoint.</span>`;
  }
}