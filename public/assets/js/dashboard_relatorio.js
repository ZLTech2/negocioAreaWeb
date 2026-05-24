// ══ Estado global ═════════════════════════════════════════════════════════════

let analyticsData      = null;
let currentPeriodo     = 'mes';
let currentGranularity = 'diario';

// ══ Seletores ═════════════════════════════════════════════════════════════════

const loadingState  = document.getElementById('loadingState');
const errorState    = document.getElementById('errorState');
const dashContent   = document.getElementById('dashContent');
const metricCards   = document.getElementById('metricCards');
const topBairrosEl  = document.getElementById('topBairros');
const hourChartEl   = document.getElementById('hourChart');
const weekChartEl   = document.getElementById('weekChart');
const insightsEl    = document.getElementById('insights');
const reportFooter  = document.getElementById('reportFooter');
const businessName  = document.getElementById('businessName');
const errorMsg      = document.getElementById('errorMsg');
const hourHighlight = document.getElementById('hourHighlight');
const weekHighlight = document.getElementById('weekHighlight');

// ══ Controle de estados ════════════════════════════════════════════════════════

function showLoading() {
  loadingState.style.display = 'flex';
  errorState.style.display   = 'none';
  dashContent.style.display  = 'none';
}

function showError(msg) {
  loadingState.style.display = 'none';
  errorState.style.display   = 'flex';
  dashContent.style.display  = 'none';
  errorMsg.textContent       = msg || 'Erro ao carregar dados.';
}

function showContent() {
  loadingState.style.display = 'none';
  errorState.style.display   = 'none';
  dashContent.style.display  = 'block';
}

// Redireciona para login (chamado por api.js via evento sessionExpired)
function showLoginScreen() {
  window.location.href = '../login.html';
}

async function loadDashboard() {
  showLoading();
  try {
    // Buscar perfil da empresa para exibir o nome
    try {
      const perfil = await fetchPerfilEmpresa();
      if (perfil && perfil.nome) {
        businessName.textContent = perfil.nome;
        localStorage.setItem('empresa_nome', perfil.nome);
      }
    } catch (_) { /* não bloqueia */ }

    // Buscar analytics
    analyticsData = await fetchAnalytics(currentPeriodo);
    if (!analyticsData) throw new Error('Dados não encontrados.');

    renderAll(analyticsData);
    showContent();

    reportFooter.innerHTML = `<p>Relatório gerado em ${new Date().toLocaleString('pt-BR')}</p>`;

  } catch (err) {
    showError(err.message || 'Não foi possível carregar os dados.');
  }
}

// ══ Filtros ═══════════════════════════════════════════════════════════════════

document.getElementById('periodFilter').addEventListener('change', async (e) => {
  currentPeriodo = e.target.value;
  await loadDashboard();
});

document.getElementById('chartGranularity').addEventListener('change', (e) => {
  currentGranularity = e.target.value;
  if (analyticsData) drawLineChart(analyticsData.curtidasPorDia, currentGranularity);
});

document.getElementById('retryBtn').addEventListener('click', loadDashboard);

document.getElementById('printReport').addEventListener('click', () => window.print());

window.addEventListener('resize', () => {
  if (analyticsData) drawLineChart(analyticsData.curtidasPorDia, currentGranularity);
});

// ══ Renderizadores ════════════════════════════════════════════════════════════

function renderAll(data) {
  renderMetrics(data);
  renderBairros(data.curtidasPorBairro || []);
  renderHourChart(data.curtidasPorHora || []);
  renderWeekChart(data.curtidasPorDiaSemana || []);
  renderInsights(data);
  drawLineChart(data.curtidasPorDia || [], currentGranularity);
}

// ── Cards de métricas ─────────────────────────────────────────────────────────

