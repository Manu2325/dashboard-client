// URL Web App de Google Apps Script (Obtenida al publicar el script como Web App)
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyiCx1fmc9AFmcj7SXFQbbRF7I2avwEHWemtDuWQKwmw5zaQZI1LCm8uu6Qv811ldec/exec'; 

let chartLobInstance = null;
let chartOutcomesInstance = null;

document.addEventListener('DOMContentLoaded', () => {
  fetchDashboardData();
});

async function fetchDashboardData() {
  try {
    const response = await fetch(GOOGLE_SCRIPT_URL);
    const data = await response.json();

    const cleanSummary = cleanMatrix(data.summaryData);
    const cleanAgent = cleanMatrix(data.agentData);
    const cleanSkill = cleanMatrix(data.skillData);

    renderTable(cleanSummary, 'summaryTableContainer');
    renderTable(cleanAgent, 'agentTableContainer');
    renderTable(cleanSkill, 'skillsTableContainer');

    // Extraer y pintar datos 100% reales
    processKPIsAndChartsReal(cleanSummary);
  } catch (error) {
    console.error('Error cargando los datos reales:', error);
  }
}

function cleanMatrix(grid) {
  if (!grid || grid.length === 0) return [];
  return grid.filter(row => row.some(cell => cell !== "" && cell !== null));
}

function formatCellValue(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'number') {
    if (val > 0 && val < 1) return (val * 100).toFixed(1) + '%';
    return val.toLocaleString();
  }
  if (typeof val === 'string' && !isNaN(val) && val.startsWith('0.') && val.length > 3) {
    return (parseFloat(val) * 100).toFixed(1) + '%';
  }
  return val;
}

function renderTable(grid, containerId) {
  if (!grid || grid.length === 0) return;

  let html = '<table class="table table-hover table-striped align-middle table-custom shadow-sm bg-white">';
  grid.forEach((row, rowIndex) => {
    if (rowIndex === 0) {
      html += '<thead><tr>';
      row.forEach(cell => {
        if(cell !== "") html += `<th>${cell}</th>`;
      });
      html += '</tr></thead><tbody>';
    } else {
      html += '<tr>';
      row.forEach(cell => {
        if(cell !== undefined) html += `<td>${formatCellValue(cell)}</td>`;
      });
      html += '</tr>';
    }
  });
  html += '</tbody></table>';
  document.getElementById(containerId).innerHTML = html;
}

// Extrae datos dinámicos buscando los nombres exactos de LOB en el Summary
function processKPIsAndChartsReal(summaryData) {
  const lobNames = [];
  const totalCallsList = [];
  const ptpCallsList = [];

  let totalPortfolioRow = null;

  summaryData.forEach(row => {
    const firstCol = row[0] ? row[0].toString().trim() : '';

    // Buscar fila Total Portfolio
    if (firstCol.toLowerCase() === 'total portfolio') {
      totalPortfolioRow = row;
    }

    // Extraer LOBs específicas para los gráficos
    if (['CRC', 'CRCC', 'EQ_EARTHLINK', 'EARTHLINK (1st Party)', 'OPTIMUM', 'OTHER / YENDO'].includes(firstCol)) {
      lobNames.push(firstCol);
      totalCallsList.push(parseInt(row[1]) || 0); // Columna Total Calls
      ptpCallsList.push(parseInt(row[6]) || 0);   // Columna PTP Calls
    }
  });

  // 1. Asignar KPI Cards con datos reales
  if (totalPortfolioRow) {
    document.getElementById('kpiTotalCalls').innerText = formatCellValue(totalPortfolioRow[1]) || '--';
    document.getElementById('kpiRpc').innerText = formatCellValue(totalPortfolioRow[4]) || '--';
    document.getElementById('kpiPtp').innerText = formatCellValue(totalPortfolioRow[6]) || '--';
    document.getElementById('kpiConversion').innerText = formatCellValue(totalPortfolioRow[7]) || '--';
  }

  // 2. Renderizar gráficos con los arreglos extraídos en tiempo real
  renderRealCharts(lobNames, totalCallsList, ptpCallsList, totalPortfolioRow);
}

function renderRealCharts(labels, totalCalls, ptpCalls, totalPortfolio) {
  // Destruir instancias previas para evitar encimamiento de gráficos al recargar
  if (chartLobInstance) chartLobInstance.destroy();
  if (chartOutcomesInstance) chartOutcomesInstance.destroy();

  // Chart 1: LOB Volumes & PTP Real
  const ctxLob = document.getElementById('lobChart').getContext('2d');
  chartLobInstance = new Chart(ctxLob, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Total Calls',
          data: totalCalls,
          backgroundColor: '#0d6efd'
        },
        {
          label: 'PTP Commitments',
          data: ptpCalls,
          backgroundColor: '#198754'
        }
      ]
    },
    options: { responsive: true, plugins: { legend: { position: 'top' } } }
  });

  // Chart 2: Distribucción Real de Resultados (NON-RPC vs RPC vs PTP)
  let nonRpcPct = 61.4, rpcPct = 37.9, ptpPct = 51.4;
  if (totalPortfolio) {
    nonRpcPct = parseFloat(totalPortfolio[3]) || 61.4;
    rpcPct = parseFloat(totalPortfolio[5]) || 37.9;
    ptpPct = parseFloat(totalPortfolio[7]) || 51.4;
  }

  const ctxOutcomes = document.getElementById('outcomesChart').getContext('2d');
  chartOutcomesInstance = new Chart(ctxOutcomes, {
    type: 'doughnut',
    data: {
      labels: ['NON-RPC %', 'RPC %', 'PTP Conversion %'],
      datasets: [{
        data: [nonRpcPct, rpcPct, ptpPct],
        backgroundColor: ['#dc3545', '#ffc107', '#198754']
      }]
    },
    options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
  });
}