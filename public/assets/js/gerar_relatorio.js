/**
 * gerar_relatorio.js
 * Gera o relatório executivo em PDF usando jsPDF + html2canvas.
 * As libs são carregadas via CDN no dashboard_empresa.html.
 */

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt  = (n) => Number(n ?? 0).toLocaleString('pt-BR');
const pct  = (v) => `${Number(v ?? 0) >= 0 ? '+' : ''}${Number(v ?? 0).toFixed(1)}%`;

function formatDataBr(iso) {
  if (!iso) return '';
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
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
    recs.push(`Publicar entre ${peakHora.hora}h e ${peakHora.hora + 2}h de ${peakDia.diaSemana}feira para maximizar curtidas.`);
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
  if (recs.length < 3) recs.push('Diversificar os tipos de publicação (promoções, novidades, bastidores) para ampliar o alcance.');
  return recs;
}

// ── Construir HTML do relatório ───────────────────────────────────────────────

function buildRelatorioHTML(data, nomeEmpresa, periodoLabel) {
  const variacao      = data.variacaoPercentual ?? 0;
  const bairros       = data.curtidasPorBairro   || [];
  const porDia        = data.curtidasPorDia       || [];
  const porHora       = data.curtidasPorHora      || [];
  const porSemana     = data.curtidasPorDiaSemana || [];
  const totalBairros  = bairros.reduce((s, b) => s + b.total, 0) || 1;
  const dataEmissao   = new Date().toLocaleDateString('pt-BR');

  const mapaHora = {};
  porHora.forEach(({ hora, total }) => { mapaHora[hora] = total; });

  const peakHora = porHora.length ? porHora.reduce((a, b) => b.total > a.total ? b : a) : null;
  const peakDia  = porSemana.length ? porSemana.reduce((a, b) => b.total > a.total ? b : a) : null;

  const variacaoCor  = variacao >= 0 ? '#22c55e' : '#ec4899';
  const variacaoSeta = variacao >= 0 ? '↑' : '↓';

  // ── Cards ─────────────────────────────────────────────────────────────────

  const cards = [
    { valor: fmt(data.totalCurtidas),        label: 'Total de curtidas',      sub: 'Todas as publicações' },
    { valor: fmt(data.curtidasMesAtual),     label: 'Curtidas este mês',      sub: `${variacaoSeta} ${pct(variacao)} vs. mês anterior`, subCor: variacaoCor },
    { valor: Number(data.mediaPorPublicacao ?? 0).toFixed(1), label: 'Média por publicação', sub: 'Curtidas por divulgação' },
    { valor: String(bairros.length),         label: 'Bairros alcançados',     sub: bairros[0] ? `Maior volume: ${bairros[0].bairro}` : '—' },
  ].map(c => `
    <div class="card">
      <div class="card-valor">${c.valor}</div>
      <div class="card-label">${c.label}</div>
      <div class="card-sub" ${c.subCor ? `style="color:${c.subCor};font-weight:700"` : ''}>${c.sub}</div>
    </div>
  `).join('');

  // ── Gráfico de barras (curtidas por dia) ──────────────────────────────────

  const diasExibir = porDia.slice(-20);
  const maxDia     = Math.max(...diasExibir.map(d => d.total), 1);

  const barrasDia = diasExibir.map(d => {
    const h = Math.max(Math.round((d.total / maxDia) * 120), 4);
    return `
      <div class="bar-col">
        <div class="bar-tooltip">${d.total}</div>
        <div class="bar-fill" style="height:${h}px"></div>
        <div class="bar-x">${formatDataBr(d.data)}</div>
      </div>
    `;
  }).join('');

  const maxDiaObj = porDia.length ? porDia.reduce((a, b) => b.total > a.total ? b : a) : null;
  const narrativaGrafico = maxDiaObj
    ? `Acumulado de ${fmt(data.curtidasMesAtual)} curtidas no período, com pico de ${fmt(maxDiaObj.total)} curtidas em ${formatDataBr(maxDiaObj.data)}. Variação de ${pct(variacao)} frente ao período anterior.`
    : 'Sem dados suficientes para análise de tendência.';

  // ── Bairros ───────────────────────────────────────────────────────────────

  const BAIRRO_CORES = ['#6b4ce6','#8b5cf6','#a78bfa','#c4b5fd','#ddd6fe','#ede9ff'];
  const maxBairro    = Math.max(...bairros.map(b => b.total), 1);

  const linhasBairro = bairros.slice(0, 6).map((b, i) => {
    const w   = Math.round((b.total / maxBairro) * 100);
    const cor = BAIRRO_CORES[i] || '#6b4ce6';
    return `
      <div class="bairro-row">
        <div class="bairro-nome">${b.bairro}</div>
        <div class="bairro-bar-wrap">
          <div class="bairro-bar" style="width:${w}%;background:${cor}"></div>
        </div>
        <div class="bairro-num">${fmt(b.total)}</div>
        <div class="bairro-pct">${((b.total / totalBairros) * 100).toFixed(1)}%</div>
      </div>
    `;
  }).join('');

  const narrativaBairro = bairros.length
    ? `${bairros[0]?.bairro} lidera com ${fmt(bairros[0]?.total)} curtidas (${((bairros[0]?.total / totalBairros) * 100).toFixed(0)}%) do total.${bairros.length > 2 ? ` ${bairros[bairros.length - 1]?.bairro} e ${bairros[bairros.length - 2]?.bairro} representam oportunidades de crescimento.` : ''}`
    : 'Nenhum dado de bairro disponível.';

  // ── Tabela detalhada de bairros ───────────────────────────────────────────

  const STATUS = (i) => ['⭐ Principal','🔼 Alto','➡ Médio','⚠ A desenvolver'][Math.min(i, 3)];

  const linhasTabela = bairros.map((b, i) => `
    <tr class="${i % 2 === 0 ? 'tr-par' : ''}">
      <td><strong>${b.bairro}</strong></td>
      <td>${fmt(b.total)}</td>
      <td>${((b.total / totalBairros) * 100).toFixed(1)}%</td>
      <td>${STATUS(i)}</td>
    </tr>
  `).join('');

  // ── Comportamento temporal ────────────────────────────────────────────────

  const ORDER_DIA = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
  const mapaSem   = {};
  porSemana.forEach(({ diaSemana, total }) => { mapaSem[diaSemana] = total; });
  const dadosDia  = ORDER_DIA.map(d => ({ label: d, value: mapaSem[d] || 0 }));
  const maxSem    = Math.max(...dadosDia.map(d => d.value), 1);

  const barrasSemana = dadosDia.map(d => {
    const h = Math.max(Math.round((d.value / maxSem) * 80), 2);
    return `
      <div class="bar-col">
        <div class="bar-tooltip">${d.value}</div>
        <div class="bar-fill bar-semana" style="height:${h}px"></div>
        <div class="bar-x">${d.label}</div>
      </div>
    `;
  }).join('');

  const slots     = [0, 3, 6, 9, 12, 15, 18, 21];
  const dadosHora = slots.map(h => ({
    label: `${h}h`,
    value: (mapaHora[h] || 0) + (mapaHora[h+1] || 0) + (mapaHora[h+2] || 0),
  }));
  const maxHoraV  = Math.max(...dadosHora.map(d => d.value), 1);

  const barrasHora = dadosHora.map(d => {
    const h = Math.max(Math.round((d.value / maxHoraV) * 80), 2);
    return `
      <div class="bar-col">
        <div class="bar-tooltip">${d.value}</div>
        <div class="bar-fill" style="height:${h}px"></div>
        <div class="bar-x">${d.label}</div>
      </div>
    `;
  }).join('');

  const notaSemana = peakDia  ? `★ ${peakDia.diaSemana}feira é o dia de maior engajamento com ${fmt(peakDia.total)} curtidas.` : '';
  const notaHora   = peakHora ? `★ Pico de curtidas entre ${peakHora.hora}h e ${peakHora.hora + 1}h. Publicações nesse intervalo recebem mais interações.` : '';

  // ── Recomendações ─────────────────────────────────────────────────────────

  const recs = gerarRecomendacoes(data, peakHora, peakDia, bairros);
  const linhasRec = recs.map((r, i) => `
    <div class="rec-row">
      <div class="rec-num">0${i + 1}</div>
      <div class="rec-text">${r}</div>
    </div>
  `).join('');

  // ── HTML completo ─────────────────────────────────────────────────────────

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 13px;
    color: #0f1221;
    background: #fff;
    width: 794px;
    padding: 40px 48px;
  }

  /* CABEÇALHO */
  .cabecalho {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 6px;
  }
  .cab-esq { display: flex; flex-direction: column; gap: 2px; }
  .cab-plataforma { font-size: 11px; font-weight: 700; color: #6b4ce6; letter-spacing: .08em; text-transform: uppercase; }
  .cab-titulo { font-size: 13px; color: #6b7494; }
  .cab-emitido { font-size: 11px; color: #6b7494; margin-top: 2px; }
  .divider { border: none; border-top: 3px solid #6b4ce6; margin: 10px 0 16px; }
  .empresa-nome { font-size: 26px; font-weight: 800; letter-spacing: -.02em; color: #0f1221; }
  .empresa-periodo { font-size: 13px; color: #6b7494; margin-top: 4px; margin-bottom: 28px; }

  /* SEÇÃO */
  .section-title {
    font-size: 14px;
    font-weight: 700;
    color: #6b4ce6;
    text-transform: uppercase;
    letter-spacing: .06em;
    border-bottom: 2px solid #ede9ff;
    padding-bottom: 6px;
    margin-bottom: 14px;
    margin-top: 28px;
  }

  /* CARDS */
  .cards { display: flex; gap: 10px; margin-bottom: 4px; }
  .card {
    flex: 1;
    border: 1.5px solid #e8eaf4;
    border-radius: 10px;
    padding: 14px 14px 12px;
    background: #fafbff;
  }
  .card-valor { font-size: 26px; font-weight: 800; color: #6b4ce6; letter-spacing: -.02em; line-height: 1.1; }
  .card-label { font-size: 11px; font-weight: 700; color: #0f1221; margin-top: 5px; }
  .card-sub   { font-size: 11px; color: #6b7494; margin-top: 3px; }

  /* GRÁFICO DE LINHA (barras verticais) */
  .bar-area {
    display: flex;
    align-items: flex-end;
    gap: 3px;
    height: 140px;
    padding-bottom: 22px;
    border-bottom: 1.5px solid #e8eaf4;
    position: relative;
    margin-bottom: 8px;
  }
  .bar-col { display: flex; flex-direction: column; align-items: center; justify-content: flex-end; flex: 1; gap: 4px; position: relative; }
  .bar-fill { width: 100%; background: #6b4ce6; border-radius: 3px 3px 0 0; min-height: 3px; opacity: .85; }
  .bar-semana { background: #8b5cf6; }
  .bar-x { font-size: 9px; color: #6b7494; white-space: nowrap; }
  .bar-tooltip { font-size: 9px; color: #6b4ce6; font-weight: 700; }
  .chart-note { font-size: 11px; color: #6b7494; margin-top: 4px; line-height: 1.5; }

  /* BAIRROS */
  .bairro-row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
  .bairro-nome { font-size: 12px; font-weight: 600; width: 110px; flex-shrink: 0; }
  .bairro-bar-wrap { flex: 1; height: 10px; background: #ede9ff; border-radius: 99px; overflow: hidden; }
  .bairro-bar { height: 100%; border-radius: 99px; }
  .bairro-num { font-size: 12px; font-weight: 700; color: #6b4ce6; width: 46px; text-align: right; flex-shrink: 0; }
  .bairro-pct { font-size: 11px; color: #6b7494; width: 38px; text-align: right; flex-shrink: 0; }
  .bairro-note { font-size: 11px; color: #6b7494; margin-top: 10px; line-height: 1.5; }

  /* TABELA */
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th {
    background: #6b4ce6;
    color: #fff;
    font-weight: 700;
    padding: 8px 12px;
    text-align: left;
    font-size: 11px;
    letter-spacing: .04em;
  }
  td { padding: 8px 12px; border-bottom: 1px solid #e8eaf4; }
  .tr-par td { background: #fafbff; }

  /* TEMPORAL */
  .temporal-grid { display: flex; gap: 28px; }
  .temporal-block { flex: 1; }
  .temporal-sub { font-size: 12px; font-weight: 700; color: #0f1221; margin-bottom: 10px; }
  .temporal-note { font-size: 11px; color: #6b7494; margin-top: 8px; line-height: 1.5; }

  /* RECOMENDAÇÕES */
  .rec-row { display: flex; gap: 14px; align-items: flex-start; margin-bottom: 12px; }
  .rec-num {
    min-width: 34px; height: 34px;
    background: #6b4ce6;
    color: #fff;
    font-size: 14px;
    font-weight: 800;
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .rec-text { font-size: 13px; color: #0f1221; padding-top: 7px; line-height: 1.5; }

  /* RODAPÉ */
  .rodape {
    margin-top: 32px;
    border-top: 1.5px solid #e8eaf4;
    padding-top: 12px;
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: #6b7494;
  }
</style>
</head>
<body>

  <!-- CABEÇALHO -->
  <div class="cabecalho">
    <div class="cab-esq">
      <div class="cab-plataforma">Negócio na Área</div>
      <div class="cab-titulo">Relatório Executivo de Desempenho</div>
    </div>
    <div class="cab-emitido">Emitido em ${dataEmissao}</div>
  </div>
  <hr class="divider"/>
  <div class="empresa-nome">${nomeEmpresa}</div>
  <div class="empresa-periodo">Análise de curtidas — ${periodoLabel}</div>

  <!-- RESUMO -->
  <div class="section-title">Resumo do Período</div>
  <div class="cards">${cards}</div>

  <!-- EVOLUÇÃO -->
  <div class="section-title">Evolução de Curtidas — ${periodoLabel}</div>
  ${porDia.length ? `<div class="bar-area">${barrasDia}</div>` : '<p class="chart-note">Sem dados no período.</p>'}
  <p class="chart-note">${narrativaGrafico}</p>

  <!-- BAIRROS -->
  <div class="section-title">Curtidas por Bairro</div>
  ${linhasBairro || '<p class="chart-note">Sem dados de bairro.</p>'}
  <p class="bairro-note">${narrativaBairro}</p>

  <!-- TABELA DETALHADA -->
  <div class="section-title">Detalhamento por Bairro</div>
  <table>
    <thead><tr><th>Bairro</th><th>Curtidas</th><th>Participação</th><th>Status</th></tr></thead>
    <tbody>${linhasTabela || '<tr><td colspan="4">Sem dados.</td></tr>'}</tbody>
  </table>

  <!-- COMPORTAMENTO TEMPORAL -->
  <div class="section-title">Comportamento Temporal</div>
  <div class="temporal-grid">
    <div class="temporal-block">
      <div class="temporal-sub">Curtidas por dia da semana</div>
      <div class="bar-area" style="height:110px">${barrasSemana}</div>
      ${notaSemana ? `<p class="temporal-note">${notaSemana}</p>` : ''}
    </div>
    <div class="temporal-block">
      <div class="temporal-sub">Curtidas por horário</div>
      <div class="bar-area" style="height:110px">${barrasHora}</div>
      ${notaHora ? `<p class="temporal-note">${notaHora}</p>` : ''}
    </div>
  </div>

  <!-- RECOMENDAÇÕES -->
  <div class="section-title">Recomendações</div>
  ${linhasRec}

  <!-- RODAPÉ -->
  <div class="rodape">
    <span>Este relatório foi gerado automaticamente pela plataforma <strong>Negócio na Área</strong>.</span>
    <span>Relatório Confidencial · Página 1</span>
  </div>

</body>
</html>
  `;
}

// ── Gerar e baixar PDF ────────────────────────────────────────────────────────

async function baixarRelatorio(analyticsData, nomeEmpresa, periodoLabel) {
  const btn = document.getElementById('printReport');
  if (btn) { btn.textContent = '⏳ Gerando PDF…'; btn.disabled = true; }

  try {
    const html = buildRelatorioHTML(analyticsData, nomeEmpresa, periodoLabel);

    // Criar iframe oculto para renderizar o HTML
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:794px;height:1123px;border:none;visibility:hidden;';
    document.body.appendChild(iframe);

    await new Promise((resolve) => {
      iframe.onload = resolve;
      iframe.srcdoc = html;
    });

    // Aguardar renderização
    await new Promise(r => setTimeout(r, 600));

    const iframeDoc  = iframe.contentDocument || iframe.contentWindow.document;
    const iframeBody = iframeDoc.body;

    // Capturar com html2canvas
    const canvas = await html2canvas(iframeBody, {
      scale:           2,
      useCORS:         true,
      backgroundColor: '#ffffff',
      width:           794,
      windowWidth:     794,
    });

    document.body.removeChild(iframe);

    // Gerar PDF com jsPDF
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const A4_W    = 210;
    const A4_H    = 297;
    const imgW    = A4_W;
    const imgH    = (canvas.height / canvas.width) * imgW;

    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    // Se o conteúdo for maior que uma página, quebra em páginas
    if (imgH <= A4_H) {
      pdf.addImage(imgData, 'JPEG', 0, 0, imgW, imgH);
    } else {
      let posY = 0;
      while (posY < imgH) {
        if (posY > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, -posY, imgW, imgH);
        posY += A4_H;
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