const reportData = {
  platform: {
    name: "Negócio na Área",
    logo: "assets/logo_rd-removebg-preview.png",
  },
  business: {
    name: "Doce Encanto Confeitaria",
  },
  period: "01/05/2025 - 31/05/2025",
  generatedAt: "31/05/2025 às 14:30",
  metrics: [
    {
      label: "Total de curtidas",
      value: "1.257",
      note: "Todas as publicações da sua loja",
      icon: "♥",
      color: "purple",
    },
    {
      label: "Curtidas este mês",
      value: "245",
      note: '<span class="positive">+18%</span> em relação ao mês passado',
      icon: "↗",
      color: "green",
    },
    {
      label: "Publicação mais curtida",
      value: "Promoção de Brigadeiro",
      note: "89 curtidas",
      icon: "🏆",
      color: "yellow",
    },
    {
      label: "Média por publicação",
      value: "34",
      note: "Curtidas por divulgação",
      icon: "▥",
      color: "blue",
    },
  ],
  dailyLikes: [
    6, 5, 20, 25, 12, 18, 20, 39, 32, 38, 30, 40, 46, 60, 46, 30, 38, 46, 67,
    72, 64, 69, 64, 74, 93,
  ],
  topPosts: [
    { title: "Promoção de Brigadeiro", likes: 89, image: "🍫", tone: ["#6b3f2f", "#d9a56f"] },
    { title: "Bolo de Morango",        likes: 76, image: "🍰", tone: ["#a33b48", "#f2b7b2"] },
    { title: "Caixa de Doces para Presente", likes: 58, image: "🎁", tone: ["#d56730", "#f5c557"] },
    { title: "Cupcakes Decorados",     likes: 45, image: "🧁", tone: ["#86533a", "#f0d2a6"] },
    { title: "Promoção de Páscoa",     likes: 32, image: "🍯", tone: ["#b86f29", "#f2cd73"] },
  ],
  hours: [
    { label: "0h",  value: 10 },
    { label: "4h",  value: 10 },
    { label: "8h",  value: 30 },
    { label: "12h", value: 53 },
    { label: "16h", value: 56 },
    { label: "18h", value: 70 },
    { label: "20h", value: 85 },
    { label: "23h", value: 67 },
  ],
  weekdays: [
    { label: "Seg", value: 57 },
    { label: "Ter", value: 70 },
    { label: "Qua", value: 62 },
    { label: "Qui", value: 76 },
    { label: "Sex", value: 83 },
    { label: "Sáb", value: 53 },
    { label: "Dom", value: 37 },
  ],
  insights: [
    { text: "Suas curtidas aumentaram 18% este mês.",                             icon: "↗", color: "green"  },
    { text: "Publicações feitas à noite recebem mais curtidas.",                   icon: "◷", color: "blue"   },
    { text: "Sua publicação mais recente teve 40% mais engajamento que a média.", icon: "★", color: "yellow" },
    { text: "Continue assim! Sua loja está se destacando na plataforma.",         icon: "♥", color: "pink"   },
  ],
};

// ── Selectors ────────────────────────────────────────────────────────────────

const metricCards  = document.querySelector("#metricCards");
const topPostsEl   = document.querySelector("#topPosts");
const hourChart    = document.querySelector("#hourChart");
const weekChart    = document.querySelector("#weekChart");
const insightsEl   = document.querySelector("#insights");
const reportFooter = document.querySelector("#reportFooter");
const platformLogo = document.querySelector("#platformLogo");
const platformName = document.querySelector("#platformName");
const businessName = document.querySelector("#businessName");

// ── Renderers ─────────────────────────────────────────────────────────────────

