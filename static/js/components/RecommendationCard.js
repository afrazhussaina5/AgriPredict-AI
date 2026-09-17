// AgriPredict AI - RecommendationCard Component
// Prominently displays the AI action verdict (WAIT / SELL NOW / SELL AT BEST MARKET)

export function renderRecommendationCard(analysis) {
  const { recommendation, pricing, input, commodityInfo } = analysis;
  const isWait = recommendation.type === 'WAIT';
  const isSellNow = recommendation.type === 'SELL_NOW';

  let badgeBg = "bg-amber-500 text-white";
  let borderColor = "border-amber-400 dark:border-amber-600";
  let gradientBg = "from-amber-500/10 via-emerald-500/5 to-transparent";
  let actionIcon = "fa-clock";
  let actionColor = "text-amber-600 dark:text-amber-400";

  if (isSellNow) {
    badgeBg = "bg-rose-500 text-white";
    borderColor = "border-rose-400 dark:border-rose-600";
    gradientBg = "from-rose-500/10 via-orange-500/5 to-transparent";
    actionIcon = "fa-bolt";
    actionColor = "text-rose-600 dark:text-rose-400";
  } else if (!isWait) {
    badgeBg = "bg-blue-600 text-white";
    borderColor = "border-blue-400 dark:border-blue-600";
    gradientBg = "from-blue-500/10 via-emerald-500/5 to-transparent";
    actionIcon = "fa-truck-fast";
    actionColor = "text-blue-600 dark:text-blue-400";
  }

  return `
    <div class="relative bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border-2 ${borderColor} shadow-lg mb-8 overflow-hidden bg-gradient-to-r ${gradientBg}">
      
      <!-- Top Badges -->
      <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div class="flex items-center gap-2">
          <span class="px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-black uppercase tracking-wider ${badgeBg} shadow-sm flex items-center gap-1.5 animate-pulse">
            <i class="fa-solid ${actionIcon}"></i>
            AI Decision: ${recommendation.action}
          </span>
          <span class="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
            ${recommendation.confidence}% Confidence
          </span>
        </div>

        <div class="flex items-center gap-2">
          <button id="voiceNarrateBtn" class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors shadow-sm" title="Listen in audio">
            <i class="fa-solid fa-volume-high text-emerald-600"></i>
            <span>Listen (आवाज़ में सुनें)</span>
          </button>
        </div>
      </div>

      <!-- Main Headline & Additional Profit Highlight -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
        
        <div class="lg:col-span-2">
          <h2 class="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white leading-tight mb-3">
            ${recommendation.headline}
          </h2>
          <p class="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
            ${recommendation.explanation}
          </p>
        </div>

        <!-- Profit Callout Box -->
        <div class="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl p-5 text-center shadow-inner">
          <div class="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider mb-1">
            ${isSellNow ? 'Loss Prevented by Selling Today' : 'Expected Extra Profit'}
          </div>
          <div class="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400">
            +₹${recommendation.expectedGain.toLocaleString('en-IN')}
          </div>
          <div class="text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-medium">
            Calculated on ${input.quantity} Quintals after transport & storage
          </div>

          <div class="mt-4 flex flex-col sm:flex-row gap-2 justify-center">
            <button onclick="window.AgriApp.openCreateLotModal()" class="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-black transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-1.5">
              <i class="fa-solid fa-box-open"></i>
              <span>Create Produce Lot</span>
            </button>
            <button onclick="window.AgriApp.navigateTo('/buyers')" class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-1.5">
              <i class="fa-solid fa-handshake"></i>
              <span>Match Buyers Now</span>
            </button>
          </div>
        </div>

      </div>

    </div>
  `;
}
