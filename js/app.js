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

    // 1. Renderizar pestaña Executive Summary con resueltos de color y formatos condicionales
    renderSummaryTable(data.summaryData, 'summaryTableContainer');
    
    // 2. Renderizar pestaña Agent Performance con formatos condicionales por agente
    renderAgentPerformanceTable(data.agentData, 'agentTableContainer');
    
    // 3. Renderizar pestaña Skills
    renderSkillsTable(data.skillData, 'skillsTableContainer');

    // Procesar métricas globales
    processLiveMetrics(data.summaryData);

  } catch (error) {
    console.error('Error cargando datos en vivo:', error);
    document.getElementById('summaryTableContainer').innerHTML = 
      `<div class="alert alert-warning">Error al procesar datos en vivo. <br><small>${error.message}</small></div>`;
  }
}

// Función auxiliar para obtener la clase CSS según el nombre de la LOB
function getLobRowClass(lobName) {
  if (!lobName) return '';
  const text = lobName.toString().toUpperCase().trim();
  
  if (text.includes('EQ_EARTHLINK') || text.includes('EQ EARTHLINK')) {
    return 'row-eq-earthlink'; // Verde Claro
  } else if (text.includes('EARTHLINK')) {
    return 'row-earthlink';    // Azul Claro
  }
  return '';
}

// FORMATO CONDICIONAL PARA RPC %
function formatRpcPercent(valStr) {
  if (!valStr || valStr === '--') return valStr;
  const num = parseFloat(valStr.toString().replace('%', '').trim());
  if (isNaN(num)) return valStr;

  let colorClass = '';
  if (num >= 30) colorClass = 'badge-kpi-green';
  else if (num >= 15) colorClass = 'badge-kpi-yellow';
  else colorClass = 'badge-kpi-red';

  return `<span class="badge-kpi ${colorClass}">${valStr}</span>`;
}

// FORMATO CONDICIONAL PARA CONVERSION RATE %
function formatConversionPercent(lobName, valStr) {
  if (!valStr || valStr === '--') return valStr;
  const num = parseFloat(valStr.toString().replace('%', '').trim());
  if (isNaN(num)) return valStr;

  const lob = (lobName || '').toString().toUpperCase().trim();
  const isCrc = lob === 'CRC';

  let colorClass = '';
  
  if (isCrc) {
    // Reglas para CRC: > 50% verde, 20-49% amarillo, 0-19% rojo
    if (num >= 50) colorClass = 'badge-kpi-green';
    else if (num >= 20) colorClass = 'badge-kpi-yellow';
    else colorClass = 'badge-kpi-red';
  } else {
    // Reglas para CRCC, EQ_EARTHLINK, EARTHLINK, OPTIMUM, YENDO, Agentes
    // > 40% verde, 20-39% amarillo, 0-19% rojo
    if (num >= 40) colorClass = 'badge-kpi-green';
    else if (num >= 20) colorClass = 'badge-kpi-yellow';
    else colorClass = 'badge-kpi-red';
  }

  return `<span class="badge-kpi ${colorClass}">${valStr}</span>`;
}