function renderMetrics(data) {
  const variacao     = data.variacaoPercentual ?? 0;
  const variacaoHtml = variacao >= 0
    ? `<span class="positive">+${variacao.toFixed(1)}%</span> em relação ao mês passado`
    : `<span class="negative">${variacao.toFixed(1)}%</span> em relação ao mês passado`;

  const metrics = [
    {
      label: 'Total de curtidas',
      value: (data.totalCurtidas ?? 0).toLocaleString('pt-BR'),
      note:  'Todas as publicações da sua loja',
      icon:  '♥',
      color: 'purple',
    },
    {
      label: 'Curtidas este mês',
      value: (data.curtidasMesAtual ?? 0).toLocaleString('pt-BR'),
      note:  variacaoHtml,
      icon:  variacao >= 0 ? '↗' : '↘',
      color: variacao >= 0 ? 'green' : 'pink',
    },
    {
      label: 'Publicação mais curtida',
      value: data.publicacaoMaisCurtida ?? '—',
      note:  `${(data.curtidasPublicacaoTop ?? 0).toLocaleString('pt-BR')} curtidas`,
      icon:  '🏆',
      color: 'yellow',
    },
    {
      label: 'Média por publicação',
      value: (data.mediaPorPublicacao ?? 0).toFixed(1),
      note:  'Curtidas por divulgação',
      icon:  '▥',
      color: 'blue',
    },
  ];

  metricCards.innerHTML = metrics.map((m) => {
    const cls = m.value.length > 10 ? 'metric-value long-value' : 'metric-value';
    return `
      <article class="metric-card">
        <span class="metric-icon ${m.color}" aria-hidden="true">${m.icon}</span>
        <div>
          <p class="metric-label">${m.label}</p>
          <strong class="${cls}">${m.value}</strong>
          <p class="metric-note">${m.note}</p>
        </div>
      </article>
    `;
  }).join('');
}

// ── Curtidas por bairro ───────────────────────────────────────────────────────

const BAIRRO_COLORS = ['#6b4ce6','#8b5cf6','#a78bfa','#c4b5fd','#ddd6fe','#ede9ff'];

function renderBairros(bairros) {
  if (!bairros.length) {
    topBairrosEl.innerHTML = '<p class="empty-state">Nenhum dado de bairro disponível.</p>';
    return;
  }
  const max = Math.max(...bairros.map((b) => b.total));
  topBairrosEl.innerHTML = bairros.slice(0, 6).map((b, i) => {
    const width = Math.round((b.total / max) * 100);
    const color = BAIRRO_COLORS[i] || '#6b4ce6';
    return `
      <div class="post-row">
        <span class="post-image" style="background:${color}" aria-hidden="true"></span>
        <p class="post-title">${b.bairro}</p>
        <div class="progress" aria-label="${b.total} curtidas">
          <span style="width:${width}%;background:${color}"></span>
        </div>
        <strong class="post-likes">${b.total.toLocaleString('pt-BR')}</strong>
      </div>
    `;
  }).join('');
}

// ── Gráfico de linha ──────────────────────────────────────────────────────────

