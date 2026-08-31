// AgriPredict AI - PriceCard Component
// Renders top summary cards on the Market Intelligence Dashboard including data source badges and logistics cost breakdown

export function renderPriceCards(analysis) {
  const { pricing, recommendation, input, commodityInfo, data_source, forecast_source } = analysis;
  const isPos = pricing.isPositive;
  const isWait = recommendation.type === 'WAIT';

  // Format Data Source Badge
  let dataSourceBadge = '<span class="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700"><i class="fa-solid fa-flask"></i> Prototype Data</span>';
  if (data_source === 'live_api') {
    dataSourceBadge = '<span class="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"><span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Live Government API (Data.gov.in)</span>';
  } else if (data_source === 'cached_data') {
    dataSourceBadge = '<span class="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700"><i class="fa-solid fa-database"></i> Cached Historical Data</span>';
  }

  // Format Forecast Capability Badge
  const hasML = forecast_source === 'actual_ml_model' || commodityInfo?.hasMLModel;
  const forecastBadge = hasML
    ? '<span class="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">Trained ML Model</span>'
    : '<span class="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">Estimated Demo Forecast</span>';

  return `
    <div class="space-y-4 mb-8">
      
      <!-- Top Data Transparency Banner -->
      <div class="flex flex-wrap items-center justify-between gap-2 p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
        <div class="flex items-center gap-2">
          <span class="text-slate-500 dark:text-slate-400 font-semibold">Data Source:</span>
          ${dataSourceBadge}
        </div>
        <div class="flex items-center gap-2">
          <span class="text-slate-500 dark:text-slate-400 font-semibold">Forecast Engine:</span>
          ${forecastBadge}
        </div>
      </div>

      <!-- Top 4 Primary KPI Summary Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <!-- 1. Current Spot Price -->
        <div class="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-sm hover:shadow-md transition-all">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Current Market Price</span>
            <span class="p-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 text-lg">💰</span>
          </div>
          <div class="flex items-baseline gap-1">
            <span class="text-3xl font-black text-slate-900 dark:text-white">₹${pricing.currentPrice.toLocaleString('en-IN')}</span>
            <span class="text-sm font-semibold text-slate-500 dark:text-slate-400">/ Quintal</span>
          </div>
          <div class="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
            <span class="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Spot Rate (${input.grade} Grade)</span>
          </div>
        </div>

        <!-- 2. Predicted Price & Trend -->
        <div class="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-sm hover:shadow-md transition-all">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              ${isWait ? `Target Price in ${pricing.optimalDays} Days` : 'Short-Term Forecast'}
            </span>
            <span class="p-2 rounded-2xl ${isPos ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400' : 'bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400'} text-lg">📈</span>
          </div>
          <div class="flex items-baseline gap-2">
            <span class="text-3xl font-black text-slate-900 dark:text-white">₹${pricing.predictedPrice.toLocaleString('en-IN')}</span>
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black ${isPos ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300' : 'bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300'}">
              ${isPos ? '+' : ''}${pricing.priceChangePct}%
            </span>
          </div>
          <div class="mt-2 text-xs font-semibold ${isPos ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'} flex items-center gap-1">
            <i class="fa-solid ${isPos ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}"></i>
            <span>${isPos ? 'Bullish Upward Trend' : 'Bearish / High Inflow Trend'}</span>
          </div>
        </div>

        <!-- 3. Best Recommended Mandi -->
        <div class="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-sm hover:shadow-md transition-all">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Best Recommended Market</span>
            <span class="p-2 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 text-lg">🏛️</span>
          </div>
          <div class="truncate text-lg font-black text-slate-900 dark:text-white" title="${pricing.bestMarketName}">
            ${pricing.bestMarketName.replace('Agricultural Market Yard', 'APMC').replace('Wholesale Mandi', 'Mandi')}
          </div>
          <div class="mt-2 text-xs text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1.5">
            <i class="fa-solid fa-truck-fast"></i>
            <span>${pricing.bestMarketDistance} km away • ₹${pricing.bestMarketPricePerQtl}/Qtl</span>
          </div>
        </div>

        <!-- 4. Estimated Net Return -->
        <div class="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white rounded-3xl p-5 shadow-lg hover:shadow-xl transition-all relative overflow-hidden flex flex-col justify-between">
          <div class="absolute -right-3 -bottom-3 opacity-15 text-6xl select-none pointer-events-none">🌾</div>
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-bold uppercase tracking-wider text-emerald-100">Estimated Net Return</span>
              <span class="px-2 py-0.5 rounded-full bg-white/20 text-xs font-extrabold text-white">For ${input.quantity} Qtl</span>
            </div>
            <div class="text-3xl font-black text-white">
              ₹${pricing.estimatedNetReturn.toLocaleString('en-IN')}
            </div>
          </div>
          <div class="mt-3 pt-2 border-t border-white/20 text-xs text-emerald-100 flex items-center gap-1 font-semibold">
            <i class="fa-solid fa-circle-check text-emerald-300"></i>
            <span>+₹${pricing.additionalProfit.toLocaleString('en-IN')} additional profit</span>
          </div>
        </div>

      </div>

      <!-- Secondary Row: Financial Cost Breakdown (Transport & Storage Deductions) -->
      <div class="bg-slate-100 dark:bg-slate-900/80 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        
        <!-- Gross Revenue -->
        <div class="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200/70 dark:border-slate-700">
          <span class="text-slate-500 dark:text-slate-400 font-semibold block text-[11px]">Gross Crop Value</span>
          <span class="text-base font-bold text-slate-900 dark:text-white mt-0.5 block">
            ₹${pricing.grossReturn.toLocaleString('en-IN')}
          </span>
          <span class="text-[10px] text-slate-400 font-medium">Price × ${input.quantity} Qtl</span>
        </div>

        <!-- Transport Cost -->
        <div class="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200/70 dark:border-slate-700">
          <span class="text-rose-500 font-semibold block text-[11px] flex items-center gap-1">
            <i class="fa-solid fa-truck"></i> Transport Freight
          </span>
          <span class="text-base font-bold text-rose-600 dark:text-rose-400 mt-0.5 block">
            - ₹${pricing.transportCostTotal.toLocaleString('en-IN')}
          </span>
          <span class="text-[10px] text-slate-400 font-medium">₹${pricing.transportCostPerQtl}/Qtl (${pricing.bestMarketDistance} km)</span>
        </div>

        <!-- Storage Cost -->
        <div class="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200/70 dark:border-slate-700">
          <span class="text-amber-500 font-semibold block text-[11px] flex items-center gap-1">
            <i class="fa-solid fa-warehouse"></i> Storage Expense
          </span>
          <span class="text-base font-bold text-amber-600 dark:text-amber-400 mt-0.5 block">
            ${isWait ? `- ₹${pricing.storageCostTotal.toLocaleString('en-IN')}` : '₹0 (Zero Holding)'}
          </span>
          <span class="text-[10px] text-slate-400 font-medium">${isWait ? `₹${pricing.storageCostPerQtl}/Qtl for ${pricing.optimalDays} days` : 'Immediate Delivery'}</span>
        </div>

        <!-- Net Profit In-Hand -->
        <div class="bg-emerald-50 dark:bg-emerald-950/60 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/70">
          <span class="text-emerald-800 dark:text-emerald-300 font-bold block text-[11px] flex items-center gap-1">
            <i class="fa-solid fa-wallet"></i> Net Cash in Hand
          </span>
          <span class="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">
            ₹${pricing.estimatedNetReturn.toLocaleString('en-IN')}
          </span>
          <span class="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">₹${Math.round(pricing.estimatedNetReturn / input.quantity).toLocaleString('en-IN')}/Qtl Net</span>
        </div>

      </div>

    </div>
  `;
}