// Renderizado Executive Summary con colores dinámicos y formato condicional
function renderSummaryTable(grid, containerId) {
  const container = document.getElementById(containerId);
  if (!container || !grid || grid.length === 0) return;

  const cleanGrid = grid.filter(row => row.some(cell => cell !== "" && cell !== null));

  let html = '';
  let inTable = false;

  cleanGrid.forEach((row) => {
    let cleanRow = [];
    let started = false;
    row.forEach(cell => {
      if (cell !== "" && cell !== null) started = true;
      if (started) cleanRow.push(cell);
    });

    if (cleanRow.length === 0) return;

    const mainTitleCell = cleanRow[0].toString().trim();

    // 1. BANNERS DE SECCIÓN
    const isSectionBanner = mainTitleCell.toUpperCase().includes('TOTAL PORTFOLIO SUMMARY') || 
                            mainTitleCell.toUpperCase().includes('TOTAL PORTFOLIO:') ||
                            mainTitleCell.toUpperCase().includes('AGENT PERFORMANCE PORTFOLIO SUMMARY');

    if (isSectionBanner) {
      if (inTable) {
        html += '</tbody></table></div>';
        inTable = false;
      }
      
      let cleanBannerText = mainTitleCell;
      if (cleanBannerText.toUpperCase().includes('TOTAL PORTFOLIO SUMMARY BY LINE OF BUSINESS')) {
        cleanBannerText = 'TOTAL PORTFOLIO SUMMARY BY LINE OF BUSINESS';
      } else if (cleanBannerText.toUpperCase().includes('TOTAL PORTFOLIO: PTP CODE NAME DISTRIBUTION')) {
        cleanBannerText = 'TOTAL PORTFOLIO: PTP CODE NAME DISTRIBUTION BY LINE OF BUSINESS';
      } else if (cleanBannerText.toUpperCase().includes('AGENT PERFORMANCE PORTFOLIO SUMMARY')) {
        cleanBannerText = 'AGENT PERFORMANCE PORTFOLIO SUMMARY';
      }

      html += `
        <div class="section-banner">
          <i class="fa-solid fa-layer-group me-2 text-primary"></i> ${cleanBannerText}
        </div>
      `;
      return;
    }

    // 2. ENCABEZADOS DE TABLA
    const isHeaderRow = mainTitleCell.toUpperCase().includes('LINE OF BUSINESS') || 
                        mainTitleCell.toUpperCase().includes('TOTAL CALLS') || 
                        mainTitleCell.toUpperCase().includes('AGENT NAME');

    if (isHeaderRow) {
      if (inTable) {
        html += '</tbody></table></div>';
      }
      
      const mainHeaders = cleanRow.slice(0, 10);

      html += '<div class="table-custom-wrapper table-responsive"><table class="table table-hover align-middle table-custom mb-0"><thead class="table-dark"><tr>';
      mainHeaders.forEach(cell => {
        if (cell !== undefined && cell !== "") html += `<th>${cell}</th>`;
      });
      html += '</tr></thead><tbody>';
      inTable = true;
      return;
    }

    // 3. FILAS DE DATOS CON FORMATO CONDICIONAL
    if (inTable) {
      const firstColText = mainTitleCell.toLowerCase();
      const isExactTotalRow = firstColText === 'total portfolio' || firstColText === 'total agent calls';
      
      let rowClass = isExactTotalRow ? 'fw-bold table-light' : getLobRowClass(mainTitleCell);

      const mainDataCells = cleanRow.slice(0, 10);

      html += `<tr class="${rowClass}">`;
      mainDataCells.forEach((cell, idx) => {
        if (cell !== undefined) {
          let cellValue = cell !== null ? cell : '';
          
          // Aplicar formato condicional solo en columnas RPC % (índice 5) y Conversion % (índice 7)
          if (!isExactTotalRow) {
            if (idx === 5) { // RPC %
              cellValue = formatRpcPercent(cellValue);
            } else if (idx === 7) { // Conversion Rate %
              cellValue = formatConversionPercent(mainTitleCell, cellValue);
            }
          }

          html += `<td>${cellValue}</td>`;
        }
      });
      html += '</tr>';
    }
  });

  if (inTable) {
    html += '</tbody></table></div>';
  }

  container.innerHTML = html;
}

