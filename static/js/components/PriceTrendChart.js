// AgriPredict AI - PriceTrendChart Component
// Renders Chart.js line graph for Historical Price -> Current Spot -> 7-Day ML Forecast

let currentChartInstance = null;

export function renderPriceTrendChart(containerId, analysis) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!analysis) return;

  if (typeof window.Chart === 'undefined') {
    container.innerHTML = `
      <div class="h-64 flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
        <i class="fa-solid fa-chart-line text-2xl text-emerald-500 animate-pulse"></i>
        <span>Chart engine initializing...</span>
      </div>
    `;
    return;
  }

  const { chartData, pricing, recommendation, commodityInfo } = analysis;
  
  // Safe extraction of historical and predicted series
  const rawHist = (chartData && Array.isArray(chartData.historical) && chartData.historical.length > 0)
    ? chartData.historical
    : (pricing?.historical30d || commodityInfo?.historical30d || [2800, 2850, 2900]);

  const rawPred = (chartData && Array.isArray(chartData.predicted) && chartData.predicted.length > 0)
    ? chartData.predicted
    : (pricing?.predicted7d || commodityInfo?.predicted7d || []);

  const histLength = rawHist.length;
  const historyLabels = Array.from({ length: histLength }, (_, i) => i === histLength - 1 ? "Today (Spot)" : `D-${histLength - 1 - i}`);
  const forecastLabels = rawPred.map((p, idx) => p.day || `Day +${idx + 1}`);
  const allLabels = [...historyLabels, ...forecastLabels];

  // Historical data points
  const historicalSeries = [...rawHist];
  while (historicalSeries.length < allLabels.length) {
    historicalSeries.push(null);
  }

  // Predicted data points (connects from today's spot price)
  const spotPrice = rawHist[histLength - 1] || pricing?.currentPrice || 3000;
  const predictedSeries = Array(Math.max(0, histLength - 1)).fill(null);
  predictedSeries.push(spotPrice);
  rawPred.forEach(p => predictedSeries.push(p.price || p));

  // Upper and Lower confidence bounds
  const upperBounds = Array(Math.max(0, histLength - 1)).fill(null);
  upperBounds.push(spotPrice);
  rawPred.forEach(p => upperBounds.push(p.upper || (p.price ? Math.round(p.price * 1.05) : spotPrice)));

  const lowerBounds = Array(Math.max(0, histLength - 1)).fill(null);
  lowerBounds.push(spotPrice);
  rawPred.forEach(p => lowerBounds.push(p.lower || (p.price ? Math.round(p.price * 0.95) : spotPrice)));

  // Destroy previous chart if exists
  if (currentChartInstance) {
    currentChartInstance.destroy();
    currentChartInstance = null;
  }

  const canvas = document.createElement('canvas');
  canvas.id = 'priceChartCanvas';
  canvas.className = 'w-full h-72 sm:h-80';
  container.innerHTML = '';
  container.appendChild(canvas);

  const ctx = canvas.getContext('2d');

  // Gradients
  const histGradient = ctx.createLinearGradient(0, 0, 0, 300);
  histGradient.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
  histGradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

  const predGradient = ctx.createLinearGradient(0, 0, 0, 300);
  predGradient.addColorStop(0, 'rgba(245, 158, 11, 0.3)');
  predGradient.addColorStop(1, 'rgba(245, 158, 11, 0.0)');

  currentChartInstance = new window.Chart(ctx, {
    type: 'line',
    data: {
      labels: allLabels,
      datasets: [
        {
          label: 'Historical Price (₹/Qtl)',
          data: historicalSeries,
          borderColor: '#10b981', // Emerald green
          backgroundColor: histGradient,
          borderWidth: 2.5,
          pointRadius: 2,
          pointHoverRadius: 6,
          pointBackgroundColor: '#10b981',
          fill: true,
          tension: 0.35
        },
        {
          label: 'AI Forecast (₹/Qtl)',
          data: predictedSeries,
          borderColor: '#f59e0b', // Amber
          backgroundColor: predGradient,
          borderWidth: 3,
          borderDash: [5, 5],
          pointRadius: 5,
          pointHoverRadius: 8,
          pointBackgroundColor: '#f59e0b',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          fill: false,
          tension: 0.3
        },
        {
          label: 'Forecast Range (Upper)',
          data: upperBounds,
          borderColor: 'transparent',
          backgroundColor: 'rgba(245, 158, 11, 0.08)',
          fill: '+1', // fill down to lower bound
          pointRadius: 0,
          tension: 0.3
        },
        {
          label: 'Forecast Range (Lower)',
          data: lowerBounds,
          borderColor: 'transparent',
          backgroundColor: 'rgba(245, 158, 11, 0.08)',
          fill: false,
          pointRadius: 0,
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            usePointStyle: true,
            boxWidth: 8,
            font: { family: "'Plus Jakarta Sans', sans-serif", size: 12, weight: '600' },
            filter: function(item) {
              return !item.text.includes('Forecast Range');
            }
          }
        },
        tooltip: {
          backgroundColor: '#0f172a',
          titleFont: { size: 13, weight: 'bold' },
          bodyFont: { size: 12 },
          padding: 12,
          cornerRadius: 10,
          callbacks: {
            label: function(context) {
              if (context.raw === null || context.dataset.label.includes('Range')) return '';
              return ` ${context.dataset.label}: ₹${context.raw.toLocaleString('en-IN')}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            font: { size: 11 },
            maxRotation: 45,
            callback: function(val, index) {
              if (index === 0 || index === 14 || index === 29 || index === 34 || index === 36) {
                return this.getLabelForValue(val);
              }
              return '';
            }
          }
        },
        y: {
          grid: { color: 'rgba(226, 232, 240, 0.6)' },
          ticks: {
            font: { size: 11 },
            callback: function(value) {
              return '₹' + value.toLocaleString('en-IN');
            }
          }
        }
      }
    }
  });
}