function drawLineChart(porDia, granularity = 'diario') {
  const canvas  = document.getElementById('likesLineChart');
  const context = canvas.getContext('2d');

  // Agregar dados conforme granularidade
  let labels = [];
  let values = [];

  if (!porDia || !porDia.length) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#6b7494';
    context.font = '14px DM Sans, sans-serif';
    context.textAlign = 'center';
    context.fillText('Sem dados no período selecionado', canvas.clientWidth / 2, canvas.clientHeight / 2);
    return;
  }

  if (granularity === 'semanal') {
    // Agrupar por semana
    const semanas = {};
    porDia.forEach(({ data, total }) => {
      const d    = new Date(data + 'T00:00:00');
      const dow  = d.getDay();
      const seg  = new Date(d);
      seg.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
      const key  = seg.toISOString().split('T')[0];
      semanas[key] = (semanas[key] || 0) + total;
    });
    const sorted = Object.entries(semanas).sort(([a], [b]) => a.localeCompare(b));
    sorted.forEach(([data, total]) => {
      labels.push(formatDate(data));
      values.push(total);
    });
  } else {
    porDia.forEach(({ data, total }) => {
      labels.push(formatDate(data));
      values.push(total);
    });
  }

  // DPI
  const pr       = window.devicePixelRatio || 1;
  const cssW     = canvas.clientWidth;
  const cssH     = canvas.clientHeight;
  canvas.width   = cssW * pr;
  canvas.height  = cssH * pr;
  context.setTransform(pr, 0, 0, pr, 0, 0);
  context.clearRect(0, 0, cssW, cssH);

  const pad     = { top: 18, right: 28, bottom: 40, left: 48 };
  const W       = cssW - pad.left - pad.right;
  const H       = cssH - pad.top  - pad.bottom;
  const maxVal  = Math.max(...values, 1);
  const step    = niceStep(maxVal);
  const topTick = Math.ceil(maxVal / step) * step;

  const pts = values.map((v, i) => ({
    x: pad.left + (i / Math.max(values.length - 1, 1)) * W,
    y: pad.top  + H - (v / topTick) * H,
    v,
  }));

  // Grid + Y labels
  context.strokeStyle = '#e8eaf4';
  context.lineWidth   = 1;
  context.fillStyle   = '#6b7494';
  context.font        = '12px DM Sans, sans-serif';
  context.textAlign   = 'right';
  context.textBaseline = 'middle';

  for (let t = 0; t <= topTick; t += step) {
    const y = pad.top + H - (t / topTick) * H;
    context.beginPath();
    context.moveTo(pad.left, y);
    context.lineTo(pad.left + W, y);
    context.stroke();
    context.fillText(String(t), pad.left - 10, y);
  }

  // X labels — mostrar apenas alguns para não sobrepor
  const maxLabels = Math.min(labels.length, Math.floor(cssW / 70));
  const step2     = Math.ceil(labels.length / maxLabels);
  context.textAlign    = 'center';
  context.textBaseline = 'top';
  labels.forEach((lbl, i) => {
    if (i % step2 !== 0 && i !== labels.length - 1) return;
    const x = pad.left + (i / Math.max(labels.length - 1, 1)) * W;
    context.fillText(lbl, x, pad.top + H + 10);
  });

  // Gradiente
  const grad = context.createLinearGradient(0, pad.top, 0, pad.top + H);
  grad.addColorStop(0, 'rgba(107,76,230,0.28)');
  grad.addColorStop(1, 'rgba(107,76,230,0.02)');

  if (pts.length > 1) {
    context.beginPath();
    pts.forEach((p, i) => i === 0 ? context.moveTo(p.x, p.y) : context.lineTo(p.x, p.y));
    context.lineTo(pts[pts.length - 1].x, pad.top + H);
    context.lineTo(pts[0].x, pad.top + H);
    context.closePath();
    context.fillStyle = grad;
    context.fill();

    // Linha
    context.beginPath();
    pts.forEach((p, i) => i === 0 ? context.moveTo(p.x, p.y) : context.lineTo(p.x, p.y));
    context.strokeStyle = '#6b4ce6';
    context.lineWidth   = 2.5;
    context.lineJoin    = 'round';
    context.lineCap     = 'round';
    context.stroke();
  }

  // Pontos
  pts.forEach((p) => {
    context.beginPath();
    context.arc(p.x, p.y, 4, 0, Math.PI * 2);
    context.fillStyle   = '#6b4ce6';
    context.fill();
    context.lineWidth   = 2.5;
    context.strokeStyle = '#ffffff';
    context.stroke();
  });
}

// ── Gráfico de barras genérico ────────────────────────────────────────────────

function renderBarChart(container, data, highlightEl) {
  if (!data.length) {
    container.innerHTML = '<p class="empty-state">Sem dados.</p>';
    return;
  }
  const max = Math.max(...data.map((d) => d.value), 1);
  const topVal = data.reduce((a, b) => (b.value > a.value ? b : a), data[0]);

  container.innerHTML = `
    <div class="bar-axis" aria-hidden="true">
      ${[100, 80, 60, 40, 20, 0].map((t) => `<span>${Math.round(t * max / 100)}</span>`).join('')}
    </div>
    <div class="bar-plot">
      ${data.map((item) => `
        <div class="bar-item" title="${item.label}: ${item.value} curtidas">
          <span class="bar" style="height:${Math.round((item.value / max) * 100)}%"></span>
          <span class="bar-label">${item.label}</span>
        </div>
      `).join('')}
    </div>
  `;

  if (highlightEl && topVal) {
    highlightEl.textContent = `★ Pico em ${topVal.label} com ${topVal.value.toLocaleString('pt-BR')} curtidas`;
  }
}