// Renderizado Agent Performance con formato condicional por LOB en subtablas
function renderAgentPerformanceTable(grid, containerId) {
  const container = document.getElementById(containerId);
  if (!container || !grid || grid.length === 0) return;

  const cleanGrid = grid.filter(row => row.some(cell => cell !== "" && cell !== null));

  let html = '';
  let currentAgent = '';
  let leftRows = [];
  let rightRows = [];

  const flushAgentBlock = () => {
    if (!currentAgent) return;

    html += `
      <div class="agent-title-badge mb-3">
        <i class="fa-solid fa-user-check me-2 fs-5"></i> ${currentAgent}
      </div>
      <div class="row g-3 mb-4">
        <!-- Tabla Izquierda: Métricas por LOB -->
        <div class="col-lg-7">
          <div class="table-custom-wrapper table-responsive">
            <table class="table table-hover align-middle table-custom mb-0">
              <thead class="table-dark">
                <tr>
                  <th>LOB</th><th>TOTAL CALLS</th><th>NON-RPC</th><th>NON-RPC %</th><th>RPC</th><th>RPC %</th><th>PTP</th><th>CONVERSION %</th><th>OTHER</th>
                </tr>
              </thead>
              <tbody>
    `;

    leftRows.forEach(r => {
      const lobName = (r[0] || '').toString();
      const isTotal = lobName.toLowerCase().includes('total');
      const rowClass = isTotal ? 'fw-bold table-light' : getLobRowClass(lobName);
      
      html += `<tr class="${rowClass}">`;
      for (let i = 0; i < 9; i++) {
        let val = r[i] !== undefined && r[i] !== null ? r[i] : '';

        // Formatos condicionales para subtabla izquierda
        if (!isTotal) {
          if (i === 5) { // RPC %
            val = formatRpcPercent(val);
          } else if (i === 7) { // Conversion Rate %
            val = formatConversionPercent(lobName, val);
          }
        }

        html += `<td>${val}</td>`;
      }
      html += `</tr>`;
    });

    html += `
              </tbody>
            </table>
          </div>
        </div>

        <!-- Tabla Derecha: Distribución de Códigos PTP -->
        <div class="col-lg-5">
          <div class="table-custom-wrapper table-responsive">
            <table class="table table-hover align-middle table-custom mb-0">
              <thead class="table-dark">
                <tr>
                  <th>LOB</th><th>PTP CODE NAME</th><th>PTP CALLS</th><th>% OF LOB PTP</th>
                </tr>
              </thead>
              <tbody>
    `;

    rightRows.forEach(r => {
      const lobName = (r[0] || '').toString();
      const rowClass = getLobRowClass(lobName);

      html += `<tr class="${rowClass}">`;
      for (let i = 0; i < r.length; i++) {
        const val = r[i] !== undefined && r[i] !== null ? r[i] : '';
        html += `<td>${val}</td>`;
      }
      html += `</tr>`;
    });

    html += `
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    leftRows = [];
    rightRows = [];
  };

  cleanGrid.forEach((row) => {
    const agentTitleCandidate = (row[0] || row[1] || '').toString().trim();

    if (agentTitleCandidate.toUpperCase().startsWith('AGENT PERFORMANCE:')) {
      flushAgentBlock();
      currentAgent = agentTitleCandidate.split('|')[0].replace('AGENT PERFORMANCE:', '').trim();
      return;
    }

    const colBText = (row[1] || '').toString().trim();
    if (colBText.toUpperCase().includes('LINE OF BUSINESS') || colBText.toUpperCase().includes('TOTAL CALLS')) {
      return;
    }

    // LADO IZQUIERDO: Columnas B a J (Índices 1 a 9)
    const rawLeft = row.slice(1, 10);
    const leftHasData = rawLeft.some(c => c !== "" && c !== null);
    const leftTitle = (rawLeft[0] || '').toString().trim();

    if (leftHasData && leftTitle !== "" && !leftTitle.toUpperCase().includes('AGENT PERFORMANCE')) {
      const alreadyHasTotal = leftRows.some(r => (r[0] || '').toString().toLowerCase().includes('total'));
      if (!alreadyHasTotal) {
        leftRows.push(rawLeft);
      }
    }

    // LADO DERECHO: Columnas K a N (Índice 10 en adelante)
    const rawRight = row.slice(10).filter(c => c !== "" && c !== null);
    if (rawRight.length >= 2) {
      rightRows.push(rawRight);
    }
  });

  flushAgentBlock();

  container.innerHTML = html;
}

// Renderizado Agent Skills
function renderSkillsTable(grid, containerId) {
  const container = document.getElementById(containerId);
  if (!container || !grid || grid.length === 0) return;

  const cleanGrid = grid.filter(row => row.some(cell => cell !== "" && cell !== null));

  let html = '<div class="row g-3">';

  cleanGrid.forEach((row, rowIndex) => {
    const rowStr = row.join(' ').toLowerCase();
    if (rowStr.includes('active services') && rowIndex === 0) return;

    const agentName = row[0] ? row[0].toString().trim() : '';
    const rawServices = row[1] ? row[1].toString().trim() : '';

    if (!agentName) return;

    const skillsList = rawServices.split(',').map(s => s.trim()).filter(s => s !== '');

    html += `
      <div class="col-md-6 col-lg-4">
        <div class="skill-card shadow-sm">
          <div class="d-flex align-items-center mb-2">
            <div class="rounded-circle bg-primary bg-opacity-10 p-2 text-primary me-3">
              <i class="fa-solid fa-user-gear fs-5"></i>
            </div>
            <div>
              <h6 class="fw-bold mb-0 text-dark">${agentName}</h6>
              <span class="text-muted small">${skillsList.length} Servicios Activos</span>
            </div>
          </div>
          <hr class="my-2 text-muted opacity-25">
          <div class="mt-2">
    `;

    skillsList.forEach(skill => {
      let badgeColor = '';
      if (skill.toUpperCase().includes('EQ')) badgeColor = 'bg-success bg-opacity-10 text-success border-success';
      else if (skill.toUpperCase().includes('EARTHLINK')) badgeColor = 'bg-primary bg-opacity-10 text-primary border-primary';

      html += `<span class="skill-badge ${badgeColor}"><i class="fa-solid fa-check-double me-1 small"></i>${skill}</span>`;
    });

    html += `
          </div>
        </div>
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;
}

function processLiveMetrics(summaryData) {
  if (!summaryData || summaryData.length === 0) return;

  const lobNames = [];
  const totalCallsList = [];
  const ptpCallsList = [];

  let totalPortfolioRow = null;

  const targetLobs = ['CRC', 'CRCC', 'EQ_EARTHLINK', 'EARTHLINK (1ST PARTY)', 'EARTHLINK', 'OPTIMUM', 'OTHER / YENDO'];

  let isReadingFirstBlock = false;

  for (let i = 0; i < summaryData.length; i++) {
    const row = summaryData[i];
    const rowText = row.map(c => (c || '').toString().toUpperCase().trim());

    if (rowText.some(cell => cell.includes('TOTAL PORTFOLIO SUMMARY BY LINE OF BUSINESS'))) {
      isReadingFirstBlock = true;
      continue;
    }

    if (rowText.includes('TOTAL PORTFOLIO')) {
      if (!totalPortfolioRow) {
        totalPortfolioRow = row.filter(cell => cell !== "" && cell !== null);
      }
      isReadingFirstBlock = false;
    }

    if (isReadingFirstBlock) {
      const firstCol = (row[0] || row[1] || '').toString().toUpperCase().trim();

      if (targetLobs.includes(firstCol) && !lobNames.includes(firstCol)) {
        const cleanRow = row.filter(c => c !== "" && c !== null);

        if (cleanRow.length >= 7) {
          lobNames.push(firstCol);

          const totalCalls = parseInt((cleanRow[1] || '0').toString().replace(/,/g, '')) || 0;
          const ptpCalls = parseInt((cleanRow[6] || '0').toString().replace(/,/g, '')) || 0;

          totalCallsList.push(totalCalls);
          ptpCallsList.push(ptpCalls);
        }
      }
    }
  }

  if (totalPortfolioRow) {
    document.getElementById('kpiTotalCalls').innerText = totalPortfolioRow[1] || '0'; 
    document.getElementById('kpiRpc').innerText = totalPortfolioRow[4] || '0';        
    document.getElementById('kpiPtp').innerText = totalPortfolioRow[6] || '0';        
    document.getElementById('kpiConversion').innerText = totalPortfolioRow[7] || '0%'; 
  }

  let nonRpcPct = 61.9, rpcPct = 37.4, convPct = 51.5;
  if (totalPortfolioRow && totalPortfolioRow.length >= 8) {
    nonRpcPct = parseFloat((totalPortfolioRow[3] || '61.9').toString().replace('%', '')) || 61.9;
    rpcPct = parseFloat((totalPortfolioRow[5] || '37.4').toString().replace('%', '')) || 37.4;
    convPct = parseFloat((totalPortfolioRow[7] || '51.5').toString().replace('%', '')) || 51.5;
  }

  renderCharts(lobNames, totalCallsList, ptpCallsList, [nonRpcPct, rpcPct, convPct]);
}

function renderCharts(lobLabels, totalCallsData, ptpCallsData, doughnutData) {
  if (chartLobInstance) chartLobInstance.destroy();
  if (chartOutcomesInstance) chartOutcomesInstance.destroy();

  if (typeof ChartDataLabels !== 'undefined') {
    Chart.register(ChartDataLabels);
  }

  const maxValInLobs = totalCallsData.length > 0 ? Math.max(...totalCallsData) : 10000;
  const dynamicYMax = maxValInLobs + 1800;

  const ctxLob = document.getElementById('lobChart')?.getContext('2d');
  if (ctxLob) {
    chartLobInstance = new Chart(ctxLob, {
      type: 'bar',
      data: {
        labels: lobLabels,
        datasets: [
          {
            label: 'Total Calls',
            data: totalCallsData,
            backgroundColor: '#0d6efd',
            borderRadius: 6,
            barPercentage: 0.7,
            categoryPercentage: 0.6
          },
          {
            label: 'PTP Commitments',
            data: ptpCallsData,
            backgroundColor: '#198754',
            borderRadius: 6,
            barPercentage: 0.7,
            categoryPercentage: 0.6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { font: { family: 'Plus Jakarta Sans', weight: '600', size: 13 } }
          },
          datalabels: {
            anchor: 'end',
            align: 'top',
            formatter: (value) => value > 0 ? value.toLocaleString() : '',
            font: { family: 'Plus Jakarta Sans', weight: 'bold', size: 11 },
            color: '#2b3445',
            offset: 2
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: dynamicYMax,
            grid: { color: '#f0f2f5' },
            ticks: {
              font: { family: 'Plus Jakarta Sans', size: 11 },
              stepSize: Math.ceil(dynamicYMax / 4)
            }
          },
          x: {
            grid: { display: false },
            ticks: {
              font: { family: 'Plus Jakarta Sans', weight: '600', size: 11 },
              color: '#495057'
            }
          }
        }
      }
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
          backgroundColor: ['#dc3545', '#ffc107', '#198754'],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { font: { family: 'Plus Jakarta Sans', size: 12 } } },
          datalabels: {
            formatter: (value) => value + '%',
            color: '#ffffff',
            font: { weight: 'bold', size: 12 }
          }
        }
      }
    });
  }
}