function renderMetrics(metrics) {
  metricCards.innerHTML = metrics
    .map((metric) => {
      const valueClass = metric.value.length > 8 ? "metric-value long-value" : "metric-value";
      return `
        <article class="metric-card">
          <span class="metric-icon ${metric.color}" aria-hidden="true">${metric.icon}</span>
          <div>
            <p class="metric-label">${metric.label}</p>
            <strong class="${valueClass}">${metric.value}</strong>
            <p class="metric-note">${metric.note}</p>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderTopPosts(posts) {
  const maxLikes = Math.max(...posts.map((p) => p.likes));
  topPostsEl.innerHTML = posts
    .map((post) => {
      const width = Math.round((post.likes / maxLikes) * 100);
      return `
        <div class="post-row">
          <span class="post-image" style="background: linear-gradient(135deg, ${post.tone[0]}, ${post.tone[1]});" aria-hidden="true">${post.image}</span>
          <p class="post-title">${post.title}</p>
          <div class="progress" aria-label="${post.likes} curtidas">
            <span style="width: ${width}%"></span>
          </div>
          <strong class="post-likes">${post.likes}</strong>
        </div>
      `;
    })
    .join("");
}

function renderBarChart(container, data) {
  container.innerHTML = `
    <div class="bar-axis" aria-hidden="true">
      <span>100</span>
      <span>80</span>
      <span>60</span>
      <span>40</span>
      <span>20</span>
      <span>0</span>
    </div>
    <div class="bar-plot">
      ${data
        .map(
          (item) => `
            <div class="bar-item" title="${item.label}: ${item.value} curtidas">
              <span class="bar" style="height: ${item.value}%"></span>
              <span class="bar-label">${item.label}</span>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderInsights(items) {
  insightsEl.innerHTML = items
    .map(
      (item) => `
        <div class="insight-row">
          <span class="insight-icon ${item.color}" aria-hidden="true">${item.icon}</span>
          <p class="insight-text">${item.text}</p>
        </div>
      `
    )
    .join("");
}

function drawLineChart(values) {
  const canvas  = document.querySelector("#likesLineChart");
  const context = canvas.getContext("2d");
  const pixelRatio = window.devicePixelRatio || 1;
  const cssWidth   = canvas.clientWidth;
  const cssHeight  = canvas.clientHeight;

  canvas.width  = cssWidth  * pixelRatio;
  canvas.height = cssHeight * pixelRatio;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, cssWidth, cssHeight);

  const padding  = { top: 18, right: 28, bottom: 34, left: 42 };
  const width    = cssWidth  - padding.left - padding.right;
  const height   = cssHeight - padding.top  - padding.bottom;
  const maxValue = 100;

  const points = values.map((value, index) => ({
    x: padding.left + (index / (values.length - 1)) * width,
    y: padding.top  + height - (value / maxValue) * height,
    value,
  }));

  // Grid lines + Y labels
  context.strokeStyle = "#e8eaf4";
  context.lineWidth   = 1;
  context.fillStyle   = "#6b7494";
  context.font        = "12px 'DM Sans', system-ui, sans-serif";
  context.textAlign   = "right";
  context.textBaseline = "middle";

  [0, 20, 40, 60, 80, 100].forEach((tick) => {
    const y = padding.top + height - (tick / maxValue) * height;
    context.beginPath();
    context.moveTo(padding.left, y);
    context.lineTo(padding.left + width, y);
    context.stroke();
    context.fillText(String(tick), padding.left - 10, y);
  });

  // X labels
  context.textAlign    = "center";
  context.textBaseline = "top";
  ["01/05", "06/05", "11/05", "16/05", "21/05", "26/05", "31/05"].forEach(
    (label, index, labels) => {
      const x = padding.left + (index / (labels.length - 1)) * width;
      context.fillText(label, x, padding.top + height + 10);
    }
  );

  // Gradient fill
  const areaGradient = context.createLinearGradient(0, padding.top, 0, padding.top + height);
  areaGradient.addColorStop(0, "rgba(107, 76, 230, 0.28)");
  areaGradient.addColorStop(1, "rgba(107, 76, 230, 0.02)");

  context.beginPath();
  points.forEach((point, index) => {
    if (index === 0) context.moveTo(point.x, point.y);
    else context.lineTo(point.x, point.y);
  });
  context.lineTo(points[points.length - 1].x, padding.top + height);
  context.lineTo(points[0].x, padding.top + height);
  context.closePath();
  context.fillStyle = areaGradient;
  context.fill();

  // Line
  context.beginPath();
  points.forEach((point, index) => {
    if (index === 0) context.moveTo(point.x, point.y);
    else context.lineTo(point.x, point.y);
  });
  context.strokeStyle = "#6b4ce6";
  context.lineWidth   = 2.5;
  context.lineJoin    = "round";
  context.lineCap     = "round";
  context.stroke();

  // Dots
  points.forEach((point) => {
    context.beginPath();
    context.arc(point.x, point.y, 4, 0, Math.PI * 2);
    context.fillStyle   = "#6b4ce6";
    context.fill();
    context.lineWidth   = 2.5;
    context.strokeStyle = "#ffffff";
    context.stroke();
  });
}

function setupActions() {
  document.querySelector("#printReport").addEventListener("click", () => {
    window.print();
  });

  window.addEventListener("resize", () => {
    drawLineChart(reportData.dailyLikes);
  });
}

// ── Init ─────────────────────────────────────────────────────────────────────

platformLogo.src          = reportData.platform.logo;
platformName.textContent  = reportData.platform.name;
businessName.textContent  = reportData.business.name;


renderMetrics(reportData.metrics);
renderTopPosts(reportData.topPosts);
renderBarChart(hourChart,  reportData.hours);
renderBarChart(weekChart,  reportData.weekdays);
renderInsights(reportData.insights);

// Draw chart after layout renders
requestAnimationFrame(() => {
  drawLineChart(reportData.dailyLikes);
});

reportFooter.innerHTML = `<p>Relatório gerado em ${reportData.generatedAt}</p>`;

setupActions();