/**
 * gerar_relatorio.js — v3
 * Gera PDF fiel ao modelo "relatorio_curtidas.docx".
 * Usa html2canvas + jsPDF (carregados via CDN no HTML).
 */

// ── Utilitários ───────────────────────────────────────────────────────────────

const fmt = (n) => Number(n ?? 0).toLocaleString('pt-BR');
const pct = (v) => `${Number(v ?? 0) >= 0 ? '+' : ''}${Number(v ?? 0).toFixed(1)}%`;

function formatDataBr(iso) {
  if (!iso) return '';
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

function nomeDiaSemana(abrev) {
  // Evita "Sexfeira" — retorna o nome completo correto
  const map = {
    'Seg': 'Segunda-feira', 'Ter': 'Terça-feira',  'Qua': 'Quarta-feira',
    'Qui': 'Quinta-feira',  'Sex': 'Sexta-feira',  'Sáb': 'Sábado', 'Dom': 'Domingo',
  };
  return map[abrev] || abrev;
}

function periodoPorExtenso(periodo) {
  const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const agora = new Date();
  switch (periodo) {
    case '7dias':  return `Últimos 7 dias — até ${agora.toLocaleDateString('pt-BR')}`;
    case '30dias': return `Últimos 30 dias — até ${agora.toLocaleDateString('pt-BR')}`;
    case 'ano':    return `Ano de ${agora.getFullYear()}`;
    default:       return `${meses[agora.getMonth()]} de ${agora.getFullYear()}`;
  }
}

function gerarRecomendacoes(data, peakHora, peakDia, bairros) {
  const recs = [];
  const v    = data.variacaoPercentual ?? 0;
  if (peakHora && peakDia) {
    recs.push(`Publicar entre ${peakHora.hora}h e ${peakHora.hora + 2}h de ${nomeDiaSemana(peakDia.diaSemana)} para maximizar curtidas.`);
  } else if (peakHora) {
    recs.push(`Publicar próximo às ${peakHora.hora}h para atingir o horário de pico de engajamento.`);
  }
  if (bairros.length > 2) {
    const menores = bairros.slice(-2).map(b => b.bairro).join(' e ');
    recs.push(`Criar divulgações segmentadas para ${menores}, bairros com menor alcance atual.`);
  }
  if (v > 0) {
    recs.push(`Manter a frequência que gerou crescimento de ${v.toFixed(1)}% no período.`);
  } else if (v < 0) {
    recs.push(`Aumentar a frequência de publicações para reverter a queda de ${Math.abs(v).toFixed(1)}%.`);
  }
  if (data.publicacaoMaisCurtida && data.publicacaoMaisCurtida !== '—') {
    recs.push(`Produzir mais conteúdo semelhante a "${data.publicacaoMaisCurtida}", sua publicação com maior engajamento.`);
  }
  while (recs.length < 3) recs.push('Diversificar os tipos de publicação (promoções, novidades, bastidores) para ampliar o alcance.');
  return recs.slice(0, 4);
}

// ── Construir HTML do relatório ───────────────────────────────────────────────

function buildRelatorioHTML(data, nomeEmpresa, periodoLabel) {
  const variacao     = data.variacaoPercentual ?? 0;
  const bairros      = data.curtidasPorBairro   || [];
  const porDia       = data.curtidasPorDia       || [];
  const porHora      = data.curtidasPorHora      || [];
  const porSemana    = data.curtidasPorDiaSemana || [];
  const totalBairros = bairros.reduce((s, b) => s + b.total, 0) || 1;
  const dataEmissao  = new Date().toLocaleDateString('pt-BR');

  const mapaHora = {};
  porHora.forEach(({ hora, total }) => { mapaHora[hora] = total; });

  const peakHora = porHora.length  ? porHora.reduce((a, b)  => b.total > a.total ? b : a) : null;
  const peakDia  = porSemana.length ? porSemana.reduce((a, b) => b.total > a.total ? b : a) : null;

  const variacaoCor = variacao >= 0 ? '#22c55e' : '#ec4899';

  // ── CARDS ─────────────────────────────────────────────────────────────────

  const cardsHTML = [
    { v: fmt(data.totalCurtidas),       l: 'Total de curtidas',      s: 'Todas as publicações',                                         sc: '#6b7494' },
    { v: fmt(data.curtidasMesAtual),    l: 'Curtidas este mês',      s: `${pct(variacao)} vs. mês anterior`,                            sc: variacaoCor },
    { v: `${Number(data.mediaPorPublicacao??0).toFixed(1)}`, l: 'Média por publicação', s: 'Curtidas por divulgação',                   sc: '#6b7494' },
    { v: String(bairros.length),        l: 'Bairros alcançados',     s: bairros[0] ? `Maior volume: ${bairros[0].bairro}` : '—',        sc: '#6b7494' },
  ].map(c => `
    <div class="card">
      <div class="card-v">${c.v}</div>
      <div class="card-l">${c.l}</div>
      <div class="card-s" style="color:${c.sc}">${c.s}</div>
    </div>
  `).join('');

  // ── GRÁFICO DE LINHA (canvas inline via SVG de barras) ────────────────────
  // Usamos barras com valor em cima, como no modelo original

  const diasExibir = porDia.slice(-20);
  const maxDia     = Math.max(...diasExibir.map(d => d.total), 1);
  const maxDiaObj  = porDia.length ? porDia.reduce((a, b) => b.total > a.total ? b : a) : null;

  // Eixo Y: 4 níveis
  const yStep  = Math.ceil(maxDia / 4 / 5) * 5 || 1;
  const yMax   = yStep * 4;
  const yTicks = [yMax, Math.round(yMax*0.75), Math.round(yMax*0.5), Math.round(yMax*0.25), 0];

  const CHART_H   = 130; // px da área de barras
  const CHART_PAD = 36;  // largura do eixo Y

  const barrasLinhaHTML = diasExibir.map(d => {
    const hPct = Math.max((d.total / yMax) * 100, 1).toFixed(1);
    return `
      <div class="lc-col">
        <div class="lc-val">${d.total > 0 ? d.total : ''}</div>
        <div class="lc-bar-wrap">
          <div class="lc-bar" style="height:${hPct}%"></div>
        </div>
        <div class="lc-x">${formatDataBr(d.data)}</div>
      </div>
    `;
  }).join('');

  const yAxisHTML = yTicks.map(t => `<div class="lc-ytick">${t}</div>`).join('');

  const narrativaGrafico = maxDiaObj
    ? `Ao longo do período, as curtidas apresentaram crescimento, com pico de <strong>${fmt(maxDiaObj.total)} curtidas</strong> no dia ${formatDataBr(maxDiaObj.data)}. O acumulado totalizou <strong>${fmt(data.curtidasMesAtual)} curtidas</strong>, representando um crescimento de <strong>${pct(variacao)}</strong> frente ao período anterior.`
    : 'Sem dados suficientes para análise de tendência.';

  // ── BAIRROS — layout 2 colunas como no modelo ─────────────────────────────

  const BAIRRO_CORES = ['#6b4ce6','#8b5cf6','#a78bfa','#c4b5fd','#ddd6fe'];
  const maxBairro    = Math.max(...bairros.map(b => b.total), 1);

  // Coluna esquerda: nome + barra horizontal + número
  const bairrosBarsHTML = bairros.slice(0, 6).map((b, i) => {
    const w   = Math.round((b.total / maxBairro) * 100);
    const cor = BAIRRO_CORES[i] || '#6b4ce6';
    return `
      <div class="bh-row">
        <div class="bh-nome"><strong>${b.bairro}</strong></div>
        <div class="bh-bar-wrap">
          <div class="bh-bar" style="width:${w}%;background:${cor}"></div>
        </div>
        <div class="bh-num">${fmt(b.total)}</div>
      </div>
    `;
  }).join('');

  // Coluna direita: círculo total + lista percentuais
  const bairrosPctHTML = bairros.slice(0, 6).map((b, i) => {
    const p   = ((b.total / totalBairros) * 100).toFixed(1);
    const cor = BAIRRO_CORES[i] || '#6b4ce6';
    return `<div class="bp-item"><span class="bp-dot" style="background:${cor}"></span>${b.bairro} — ${p}%</div>`;
  }).join('');

  const narrativaBairro = bairros.length
    ? `<strong>${bairros[0]?.bairro}</strong> lidera com <strong>${fmt(bairros[0]?.total)} curtidas (${((bairros[0]?.total/totalBairros)*100).toFixed(0)}%)</strong> do total.${bairros.length > 2 ? ` <strong>${bairros[bairros.length-1]?.bairro}</strong> (${fmt(bairros[bairros.length-1]?.total)} curtidas) e <strong>${bairros[bairros.length-2]?.bairro}</strong> (${fmt(bairros[bairros.length-2]?.total)}) representam oportunidades de crescimento com divulgações segmentadas.` : ''}`
    : 'Nenhum dado de bairro disponível.';

  // ── TABELA DETALHADA ──────────────────────────────────────────────────────

  const STATUS = (i) => i === 0 ? 'Principal' : i === 1 ? 'Alto' : i === 2 ? 'Médio' : 'A desenvolver';
  const STATUS_COR = (i) => i === 0 ? '#22c55e' : i === 1 ? '#3b82f6' : i === 2 ? '#f59e0b' : '#6b7494';

  const linhasTabela = bairros.map((b, i) => `
    <tr class="${i%2===0?'tr-par':''}">
      <td><strong>${b.bairro}</strong></td>
      <td>${fmt(b.total)}</td>
      <td>${((b.total/totalBairros)*100).toFixed(1)}%</td>
      <td><span class="status-badge" style="color:${STATUS_COR(i)}">${STATUS(i)}</span></td>
    </tr>
  `).join('');

  // ── COMPORTAMENTO TEMPORAL ────────────────────────────────────────────────

  const ORDER_DIA = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
  const mapaSem   = {};
  porSemana.forEach(({ diaSemana, total }) => { mapaSem[diaSemana] = total; });
  const dadosDia  = ORDER_DIA.map(d => ({ label: d, value: mapaSem[d] || 0 }));
  const maxSem    = Math.max(...dadosDia.map(d => d.value), 1);

  // Barras verticais com valor em cima — igual ao modelo
  const barrasSemana = dadosDia.map(d => {
    const hPct = Math.max((d.value / maxSem) * 100, 1).toFixed(1);
    return `
      <div class="tc-col">
        <div class="tc-val">${d.value > 0 ? `<strong>${d.value}</strong>` : ''}</div>
        <div class="tc-bar-wrap">
          <div class="tc-bar" style="height:${hPct}%"></div>
        </div>
        <div class="tc-x">${d.label}</div>
      </div>
    `;
  }).join('');

  const slots     = [0, 3, 6, 9, 12, 15, 18, 21];
  const dadosHora = slots.map(h => ({
    label: `${h}h`,
    value: (mapaHora[h]||0) + (mapaHora[h+1]||0) + (mapaHora[h+2]||0),
  }));
  const maxHoraV = Math.max(...dadosHora.map(d => d.value), 1);

  const barrasHora = dadosHora.map(d => {
    const hPct = Math.max((d.value / maxHoraV) * 100, 1).toFixed(1);
    return `
      <div class="tc-col">
        <div class="tc-val">${d.value > 0 ? `<strong>${d.value}</strong>` : ''}</div>
        <div class="tc-bar-wrap">
          <div class="tc-bar" style="height:${hPct}%"></div>
        </div>
        <div class="tc-x">${d.label}</div>
      </div>
    `;
  }).join('');

  const notaSemana = peakDia
    ? `<strong>${nomeDiaSemana(peakDia.diaSemana)}</strong> é o dia de maior engajamento (${fmt(peakDia.total)} curtidas). ${dadosDia.filter(d=>d.value===0).length > 0 ? 'O fim de semana apresenta queda, especialmente nos dias sem registro.' : ''}`
    : '';

  // Hora de pico real (horária, não agrupada)
  const peakHoraReal = peakHora ? peakHora.hora : null;
  const notaHora = peakHoraReal !== null
    ? `Pico de curtidas entre <strong>${peakHoraReal}h e ${peakHoraReal+2}h</strong>. Publicações nesse intervalo recebem em média <strong>mais</strong> interações que a média do dia.`
    : '';

  // ── RECOMENDAÇÕES ─────────────────────────────────────────────────────────

  const recs        = gerarRecomendacoes(data, peakHora, peakDia, bairros);
  const recsHTML    = recs.map((r, i) => `
    <div class="rec-row">
      <div class="rec-num">${String(i+1).padStart(2,'0')}</div>
      <div class="rec-text">${r}</div>
    </div>
  `).join('');

  // ── HTML COMPLETO ─────────────────────────────────────────────────────────

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
    font-size: 12.5px;
    color: #0f1221;
    background: #fff;
    width: 780px;
    padding: 44px 52px 40px;
    line-height: 1.5;
  }

  /* ── CABEÇALHO ─────────────────────────────────────────────────────── */
  .cab { display: flex; justify-content: space-between; align-items: flex-start; }
  .cab-plataforma { font-size: 13px; font-weight: 800; color: #6b4ce6; letter-spacing: .02em; }
  .cab-plataforma span { font-weight: 400; color: #6b7494; }
  .cab-emitido { font-size: 11px; color: #6b7494; padding-top: 2px; }
  .divider { border: none; border-top: 3px solid #6b4ce6; margin: 10px 0 18px; }
  .emp-nome { font-size: 28px; font-weight: 800; letter-spacing: -.02em; line-height: 1.1; }
  .emp-periodo { font-size: 12px; color: #6b7494; margin-top: 5px; margin-bottom: 26px; }

  /* ── TÍTULO DE SEÇÃO ───────────────────────────────────────────────── */
  .sec-title {
    font-size: 12px; font-weight: 700; color: #6b4ce6;
    text-transform: uppercase; letter-spacing: .07em;
    border-bottom: 1.5px solid #ede9ff;
    padding-bottom: 5px; margin-bottom: 14px; margin-top: 26px;
  }

  /* ── CARDS ─────────────────────────────────────────────────────────── */
  .cards { display: flex; gap: 10px; }
  .card {
    flex: 1; border: 1.5px solid #e8eaf4; border-radius: 10px;
    padding: 14px 14px 12px; background: #fafbff;
  }
  .card-v { font-size: 28px; font-weight: 800; color: #6b4ce6; letter-spacing: -.02em; line-height: 1.05; }
  .card-l { font-size: 11px; font-weight: 700; color: #0f1221; margin-top: 6px; }
  .card-s { font-size: 10.5px; margin-top: 3px; font-weight: 500; }

  /* ── GRÁFICO LINHA ─────────────────────────────────────────────────── */
  .lc-wrap { display: flex; gap: 0; align-items: flex-end; margin-bottom: 4px; }
  .lc-yaxis {
    display: flex; flex-direction: column; justify-content: space-between;
    height: 150px; padding-bottom: 20px; padding-right: 6px; flex-shrink: 0;
  }
  .lc-ytick { font-size: 9.5px; color: #6b7494; text-align: right; line-height: 1; }
  .lc-chart { display: flex; align-items: flex-end; gap: 2px; flex: 1; height: 150px; border-left: 1.5px solid #e8eaf4; border-bottom: 1.5px solid #e8eaf4; padding: 0 0 18px 4px; }
  .lc-col { display: flex; flex-direction: column; align-items: center; justify-content: flex-end; flex: 1; height: 100%; gap: 3px; }
  .lc-val { font-size: 8.5px; color: #6b4ce6; font-weight: 700; min-height: 12px; }
  .lc-bar-wrap { flex: 1; width: 100%; display: flex; align-items: flex-end; }
  .lc-bar { width: 100%; background: #6b4ce6; border-radius: 2px 2px 0 0; min-height: 2px; opacity: .9; }
  .lc-x { font-size: 8.5px; color: #6b7494; white-space: nowrap; }
  .chart-note { font-size: 11.5px; color: #0f1221; line-height: 1.6; margin-top: 8px; }

  /* ── BAIRROS 2 COLUNAS ─────────────────────────────────────────────── */
  .bairros-grid { display: flex; gap: 24px; align-items: flex-start; }
  .bairros-bars { flex: 1; }
  .bairros-side { width: 170px; flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: 12px; }

  .bh-row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
  .bh-nome { font-size: 11.5px; font-weight: 600; width: 130px; flex-shrink: 0; }
  .bh-bar-wrap { flex: 1; height: 10px; background: #ede9ff; border-radius: 99px; overflow: hidden; }
  .bh-bar { height: 100%; border-radius: 99px; }
  .bh-num { font-size: 12px; font-weight: 700; color: #0f1221; width: 36px; text-align: right; flex-shrink: 0; }

  .bp-circle {
    width: 90px; height: 90px; border-radius: 50%;
    background: #6b4ce6; display: flex; flex-direction: column;
    align-items: center; justify-content: center; color: #fff;
  }
  .bp-circle-num { font-size: 22px; font-weight: 800; line-height: 1; }
  .bp-circle-sub { font-size: 10px; font-weight: 500; opacity: .85; }

  .bp-item { font-size: 10.5px; color: #0f1221; display: flex; align-items: center; gap: 5px; margin-bottom: 4px; }
  .bp-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

  .bairro-note { font-size: 11.5px; color: #0f1221; line-height: 1.6; margin-top: 12px; }

  /* ── TABELA ────────────────────────────────────────────────────────── */
  table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
  th {
    background: #6b4ce6; color: #fff; font-weight: 700;
    padding: 8px 12px; text-align: left; font-size: 10.5px; letter-spacing: .04em;
  }
  td { padding: 8px 12px; border-bottom: 1px solid #e8eaf4; }
  .tr-par td { background: #fafbff; }
  .status-badge { font-weight: 600; font-size: 11px; }

  /* ── TEMPORAL ──────────────────────────────────────────────────────── */
  .temporal-grid { display: flex; gap: 32px; }
  .temporal-block { flex: 1; }
  .temporal-sub { font-size: 12px; font-weight: 700; color: #0f1221; margin-bottom: 10px; }
  .tc-chart { display: flex; align-items: flex-end; gap: 4px; height: 120px; border-bottom: 1.5px solid #e8eaf4; padding-bottom: 16px; }
  .tc-col { display: flex; flex-direction: column; align-items: center; justify-content: flex-end; flex: 1; height: 100%; gap: 3px; }
  .tc-val { font-size: 9px; color: #0f1221; min-height: 13px; text-align: center; }
  .tc-bar-wrap { flex: 1; width: 100%; display: flex; align-items: flex-end; }
  .tc-bar { width: 100%; background: #6b4ce6; border-radius: 2px 2px 0 0; min-height: 2px; opacity: .85; }
  .tc-x { font-size: 9px; color: #6b7494; }
  .temporal-note { font-size: 11px; color: #0f1221; line-height: 1.6; margin-top: 8px; }

  /* ── RECOMENDAÇÕES ─────────────────────────────────────────────────── */
  .rec-row { display: flex; gap: 14px; align-items: flex-start; margin-bottom: 12px; }
  .rec-num {
    min-width: 36px; height: 36px; background: #6b4ce6; color: #fff;
    font-size: 15px; font-weight: 800; border-radius: 8px;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .rec-text { font-size: 12.5px; color: #0f1221; padding-top: 8px; line-height: 1.5; }

  /* ── RODAPÉ ────────────────────────────────────────────────────────── */
  .rodape-div { border: none; border-top: 1.5px solid #e8eaf4; margin-top: 28px; padding-top: 12px; }
  .rodape-texto { font-size: 10px; color: #6b7494; margin-bottom: 6px; }
  .rodape-bottom { display: flex; justify-content: space-between; font-size: 10px; color: #6b7494; font-weight: 600; }
</style>
</head>
<body>

  <!-- CABEÇALHO -->
  <div class="cab">
    <div class="cab-plataforma">NEGÓCIO NA ÁREA <span>— Relatório Executivo de Desempenho</span></div>
    <div class="cab-emitido">Emitido em ${dataEmissao}</div>
  </div>
  <hr class="divider"/>
  <div class="emp-nome">${nomeEmpresa}</div>
  <div class="emp-periodo">Análise de curtidas — ${periodoLabel}</div>

  <!-- RESUMO -->
  <div class="sec-title">Resumo do Período</div>
  <div class="cards">${cardsHTML}</div>

  <!-- EVOLUÇÃO -->
  <div class="sec-title">Evolução de Curtidas — ${periodoLabel}</div>
  ${porDia.length ? `
    <div class="lc-wrap">
      <div class="lc-yaxis">${yAxisHTML}</div>
      <div class="lc-chart">${barrasLinhaHTML}</div>
    </div>
  ` : ''}
  <p class="chart-note">${narrativaGrafico}</p>

  <!-- BAIRROS -->
  <div class="sec-title">Curtidas por Bairro</div>
  <div class="bairros-grid">
    <div class="bairros-bars">${bairrosBarsHTML}</div>
    <div class="bairros-side">
      <div class="bp-circle">
        <div class="bp-circle-num">${fmt(totalBairros)}</div>
        <div class="bp-circle-sub">curtidas</div>
      </div>
      <div>${bairrosPctHTML}</div>
    </div>
  </div>
  <p class="bairro-note">${narrativaBairro}</p>

  <!-- TABELA -->
  <div class="sec-title">Detalhamento por Bairro</div>
  <table>
    <thead><tr><th>Bairro</th><th>Curtidas</th><th>Participação</th><th>Status</th></tr></thead>
    <tbody>${linhasTabela || '<tr><td colspan="4">Sem dados.</td></tr>'}</tbody>
  </table>

  <!-- TEMPORAL -->
  <div class="sec-title">Comportamento Temporal</div>
  <div class="temporal-grid">
    <div class="temporal-block">
      <div class="temporal-sub">Curtidas por dia da semana</div>
      <div class="tc-chart">${barrasSemana}</div>
      ${notaSemana ? `<p class="temporal-note">${notaSemana}</p>` : ''}
    </div>
    <div class="temporal-block">
      <div class="temporal-sub">Curtidas por horário</div>
      <div class="tc-chart">${barrasHora}</div>
      ${notaHora ? `<p class="temporal-note">${notaHora}</p>` : ''}
    </div>
  </div>

  <!-- RECOMENDAÇÕES -->
  <div class="sec-title">Recomendações</div>
  ${recsHTML}

  <!-- RODAPÉ -->
  <div class="rodape-div">
    <p class="rodape-texto">Este relatório foi gerado automaticamente pela plataforma <strong>Negócio na Área</strong> com base nos dados de curtidas registrados no período indicado.</p>
    <div class="rodape-bottom">
      <span>Negócio na Área — Relatório Confidencial</span>
      <span>Página 1</span>
    </div>
  </div>

</body>
</html>`;
}

// ── Gerar e baixar PDF ────────────────────────────────────────────────────────

async function baixarRelatorio(analyticsData, nomeEmpresa, periodoLabel) {
  const btn = document.getElementById('printReport');
  if (btn) { btn.textContent = '⏳ Gerando PDF…'; btn.disabled = true; }

  try {
    const html = buildRelatorioHTML(analyticsData, nomeEmpresa, periodoLabel);

    // Iframe oculto para renderizar
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:780px;height:2400px;border:none;opacity:0;pointer-events:none;';
    document.body.appendChild(iframe);

    await new Promise(resolve => {
      iframe.onload = resolve;
      iframe.srcdoc = html;
    });

    // Aguardar fontes e layout
    await new Promise(r => setTimeout(r, 1000));

    const iframeDoc  = iframe.contentDocument || iframe.contentWindow.document;
    const iframeBody = iframeDoc.body;

    const fullH = iframeBody.scrollHeight;
    iframe.style.height = fullH + 'px';
    await new Promise(r => setTimeout(r, 300));

    // Capturar
    const canvas = await html2canvas(iframeBody, {
      scale:           2.5,
      useCORS:         true,
      allowTaint:      true,
      backgroundColor: '#ffffff',
      width:           780,
      height:          fullH,
      windowWidth:     780,
      scrollY:         0,
    });

    document.body.removeChild(iframe);

    // Gerar PDF A4
    const { jsPDF } = window.jspdf;
    const pdf    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const A4_W   = 210;
    const A4_H   = 297;
    const imgW   = A4_W;
    const imgH   = (canvas.height / canvas.width) * imgW;
    const imgData = canvas.toDataURL('image/jpeg', 0.97);

    if (imgH <= A4_H) {
      pdf.addImage(imgData, 'JPEG', 0, 0, imgW, imgH);
    } else {
      // Múltiplas páginas com corte limpo
      let posY = 0;
      let page = 0;
      while (posY < imgH) {
        if (page > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, -posY, imgW, imgH);
        posY += A4_H;
        page++;
      }
    }

    const safe = nomeEmpresa.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    pdf.save(`relatorio_${safe}_${new Date().toISOString().slice(0, 10)}.pdf`);

  } catch (err) {
    console.error('Erro ao gerar PDF:', err);
    alert('Erro ao gerar o PDF: ' + err.message);
  } finally {
    if (btn) { btn.textContent = '▣ Imprimir relatório'; btn.disabled = false; }
  }
}