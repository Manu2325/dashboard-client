const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyiCx1fmc9AFmcj7SXFQbbRF7I2avwEHWemtDuWQKwmw5zaQZI1LCm8uu6Qv811ldec/exec'; 

let chartLobInstance = null;
let chartOutcomesInstance = null;

document.addEventListener('DOMContentLoaded', () => {
  fetchDashboardData();
});

async function fetchDashboardData() {
  try {
    console.log("Conectando en tiempo real con Google Sheets...");
    
    const response = await fetch(GOOGLE_SCRIPT_URL, { method: 'GET', redirect: 'follow' });
    
    if (!response.ok) throw new Error(`HTTP Status: ${response.status}`);
    
    const data = await response.json();
    console.log("¡Datos en vivo recibidos!", data);

    // Renderizar tablas HTML
    renderTable(data.summaryData, 'summaryTableContainer');
    renderTable(data.agentData, 'agentTableContainer');
    renderTable(data.skillData, 'skillsTableContainer');

    // Procesar métricas filtrando celdas desplazadas
    processLiveMetrics(data.summaryData);

  } catch (error) {
    console.error('Error cargando datos en vivo:', error);
    document.getElementById('summaryTableContainer').innerHTML = 
      `<div class="alert alert-warning">Error al procesar datos en vivo. <br><small>${error.message}</small></div>`;
  }
}

function renderTable(grid, containerId) {
  const container = document.getElementById(containerId);
  if (!container || !grid || grid.length === 0) return;

  const cleanGrid = grid.filter(row => row.some(cell => cell !== "" && cell !== null));

  let html = '<table class="table table-hover table-striped align-middle table-custom shadow-sm bg-white mb-0">';
  cleanGrid.forEach((row, rowIndex) => {
    if (rowIndex === 0) {
      html += '<thead class="table-dark"><tr>';
      row.forEach(cell => html += `<th>${cell || ''}</th>`);
      html += '</tr></thead><tbody>';
    } else {
      html += '<tr>';
      row.forEach(cell => html += `<td>${cell !== null && cell !== undefined ? cell : ''}</td>`);
      html += '</tr>';
    }
  });
  html += '</tbody></table>';
  container.innerHTML = html;
}

function processLiveMetrics(summaryData) {
  if (!summaryData || summaryData.length === 0) return;

  const lobNames = [];
  const totalCallsList = [];
  const ptpCallsList = [];

  let totalPortfolioRow = null;

  const targetLobs = ['CRC', 'CRCC', 'EQ_EARTHLINK', 'EARTHLINK', 'EARTHLINK (1ST PARTY)', 'OPTIMUM', 'OTHER / YENDO'];

  // BÚSQUEDA FLEXIBLE: Escanear todas las columnas por si hay celdas desplazadas/combinadas
  summaryData.forEach(row => {
    // Unir la fila entera en texto para buscar coincidencias fácilmente
    const rowText = row.map(c => (c || '').toString().toUpperCase().trim());

    // 1. Detectar la fila de Total Portfolio
    if (rowText.includes('TOTAL PORTFOLIO') && !totalPortfolioRow) {
      // Filtrar celdas vacías previas para normalizar el índice
      const cleanRow = row.filter(cell => cell !== "" && cell !== null);
      if (cleanRow.length >= 7) {
        totalPortfolioRow = cleanRow;
      }
    }

    // 2. Detectar LOBs para las gráficas
    targetLobs.forEach(lob => {
      const lobIdx = rowText.indexOf(lob);
      if (lobIdx !== -1) {
        // Encontrar los números más cercanos dentro de la misma fila
        const numbersInRow = row.map(c => parseInt((c || '0').toString().replace(/,/g, ''))).filter(n => !isNaN(n) && n > 0);
        
        if (numbersInRow.length >= 2) {
          lobNames.push(lob);
          totalCallsList.push(numbersInRow[0]); // Primer número es Total Calls
          ptpCallsList.push(numbersInRow[numbersInRow.length - 1]); // PTP Calls
        }
      }
    });
  });

  console.log("Fila Total Portfolio detectada:", totalPortfolioRow);

  // Mapear los KPI Cards de forma relativa sobre las celdas con datos reales
  if (totalPortfolioRow) {
    // [0] Total Portfolio | [1] Total Calls | [4] RPC Calls | [6] PTP Calls | [7] Conversion Rate %
    document.getElementById('kpiTotalCalls').innerText = totalPortfolioRow[1] || '15,809';
    document.getElementById('kpiRpc').innerText = totalPortfolioRow[4] || '5,937';
    document.getElementById('kpiPtp').innerText = totalPortfolioRow[6] || '3,056';
    document.getElementById('kpiConversion').innerText = totalPortfolioRow[7] || '51.5%';
  }

  // Valores para la Gráfica de Dona
  let nonRpcPct = 61.8, rpcPct = 37.6, convPct = 51.5;
  if (totalPortfolioRow && totalPortfolioRow.length >= 8) {
    nonRpcPct = parseFloat((totalPortfolioRow[3] || '61.8').toString().replace('%', '')) || 61.8;
    rpcPct = parseFloat((totalPortfolioRow[5] || '37.6').toString().replace('%', '')) || 37.6;
    convPct = parseFloat((totalPortfolioRow[7] || '51.5').toString().replace('%', '')) || 51.5;
  }

  renderCharts(lobNames, totalCallsList, ptpCallsList, [nonRpcPct, rpcPct, convPct]);
}

function renderCharts(lobLabels, totalCallsData, ptpCallsData, doughnutData) {
  if (chartLobInstance) chartLobInstance.destroy();
  if (chartOutcomesInstance) chartOutcomesInstance.destroy();

  const ctxLob = document.getElementById('lobChart')?.getContext('2d');
  if (ctxLob) {
    chartLobInstance = new Chart(ctxLob, {
      type: 'bar',
      data: {
        labels: lobLabels.length > 0 ? lobLabels : ['CRC', 'CRCC', 'EQ_EARTHLINK', 'EARTHLINK', 'OPTIMUM'],
        datasets: [
          { label: 'Total Calls', data: totalCallsData, backgroundColor: '#0d6efd' },
          { label: 'PTP Commitments', data: ptpCallsData, backgroundColor: '#198754' }
        ]
      },
      options: { responsive: true, plugins: { legend: { position: 'top' } } }
    });
  }

  const ctxOutcomes = document.getElementById('outcomesChart')?.getContext('2d');
  if (ctxOutcomes) {
    chartOutcomesInstance = new Chart(ctxOutcomes, {
      type: 'doughnut',
      data: {
        labels: ['NON-RPC %', 'RPC %', 'Conversion Rate %'],
        datasets: [{
          data: doughnutData,
          backgroundColor: ['#dc3545', '#ffc107', '#198754']
        }]
      },
      options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });
  }
}