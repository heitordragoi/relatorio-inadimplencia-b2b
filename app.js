/* ── Relatório Inadimplência B2B — app.js ── */

const COLORS = {
  navy:   '#0A212F',
  teal:   '#138090',
  tealLight: '#1a9aac',
  sand:   '#DCD8C4',
  amber:  '#E88737',
  coral:  '#ED7048',
  success:'#10B981',
  white:  '#FFFFFF',
  textSec:'#7A9AAA',
  border: '#1e2d35',
  grid:   'rgba(255,255,255,0.05)',
};

Chart.defaults.color = COLORS.textSec;
Chart.defaults.font.family = "'Google Sans Flex', 'Google Sans', sans-serif";
Chart.defaults.font.size = 12;

let data = null;
let charts = {};

// ── Load data ──
fetch('data.json')
  .then(r => r.json())
  .then(d => {
    data = d;
    init();
  })
  .catch(err => console.error('Erro ao carregar data.json:', err));

function init() {
  populateMeta();
  populateKPIs();
  populateFilters();
  renderTrend();
  renderSetor();
  renderPorte();
  renderTable();
  populateSources();
  bindFilters();
}

// ── Meta ──
function populateMeta() {
  const m = data.meta;
  document.getElementById('hero-year').textContent = m.ultima_atualizacao.split('-')[0];
  document.getElementById('mes-referencia').textContent = m.ultima_atualizacao_label;
  document.getElementById('footer-update').textContent =
    `Última atualização: ${m.ultima_atualizacao_label} · Próxima: ${m.proxima_atualizacao}`;

  const n = data.nacional;
  document.getElementById('taxa-nacional').textContent = formatPct(n.taxa_inadimplencia_pct);
  const varEl = document.getElementById('variacao-anual');
  const vr = n.variacao_anual_pp;
  varEl.textContent = `${vr > 0 ? '↑ +' : '↓ '}${Math.abs(vr).toFixed(1)} p.p. vs. ano anterior`;
  varEl.className = `big-number-var ${vr > 0 ? 'positive' : 'negative'}`;
}

// ── KPI cards ──
function populateKPIs() {
  const grid = document.getElementById('kpi-grid');
  data.destaques.forEach(d => {
    const el = document.createElement('div');
    el.className = 'kpi-card';
    el.innerHTML = `
      <div class="kpi-value">${d.valor}</div>
      <div class="kpi-desc">${d.descricao}</div>
    `;
    grid.appendChild(el);
  });
}

// ── Filters ──
function populateFilters() {
  const selSetor = document.getElementById('filter-setor');
  data.por_setor.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.setor;
    opt.textContent = s.setor;
    selSetor.appendChild(opt);
  });

  const selPorte = document.getElementById('filter-porte');
  data.por_porte.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.porte;
    opt.textContent = p.porte;
    selPorte.appendChild(opt);
  });
}

function bindFilters() {
  document.getElementById('filter-periodo').addEventListener('change', () => {
    renderTrend();
  });
  document.getElementById('filter-setor').addEventListener('change', () => {
    renderSetor();
    renderTable();
  });
  document.getElementById('filter-porte').addEventListener('change', () => {
    renderPorte();
  });
}

// ── Trend chart ──
function renderTrend() {
  const n = parseInt(document.getElementById('filter-periodo').value);
  const slice = data.historico.slice(-n);

  const labels = slice.map(h => h.label);
  const values = slice.map(h => h.taxa);

  if (charts.trend) charts.trend.destroy();

  const ctx = document.getElementById('chart-trend').getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, 0, 260);
  gradient.addColorStop(0, 'rgba(237,112,72,0.25)');
  gradient.addColorStop(1, 'rgba(237,112,72,0)');

  charts.trend = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Taxa de inadimplência (%)',
        data: values,
        borderColor: COLORS.coral,
        backgroundColor: gradient,
        borderWidth: 3,
        pointBackgroundColor: COLORS.coral,
        pointBorderColor: '#000',
        pointBorderWidth: 1.5,
        pointRadius: 5,
        pointHoverRadius: 8,
        tension: 0.35,
        fill: true,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0d1518',
          borderColor: COLORS.coral,
          borderWidth: 1,
          padding: 14,
          displayColors: false,
          callbacks: {
            title: ctx => ctx[0].label,
            label: ctx => `Inadimplência: ${ctx.parsed.y.toFixed(1)}%`
          }
        },
        datalabels: false,
      },
      scales: {
        x: {
          grid: { color: COLORS.grid },
          ticks: { color: COLORS.textSec, font: { size: 12 } }
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.07)' },
          ticks: {
            color: COLORS.textSec,
            font: { size: 12 },
            stepSize: 0.5,
            callback: v => v.toFixed(1) + '%'
          },
          min: Math.floor((Math.min(...values) - 0.5) * 2) / 2,
          max: Math.ceil((Math.max(...values) + 0.5) * 2) / 2,
        }
      }
    }
  });
}

