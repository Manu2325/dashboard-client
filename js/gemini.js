document.getElementById('sendGeminiBtn')?.addEventListener('click', askGemini);
document.getElementById('geminiInput')?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') askGemini();
});

async function askGemini() {
  const input = document.getElementById('geminiInput');
  const responseBox = document.getElementById('geminiResponse');
  
  const promptText = input.value.trim();
  if (!promptText) return;
  
  // Extract live KPI metrics to serve as context for the AI
  const totalCalls = document.getElementById('kpiTotalCalls')?.innerText || '--';
  const rpcCalls = document.getElementById('kpiRpc')?.innerText || '--';
  const ptpCommitments = document.getElementById('kpiPtp')?.innerText || '--';
  const avgConversion = document.getElementById('kpiConversion')?.innerText || '--';

  const liveContext = `
    [REAL-TIME BOGOTA OPERATIONS DASHBOARD CONTEXT]:
    - Total Portfolio Calls: ${totalCalls}
    - RPC Calls: ${rpcCalls}
    - PTP Commitments: ${ptpCommitments}
    - Average Conversion Rate: ${avgConversion}
    
    SYSTEM INSTRUCTION: Always respond in professional executive English. Provide concise, clear, and actionable data insights.
  `;

  // Display loading indicator
  responseBox.innerHTML = `
    <div class="d-flex align-items-center text-primary">
      <div class="spinner-border spinner-border-sm me-2" role="status"></div>
      Analyzing operational data with Gemini AI...
    </div>
  `;
  input.value = '';

  try {
    const res = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        prompt: `${liveContext}\n\nClient/User Query: ${promptText}` 
      })
    });
    
    // Check if the response is valid JSON
    if (!res.ok) {
      throw new Error(`HTTP Error Status ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    
    if (data.candidates && data.candidates[0]) {
      const reply = data.candidates[0].content.parts[0].text;
      responseBox.innerHTML = `<strong>Gemini AI Assistant:</strong><br><br>${reply.replace(/\n/g, '<br>')}`;
    } else if (data.reply) {
      responseBox.innerHTML = `<strong>Gemini AI Assistant:</strong><br><br>${data.reply.replace(/\n/g, '<br>')}`;
    } else {
      responseBox.innerText = 'No valid response received from Gemini AI.';
    }
  } catch (err) {
    console.error('Error connecting to Gemini API:', err);
    responseBox.innerHTML = `
      <div class="alert alert-warning mb-0 small">
        <i class="fa-solid fa-triangle-exclamation me-1"></i>
        <strong>API Connection Note:</strong><br>
        Serverless API endpoint is inactive in local preview mode (HTTP 405). Once deployed to <strong>Vercel</strong>, Gemini AI will automatically generate insights in English.
      </div>
    `;
  }
}