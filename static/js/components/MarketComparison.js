// AgriPredict AI - MarketComparison Component
// Renders the Multi-Mandi Logistics & Net Return Comparison Table

export function renderMarketComparison(analysis) {
  const { mandis, input, pricing, recommendation } = analysis;
  const isWait = recommendation.type === 'WAIT';

  return `
    <div class="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-700/80 shadow-md mb-8">
      
      <!-- Header with Formula Explanation -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-700">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-2xl">🏛️</span>
            <h3 class="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              Multi-Mandi Net Return Comparison
            </h3>
          </div>
          <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Comparing prices and deducting real transportation and storage expenses for ${input.quantity} Quintals.
          </p>
        </div>

        <!-- Formula Banner -->
        <div class="inline-flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 px-4 py-2 rounded-2xl text-xs sm:text-sm font-semibold text-emerald-800 dark:text-emerald-300">
          <i class="fa-solid fa-calculator text-emerald-600"></i>
          <span>Net Return = (Price × Qty) - Transport Cost - Storage Cost</span>
        </div>
      </div>

      <!-- Mandi Cards Grid / Table -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
        ${mandis.map((mandi, idx) => {
          const isBest = idx === 0;
          const isNearest = mandi.distanceKm <= 10;
          const netReturn = isWait ? mandi.netReturnFuture : mandi.netReturnToday;
          const priceUsed = isWait ? mandi.predPricePerQtl : mandi.spotPricePerQtl;

          return `
            <div class="relative bg-slate-50/70 dark:bg-slate-900/60 rounded-2xl p-5 border ${isBest ? 'border-2 border-emerald-500 shadow-md bg-emerald-50/20 dark:bg-emerald-950/20' : 'border-slate-200 dark:border-slate-700/80'} hover:shadow-lg transition-all flex flex-col justify-between">
              
              <!-- Badges -->
              <div class="flex items-center justify-between gap-2 mb-3">
                <span class="text-xs font-bold px-2.5 py-1 rounded-full ${isBest ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}">
                  ${isBest ? '🏆 RECOMMENDED BEST' : `Rank #${idx + 1}`}
                </span>

                <div class="flex items-center gap-1.5">
                  ${mandi.isE_NAM ? '<span class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">e-NAM</span>' : ''}
                  <span class="text-xs text-amber-500 font-bold flex items-center gap-0.5">
                    ★ ${mandi.rating}
                  </span>
                </div>
              </div>

              <!-- Mandi Name & Distance -->
              <div class="mb-4">
                <h4 class="text-base font-bold text-slate-900 dark:text-white leading-snug">
                  ${mandi.name}
                </h4>
                <div class="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                  <span class="flex items-center gap-1"><i class="fa-solid fa-location-dot text-slate-400"></i> ${mandi.district}, ${mandi.state}</span>
                  <span>•</span>
                  <span class="font-semibold text-slate-700 dark:text-slate-300">${mandi.distanceKm} km</span>
                </div>
              </div>

              <!-- Price & Deductions Breakdown -->
              <div class="space-y-2 py-3 border-y border-slate-200/80 dark:border-slate-700/80 text-xs text-slate-600 dark:text-slate-300">
                
                <div class="flex justify-between items-center">
                  <span class="text-slate-500 dark:text-slate-400">Mandi Price:</span>
                  <span class="font-bold text-slate-900 dark:text-white">₹${priceUsed.toLocaleString('en-IN')} / Qtl</span>
                </div>

                <div class="flex justify-between items-center text-slate-500 dark:text-slate-400">
                  <span>Gross Value:</span>
                  <span>₹${(priceUsed * input.quantity).toLocaleString('en-IN')}</span>
                </div>

                <div class="flex justify-between items-center text-red-500 dark:text-red-400">
                  <span class="flex items-center gap-1"><i class="fa-solid fa-truck text-[10px]"></i> Transport (${mandi.distanceKm} km):</span>
                  <span>- ₹${mandi.transportCostTotal.toLocaleString('en-IN')}</span>
                </div>

                ${isWait ? `
                  <div class="flex justify-between items-center text-amber-600 dark:text-amber-400">
                    <span class="flex items-center gap-1"><i class="fa-solid fa-warehouse text-[10px]"></i> Storage (${recommendation.optimalDays} days):</span>
                    <span>- ₹${mandi.storageCostTotal.toLocaleString('en-IN')}</span>
                  </div>
                ` : ''}

              </div>

              <!-- Net Return Result -->
              <div class="mt-4 pt-1">
                <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Estimated Net In-Hand
                </div>
                <div class="flex items-baseline justify-between mt-0.5">
                  <span class="text-2xl font-black ${isBest ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}">
                    ₹${netReturn.toLocaleString('en-IN')}
                  </span>
                  <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    ₹${Math.round(netReturn / input.quantity).toLocaleString('en-IN')}/Qtl
                  </span>
                </div>

                <!-- Facilities Chips -->
                <div class="mt-3 flex flex-wrap gap-1">
                  ${mandi.facilities.slice(0, 2).map(f => `
                    <span class="text-[10px] px-2 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300">
                      ${f}
                    </span>
                  `).join('')}
                </div>
              </div>

            </div>
          `;
        }).join('')}
      </div>

    </div>
  `;
}
