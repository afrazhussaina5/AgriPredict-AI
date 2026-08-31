// AgriPredict AI - BuyerCard Component
// Renders the Produce Lot overview, Deterministic Buyer Matching directory (100-point algorithm),
// and the Interactive "Send Interest / Request Offer" workflow with multi-stage timeline.

export function renderBuyerSection(analysis, activeLot = null) {
  const { buyers, input, pricing, commodityInfo } = analysis;

  // Resolve Active Lot Data
  const lot = activeLot || {
    lotId: "AGRI-2026-1001",
    commodityId: input.commodityId || "onion",
    commodityName: commodityInfo?.name || "Onion",
    quantity: input.quantity || 50,
    unit: "Quintal (100 kg)",
    qualityGrade: input.grade || "A",
    location: input.location || "Kurnool, Andhra Pradesh",
    expectedMinimumPrice: pricing?.predictedPrice || pricing?.currentPrice || 3000,
    sellerType: "Individual Farmer",
    status: "OPEN",
    createdAt: new Date().toISOString()
  };

  const isFPO = lot.sellerType === "FPO / Producer Group";
  const hasMembers = lot.fpoMembers && Array.isArray(lot.fpoMembers) && lot.fpoMembers.length > 0;

  return `
    <div class="space-y-8">
      
      <!-- 1. YOUR ACTIVE PRODUCE LOT HEADER -->
      <div class="bg-gradient-to-r from-emerald-900 via-slate-900 to-teal-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-500/30">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
          
          <div>
            <div class="flex flex-wrap items-center gap-2 mb-2">
              <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-xs font-black text-emerald-300 border border-emerald-400/40">
                <i class="fa-solid fa-box-archive"></i>
                <span>Lot ID: <b>${lot.lotId}</b></span>
              </span>
              <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/20 text-xs font-bold text-blue-300 border border-blue-400/30">
                <i class="fa-solid ${isFPO ? 'fa-people-group' : 'fa-user'}"></i>
                <span>${lot.sellerType}</span>
              </span>
              <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500 text-slate-950 text-xs font-black">
                <span class="w-1.5 h-1.5 rounded-full bg-slate-950 animate-pulse"></span>
                <span>STATUS: ${lot.status || 'OPEN'}</span>
              </span>
            </div>

            <h2 class="text-2xl sm:text-3xl font-black text-white">
              Produce Lot & Buyer Matching
            </h2>
            <p class="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              Market linkages connecting your verified lot with institutional buyers, retail aggregators, and food processors.
            </p>
          </div>

          <!-- Lot Specs Summary Box -->
          <div class="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div>
              <div class="text-[10px] text-emerald-300 uppercase font-bold">Commodity</div>
              <div class="text-sm sm:text-base font-black text-white mt-0.5 truncate max-w-[110px]">${(lot.commodityName || commodityInfo.name).split(' ')[0]}</div>
            </div>
            <div class="border-l border-white/20 pl-2">
              <div class="text-[10px] text-emerald-300 uppercase font-bold">Total Qty</div>
              <div class="text-sm sm:text-base font-black text-white mt-0.5">${lot.quantity} Qtl</div>
            </div>
            <div class="border-l border-white/20 pl-2">
              <div class="text-[10px] text-emerald-300 uppercase font-bold">Quality</div>
              <div class="text-sm sm:text-base font-black text-white mt-0.5">Grade ${lot.qualityGrade}</div>
            </div>
            <div class="border-l border-white/20 pl-2">
              <div class="text-[10px] text-emerald-300 uppercase font-bold">Target Base</div>
              <div class="text-sm sm:text-base font-black text-emerald-300 mt-0.5">₹${lot.expectedMinimumPrice || 3000}</div>
            </div>
          </div>

        </div>

        <!-- FPO Member Aggregation Breakdown if applicable -->
        ${isFPO && hasMembers ? `
          <div class="mt-4 pt-3 border-t border-white/15 flex flex-wrap items-center gap-2 text-xs text-slate-200">
            <span class="font-bold text-amber-300 flex items-center gap-1"><i class="fa-solid fa-users"></i> FPO Aggregation:</span>
            ${lot.fpoMembers.map((m, idx) => `
              <span class="px-2.5 py-0.5 rounded-lg bg-white/10 text-white font-medium border border-white/10">
                ${m.name || `Member ${idx + 1}`}: <b>${m.quantity} Qtl</b>
              </span>
            `).join('')}
            <span class="font-black text-emerald-400">= ${lot.quantity} Qtl Total</span>
          </div>
        ` : ''}

        <!-- Top Actions Bar -->
        <div class="mt-5 pt-4 border-t border-white/15 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div class="flex items-center gap-2 text-slate-300">
            <i class="fa-solid fa-location-dot text-emerald-400"></i>
            <span>Pickup Location: <b>${lot.location}</b></span>
          </div>
          <div class="flex items-center gap-2">
            <button 
              onclick="window.AgriApp.openCreateLotModal()"
              class="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition-all flex items-center gap-1.5 shadow"
            >
              <i class="fa-solid fa-pen-to-square"></i>
              <span>Edit / Create New Lot</span>
            </button>
          </div>
        </div>

        <!-- Prototype Data Transparency Notice -->
        <div class="mt-4 pt-3 border-t border-white/10 flex items-start gap-2 text-xs text-amber-200/90 bg-amber-950/40 p-3 rounded-2xl border border-amber-500/20">
          <i class="fa-solid fa-flask text-amber-400 mt-0.5 text-sm"></i>
          <div>
            <b>Prototype Buyer Profiles:</b> Buyer data and demand matching shown below are prototype profiles built for the SIH 26132 demonstration. Match scores are calculated using a deterministic 100-point algorithm.
          </div>
        </div>
      </div>

      <!-- 2. DETERMINISTIC MATCHING ALGORITHM EXPLAINER -->
      <div class="bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between font-bold text-slate-900 dark:text-white text-sm mb-3 gap-2">
          <span class="flex items-center gap-2">
            <i class="fa-solid fa-calculator text-emerald-600"></i>
            <span class="text-base font-black">Deterministic 100-Point Buyer Compatibility Formula</span>
          </span>
          <span class="text-xs text-slate-400 font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700">
            Transparent Weighting
          </span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
          <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80">
            <div class="font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <span>🌾 1. Commodity Match</span>
              <span class="text-xs bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 rounded">40 Pts</span>
            </div>
            <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Direct crop compatibility with buyer processing/retail category.</div>
          </div>
          <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80">
            <div class="font-black text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
              <span>⚖️ 2. Quantity Fit</span>
              <span class="text-xs bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 px-1.5 py-0.5 rounded">25 Pts</span>
            </div>
            <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Alignment with buyer batch minimum and aggregation capability.</div>
          </div>
          <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80">
            <div class="font-black text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <span>🌟 3. Quality Grade</span>
              <span class="text-xs bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded">20 Pts</span>
            </div>
            <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Lot Grade (${lot.qualityGrade}) matching buyer acceptance standards.</div>
          </div>
          <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80">
            <div class="font-black text-teal-600 dark:text-teal-400 flex items-center gap-1.5">
              <span>📍 4. Location</span>
              <span class="text-xs bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 px-1.5 py-0.5 rounded">15 Pts</span>
            </div>
            <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Freight optimization and proximity to buyer fulfillment center.</div>
          </div>
        </div>
      </div>

      <!-- 3. MATCHED BUYERS GRID (Sorted Highest to Lowest Match Score) -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <span>🎯</span>
            <span>Matched Buyers for Lot ${lot.lotId}</span>
            <span class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
              ${buyers.length} Matches Found
            </span>
          </h3>
          <span class="text-xs font-semibold text-slate-500">Sorted by Compatibility Score</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          ${buyers.map((buyer, idx) => {
            const isTop = idx === 0;
            const breakdown = buyer.scoreBreakdown || {
              commodityScore: 40,
              quantityScore: 23,
              gradeScore: 18,
              locationScore: 14,
              total: buyer.matchScore
            };
            const interestSent = buyer.interestSent || false;

            return `
              <div class="relative bg-white dark:bg-slate-800 rounded-3xl p-6 border ${isTop ? 'border-2 border-emerald-500 shadow-xl ring-2 ring-emerald-500/20' : 'border-slate-200 dark:border-slate-700'} hover:shadow-xl transition-all flex flex-col justify-between">
                
                <div>
                  <!-- Top Row: Match Score & Rating -->
                  <div class="flex items-center justify-between gap-2 mb-3">
                    <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black ${isTop ? 'bg-emerald-600 text-white shadow-sm' : 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300'}">
                      <i class="fa-solid fa-bullseye"></i>
                      ${buyer.matchScore}% Match Score
                    </span>

                    <div class="flex items-center gap-1">
                      <span class="text-xs font-bold text-amber-500">★ ${buyer.rating || 4.8}</span>
                      <span class="text-[10px] text-slate-400 font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700">Prototype</span>
                    </div>
                  </div>

                  <!-- Buyer Name & Category -->
                  <div class="mb-3">
                    <h4 class="text-lg font-black text-slate-900 dark:text-white leading-snug">
                      ${buyer.name}
                    </h4>
                    <div class="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      ${buyer.category}
                    </div>
                    <div class="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                      <i class="fa-solid fa-location-dot text-slate-400"></i>
                      <span>${buyer.location || 'Regional Fulfillment Hub'} • <b>${buyer.distanceKm} km away</b></span>
                    </div>
                  </div>

                  <!-- Offer & In-Hand Estimate Box -->
                  <div class="bg-slate-50 dark:bg-slate-900/70 rounded-2xl p-3.5 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5 mb-3">
                    <div class="flex justify-between items-baseline">
                      <span class="text-xs text-slate-500 dark:text-slate-400 font-medium">Indicative Offer:</span>
                      <span class="text-lg font-black text-slate-900 dark:text-white">
                        ₹${buyer.offerPricePerQtl.toLocaleString('en-IN')} <span class="text-xs font-medium text-slate-400">/Qtl</span>
                      </span>
                    </div>

                    <div class="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
                      <span>Gross Contract (${lot.quantity} Qtl):</span>
                      <span class="font-bold text-slate-800 dark:text-slate-200">₹${buyer.grossContractValue.toLocaleString('en-IN')}</span>
                    </div>

                    <div class="flex justify-between items-center text-xs pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                      <span class="font-semibold text-slate-700 dark:text-slate-300">Estimated Net In-Hand:</span>
                      <span class="font-black text-emerald-600 dark:text-emerald-400">₹${buyer.netReturn.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <!-- 4-Part Formula Breakdown -->
                  <div class="grid grid-cols-4 gap-1 text-[10px] text-center mb-3 bg-slate-100/70 dark:bg-slate-900/50 p-2 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                    <div>
                      <span class="text-slate-400 block">Crop</span>
                      <b class="text-emerald-600 dark:text-emerald-400">${breakdown.commodityScore || 40}/40</b>
                    </div>
                    <div>
                      <span class="text-slate-400 block">Qty</span>
                      <b class="text-blue-600 dark:text-blue-400">${breakdown.quantityScore || 23}/25</b>
                    </div>
                    <div>
                      <span class="text-slate-400 block">Grade</span>
                      <b class="text-amber-600 dark:text-amber-400">${breakdown.gradeScore || 18}/20</b>
                    </div>
                    <div>
                      <span class="text-slate-400 block">Location</span>
                      <b class="text-teal-600 dark:text-teal-400">${breakdown.locationScore || 14}/15</b>
                    </div>
                  </div>

                  <!-- Algorithmic Reasoning Text -->
                  <p class="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed mb-4 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-700/50">
                    <i class="fa-solid fa-circle-info text-emerald-600 mr-1"></i>
                    ${buyer.matchExplanation || `Compatible buyer for ${lot.commodityName}. Quantity is within required procurement parameters with favorable distance.`}
                  </p>
                </div>

                <!-- Action Buttons: Send Interest & View Details -->
                <div class="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                  
                  <!-- Send Interest CTA Button -->
                  <button 
                    id="interestBtn-${buyer.id}"
                    type="button"
                    onclick="window.AgriApp.sendInterest('${lot.lotId}', '${buyer.id}', '${buyer.name.replace(/'/g, "\\'")}')"
                    class="w-full py-2.5 px-4 rounded-xl ${interestSent ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-500 font-black' : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black shadow-md hover:shadow-lg'} text-xs transition-all flex items-center justify-center gap-2"
                  >
                    <i class="fa-solid ${interestSent ? 'fa-circle-check text-emerald-600' : 'fa-paper-plane'}"></i>
                    <span>${interestSent ? '✓ Interest Sent (Pending Response)' : 'Send Interest / Request Offer'}</span>
                  </button>

                  <div class="grid grid-cols-2 gap-2">
                    <button 
                      type="button"
                      onclick="window.AgriApp.openBuyerDetailsModal('${buyer.id}')"
                      class="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5"
                    >
                      <i class="fa-solid fa-eye text-slate-500"></i>
                      <span>View Details</span>
                    </button>
                    
                    <button 
                      type="button"
                      onclick="window.AgriApp.openDealSlip('${buyer.id}')"
                      class="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5"
                    >
                      <i class="fa-solid fa-file-invoice text-emerald-600"></i>
                      <span>Deal Slip</span>
                    </button>
                  </div>

                </div>

              </div>
            `;
          }).join('')}
        </div>
      </div>

    </div>
  `;
}

