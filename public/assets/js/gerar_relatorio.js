/**
 * gerar_relatorio.js
 * Gera o relatório executivo .docx com os dados reais da API.
 * Depende da biblioteca docx carregada via CDN (UMD build).
 */

// Resolve o namespace docx independente de como o CDN o expõe
function resolverDocx() {
  if (typeof window !== 'undefined' && window.docx) return window.docx;
  if (typeof self !== 'undefined' && self.docx) return self.docx;
  throw new Error('Biblioteca docx não carregada. Verifique a tag <script> do CDN no HTML.');
}

async function gerarRelatorioDocx(analyticsData, nomeEmpresa, periodoLabel) {
  const docxLib = resolverDocx();
  const {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign,
    HeadingLevel, TabStopType, TabStopPosition, LevelFormat,
    PageNumber, NumberFormat,
  } = docxLib;

  // ── Cores e constantes ────────────────────────────────────────────────────

  const ROXO      = '6B4CE6';
  const ROXO_DARK = '5235CC';
  const CINZA     = 'F4F5FB';
  const TEXTO     = '0F1221';
  const MUTED     = '6B7494';
  const VERDE     = '22C55E';
  const VERMELHO  = 'EC4899';
  const AMARELO   = 'F59E0B';
  const BORDA     = 'E8EAF4';

  const PAGE_W    = 11906; // A4 largura DXA
  const PAGE_H    = 16838;
  const MARGIN    = 1134; // ~2cm
  const CONTENT_W = PAGE_W - MARGIN * 2; // 9638 DXA

  // ── Helpers ───────────────────────────────────────────────────────────────

  const bordaCelula = (color = BORDA) => ({
    top:    { style: BorderStyle.SINGLE, size: 1, color },
    bottom: { style: BorderStyle.SINGLE, size: 1, color },
    left:   { style: BorderStyle.SINGLE, size: 1, color },
    right:  { style: BorderStyle.SINGLE, size: 1, color },
  });

  const semBorda = () => ({
    top:    { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    left:   { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    right:  { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  });

  const paragrafoVazio = (spacing = 160) =>
    new Paragraph({ children: [new TextRun('')], spacing: { after: spacing } });

  const linhaDivisoria = (color = ROXO) =>
    new Paragraph({
      children: [new TextRun('')],
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color, space: 1 } },
      spacing: { after: 200 },
    });

  const tituloSecao = (texto) =>
    new Paragraph({
      children: [new TextRun({ text: texto, bold: true, size: 26, color: ROXO, font: 'Arial' })],
      spacing: { before: 300, after: 160 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 3, color: ROXO, space: 1 } },
    });

  const fmt = (n) => Number(n ?? 0).toLocaleString('pt-BR');
  const pct = (v) => `${v >= 0 ? '+' : ''}${Number(v ?? 0).toFixed(1)}%`;

  // ── Dados ─────────────────────────────────────────────────────────────────

  const data          = analyticsData;
  const variacao      = data.variacaoPercentual ?? 0;
  const bairros       = data.curtidasPorBairro  || [];
  const porDia        = data.curtidasPorDia      || [];
  const porHora       = data.curtidasPorHora     || [];
  const porSemana     = data.curtidasPorDiaSemana|| [];
  const totalBairros  = bairros.reduce((s, b) => s + b.total, 0) || 1;

  const dataEmissao   = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

  // Peak hora
  const peakHora = porHora.length
    ? porHora.reduce((a, b) => (b.total > a.total ? b : a))
    : null;

  // Peak dia semana
  const ORDER_DIA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const mapaHora  = {};
  porHora.forEach(({ hora, total }) => { mapaHora[hora] = total; });

  const peakDia = porSemana.length
    ? porSemana.reduce((a, b) => (b.total > a.total ? b : a))
    : null;

  // ══════════════════════════════════════════════════════════════════════════
  // SEÇÃO 1 — CABEÇALHO
  // ══════════════════════════════════════════════════════════════════════════

  const secaoCabecalho = [

    // Linha: plataforma | emissão
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [Math.round(CONTENT_W * 0.65), Math.round(CONTENT_W * 0.35)],
      borders: semBorda(),
      rows: [
        new TableRow({
          children: [
            // Esquerda: nome plataforma
            new TableCell({
              borders: semBorda(),
              width: { size: Math.round(CONTENT_W * 0.65), type: WidthType.DXA },
              verticalAlign: VerticalAlign.CENTER,
              margins: { top: 60, bottom: 60, left: 0, right: 60 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: 'NEGÓCIO NA ÁREA', bold: true, size: 22, color: ROXO, font: 'Arial' }),
                    new TextRun({ text: ' — Relatório Executivo de Desempenho', size: 20, color: MUTED, font: 'Arial' }),
                  ],
                }),
              ],
            }),
            // Direita: data
            new TableCell({
              borders: semBorda(),
              width: { size: Math.round(CONTENT_W * 0.35), type: WidthType.DXA },
              verticalAlign: VerticalAlign.CENTER,
              margins: { top: 60, bottom: 60, left: 60, right: 0 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [new TextRun({ text: `Emitido em ${dataEmissao}`, size: 18, color: MUTED, font: 'Arial' })],
                }),
              ],
            }),
          ],
        }),
      ],
    }),

    linhaDivisoria(ROXO),

    // Nome da empresa
    new Paragraph({
      children: [new TextRun({ text: nomeEmpresa, bold: true, size: 36, color: TEXTO, font: 'Arial' })],
      spacing: { before: 100, after: 80 },
    }),

    // Período
    new Paragraph({
      children: [new TextRun({ text: periodoLabel, size: 20, color: MUTED, font: 'Arial' })],
      spacing: { after: 320 },
    }),
  ];

  // ══════════════════════════════════════════════════════════════════════════
  // SEÇÃO 2 — RESUMO (cards como tabela 4 colunas)
  // ══════════════════════════════════════════════════════════════════════════

  const colW = Math.round(CONTENT_W / 4);

  const cardCell = (titulo, valor, nota, corNota) =>
    new TableCell({
      borders: bordaCelula(BORDA),
      width: { size: colW, type: WidthType.DXA },
      shading: { fill: 'FAFBFF', type: ShadingType.CLEAR },
      margins: { top: 140, bottom: 140, left: 160, right: 160 },
      children: [
        new Paragraph({
          children: [new TextRun({ text: valor, bold: true, size: 40, color: ROXO, font: 'Arial' })],
          spacing: { after: 60 },
        }),
        new Paragraph({
          children: [new TextRun({ text: titulo, bold: true, size: 18, color: TEXTO, font: 'Arial' })],
          spacing: { after: 40 },
        }),
        new Paragraph({
          children: [new TextRun({ text: nota, size: 16, color: corNota || MUTED, font: 'Arial' })],
        }),
      ],
    });

  const variacaoLabel = `${pct(variacao)} vs. mês anterior`;
  const variacaoCor   = variacao >= 0 ? VERDE : VERMELHO;

  const secaoResumo = [
    tituloSecao('Resumo do Período'),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [colW, colW, colW, colW],
      rows: [
        new TableRow({
          children: [
            cardCell('Total de curtidas',       fmt(data.totalCurtidas),        'Todas as publicações',      MUTED),
            cardCell('Curtidas este mês',        fmt(data.curtidasMesAtual),     variacaoLabel,               variacaoCor),
            cardCell('Média por publicação',     `${Number(data.mediaPorPublicacao ?? 0).toFixed(1)}`,  'Curtidas por divulgação',   MUTED),
            cardCell('Bairros alcançados',       String(bairros.length),         `Maior volume: ${bairros[0]?.bairro || '—'}`, MUTED),
          ],
        }),
      ],
    }),
    paragrafoVazio(280),
  ];

  // ══════════════════════════════════════════════════════════════════════════
  // SEÇÃO 3 — EVOLUÇÃO (gráfico textual)
  // ══════════════════════════════════════════════════════════════════════════

  // Montar mini-gráfico de barras ASCII em tabela
  const diasExibir  = porDia.slice(-14); // até 14 dias
  const maxDia      = Math.max(...diasExibir.map((d) => d.total), 1);
  const BARRAS      = '█▇▆▅▄▃▂▁';
  const BAR_LEVELS  = 8;

  function barChar(v, max) {
    const idx = Math.round((v / max) * (BAR_LEVELS - 1));
    return BARRAS[BAR_LEVELS - 1 - idx] || '▁';
  }

  // Montar linha de texto com os dias
  const linhaDias  = diasExibir.map((d) => {
    const [, m, dia] = d.data.split('-');
    return `${dia}/${m}`;
  }).join('  ');

  const linhaBarras = diasExibir.map((d) => barChar(d.total, maxDia)).join('   ');

  // Texto narrativo do gráfico
  const maxDiaObj   = porDia.reduce((a, b) => (b.total > a.total ? b : a), porDia[0] || { total: 0, data: '' });
  const narrativaGrafico = porDia.length
    ? `Ao longo do período, as curtidas apresentaram crescimento, com pico de ${fmt(maxDiaObj.total)} curtidas no dia ${formatDataBr(maxDiaObj.data)}. O acumulado totalizou ${fmt(data.curtidasMesAtual)} curtidas, representando ${pct(variacao)} frente ao período anterior.`
    : 'Sem dados suficientes para análise de tendência.';

  const secaoGrafico = [
    tituloSecao(`Evolução de Curtidas — ${periodoLabel}`),

    // Exibir mini gráfico só se houver dados
    ...(diasExibir.length ? [
      new Paragraph({
        children: [new TextRun({ text: linhaBarras, font: 'Courier New', size: 24, color: ROXO })],
        spacing: { after: 40 },
      }),
      new Paragraph({
        children: [new TextRun({ text: linhaDias, font: 'Courier New', size: 14, color: MUTED })],
        spacing: { after: 160 },
      }),
    ] : []),

    new Paragraph({
      children: [new TextRun({ text: narrativaGrafico, size: 20, color: TEXTO, font: 'Arial' })],
      spacing: { after: 280 },
    }),
  ];

  // ══════════════════════════════════════════════════════════════════════════
  // SEÇÃO 4 — CURTIDAS POR BAIRRO
  // ══════════════════════════════════════════════════════════════════════════

  const BAIRRO_CORES = [ROXO, '8B5CF6', 'A78BFA', 'C4B5FD', 'DDD6FE', 'EDE9FF'];
  const BAR_MAX_CHARS = 30;

  function barraTexto(v, max) {
    const filled = Math.round((v / max) * BAR_MAX_CHARS);
    return '█'.repeat(filled) + '░'.repeat(BAR_MAX_CHARS - filled);
  }

  const maxBairro  = Math.max(...bairros.map((b) => b.total), 1);
  const colB1 = Math.round(CONTENT_W * 0.30);
  const colB2 = Math.round(CONTENT_W * 0.42);
  const colB3 = Math.round(CONTENT_W * 0.15);
  const colB4 = CONTENT_W - colB1 - colB2 - colB3;

  const linhasBairro = bairros.slice(0, 6).map((b, i) => {
    const pctVal = ((b.total / totalBairros) * 100).toFixed(1);
    return new TableRow({
      children: [
        new TableCell({
          borders: bordaCelula(BORDA),
          width: { size: colB1, type: WidthType.DXA },
          margins: { top: 100, bottom: 100, left: 140, right: 100 },
          children: [new Paragraph({ children: [new TextRun({ text: b.bairro, bold: true, size: 20, color: TEXTO, font: 'Arial' })] })],
        }),
        new TableCell({
          borders: bordaCelula(BORDA),
          width: { size: colB2, type: WidthType.DXA },
          margins: { top: 100, bottom: 100, left: 100, right: 100 },
          children: [new Paragraph({ children: [new TextRun({ text: barraTexto(b.total, maxBairro), font: 'Courier New', size: 16, color: BAIRRO_CORES[i] || ROXO })] })],
        }),
        new TableCell({
          borders: bordaCelula(BORDA),
          width: { size: colB3, type: WidthType.DXA },
          margins: { top: 100, bottom: 100, left: 100, right: 100 },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: fmt(b.total), bold: true, size: 20, color: ROXO, font: 'Arial' })] })],
        }),
        new TableCell({
          borders: bordaCelula(BORDA),
          width: { size: colB4, type: WidthType.DXA },
          margins: { top: 100, bottom: 100, left: 100, right: 140 },
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `${pctVal}%`, size: 18, color: MUTED, font: 'Arial' })] })],
        }),
      ],
    });
  });

  // Header da tabela de bairros
  const headerBairro = new TableRow({
    tableHeader: true,
    children: [
      ['Bairro', colB1], ['Distribuição', colB2], ['Curtidas', colB3], ['%', colB4],
    ].map(([label, w]) =>
      new TableCell({
        borders: bordaCelula(ROXO),
        width: { size: w, type: WidthType.DXA },
        shading: { fill: ROXO, type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 140, right: 100 },
        children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 18, color: 'FFFFFF', font: 'Arial' })] })],
      })
    ),
  });

  const narrativaBairro = bairros.length
    ? `${bairros[0]?.bairro} lidera com ${fmt(bairros[0]?.total)} curtidas (${((bairros[0]?.total / totalBairros) * 100).toFixed(0)}%) do total. ${bairros.length > 2 ? `${bairros[bairros.length - 1]?.bairro} e ${bairros[bairros.length - 2]?.bairro} representam oportunidades de crescimento com divulgações segmentadas.` : ''}`
    : 'Nenhum dado de bairro disponível.';

  const secaoBairros = [
    tituloSecao('Curtidas por Bairro'),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [colB1, colB2, colB3, colB4],
      rows: [headerBairro, ...linhasBairro],
    }),
    paragrafoVazio(120),
    new Paragraph({
      children: [new TextRun({ text: narrativaBairro, size: 20, color: TEXTO, font: 'Arial' })],
      spacing: { after: 280 },
    }),
  ];

  // ══════════════════════════════════════════════════════════════════════════
  // SEÇÃO 5 — DETALHAMENTO POR BAIRRO (tabela detalhada)
  // ══════════════════════════════════════════════════════════════════════════

  const STATUS_MAP = (i) => {
    if (i === 0) return '⭐ Principal';
    if (i === 1) return '🔼 Alto';
    if (i === 2) return '➡ Médio';
    return '⚠ A desenvolver';
  };

  const colD = [
    Math.round(CONTENT_W * 0.28),
    Math.round(CONTENT_W * 0.20),
    Math.round(CONTENT_W * 0.20),
    CONTENT_W - Math.round(CONTENT_W * 0.28) - Math.round(CONTENT_W * 0.20) - Math.round(CONTENT_W * 0.20),
  ];

  const headerDetalhe = new TableRow({
    tableHeader: true,
    children: [['Bairro', colD[0]], ['Curtidas', colD[1]], ['Participação', colD[2]], ['Status', colD[3]]].map(([label, w]) =>
      new TableCell({
        borders: bordaCelula(ROXO),
        width: { size: w, type: WidthType.DXA },
        shading: { fill: ROXO, type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 140, right: 100 },
        children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 18, color: 'FFFFFF', font: 'Arial' })] })],
      })
    ),
  });

  const linhasDetalhe = bairros.map((b, i) => {
    const pctVal   = ((b.total / totalBairros) * 100).toFixed(1) + '%';
    const fillCor  = i % 2 === 0 ? 'FAFBFF' : 'FFFFFF';
    return new TableRow({
      children: [
        [b.bairro,        colD[0], true],
        [fmt(b.total),    colD[1], false],
        [pctVal,          colD[2], false],
        [STATUS_MAP(i),   colD[3], false],
      ].map(([text, w, bold]) =>
        new TableCell({
          borders: bordaCelula(BORDA),
          width: { size: w, type: WidthType.DXA },
          shading: { fill: fillCor, type: ShadingType.CLEAR },
          margins: { top: 100, bottom: 100, left: 140, right: 100 },
          children: [new Paragraph({ children: [new TextRun({ text: String(text), bold, size: 20, color: TEXTO, font: 'Arial' })] })],
        })
      ),
    });
  });

  const secaoDetalhe = [
    tituloSecao('Detalhamento por Bairro'),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: colD,
      rows: [headerDetalhe, ...linhasDetalhe],
    }),
    paragrafoVazio(280),
  ];

  // ══════════════════════════════════════════════════════════════════════════
  // SEÇÃO 6 — COMPORTAMENTO TEMPORAL
  // ══════════════════════════════════════════════════════════════════════════

  const ORDER_DIA2 = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const mapaSem    = {};
  porSemana.forEach(({ diaSemana, total }) => { mapaSem[diaSemana] = total; });
  const dadosDia = ORDER_DIA2.map((d) => ({ label: d, value: mapaSem[d] || 0 }));
  const maxSem   = Math.max(...dadosDia.map((d) => d.value), 1);

  // Slots de hora agrupados de 3h em 3h
  const slots    = [0, 3, 6, 9, 12, 15, 18, 21];
  const dadosHora = slots.map((h) => ({
    label: `${h}h`,
    value: (mapaHora[h] || 0) + (mapaHora[h + 1] || 0) + (mapaHora[h + 2] || 0),
  }));
  const maxHora  = Math.max(...dadosHora.map((d) => d.value), 1);

  function miniBarTemporal(v, max) {
    const n = Math.round((v / max) * 8);
    return '█'.repeat(n) + '░'.repeat(8 - n);
  }

  // Tabela dias da semana
  const colT1 = Math.round(CONTENT_W * 0.15);
  const colT2 = Math.round(CONTENT_W * 0.50);
  const colT3 = CONTENT_W - colT1 - colT2;

  const linhasDia = dadosDia.map((d) => new TableRow({
    children: [
      new TableCell({
        borders: bordaCelula(BORDA), width: { size: colT1, type: WidthType.DXA },
        margins: { top: 80, bottom: 80, left: 120, right: 80 },
        children: [new Paragraph({ children: [new TextRun({ text: d.label, bold: true, size: 18, font: 'Arial', color: TEXTO })] })],
      }),
      new TableCell({
        borders: bordaCelula(BORDA), width: { size: colT2, type: WidthType.DXA },
        margins: { top: 80, bottom: 80, left: 80, right: 80 },
        children: [new Paragraph({ children: [new TextRun({ text: miniBarTemporal(d.value, maxSem), font: 'Courier New', size: 18, color: ROXO })] })],
      }),
      new TableCell({
        borders: bordaCelula(BORDA), width: { size: colT3, type: WidthType.DXA },
        margins: { top: 80, bottom: 80, left: 80, right: 120 },
        children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: fmt(d.value), bold: true, size: 18, font: 'Arial', color: ROXO })] })],
      }),
    ],
  }));

  const linhasHora = dadosHora.map((d) => new TableRow({
    children: [
      new TableCell({
        borders: bordaCelula(BORDA), width: { size: colT1, type: WidthType.DXA },
        margins: { top: 80, bottom: 80, left: 120, right: 80 },
        children: [new Paragraph({ children: [new TextRun({ text: d.label, bold: true, size: 18, font: 'Arial', color: TEXTO })] })],
      }),
      new TableCell({
        borders: bordaCelula(BORDA), width: { size: colT2, type: WidthType.DXA },
        margins: { top: 80, bottom: 80, left: 80, right: 80 },
        children: [new Paragraph({ children: [new TextRun({ text: miniBarTemporal(d.value, maxHora), font: 'Courier New', size: 18, color: ROXO })] })],
      }),
      new TableCell({
        borders: bordaCelula(BORDA), width: { size: colT3, type: WidthType.DXA },
        margins: { top: 80, bottom: 80, left: 80, right: 120 },
        children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: fmt(d.value), bold: true, size: 18, font: 'Arial', color: ROXO })] })],
      }),
    ],
  }));

  const notasSemana = peakDia
    ? `${peakDia.diaSemana}feira é o dia de maior engajamento com ${fmt(peakDia.total)} curtidas.`
    : '';
  const notasHora = peakHora
    ? `Pico de curtidas às ${peakHora.hora}h. Publicações nesse intervalo recebem em média mais interações que a média do dia.`
    : '';

  const secaoTemporal = [
    tituloSecao('Comportamento Temporal'),

    new Paragraph({
      children: [new TextRun({ text: 'Curtidas por dia da semana', bold: true, size: 22, color: TEXTO, font: 'Arial' })],
      spacing: { before: 160, after: 100 },
    }),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [colT1, colT2, colT3],
      rows: linhasDia,
    }),
    paragrafoVazio(80),
    ...(notasSemana ? [new Paragraph({ children: [new TextRun({ text: notasSemana, size: 18, color: MUTED, font: 'Arial', italics: true })], spacing: { after: 200 } })] : []),

    new Paragraph({
      children: [new TextRun({ text: 'Curtidas por horário', bold: true, size: 22, color: TEXTO, font: 'Arial' })],
      spacing: { before: 200, after: 100 },
    }),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [colT1, colT2, colT3],
      rows: linhasHora,
    }),
    paragrafoVazio(80),
    ...(notasHora ? [new Paragraph({ children: [new TextRun({ text: notasHora, size: 18, color: MUTED, font: 'Arial', italics: true })], spacing: { after: 280 } })] : []),
  ];

  // ══════════════════════════════════════════════════════════════════════════
  // SEÇÃO 7 — RECOMENDAÇÕES
  // ══════════════════════════════════════════════════════════════════════════

  const recomendacoes = gerarRecomendacoes(data, peakHora, peakDia, bairros);

  const colR1 = Math.round(CONTENT_W * 0.10);
  const colR2 = CONTENT_W - colR1;

  const secaoRecomendacoes = [
    tituloSecao('Recomendações'),
    ...recomendacoes.map((rec, i) =>
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [colR1, colR2],
        borders: semBorda(),
        rows: [
          new TableRow({
            children: [
              new TableCell({
                borders: semBorda(),
                width: { size: colR1, type: WidthType.DXA },
                shading: { fill: ROXO, type: ShadingType.CLEAR },
                margins: { top: 120, bottom: 120, left: 140, right: 100 },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `0${i + 1}`, bold: true, size: 28, color: 'FFFFFF', font: 'Arial' })] })],
              }),
              new TableCell({
                borders: semBorda(),
                width: { size: colR2, type: WidthType.DXA },
                margins: { top: 120, bottom: 120, left: 160, right: 0 },
                children: [new Paragraph({ children: [new TextRun({ text: rec, size: 20, color: TEXTO, font: 'Arial' })] })],
              }),
            ],
          }),
        ],
      })
    ),
    paragrafoVazio(200),
  ];

  // ══════════════════════════════════════════════════════════════════════════
  // RODAPÉ
  // ══════════════════════════════════════════════════════════════════════════

  const secaoRodape = [
    linhaDivisoria(BORDA),
    new Paragraph({
      children: [new TextRun({ text: `Este relatório foi gerado automaticamente pela plataforma Negócio na Área com base nos dados de curtidas registrados no período indicado.`, size: 16, color: MUTED, font: 'Arial' })],
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Negócio na Área — Relatório Confidencial', size: 16, color: MUTED, font: 'Arial', bold: true }),
        new TextRun({ text: '                                    Página 1', size: 16, color: MUTED, font: 'Arial' }),
      ],
    }),
  ];

  // ══════════════════════════════════════════════════════════════════════════
  // MONTAR DOCUMENTO
  // ══════════════════════════════════════════════════════════════════════════

  const document = new Document({
    styles: {
      default: {
        document: { run: { font: 'Arial', size: 22, color: TEXTO } },
      },
    },
    sections: [{
      properties: {
        page: {
          size: { width: PAGE_W, height: PAGE_H },
          margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
        },
      },
      children: [
        ...secaoCabecalho,
        ...secaoResumo,
        ...secaoGrafico,
        ...secaoBairros,
        ...secaoDetalhe,
        ...secaoTemporal,
        ...secaoRecomendacoes,
        ...secaoRodape,
      ],
    }],
  });

  return document;
}

