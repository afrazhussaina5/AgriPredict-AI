// AgriPredict AI - WhatIfSimulator Component
// Interactive slider & numeric input playground enabling farmers to simulate different storage & freight scenarios

import { ApiService } from '../services/apiService.js';

export function renderWhatIfSimulator(analysis) {
  const { input, pricing, recommendation, commodityInfo } = analysis;
  const initialDays = recommendation.optimalDays || 5;

  return `
    <div class="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl mb-8 border border-emerald-500/30">
      
      <!-- Simulator Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-700">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-2xl">🎛️</span>
            <h3 class="text-xl sm:text-2xl font-black text-white">
              Interactive "What-If" Scenario Simulator
            </h3>
          </div>
          <p class="text-xs sm:text-sm text-slate-300 mt-1">
            Adjust storage holding days and diesel transport rates to instantly see how your Net In-Hand Cash changes.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <button 
            id="resetWhatIfBtn"
            type="button"
            class="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-xs font-bold text-slate-200 transition-all flex items-center gap-1.5 border border-slate-600"
          >
            <i class="fa-solid fa-rotate-left text-amber-400"></i>
            <span>Reset to AI Baseline</span>
          </button>
          <span class="px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Live Engine
          </span>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6 items-center">
        
        <!-- Controls / Sliders & Inputs (7 cols) -->
        <div class="lg:col-span-7 space-y-6">
          
          <!-- Control 1: Storage Days -->
          <div class="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/80">
            <div class="flex justify-between items-center mb-2">
              <label for="simDaysSlider" class="text-sm font-bold text-slate-200 flex items-center gap-2">
                <i class="fa-solid fa-calendar-day text-amber-400"></i>
                <span>Days to Hold in Storage (दिन):</span>
              </label>
              <div class="flex items-center gap-2">
                <input 
                  id="simDaysNumber" 
                  type="number" 
                  min="0" 
                  max="14" 
                  value="${initialDays}" 
                  class="w-16 px-2 py-1 text-center font-black text-amber-300 bg-slate-900 border border-amber-500/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <span id="simDaysLabel" class="text-xs font-bold text-amber-300">Days</span>
              </div>
            </div>

            <input 
              id="simDaysSlider" 
              type="range" 
              min="0" 
              max="14" 
              step="1" 
              value="${initialDays}" 
              class="w-full h-2.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
            <div class="flex justify-between text-[11px] text-slate-400 mt-1.5 font-semibold">
              <span>0 Days (Sell Today)</span>
              <span>${initialDays} Days (AI Baseline)</span>
              <span>14 Days (Extended)</span>
            </div>
          </div>

          <!-- Control 2: Transport Cost Factor -->
          <div class="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/80">
            <div class="flex justify-between items-center mb-2">
              <label for="simTransportSlider" class="text-sm font-bold text-slate-200 flex items-center gap-2">
                <i class="fa-solid fa-gas-pump text-blue-400"></i>
                <span>Transport / Diesel Cost Adjustment:</span>
              </label>
              <div class="flex items-center gap-2">
                <span id="simTransportPercent" class="text-xs font-black px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/40">
                  1.0x (Standard Rate)
                </span>
              </div>
            </div>

            <input 
              id="simTransportSlider" 
              type="range" 
              min="0.5" 
              max="2.0" 
              step="0.05" 
              value="1.0" 
              class="w-full h-2.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-400"
            />
            <div class="flex justify-between text-[11px] text-slate-400 mt-1.5 font-semibold">
              <span>-50% (Shared / Self Tractor)</span>
              <span>1.0x (Normal APMC Freight)</span>
              <span>+100% (High Fuel Hike)</span>
            </div>
          </div>

        </div>

        <!-- Real-time Output Card (5 cols) -->
        <div class="lg:col-span-5 bg-slate-800/90 rounded-3xl p-6 border border-slate-600 shadow-2xl flex flex-col justify-between space-y-4">
          <div>
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold uppercase tracking-wider text-slate-400">
                Simulated In-Hand Return
              </span>
              <span id="simDiffBadge" class="text-[11px] font-black px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                Baseline
              </span>
            </div>

            <div id="simNetReturn" class="text-3xl sm:text-4xl font-black text-emerald-400 mt-1">
              ₹${pricing.estimatedNetReturn.toLocaleString('en-IN')}
            </div>
            
            <div id="simGainBadge" class="mt-2 text-xs font-bold text-emerald-300 flex items-center gap-1.5">
              <i class="fa-solid fa-arrow-trend-up"></i>
              <span>+₹${pricing.additionalProfit.toLocaleString('en-IN')} additional profit for ${input.quantity} Qtl</span>
            </div>
          </div>

          <!-- Real-time Cost Breakdown -->
          <div class="pt-4 border-t border-slate-700/80 space-y-2.5 text-xs text-slate-300">
            <div class="flex justify-between">
              <span class="text-slate-400">Projected Mandi Price:</span>
              <span id="simPriceRate" class="font-bold text-white">₹${pricing.predictedPrice.toLocaleString('en-IN')}/Qtl</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Simulated Transport Cost:</span>
              <span id="simTransportCost" class="font-bold text-rose-300">- ₹${pricing.transportCostTotal.toLocaleString('en-IN')}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Simulated Storage Cost:</span>
              <span id="simStorageCost" class="font-bold text-amber-300">- ₹${pricing.storageCostTotal.toLocaleString('en-IN')}</span>
            </div>
            <div class="flex justify-between pt-1 border-t border-slate-700/60">
              <span class="text-slate-400">Best Simulated Mandi:</span>
              <span id="simBestMandi" class="font-bold text-white">${pricing.bestMarketName.replace('Agricultural Market Yard', 'APMC')}</span>
            </div>
          </div>

        </div>

      </div>

    </div>
  `;
}

