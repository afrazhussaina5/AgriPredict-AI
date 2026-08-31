// AgriPredict AI - AIExplanation Component
// Explains the factors behind the recommendation in simple farmer language with audio narration

export function renderAIExplanation(analysis) {
  const { recommendation, input, pricing, commodityInfo } = analysis;

  return `
    <div class="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-700/80 shadow-md mb-8">
      
      <!-- Top Section -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-700">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-2xl">🧠</span>
            <h3 class="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              Why this recommendation? (यह सलाह क्यों दी गई?)
            </h3>
          </div>
          <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Our AI analyzed 5 key market forces before calculating your optimal decision.
          </p>
        </div>

        <button id="aiVoiceBtn" class="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all self-start sm:self-auto">
          <i class="fa-solid fa-volume-high"></i>
          <span>Read Aloud to Farmer (आवाज़ सुनें)</span>
        </button>
      </div>

      <!-- Farmer-Friendly Simple Summary Card -->
      <div class="my-6 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl p-5">
        <div class="flex items-start gap-3">
          <span class="text-2xl mt-0.5">🌾</span>
          <div>
            <div class="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              Simple Farmer Summary (सरल भाषा में समझें)
            </div>
            <p class="text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-200 mt-1 leading-relaxed">
              "${recommendation.explanation}"
            </p>
          </div>
        </div>
      </div>

      <!-- 5-Factor Impact Breakdown Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        ${recommendation.factors.map((factor, idx) => {
          let badgeColor = "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300";
          if (factor.impact.includes("Bearish") || factor.impact.includes("Risk")) {
            badgeColor = "bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300";
          } else if (factor.impact.includes("Moderate") || factor.impact.includes("Cautious")) {
            badgeColor = "bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300";
          }

          return `
            <div class="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between">
              <div>
                <div class="flex items-center justify-between gap-2 mb-2">
                  <span class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span class="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center font-black">${idx + 1}</span>
                    ${factor.name}
                  </span>
                  <span class="text-[11px] font-bold px-2 py-0.5 rounded-full ${badgeColor}">
                    ${factor.impact}
                  </span>
                </div>
                <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
                  ${factor.desc}
                </p>
              </div>

              <div class="mt-4 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                <span class="text-[11px] text-slate-400 font-semibold">Factor Confidence</span>
                <div class="flex items-center gap-2">
                  <div class="w-24 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                    <div class="bg-emerald-500 h-1.5 rounded-full" style="width: ${factor.score}%"></div>
                  </div>
                  <span class="text-xs font-bold text-slate-700 dark:text-slate-300">${factor.score}%</span>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>

    </div>
  `;
}