// ── Recomendações dinâmicas ───────────────────────────────────────────────────

function gerarRecomendacoes(data, peakHora, peakDia, bairros) {
  const recs = [];
  const v    = data.variacaoPercentual ?? 0;

  if (peakHora && peakDia) {
    recs.push(`Publicar entre ${peakHora.hora}h e ${peakHora.hora + 2}h de ${peakDia.diaSemana}feira para maximizar curtidas.`);
  } else if (peakHora) {
    recs.push(`Publicar próximo às ${peakHora.hora}h para atingir o horário de pico de engajamento.`);
  }

  if (bairros.length > 2) {
    const menores = bairros.slice(-2).map((b) => b.bairro).join(' e ');
    recs.push(`Criar divulgações segmentadas para ${menores}, bairros com menor alcance atual.`);
  }

  if (v > 0) {
    recs.push(`Manter a frequência e qualidade de postagens que gerou crescimento de ${v.toFixed(1)}% no período.`);
  } else if (v < 0) {
    recs.push(`Aumentar a frequência de publicações para reverter a queda de ${Math.abs(v).toFixed(1)}% em relação ao período anterior.`);
  }

  if (data.publicacaoMaisCurtida && data.publicacaoMaisCurtida !== '—') {
    recs.push(`Produzir mais conteúdo semelhante a "${data.publicacaoMaisCurtida}", sua publicação com maior engajamento.`);
  }

  // Garantir pelo menos 3 recomendações
  if (recs.length < 3) {
    recs.push('Diversificar os tipos de publicação (promoções, novidades, bastidores) para ampliar o alcance.');
  }

  return recs;
}

// ── Download ──────────────────────────────────────────────────────────────────

async function baixarRelatorio(analyticsData, nomeEmpresa, periodoLabel) {
  const btn = document.getElementById('printReport');
  if (btn) { btn.textContent = '⏳ Gerando…'; btn.disabled = true; }

  try {
    const doc  = await gerarRelatorioDocx(analyticsData, nomeEmpresa, periodoLabel);
    const blob = await resolverDocx().Packer.toBlob(doc);
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    const safe = nomeEmpresa.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    a.href     = url;
    a.download = `relatorio_${safe}_${new Date().toISOString().slice(0, 10)}.docx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Erro ao gerar relatório:', err);
    alert('Erro ao gerar o relatório. Verifique o console.');
  } finally {
    if (btn) { btn.textContent = '▣ Imprimir relatório'; btn.disabled = false; }
  }
}

// ── Utilitário ────────────────────────────────────────────────────────────────

function formatDataBr(iso) {
  if (!iso) return '';
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}