export function attachWhatIfListeners(analysis) {
  const daysSlider = document.getElementById('simDaysSlider');
  const daysNumber = document.getElementById('simDaysNumber');
  const daysLabel = document.getElementById('simDaysLabel');
  const transportSlider = document.getElementById('simTransportSlider');
  const transportPercent = document.getElementById('simTransportPercent');
  const resetBtn = document.getElementById('resetWhatIfBtn');

  const netReturnEl = document.getElementById('simNetReturn');
  const gainBadgeEl = document.getElementById('simGainBadge');
  const diffBadgeEl = document.getElementById('simDiffBadge');
  const priceRateEl = document.getElementById('simPriceRate');
  const transportCostEl = document.getElementById('simTransportCost');
  const storageCostEl = document.getElementById('simStorageCost');
  const bestMandiEl = document.getElementById('simBestMandi');

  if (!daysSlider || !transportSlider) return;

  const baselineDays = analysis.recommendation?.optimalDays || 5;

  function recalculateScenario() {
    let days = parseInt(daysSlider.value);
    if (isNaN(days)) days = 0;
    days = Math.max(0, Math.min(14, days));

    let transportMult = parseFloat(transportSlider.value);
    if (isNaN(transportMult)) transportMult = 1.0;
    transportMult = Math.max(0.5, Math.min(2.0, transportMult));

    // Synchronize inputs
    if (daysNumber && daysNumber.value != days) {
      daysNumber.value = days;
    }
    if (daysLabel) {
      daysLabel.textContent = days === 0 ? "Today" : `${days} Days`;
    }
    if (transportPercent) {
      const pct = Math.round((transportMult - 1.0) * 100);
      const sign = pct > 0 ? `+${pct}%` : (pct < 0 ? `${pct}%` : `Normal (1.0x)`);
      transportPercent.textContent = `${transportMult.toFixed(2)}x (${sign})`;
    }

    // Call Centralized Calculation Function
    const simResult = ApiService.simulateScenario(analysis, {
      storageDays: days,
      transportRateMultiplier: transportMult,
      storageRateMultiplier: 1.0
    });

    // Update DOM
    if (netReturnEl) {
      netReturnEl.textContent = `₹${simResult.simulatedNetReturn.toLocaleString('en-IN')}`;
    }
    if (priceRateEl) {
      priceRateEl.textContent = `₹${simResult.effectivePrice.toLocaleString('en-IN')}/Qtl`;
    }
    if (transportCostEl) {
      transportCostEl.textContent = `- ₹${simResult.adjustedTransportCost.toLocaleString('en-IN')}`;
    }
    if (storageCostEl) {
      storageCostEl.textContent = simResult.storageCostTotal > 0 ? `- ₹${simResult.storageCostTotal.toLocaleString('en-IN')}` : '₹0 (No Storage)';
    }
    if (bestMandiEl && simResult.topMandi) {
      bestMandiEl.textContent = (simResult.topMandi.name || "Best Regional APMC").replace('Agricultural Market Yard', 'APMC');
    }

    if (diffBadgeEl) {
      const diff = simResult.differenceFromBaseline;
      if (diff > 0) {
        diffBadgeEl.className = "text-[11px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40";
        diffBadgeEl.textContent = `+₹${diff.toLocaleString('en-IN')} vs AI Target`;
      } else if (diff < 0) {
        diffBadgeEl.className = "text-[11px] font-black px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40";
        diffBadgeEl.textContent = `-₹${Math.abs(diff).toLocaleString('en-IN')} vs AI Target`;
      } else {
        diffBadgeEl.className = "text-[11px] font-black px-2 py-0.5 rounded-full bg-slate-700 text-slate-300";
        diffBadgeEl.textContent = `AI Target Match`;
      }
    }

    if (gainBadgeEl) {
      if (simResult.netGain >= 0) {
        gainBadgeEl.className = "mt-2 text-xs font-bold text-emerald-300 flex items-center gap-1.5";
        gainBadgeEl.innerHTML = `<i class="fa-solid fa-arrow-trend-up"></i> <span>+₹${simResult.netGain.toLocaleString('en-IN')} extra profit for ${analysis.input.quantity} Quintals</span>`;
      } else {
        gainBadgeEl.className = "mt-2 text-xs font-bold text-rose-300 flex items-center gap-1.5";
        gainBadgeEl.innerHTML = `<i class="fa-solid fa-arrow-trend-down"></i> <span>-₹${Math.abs(simResult.netGain).toLocaleString('en-IN')} net loss vs spot sale</span>`;
      }
    }
  }

  // Slider event listeners
  daysSlider.addEventListener('input', recalculateScenario);
  transportSlider.addEventListener('input', recalculateScenario);

  // Numeric input listener for storage days
  if (daysNumber) {
    daysNumber.addEventListener('input', (e) => {
      let val = parseInt(e.target.value);
      if (isNaN(val)) val = 0;
      val = Math.max(0, Math.min(14, val));
      daysSlider.value = val;
      recalculateScenario();
    });
  }

  // Reset button listener
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      daysSlider.value = baselineDays;
      if (daysNumber) daysNumber.value = baselineDays;
      transportSlider.value = 1.0;
      recalculateScenario();
    });
  }

  // Run initial calculation to sync UI
  recalculateScenario();
}