// ── Sector chart ──
function renderSetor() {
  const filterVal = document.getElementById('filter-setor').value;
  let setores = data.por_setor;
  if (filterVal !== 'todos') setores = setores.filter(s => s.setor === filterVal);
  setores = [...setores].sort((a, b) => b.taxa - a.taxa);

  const labels = setores.map(s => s.setor);
  const values = setores.map(s => s.taxa);
  const bgColors = setores.map(s =>
    s.risco === 'alto' ? 'rgba(237,112,72,0.75)' :
    s.risco === 'medio' ? 'rgba(232,135,55,0.65)' :
    'rgba(19,128,144,0.65)'
  );

  if (charts.setor) charts.setor.destroy();

  const ctx = document.getElementById('chart-setor').getContext('2d');
  charts.setor = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Inadimplência (%)',
        data: values,
        backgroundColor: bgColors,
        borderRadius: 6,
        borderSkipped: false,
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0d1518',
          borderColor: COLORS.border,
          borderWidth: 1,
          padding: 12,
          displayColors: false,
          callbacks: { label: ctx => `${ctx.parsed.x.toFixed(1)}%` }
        }
      },
      scales: {
        x: {
          grid: { color: COLORS.grid },
          ticks: { color: COLORS.textSec, font: { size: 12 }, callback: v => v + '%' },
          min: 0, max: 35,
        },
        y: {
          grid: { display: false },
          ticks: { color: COLORS.textSec, font: { size: 12 } }
        }
      },
      // Inline value labels
      animation: {
        onComplete() {
          const chart = this;
          const ctx2 = chart.ctx;
          ctx2.save();
          ctx2.font = 'bold 12px "Google Sans Flex", sans-serif';
          ctx2.fillStyle = '#fff';
          ctx2.textAlign = 'left';
          ctx2.textBaseline = 'middle';
          chart.data.datasets.forEach((dataset, i) => {
            chart.getDatasetMeta(i).data.forEach((bar, j) => {
              const val = dataset.data[j];
              ctx2.fillText(`${val.toFixed(1)}%`, bar.x + 6, bar.y);
            });
          });
          ctx2.restore();
        }
      }
    }
  });
}

// ── Porte chart ──
function renderPorte() {
  const filterVal = document.getElementById('filter-porte').value;
  let portes = data.por_porte;
  if (filterVal !== 'todos') portes = portes.filter(p => p.porte === filterVal);

  const labels = portes.map(p => p.porte);
  const values = portes.map(p => p.taxa);

  if (charts.porte) charts.porte.destroy();

  const ctx = document.getElementById('chart-porte').getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, 700, 0);
  gradient.addColorStop(0, 'rgba(237,112,72,0.8)');
  gradient.addColorStop(1, 'rgba(19,128,144,0.6)');

  charts.porte = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Inadimplência (%)',
        data: values,
        backgroundColor: gradient,
        borderRadius: 6,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0d1518',
          borderColor: COLORS.border,
          borderWidth: 1,
          padding: 12,
          callbacks: { label: ctx => ` ${ctx.parsed.y.toFixed(1)}%` }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: COLORS.textSec }
        },
        y: {
          grid: { color: COLORS.grid },
          ticks: { color: COLORS.textSec, callback: v => v + '%' },
          min: 0, max: 40,
        }
      }
    }
  });
}

// ── Table ──
function renderTable() {
  const filterVal = document.getElementById('filter-setor').value;
  let setores = data.por_setor;
  if (filterVal !== 'todos') setores = setores.filter(s => s.setor === filterVal);
  setores = [...setores].sort((a, b) => b.taxa - a.taxa);

  const wrap = document.getElementById('table-setor');
  wrap.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Setor</th>
          <th>Taxa</th>
          <th>Var. anual</th>
          <th>Risco</th>
        </tr>
      </thead>
      <tbody>
        ${setores.map(s => `
          <tr>
            <td>${s.setor}</td>
            <td style="font-weight:600;color:var(--white)">${s.taxa.toFixed(1)}%</td>
            <td class="${s.variacao_anual > 0 ? 'var-up' : 'var-down'}">
              ${s.variacao_anual > 0 ? '↑ +' : '↓ '}${Math.abs(s.variacao_anual).toFixed(1)} p.p.
            </td>
            <td><span class="badge-risco badge-${s.risco}">${s.risco}</span></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// ── Sources ──
function populateSources() {
  const list = document.getElementById('sources-list');
  data.meta.fontes.forEach(f => {
    const el = document.createElement('a');
    el.href = f.url;
    el.target = '_blank';
    el.rel = 'noopener noreferrer';
    el.className = 'source-item';
    el.innerHTML = `
      <div class="source-dot"></div>
      <div>
        <div class="source-name">${f.nome}</div>
        <div class="source-dado">${f.dado}</div>
      </div>
    `;
    list.appendChild(el);
  });
}

// ── Utils ──
function formatPct(v) {
  return v.toFixed(1).replace('.', ',') + '%';
}