// ── Gráfico de horas ──────────────────────────────────────────────────────────

function renderHourChart(porHora) {
  // Garantir 24h preenchidas
  const mapa = {};
  porHora.forEach(({ hora, total }) => { mapa[hora] = total; });

  // Exibir agrupado de 3h em 3h para não poluir
  const slots = [0, 3, 6, 9, 12, 15, 18, 21];
  const data  = slots.map((h) => ({
    label: `${h}h`,
    value: (mapa[h] || 0) + (mapa[h + 1] || 0) + (mapa[h + 2] || 0),
  }));

  renderBarChart(hourChartEl, data, hourHighlight);
}

// ── Gráfico de dias da semana ─────────────────────────────────────────────────

function renderWeekChart(porDiaSemana) {
  const ORDER = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const mapa  = {};
  porDiaSemana.forEach(({ diaSemana, total }) => { mapa[diaSemana] = total; });

  const data = ORDER.map((d) => ({ label: d, value: mapa[d] || 0 }));
  renderBarChart(weekChartEl, data, weekHighlight);
}

// ── Insights gerados dinamicamente ───────────────────────────────────────────

function renderInsights(data) {
  const insights = [];
  const v        = data.variacaoPercentual ?? 0;

  if (v > 0) {
    insights.push({ text: `Suas curtidas cresceram ${v.toFixed(1)}% este mês. Continue assim!`, icon: '↗', color: 'green' });
  } else if (v < 0) {
    insights.push({ text: `Curtidas caíram ${Math.abs(v).toFixed(1)}% em relação ao mês passado. Tente postar mais!`, icon: '↘', color: 'pink' });
  } else {
    insights.push({ text: 'Desempenho estável em relação ao mês anterior.', icon: '→', color: 'blue' });
  }

  const horas = data.curtidasPorHora || [];
  if (horas.length) {
    const peak = horas.reduce((a, b) => (b.total > a.total ? b : a));
    insights.push({ text: `Publicações às ${peak.hora}h geram mais curtidas. Prefira esse horário!`, icon: '◷', color: 'blue' });
  }

  if (data.publicacaoMaisCurtida && data.publicacaoMaisCurtida !== '—') {
    insights.push({ text: `"${data.publicacaoMaisCurtida}" é sua publicação com mais engajamento.`, icon: '★', color: 'yellow' });
  }

  const semana = data.curtidasPorDiaSemana || [];
  if (semana.length) {
    const melhorDia = semana.reduce((a, b) => (b.total > a.total ? b : a));
    insights.push({ text: `${melhorDia.diaSemana}feira é o seu melhor dia da semana para engajamento.`, icon: '♥', color: 'pink' });
  }

  insightsEl.innerHTML = insights.map((i) => `
    <div class="insight-row">
      <span class="insight-icon ${i.color}" aria-hidden="true">${i.icon}</span>
      <p class="insight-text">${i.text}</p>
    </div>
  `).join('');
}

// ══ Utilitários ═══════════════════════════════════════════════════════════════

function formatDate(iso) {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

function niceStep(max) {
  const rough = max / 5;
  const pow   = Math.pow(10, Math.floor(Math.log10(rough)));
  const steps = [1, 2, 5, 10];
  for (const s of steps) {
    if (s * pow >= rough) return s * pow;
  }
  return pow * 10;
}

// ══ Init ═════════════════════════════════════════════════════════════════════

// Ouve o evento disparado pelo api.js quando o token expira (401)
window.addEventListener('sessionExpired', () => {
  showLoginScreen(); // redireciona para login.html
});

(function init() {
  loadDashboard();
})();