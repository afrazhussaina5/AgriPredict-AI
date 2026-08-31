// AgriPredict AI - Main Application Controller & Single Page Application Router
// Fully connected 6-page navigation: / -> /analyze -> /analysis -> /dashboard -> /recommendation -> /buyers
// Includes dynamic commodity search, robust error handling, session persistence, and data transparency.

import { COMMODITIES, MANDIS_DATABASE, BUYERS_DATABASE, I18N } from './data/mockData.js';
import { ApiService } from './services/apiService.js';
import { renderPriceCards } from './components/PriceCard.js';
import { renderRecommendationCard } from './components/RecommendationCard.js';
import { renderPriceTrendChart } from './components/PriceTrendChart.js';
import { renderMarketComparison } from './components/MarketComparison.js';
import { renderAIExplanation } from './components/AIExplanation.js';
import { renderWhatIfSimulator, attachWhatIfListeners } from './components/WhatIfSimulator.js';
import { renderBuyerSection } from './components/BuyerCard.js';

class AgriPredictApp {
  constructor() {
    this.currentRoute = '/';
    this.currentLang = 'en';
    this.commodities = COMMODITIES;
    this.activeCategoryFilter = 'All';
    this.searchFilterQuery = '';
    this.isSpeaking = false;

    // Load persisted form data & latest analysis from session storage
    this.formData = this.loadPersistedFormData() || {
      commodityId: 'onion',
      quantity: 50,
      grade: 'A',
      state: 'Andhra Pradesh',
      district: 'Kurnool',
      preferredMarket: 'Kurnool Agricultural Market Yard',
      location: 'Kurnool, Andhra Pradesh',
      hasStorage: true
    };

    this.currentAnalysis = this.loadPersistedAnalysis();
    this.activeLot = this.loadPersistedLot();

    this.init();
  }

  loadPersistedLot() {
    try {
      const saved = sessionStorage.getItem('agripredict_active_lot');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  }

  saveActiveLot(lot) {
    this.activeLot = lot;
    try {
      sessionStorage.setItem('agripredict_active_lot', JSON.stringify(lot));
    } catch (e) {}
  }

  loadPersistedFormData() {
    try {
      const saved = sessionStorage.getItem('agripredict_form_data');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  }

  saveFormData(data) {
    this.formData = { ...this.formData, ...data };
    try {
      sessionStorage.setItem('agripredict_form_data', JSON.stringify(this.formData));
    } catch (e) {}
  }

  loadPersistedAnalysis() {
    try {
      const saved = sessionStorage.getItem('agripredict_latest_analysis');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  }

  saveAnalysisResult(analysis) {
    this.currentAnalysis = analysis;
    if (analysis && analysis.input) {
      this.formData = { ...this.formData, ...analysis.input };
      try {
        sessionStorage.setItem('agripredict_form_data', JSON.stringify(this.formData));
      } catch (e) {}
    }
    // Reset stale active lot when new analysis is generated
    this.activeLot = null;
    try {
      sessionStorage.removeItem('agripredict_active_lot');
      sessionStorage.setItem('agripredict_latest_analysis', JSON.stringify(analysis));
    } catch (e) {}
  }

  ensureModalContainer(modalId, contentId, maxWidthClass = 'max-w-2xl') {
    let modal = document.getElementById(modalId);
    let content = document.getElementById(contentId);
    if (!modal) {
      modal = document.createElement('div');
      modal.id = modalId;
      modal.className = 'fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm hidden items-center justify-center p-4 overflow-y-auto';
      modal.innerHTML = `<div id="${contentId}" class="w-full ${maxWidthClass} my-8"></div>`;
      document.body.appendChild(modal);
      content = document.getElementById(contentId);
    } else if (!content) {
      modal.innerHTML = `<div id="${contentId}" class="w-full ${maxWidthClass} my-8"></div>`;
      content = document.getElementById(contentId);
    }
    return { modal, content };
  }

  async init() {
    // 1. Fetch dynamic commodities from backend API
    try {
      const loaded = await ApiService.getCommodities();
      if (loaded && loaded.length > 0) {
        this.commodities = loaded;
      }
    } catch (e) {
      console.warn("Using default commodity dataset:", e);
    }

    // 2. Setup event listeners and router
    this.setupGlobalEvents();
    this.setupRouter();

    // 3. Determine initial route from URL
    const initialRoute = this.getRouteFromUrl();
    this.navigateTo(initialRoute, false);
  }

  setupGlobalEvents() {
    const langSelect = document.getElementById('langSelect');
    if (langSelect) {
      langSelect.addEventListener('change', (e) => {
        this.currentLang = e.target.value;
        this.updateLanguageStrings();
      });
    }

    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
      });
    }
  }

  setupRouter() {
    // HTML5 History API popstate handler
    window.addEventListener('popstate', () => {
      const route = this.getRouteFromUrl();
      this.navigateTo(route, false);
    });

    // Hash change handler for static fallback
    window.addEventListener('hashchange', () => {
      const route = this.getRouteFromUrl();
      this.navigateTo(route, false);
    });
  }

  getRouteFromUrl() {
    if (window.location.hash) {
      const cleanHash = window.location.hash.replace(/^#\/?/, '/');
      const normalized = cleanHash.startsWith('/') ? cleanHash : `/${cleanHash}`;
      if (['/', '/analyze', '/analysis', '/dashboard', '/recommendation', '/buyers'].includes(normalized)) {
        return normalized;
      }
    }

    const path = window.location.pathname;
    if (['/analyze', '/analysis', '/dashboard', '/recommendation', '/buyers'].includes(path)) {
      return path;
    }

    return '/';
  }

  updateLanguageStrings() {
    const dict = I18N[this.currentLang] || I18N.en;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) {
        el.textContent = dict[key];
      }
    });
  }

  renderHeaderNav() {
    const navEl = document.getElementById('mainNavLinks');
    if (!navEl) return;

    const navItems = [
      { route: '/', label: 'Home', icon: 'fa-house' },
      { route: '/analyze', label: 'Analyze', icon: 'fa-wheat-awn' },
      { route: '/dashboard', label: 'Dashboard', icon: 'fa-chart-line' },
      { route: '/recommendation', label: 'Recommendation', icon: 'fa-brain' },
      { route: '/buyers', label: 'Buyers', icon: 'fa-handshake' }
    ];

    navEl.innerHTML = navItems.map(item => {
      const isActive = this.currentRoute === item.route;
      return `
        <button 
          onclick="window.AgriApp.navigateTo('${item.route}')"
          class="nav-btn px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${isActive ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 hover:text-emerald-700 dark:text-slate-300 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-800'}"
          data-route="${item.route}"
        >
          <i class="fa-solid ${item.icon}"></i>
          <span>${item.label}</span>
        </button>
      `;
    }).join('');

    // Update Mobile Nav Active States
    document.querySelectorAll('[data-mobile-route]').forEach(btn => {
      const route = btn.getAttribute('data-mobile-route');
      if (route === this.currentRoute) {
        btn.className = "flex flex-col items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-black";
      } else {
        btn.className = "flex flex-col items-center gap-0.5 text-slate-600 dark:text-slate-400 font-semibold";
      }
    });
  }

  navigateTo(route, updateHistory = true) {
    let target = route;
    if (target === 'landing' || target === 'home') target = '/';
    if (target === 'input') target = '/analyze';
    if (target === 'analyzing') target = '/analysis';
    if (target === 'explain') target = '/recommendation';
    if (!target.startsWith('/')) target = `/${target}`;

    const validRoutes = ['/', '/analyze', '/analysis', '/dashboard', '/recommendation', '/buyers'];
    if (!validRoutes.includes(target)) {
      target = '/';
    }

    this.currentRoute = target;

    if (updateHistory) {
      if (window.location.protocol === 'file:') {
        window.location.hash = target === '/' ? '' : target;
      } else {
        window.history.pushState({ route: target }, '', target);
      }
    }

    this.renderHeaderNav();
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const content = document.getElementById('appMainContent');
    if (!content) return;

    switch (target) {
      case '/':
        this.renderLandingView(content);
        break;
      case '/analyze':
        this.renderInputView(content);
        break;
      case '/analysis':
        this.renderAnalyzingView(content);
        break;
      case '/dashboard':
        this.renderDashboardView(content);
        break;
      case '/recommendation':
        this.renderRecommendationView(content);
        break;
      case '/buyers':
        this.renderBuyersView(content);
        break;
      default:
        this.renderLandingView(content);
    }
  }

  // =========================================================================
  // 1. HOME / LANDING PAGE (Route: /)
  // =========================================================================
  renderLandingView(container) {
    container.innerHTML = `
      <div class="space-y-16 animate-fadeIn pb-12">
        
        <!-- Hero Section -->
        <section class="relative rounded-3xl overflow-hidden bg-gradient-to-br from-emerald-900 via-slate-900 to-emerald-950 text-white p-8 sm:p-14 border border-emerald-500/30 shadow-2xl">
          
          <div class="absolute -right-12 -bottom-12 opacity-10 text-[260px] pointer-events-none select-none">
            🌾
          </div>

          <div class="max-w-3xl relative z-10 space-y-6">
            
            <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs sm:text-sm font-black">
              <i class="fa-solid fa-trophy text-amber-400"></i>
              <span>SIH Problem Statement 26132 • Market Linkages & Price Discovery</span>
            </div>

            <h1 class="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
              Know <span class="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300">When, Where & Who</span> to Sell Your Crop.
            </h1>

            <p class="text-base sm:text-xl text-emerald-100/90 leading-relaxed font-normal">
              AgriPredict AI empowers farmers with intelligent price forecasting, multi-mandi freight optimization, and verified direct buyer matching for maximum net returns.
            </p>

            <!-- 3 Core Questions Answered -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div class="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15">
                <div class="text-emerald-400 text-xl font-black mb-1">1. When to Sell?</div>
                <div class="text-xs text-slate-200">Sell Today vs Wait 5-7 days for price spikes.</div>
              </div>
              <div class="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15">
                <div class="text-emerald-400 text-xl font-black mb-1">2. Where to Sell?</div>
                <div class="text-xs text-slate-200">Compare regional APMCs after exact transport cost.</div>
              </div>
              <div class="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15">
                <div class="text-emerald-400 text-xl font-black mb-1">3. Net Return</div>
                <div class="text-xs text-slate-200">Formula: (Price × Qty) − Transport − Storage.</div>
              </div>
            </div>

            <!-- Primary CTA Button -->
            <div class="pt-4 flex flex-wrap gap-4 items-center">
              <button 
                onclick="window.AgriApp.navigateTo('/analyze')" 
                class="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black text-base rounded-2xl shadow-lg hover:shadow-emerald-500/30 transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
              >
                <span>Analyze My Produce</span>
                <i class="fa-solid fa-arrow-right"></i>
              </button>

              <button 
                onclick="window.AgriApp.navigateTo('/dashboard')" 
                class="px-6 py-4 bg-white/15 hover:bg-white/25 text-white font-bold text-base rounded-2xl border border-white/20 transition-all flex items-center gap-2"
              >
                <i class="fa-solid fa-chart-pie"></i>
                <span>View Dashboard</span>
              </button>
            </div>

          </div>

        </section>

        <!-- Live Mandi Commodities Quick Glance -->
        <section>
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <h2 class="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                Live Mandi Commodities & Price Outlook (${this.commodities.length} Crops Available)
              </h2>
              <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Select any commodity below to prefill your analysis and discover optimal selling strategies.
              </p>
            </div>
            <span class="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
              <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Data.gov.in & e-NAM Ready
            </span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            ${this.commodities.slice(0, 8).map(c => `
              <div 
                onclick="window.AgriApp.quickSelectCommodity('${c.id}')"
                class="group bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700/80 shadow-sm hover:shadow-xl hover:border-emerald-500 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div class="flex items-center justify-between mb-3">
                    <span class="text-3xl p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-700/70 group-hover:scale-110 transition-transform">${c.icon || '🌾'}</span>
                    <span class="px-2.5 py-1 rounded-full text-xs font-bold ${c.priceChangePct >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300' : 'bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300'}">
                      ${c.priceChangePct >= 0 ? '+' : ''}${c.priceChangePct}% (${c.recommendation?.optimalDays || 5}d)
                    </span>
                  </div>

                  <h3 class="text-lg font-black text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                    ${c.name}
                  </h3>
                  <div class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">${c.variety}</div>
                </div>

                <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-baseline justify-between">
                  <div>
                    <div class="text-[10px] uppercase font-bold text-slate-400">Current Spot</div>
                    <div class="text-base font-extrabold text-slate-900 dark:text-white">₹${c.basePrice.toLocaleString('en-IN')}<span class="text-xs font-normal text-slate-400">/Qtl</span></div>
                  </div>
                  <div class="text-right">
                    <div class="text-[10px] uppercase font-bold text-amber-500">Target</div>
                    <div class="text-base font-extrabold text-amber-600 dark:text-amber-400">₹${c.predictedPrice.toLocaleString('en-IN')}<span class="text-xs font-normal text-slate-400">/Qtl</span></div>
                  </div>
                </div>

                <div class="mt-3 text-center">
                  <span class="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 group-hover:underline">
                    <span>Analyze ${c.name.split(' ')[0]}</span>
                    <i class="fa-solid fa-arrow-right text-[10px]"></i>
                  </span>
                </div>
              </div>
            `).join('')}
          </div>

          <div class="mt-6 text-center">
            <button 
              onclick="window.AgriApp.navigateTo('/analyze')" 
              class="px-6 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-sm transition-all"
            >
              <span>Explore all ${this.commodities.length} Commodities on the Produce Form</span>
              <i class="fa-solid fa-arrow-right ml-2 text-xs"></i>
            </button>
          </div>
        </section>

      </div>
    `;
  }

  // =========================================================================
  // 2. ANALYZE PRODUCE PAGE (Route: /analyze)
  // =========================================================================
  renderInputView(container) {
    const fd = this.formData;
    const categories = ['All', 'Vegetables', 'Cereals & Grains', 'Pulses', 'Oilseeds', 'Cash Crops', 'Spices', 'Fruits'];

    // Filter commodities by category and search term
    const filteredCommodities = this.commodities.filter(c => {
      const matchCat = this.activeCategoryFilter === 'All' || c.category === this.activeCategoryFilter;
      const matchSearch = !this.searchFilterQuery || c.name.toLowerCase().includes(this.searchFilterQuery.toLowerCase()) || (c.variety && c.variety.toLowerCase().includes(this.searchFilterQuery.toLowerCase()));
      return matchCat && matchSearch;
    });

    const selectedCrop = this.commodities.find(c => c.id === fd.commodityId) || this.commodities[0];

    container.innerHTML = `
      <div class="max-w-4xl mx-auto animate-fadeIn pb-12">
        
        <!-- Form Header -->
        <div class="text-center mb-8">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-bold mb-2">
            <span>🌾 Step 2: Farmer Produce & Location Profile</span>
          </div>
          <h1 class="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
            Analyze Produce
          </h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Choose from ${this.commodities.length} available commodities or search by crop name.
          </p>
        </div>

        <!-- Input Form Card -->
        <div class="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-10 border border-slate-200 dark:border-slate-700 shadow-xl">
          
          <form id="produceAnalysisForm" class="space-y-8">
            
            <!-- 1. Commodity Selector with Primary Dropdown, Category Filter & Search Grid -->
            <div>
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <label for="commoditySelect" class="block text-sm font-bold text-slate-900 dark:text-white">
                  1. Agricultural Commodity (फसल चुनें):
                </label>
                <span id="selectedCropBadge" class="text-xs text-slate-500 dark:text-slate-400">
                  Selected: <b class="text-emerald-600 dark:text-emerald-400">${selectedCrop.name}</b> (${selectedCrop.hasMLModel ? 'Trained ML Model' : 'Estimated Demo Forecast'})
                </span>
              </div>

              <!-- Primary Commodity Dropdown Selector -->
              <div class="relative mb-4">
                <select 
                  id="commoditySelect" 
                  name="commoditySelect"
                  class="w-full pl-4 pr-10 py-3.5 rounded-2xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-base focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer appearance-none shadow-sm"
                  onchange="window.AgriApp.updateCommodityField(this.value)"
                >
                  ${this.commodities.map((c, idx) => `
                    <option value="${c.id}" ${fd.commodityId === c.id ? 'selected' : ''}>
                      ${idx + 1}. ${c.icon || '🌾'} ${c.name} — ₹${c.basePrice}/Qtl ${c.hasMLModel ? '★ (Trained ML Model)' : '(Demo Forecast)'}
                    </option>
                  `).join('')}
                </select>
                <div class="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                  <i class="fa-solid fa-chevron-down"></i>
                </div>
              </div>

              <!-- Search & Filter Toolbar -->
              <div class="flex flex-col sm:flex-row gap-2 mb-3">
                <!-- Live Search Box -->
                <div class="relative flex-1">
                  <input 
                    type="text" 
                    id="cropSearchInput" 
                    value="${this.searchFilterQuery}" 
                    placeholder="Search / Filter crops (e.g. Onion, Potato, Tomato, Wheat, Cotton)..." 
                    class="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    oninput="window.AgriApp.handleCropSearch(this.value)"
                  />
                  <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                </div>

                <!-- Category Pills -->
                <div class="flex gap-1.5 overflow-x-auto pb-1 max-w-full">
                  ${categories.map(cat => `
                    <button 
                      type="button" 
                      onclick="window.AgriApp.setCategoryFilter('${cat}')"
                      class="px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${this.activeCategoryFilter === cat ? 'bg-emerald-600 text-white shadow' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}"
                    >
                      ${cat}
                    </button>
                  `).join('')}
                </div>
              </div>

              <!-- Dynamic Commodity Grid -->
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-56 overflow-y-auto p-1.5 border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-900/40">
                ${filteredCommodities.map(c => `
                  <label class="commodity-tile-label relative flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all ${fd.commodityId === c.id ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-white ring-2 ring-emerald-500/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800'}">
                    <input 
                      type="radio" 
                      name="commodityRadio" 
                      value="${c.id}" 
                      ${fd.commodityId === c.id ? 'checked' : ''} 
                      class="sr-only"
                      onchange="window.AgriApp.updateCommodityField('${c.id}')"
                    />
                    <span class="text-2xl mb-1">${c.icon || '🌾'}</span>
                    <span class="text-xs font-bold text-center truncate max-w-full">${c.name.split(' ')[0]}</span>
                    <span class="text-[10px] text-slate-500 dark:text-slate-400">₹${c.basePrice}/Qtl</span>
                  </label>
                `).join('')}
              </div>

            </div>

            <!-- 2. Quantity & Grade -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              <!-- Quantity Input -->
              <div>
                <label class="block text-sm font-bold text-slate-900 dark:text-white mb-2">
                  2. Harvest Quantity (मात्रा):
                </label>
                <div class="relative">
                  <input 
                    id="inputQty" 
                    type="number" 
                    min="1" 
                    max="10000" 
                    value="${fd.quantity || 50}" 
                    required 
                    class="w-full pl-4 pr-24 py-3.5 rounded-2xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <div class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold px-3 py-1 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    Quintals
                  </div>
                </div>
                <div class="flex gap-2 mt-2">
                  <button type="button" onclick="document.getElementById('inputQty').value = 25" class="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-200">25 Qtl</button>
                  <button type="button" onclick="document.getElementById('inputQty').value = 50" class="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-200">50 Qtl</button>
                  <button type="button" onclick="document.getElementById('inputQty').value = 100" class="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-200">100 Qtl</button>
                  <button type="button" onclick="document.getElementById('inputQty').value = 250" class="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-200">250 Qtl</button>
                </div>
              </div>

              <!-- Quality Grade -->
              <div>
                <label class="block text-sm font-bold text-slate-900 dark:text-white mb-2">
                  3. Quality Grade (गुणवत्ता):
                </label>
                <select 
                  id="inputGrade" 
                  class="w-full px-4 py-3.5 rounded-2xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-base focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="A" ${fd.grade === 'A' ? 'selected' : ''}>Grade A - Premium (+5% to +10% Price, Clean / Export Quality)</option>
                  <option value="B" ${fd.grade === 'B' ? 'selected' : ''}>Grade B - Standard (Benchmark Mandi Price)</option>
                  <option value="C" ${fd.grade === 'C' ? 'selected' : ''}>Grade C - Fair / Commercial (-10% to -15% Price)</option>
                </select>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Grading improves mandi auction bidding and institutional buyer matching.
                </p>
              </div>

            </div>

            <!-- 3. State & District Location -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              <!-- State Input -->
              <div>
                <label class="block text-sm font-bold text-slate-900 dark:text-white mb-2">
                  4. State (राज्य):
                </label>
                <div class="relative">
                  <input 
                    id="inputState" 
                    type="text" 
                    value="${fd.state || 'Andhra Pradesh'}" 
                    placeholder="e.g. Andhra Pradesh, Maharashtra, Telangana"
                    class="w-full pl-10 pr-4 py-3.5 rounded-2xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-base focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <i class="fa-solid fa-map-location-dot"></i>
                  </span>
                </div>
              </div>

              <!-- District Input -->
              <div>
                <label class="block text-sm font-bold text-slate-900 dark:text-white mb-2">
                  5. District (ज़िला):
                </label>
                <div class="relative">
                  <input 
                    id="inputDistrict" 
                    type="text" 
                    value="${fd.district || 'Kurnool'}" 
                    placeholder="e.g. Kurnool, Nashik, Warangal, Guntur, Indore"
                    class="w-full pl-10 pr-4 py-3.5 rounded-2xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-base focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <i class="fa-solid fa-location-dot"></i>
                  </span>
                </div>
              </div>

            </div>

            <!-- 4. Preferred Market & Storage Toggle -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              <!-- Preferred Market (Optional) -->
              <div>
                <label class="block text-sm font-bold text-slate-900 dark:text-white mb-2">
                  6. Preferred Mandi / Market (वैकल्पिक मंडी):
                </label>
                <div class="relative">
                  <input 
                    id="inputMarket" 
                    type="text" 
                    value="${fd.preferredMarket || 'Kurnool Agricultural Market Yard'}" 
                    placeholder="e.g. Kurnool APMC, Bowenpally, Lasalgaon"
                    class="w-full pl-10 pr-4 py-3.5 rounded-2xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-base focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <i class="fa-solid fa-landmark"></i>
                  </span>
                </div>
              </div>

              <!-- Storage Availability Toggle -->
              <div>
                <label class="block text-sm font-bold text-slate-900 dark:text-white mb-2">
                  7. Cold Storage / Godown Access:
                </label>
                <div class="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900">
                  <input 
                    id="inputStorage" 
                    type="checkbox" 
                    ${fd.hasStorage !== false ? 'checked' : ''} 
                    class="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                  />
                  <div>
                    <span class="text-sm font-bold text-slate-900 dark:text-white">Local Godown / Cold Store Available</span>
                    <p class="text-xs text-slate-500 dark:text-slate-400">Enables multi-day price gain calculations.</p>
                  </div>
                </div>
              </div>

            </div>

            <!-- Action Buttons: Analyze Market & Back to Home -->
            <div class="pt-4 flex flex-col sm:flex-row gap-3">
              <button 
                type="submit" 
                id="analyzeMarketBtn"
                class="flex-1 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-lg shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-3"
              >
                <i class="fa-solid fa-wand-magic-sparkles text-amber-300"></i>
                <span>Analyze Market</span>
              </button>

              <button 
                type="button"
                onclick="window.AgriApp.navigateTo('/')"
                class="px-6 py-4 rounded-2xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-base transition-all flex items-center justify-center gap-2"
              >
                <i class="fa-solid fa-house"></i>
                <span>Back to Home</span>
              </button>
            </div>

          </form>

        </div>

      </div>
    `;

    // Form submission handler: Saves data and navigates immediately to /analysis
    const form = document.getElementById('produceAnalysisForm');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();

        const selectedCommodity = document.getElementById('commoditySelect')?.value 
          || document.querySelector('input[name="commodityRadio"]:checked')?.value 
          || this.formData.commodityId 
          || (this.commodities[0] ? this.commodities[0].id : 'onion');

        const stateVal = document.getElementById('inputState')?.value || 'Andhra Pradesh';
        const distVal = document.getElementById('inputDistrict')?.value || 'Kurnool';
        const marketVal = document.getElementById('inputMarket')?.value || 'Kurnool APMC';

        const payload = {
          commodityId: selectedCommodity,
          quantity: parseFloat(document.getElementById('inputQty')?.value) || 50,
          grade: document.getElementById('inputGrade')?.value || 'A',
          state: stateVal,
          district: distVal,
          preferredMarket: marketVal,
          location: `${distVal}, ${stateVal}`,
          hasStorage: document.getElementById('inputStorage')?.checked ?? true
        };

        this.saveFormData(payload);
        this.navigateTo('/analysis');
      });
    }
  }

  handleCropSearch(query) {
    this.searchFilterQuery = query;
    const content = document.getElementById('appMainContent');
    if (content && this.currentRoute === '/analyze') {
      this.renderInputView(content);
      // Refocus search input
      const searchEl = document.getElementById('cropSearchInput');
      if (searchEl) {
        searchEl.focus();
        searchEl.setSelectionRange(searchEl.value.length, searchEl.value.length);
      }
    }
  }

  setCategoryFilter(category) {
    this.activeCategoryFilter = category;
    const content = document.getElementById('appMainContent');
    if (content && this.currentRoute === '/analyze') {
      this.renderInputView(content);
    }
  }

  updateCommodityField(id) {
    if (!id && id !== 0) return;
    const selectedId = String(id).trim();
    this.formData.commodityId = selectedId;
    this.saveFormData({ commodityId: selectedId });

    // Sync dropdown
    const selectEl = document.getElementById('commoditySelect');
    if (selectEl && selectEl.value !== selectedId) {
      selectEl.value = selectedId;
    }

    // Sync radio inputs
    const radios = document.querySelectorAll('input[name="commodityRadio"]');
    radios.forEach(r => {
      r.checked = (r.value === selectedId);
    });

    // Update active styles on tiles
    const labels = document.querySelectorAll('.commodity-tile-label');
    labels.forEach(lbl => {
      const radio = lbl.querySelector('input[name="commodityRadio"]');
      if (radio && radio.value === selectedId) {
        lbl.className = "commodity-tile-label relative flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-white ring-2 ring-emerald-500/20";
      } else {
        lbl.className = "commodity-tile-label relative flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800";
      }
    });

    // Update the selected badge
    const crop = this.commodities.find(c => c.id === selectedId) || this.commodities[0];
    const badge = document.getElementById('selectedCropBadge');
    if (badge && crop) {
      badge.innerHTML = `Selected: <b class="text-emerald-600 dark:text-emerald-400">${crop.name}</b> (${crop.hasMLModel ? 'Trained ML Model' : 'Estimated Demo Forecast'})`;
    }
  }

  quickSelectCommodity(id) {
    this.saveFormData({
      commodityId: id,
      quantity: 50,
      grade: 'A',
      location: 'Kurnool, Andhra Pradesh'
    });
    this.navigateTo('/analysis');
  }

  // =========================================================================
  // 3. AI ANALYSIS / LOADING PAGE (Route: /analysis)
  // =========================================================================
  renderAnalyzingView(container) {
    const fd = this.formData;
    const commodity = this.commodities.find(c => c.id === fd.commodityId) || this.commodities[0];

    container.innerHTML = `
      <div class="max-w-2xl mx-auto text-center py-16 px-4 animate-fadeIn" id="analysisContainer">
        
        <!-- Pulsing AI Orb -->
        <div class="relative w-28 h-28 mx-auto mb-8 flex items-center justify-center">
          <div class="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping"></div>
          <div class="absolute inset-2 rounded-full bg-emerald-500/40 animate-pulse"></div>
          <div class="relative w-20 h-20 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white text-3xl shadow-xl">
            <i class="fa-solid fa-brain animate-bounce"></i>
          </div>
        </div>

        <h2 class="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-2">
          Analyzing Market Data for ${commodity.name.split(' ')[0]}...
        </h2>
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-8">
          Executing real-time price forecasting, logistics freight deductions, and market optimization for <b>${fd.quantity} Quintals</b> (${fd.district || 'Kurnool'}, ${fd.state || 'AP'}).
        </p>

        <!-- Dynamic Step Checklist -->
        <div class="space-y-3 max-w-md mx-auto text-left mb-8" id="analysisStepList">
          
          <div class="step-item flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm" id="step1">
            <i class="fa-solid fa-spinner fa-spin text-amber-500 text-base"></i>
            <span class="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">1. Fetching live mandi market data...</span>
          </div>

          <div class="step-item flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm opacity-50" id="step2">
            <i class="fa-regular fa-circle text-slate-400 text-base"></i>
            <span class="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">2. Checking nearby regional markets & freight...</span>
          </div>

          <div class="step-item flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm opacity-50" id="step3">
            <i class="fa-regular fa-circle text-slate-400 text-base"></i>
            <span class="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">3. Analyzing 30-day price trends & arrival volumes...</span>
          </div>

          <div class="step-item flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm opacity-50" id="step4">
            <i class="fa-regular fa-circle text-slate-400 text-base"></i>
            <span class="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">4. Calculating transport and storage costs...</span>
          </div>

          <div class="step-item flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm opacity-50" id="step5">
            <i class="fa-regular fa-circle text-slate-400 text-base"></i>
            <span class="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">5. Generating optimal selling recommendation...</span>
          </div>

        </div>

      </div>
    `;

    // Concurrently trigger backend analysis with full try/catch error handling
    this.runAnalysisProcess(fd);
  }

  async runAnalysisProcess(payload) {
    try {
      // 1. Trigger API request with timeout fallback
      const analysisPromise = ApiService.analyzeProduce(payload);

      // Step 1 -> 2 animation
      setTimeout(() => {
        const s1 = document.getElementById('step1');
        if (s1) s1.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-500 text-base"></i> <span class="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">1. Market prices ingested successfully.</span>`;
        
        const s2 = document.getElementById('step2');
        if (s2) {
          s2.classList.remove('opacity-50');
          s2.innerHTML = `<i class="fa-solid fa-spinner fa-spin text-amber-500 text-base"></i> <span class="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">2. Checking nearby regional markets & freight...</span>`;
        }
      }, 350);

      // Step 2 -> 3 animation
      setTimeout(() => {
        const s2 = document.getElementById('step2');
        if (s2) s2.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-500 text-base"></i> <span class="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">2. Regional APMC mandis mapped.</span>`;

        const s3 = document.getElementById('step3');
        if (s3) {
          s3.classList.remove('opacity-50');
          s3.innerHTML = `<i class="fa-solid fa-spinner fa-spin text-amber-500 text-base"></i> <span class="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">3. Analyzing 30-day price trends & arrival volumes...</span>`;
        }
      }, 700);

      // Step 3 -> 4 animation
      setTimeout(() => {
        const s3 = document.getElementById('step3');
        if (s3) s3.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-500 text-base"></i> <span class="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">3. Price momentum & arrivals analyzed.</span>`;

        const s4 = document.getElementById('step4');
        if (s4) {
          s4.classList.remove('opacity-50');
          s4.innerHTML = `<i class="fa-solid fa-spinner fa-spin text-amber-500 text-base"></i> <span class="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">4. Calculating transport and storage costs...</span>`;
        }
      }, 1050);

      // Await result
      const analysisResult = await analysisPromise;
      if (!analysisResult) {
        throw new Error("Unable to obtain market analysis.");
      }

      // Save into application state and browser session storage
      this.saveAnalysisResult(analysisResult);

      setTimeout(() => {
        const s4 = document.getElementById('step4');
        if (s4) s4.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-500 text-base"></i> <span class="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">4. Net return equation calculated!</span>`;

        const s5 = document.getElementById('step5');
        if (s5) {
          s5.classList.remove('opacity-50');
          s5.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-500 text-base"></i> <span class="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">5. Selling recommendation generated!</span>`;
        }
      }, 1350);

      // Auto-navigate to /dashboard
      setTimeout(() => {
        this.navigateTo('/dashboard');
      }, 1650);

    } catch (err) {
      console.error("Analysis process error:", err);
      const container = document.getElementById('analysisContainer');
      if (container) {
        container.innerHTML = `
          <div class="bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-3xl p-8 max-w-md mx-auto text-center">
            <div class="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-400 flex items-center justify-center text-2xl mx-auto mb-4">
              <i class="fa-solid fa-triangle-exclamation"></i>
            </div>
            <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-2">Analysis Interrupted</h3>
            <p class="text-xs text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
              We encountered a temporary connection issue while running the market calculations. You can retry the analysis or return to the produce form.
            </p>
            <div class="flex flex-col gap-2">
              <button 
                onclick="window.AgriApp.runAnalysisProcess(window.AgriApp.formData)" 
                class="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow transition-all"
              >
                <i class="fa-solid fa-rotate-right mr-1.5"></i>
                <span>Retry Analysis</span>
              </button>
              <button 
                onclick="window.AgriApp.navigateTo('/analyze')" 
                class="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all"
              >
                <span>Back to Analyze Form</span>
              </button>
            </div>
          </div>
        `;
      }
    }
  }

  // =========================================================================
  // 4. MARKET INTELLIGENCE DASHBOARD (Route: /dashboard)
  // =========================================================================
  renderDashboardView(container) {
    if (!this.currentAnalysis) {
      this.currentAnalysis = this.loadPersistedAnalysis();
    }

    if (!this.currentAnalysis) {
      container.innerHTML = `
        <div class="max-w-md mx-auto text-center py-16 animate-fadeIn">
          <div class="w-20 h-20 rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center text-3xl mx-auto mb-4">
            <i class="fa-solid fa-chart-line"></i>
          </div>
          <h2 class="text-2xl font-black text-slate-900 dark:text-white mb-2">No Active Analysis Data</h2>
          <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6">
            Please enter your crop details and run the market analysis first to see your customized dashboard.
          </p>
          <button 
            onclick="window.AgriApp.navigateTo('/analyze')" 
            class="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-2xl shadow transition-all"
          >
            <i class="fa-solid fa-wheat-awn mr-2"></i>
            <span>Start New Analysis</span>
          </button>
        </div>
      `;
      return;
    }

    const { input, commodityInfo, recommendation } = this.currentAnalysis;

    container.innerHTML = `
      <div class="space-y-8 animate-fadeIn pb-12">
        
        <!-- Dashboard Top Header & Quick Action Buttons -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-3xl">${commodityInfo.icon || '🌾'}</span>
              <h1 class="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                Market Intelligence Dashboard
              </h1>
            </div>
            <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Lot Profile: <b>${commodityInfo.name.split(' ')[0]}</b> • <b>${input.quantity} Quintals</b> (Grade ${input.grade}) • <b>${input.location || `${input.district}, ${input.state}`}</b>
            </p>
          </div>

          <!-- Navigation Action Buttons for Dashboard -->
          <div class="flex flex-wrap items-center gap-2">
            <button 
              onclick="window.AgriApp.navigateTo('/recommendation')" 
              class="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-black transition-all flex items-center gap-1.5 shadow-md hover:shadow-lg"
            >
              <i class="fa-solid fa-brain"></i>
              <span>View Recommendation</span>
              <i class="fa-solid fa-arrow-right text-[10px]"></i>
            </button>

            <button 
              onclick="window.AgriApp.navigateTo('/analyze')" 
              class="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5"
            >
              <i class="fa-solid fa-rotate-left"></i>
              <span>Analyze Again</span>
            </button>

            <button 
              onclick="window.AgriApp.navigateTo('/')" 
              class="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5"
            >
              <i class="fa-solid fa-house"></i>
              <span>Home</span>
            </button>
          </div>
        </div>

        <!-- 1. Top Price Summary & Logistics Deductions Breakdown -->
        ${renderPriceCards(this.currentAnalysis)}

        <!-- 2. Action Recommendation Verdict Banner -->
        ${renderRecommendationCard(this.currentAnalysis)}

        <!-- 3. Interactive Price Trend Chart (30d History -> 7d Forecast) -->
        <div class="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-700/80 shadow-md">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-2xl">📈</span>
                <h3 class="text-xl font-black text-slate-900 dark:text-white">
                  30-Day Historical Trend → 7-Day AI Price Forecast
                </h3>
              </div>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Past mandi prices (green line) connecting to forecasted price trajectory (dashed amber line).
              </p>
            </div>

            <div class="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span class="inline-block w-3 h-3 rounded-full bg-amber-400"></span>
              <span>Optimal Sell Window: ${recommendation.optimalDays > 0 ? `Day ${recommendation.optimalDays}` : 'Sell Today'}</span>
            </div>
          </div>

          <div id="priceChartContainer" class="w-full"></div>
        </div>

        <!-- 4. Multi-Mandi Logistics & Net Return Comparison Table -->
        ${renderMarketComparison(this.currentAnalysis)}

      </div>
    `;

    setTimeout(() => {
      try {
        renderPriceTrendChart('priceChartContainer', this.currentAnalysis);
      } catch (err) {
        console.warn("Could not render price trend chart:", err);
      }
      try {
        this.attachSpeechButton();
      } catch (err) {}
    }, 50);
  }

  // =========================================================================
  // 5. AI RECOMMENDATION PAGE (Route: /recommendation)
  // =========================================================================
  renderRecommendationView(container) {
    if (!this.currentAnalysis) {
      this.currentAnalysis = this.loadPersistedAnalysis();
    }

    if (!this.currentAnalysis) {
      this.renderDashboardView(container);
      return;
    }

    container.innerHTML = `
      <div class="space-y-8 animate-fadeIn pb-12">
        
        <!-- Header & Action Navigation Buttons -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              AI Recommendation & Explainability
            </h1>
            <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Transparent multi-factor breakdown explaining why this recommendation was generated.
            </p>
          </div>

          <!-- Navigation Buttons -->
          <div class="flex flex-wrap items-center gap-2">
            <button 
              onclick="window.AgriApp.navigateTo('/buyers')" 
              class="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-black transition-all flex items-center gap-1.5 shadow-md hover:shadow-lg"
            >
              <i class="fa-solid fa-handshake"></i>
              <span>View Buyer Matches</span>
              <i class="fa-solid fa-arrow-right text-[10px]"></i>
            </button>

            <button 
              onclick="window.AgriApp.navigateTo('/dashboard')" 
              class="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5"
            >
              <i class="fa-solid fa-chart-line"></i>
              <span>Back to Dashboard</span>
            </button>

            <button 
              onclick="window.AgriApp.navigateTo('/analyze')" 
              class="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5"
            >
              <i class="fa-solid fa-rotate-left"></i>
              <span>Analyze Again</span>
            </button>
          </div>
        </div>

        <!-- 1. Recommendation Verdict Banner -->
        ${renderRecommendationCard(this.currentAnalysis)}

        <!-- 2. 5-Factor Detailed Explainability -->
        ${renderAIExplanation(this.currentAnalysis)}

        <!-- 3. Interactive What-If Scenario Simulator -->
        ${renderWhatIfSimulator(this.currentAnalysis)}

      </div>
    `;

    setTimeout(() => {
      attachWhatIfListeners(this.currentAnalysis);
      this.attachSpeechButton();
    }, 50);
  }

  // =========================================================================
  // 6. BUYER MATCHING PAGE (Route: /buyers)
  // =========================================================================
  async renderBuyersView(container) {
    if (!this.currentAnalysis) {
      this.currentAnalysis = this.loadPersistedAnalysis();
    }

    if (!this.currentAnalysis) {
      this.renderDashboardView(container);
      return;
    }

    // Load active produce lot or seed from current produce analysis
    if (!this.activeLot) {
      this.activeLot = {
        lotId: "AGRI-2026-1001",
        commodityId: this.currentAnalysis.input?.commodityId || "onion",
        commodityName: this.currentAnalysis.commodityInfo?.name || "Onion",
        quantity: this.currentAnalysis.input?.quantity || 50,
        unit: "Quintal (100 kg)",
        qualityGrade: this.currentAnalysis.input?.grade || "A",
        location: this.currentAnalysis.input?.location || "Kurnool, Andhra Pradesh",
        expectedMinimumPrice: this.currentAnalysis.pricing?.predictedPrice || this.currentAnalysis.pricing?.currentPrice || 3000,
        sellerType: "Individual Farmer",
        fpoName: null,
        fpoMembers: [],
        status: "OPEN",
        createdAt: new Date().toISOString(),
        interests: {}
      };
      this.saveActiveLot(this.activeLot);
    }

    // Try fetching fresh deterministic buyer matches from backend
    try {
      const lotRes = await ApiService.getMatchedBuyersForLot(this.activeLot.lotId);
      if (lotRes && lotRes.buyers && lotRes.buyers.length > 0) {
        this.currentAnalysis.buyers = lotRes.buyers;
      }
    } catch (e) {
      console.warn("Using active produce analysis buyers:", e);
    }

    container.innerHTML = `
      <div class="space-y-8 animate-fadeIn pb-12">
        
        <!-- Header & Action Navigation Buttons -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              Produce Lot & Buyer Matching
            </h1>
            <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Direct institutional aggregators, retail chains, and verified wholesale buyer simulation models.
            </p>
          </div>

          <!-- Navigation Buttons -->
          <div class="flex flex-wrap items-center gap-2">
            <button 
              onclick="window.AgriApp.openCreateLotModal()" 
              class="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs sm:text-sm font-black transition-all flex items-center gap-1.5 shadow-md"
            >
              <i class="fa-solid fa-box-open"></i>
              <span>Create Produce Lot</span>
            </button>

            <button 
              onclick="window.AgriApp.navigateTo('/recommendation')" 
              class="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5"
            >
              <i class="fa-solid fa-brain"></i>
              <span>Recommendation</span>
            </button>

            <button 
              onclick="window.AgriApp.navigateTo('/dashboard')" 
              class="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5"
            >
              <i class="fa-solid fa-chart-line"></i>
              <span>Dashboard</span>
            </button>

            <button 
              onclick="window.AgriApp.navigateTo('/analyze')" 
              class="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-black transition-all flex items-center gap-1.5 shadow-md"
            >
              <i class="fa-solid fa-rotate-left"></i>
              <span>Analyze New Crop</span>
            </button>
          </div>
        </div>

        <!-- Buyer Directory Grid with Active Lot Banner -->
        ${renderBuyerSection(this.currentAnalysis, this.activeLot)}

      </div>
    `;
  }

  // =========================================================================
  // PRODUCE LOT CREATION MODAL & WORKFLOW (SIH 26132)
  // =========================================================================
  openCreateLotModal() {
    const analysis = this.currentAnalysis || this.loadPersistedAnalysis() || {
      input: this.formData || { commodityId: 'onion', quantity: 50, grade: 'A', location: 'Kurnool, Andhra Pradesh' },
      commodityInfo: this.commodities[0] || COMMODITIES[0] || { id: 'onion', name: 'Onion (Nashik Red)', basePrice: 2900 },
      pricing: { predictedPrice: 3360, currentPrice: 2900 }
    };

    const { modal, content: modalContent } = this.ensureModalContainer('produceLotModal', 'produceLotModalContent');
    if (!modal || !modalContent) return;

    const commodityList = (this.commodities && this.commodities.length > 0) ? this.commodities : COMMODITIES;
    const cropId = analysis.input?.commodityId || 'onion';
    const cropName = analysis.commodityInfo?.name || 'Onion';
    const initialQty = analysis.input?.quantity || 50;
    const initialGrade = analysis.input?.grade || 'A';
    const initialLoc = analysis.input?.location || (analysis.input?.district ? `${analysis.input.district}, ${analysis.input.state}` : 'Kurnool, Andhra Pradesh');
    const targetPrice = analysis.pricing?.predictedPrice || analysis.pricing?.currentPrice || 3000;

    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const dateDefault = nextWeek.toISOString().split('T')[0];

    modalContent.innerHTML = `
      <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-2xl w-full border border-slate-200 dark:border-slate-700 shadow-2xl relative text-left">
        
        <button onclick="window.AgriApp.closeCreateLotModal()" class="absolute right-5 top-5 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center">
          <i class="fa-solid fa-xmark"></i>
        </button>

        <div class="pb-4 border-b border-slate-200 dark:border-slate-700">
          <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-black mb-2">
            <i class="fa-solid fa-box-open text-emerald-600"></i>
            <span>SIH 26132 • Direct Produce Lot Creation</span>
          </div>
          <h3 class="text-2xl font-black text-slate-900 dark:text-white">
            Create Verified Produce Lot
          </h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Package and list your agricultural harvest to calculate instant buyer compatibility and send direct interest requests.
          </p>
        </div>

        <form id="createProduceLotForm" onsubmit="window.AgriApp.submitProduceLotForm(event)" class="space-y-4 my-5 text-xs sm:text-sm">
          
          <!-- Row 1: Commodity & Selling Type -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                1. Agricultural Commodity:
              </label>
              <select id="lotCommodity" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-white">
                ${commodityList.map(c => `
                  <option value="${c.id}" ${c.id === cropId ? 'selected' : ''}>
                    ${c.icon || '🌾'} ${c.name}
                  </option>
                `).join('')}
              </select>
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                2. Seller / Producer Type:
              </label>
              <select id="lotSellerType" onchange="window.AgriApp.handleSellerTypeChange(this.value)" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-white">
                <option value="Individual Farmer">🧑‍🌾 Individual Farmer</option>
                <option value="FPO / Producer Group">👥 FPO / Producer Group (Multi-Member)</option>
              </select>
            </div>
          </div>

          <!-- FPO Member Aggregation Section (Shown conditionally) -->
          <div id="fpoAggregationBox" class="hidden p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 space-y-3">
            <div class="flex items-center justify-between">
              <span class="font-black text-amber-900 dark:text-amber-200 text-xs flex items-center gap-1.5">
                <i class="fa-solid fa-people-group text-amber-600"></i>
                <span>FPO Member Harvest Aggregation (सदस्य मात्रा संकलन)</span>
              </span>
              <span class="text-[11px] font-bold text-amber-700 dark:text-amber-300">
                Summed Automatically
              </span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label class="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">Farmer 1 (Ramesh):</label>
                <input type="number" id="fpoMember1" value="20" min="0" oninput="window.AgriApp.recalcFPOQuantity()" class="w-full px-3 py-1.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-xs font-bold" />
              </div>
              <div>
                <label class="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">Farmer 2 (Suresh):</label>
                <input type="number" id="fpoMember2" value="15" min="0" oninput="window.AgriApp.recalcFPOQuantity()" class="w-full px-3 py-1.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-xs font-bold" />
              </div>
              <div>
                <label class="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">Farmer 3 (Anil):</label>
                <input type="number" id="fpoMember3" value="15" min="0" oninput="window.AgriApp.recalcFPOQuantity()" class="w-full px-3 py-1.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-xs font-bold" />
              </div>
            </div>

            <div class="text-xs font-black text-amber-900 dark:text-amber-100 flex items-center justify-between pt-1">
              <span>Total Aggregated FPO Batch:</span>
              <span id="fpoTotalDisplay" class="text-base text-emerald-600 dark:text-emerald-400">50 Quintals</span>
            </div>
          </div>

          <!-- Row 2: Quantity & Unit & Quality -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                3. Total Quantity:
              </label>
              <input type="number" id="lotQty" value="${initialQty}" min="1" max="10000" required class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-white" />
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                4. Measurement Unit:
              </label>
              <select id="lotUnit" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-white">
                <option value="Quintal (100 kg)" selected>Quintal (100 kg)</option>
                <option value="Metric Ton (1,000 kg)">Metric Ton (1,000 kg)</option>
                <option value="Bags / Crates (50 kg)">Bags / Crates (50 kg)</option>
              </select>
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                5. Quality Grade:
              </label>
              <select id="lotGrade" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-white">
                <option value="A" ${initialGrade === 'A' ? 'selected' : ''}>Grade A - Premium (+5% Price)</option>
                <option value="B" ${initialGrade === 'B' ? 'selected' : ''}>Grade B - Standard</option>
                <option value="C" ${initialGrade === 'C' ? 'selected' : ''}>Grade C - Commercial Fair</option>
              </select>
            </div>
          </div>

          <!-- Row 3: Expected Min Price & Available Until Date -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                6. Expected Minimum Price (₹/Quintal):
              </label>
              <div class="relative">
                <input type="number" id="lotMinPrice" value="${targetPrice}" min="100" step="10" required class="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 font-black text-slate-900 dark:text-white text-base" />
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
              </div>
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                7. Produce Available Until Date:
              </label>
              <input type="date" id="lotAvailableUntil" value="${dateDefault}" required class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-white" />
            </div>
          </div>

          <!-- Row 4: Pickup Location -->
          <div>
            <label class="block font-bold text-slate-700 dark:text-slate-200 mb-1">
              8. Farmer / FPO Pickup Location:
            </label>
            <input type="text" id="lotLocation" value="${initialLoc}" placeholder="e.g. Kurnool, Andhra Pradesh" required class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-white" />
          </div>

          <!-- Modal Action Buttons -->
          <div class="pt-4 flex flex-col sm:flex-row gap-2 border-t border-slate-200 dark:border-slate-700">
            <button 
              type="submit" 
              class="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
            >
              <i class="fa-solid fa-check"></i>
              <span>Create Produce Lot & Find Matching Buyers</span>
            </button>

            <button 
              type="button" 
              onclick="window.AgriApp.closeCreateLotModal()" 
              class="px-5 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-sm transition-all"
            >
              Cancel
            </button>
          </div>

        </form>

      </div>
    `;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  handleSellerTypeChange(type) {
    const fpoBox = document.getElementById('fpoAggregationBox');
    if (fpoBox) {
      if (type === "FPO / Producer Group") {
        fpoBox.classList.remove('hidden');
        this.recalcFPOQuantity();
      } else {
        fpoBox.classList.add('hidden');
      }
    }
  }

  recalcFPOQuantity() {
    const m1 = parseFloat(document.getElementById('fpoMember1')?.value) || 0;
    const m2 = parseFloat(document.getElementById('fpoMember2')?.value) || 0;
    const m3 = parseFloat(document.getElementById('fpoMember3')?.value) || 0;
    const total = m1 + m2 + m3;
    
    const qtyInput = document.getElementById('lotQty');
    if (qtyInput) qtyInput.value = total;

    const display = document.getElementById('fpoTotalDisplay');
    if (display) display.textContent = `${total} Quintals`;
  }

  async submitProduceLotForm(e) {
    if (e) e.preventDefault();

    const commodityId = document.getElementById('lotCommodity')?.value || 'onion';
    const crop = this.commodities.find(c => c.id === commodityId) || this.commodities[0];
    const sellerType = document.getElementById('lotSellerType')?.value || 'Individual Farmer';
    const quantity = parseFloat(document.getElementById('lotQty')?.value) || 50;
    const unit = document.getElementById('lotUnit')?.value || 'Quintal (100 kg)';
    const qualityGrade = document.getElementById('lotGrade')?.value || 'A';
    const expectedMinimumPrice = parseFloat(document.getElementById('lotMinPrice')?.value) || 3000;
    const availableUntil = document.getElementById('lotAvailableUntil')?.value || new Date().toISOString().split('T')[0];
    const location = document.getElementById('lotLocation')?.value || 'Kurnool, Andhra Pradesh';

    let fpoMembers = [];
    if (sellerType === "FPO / Producer Group") {
      fpoMembers = [
        { name: "Farmer Ramesh", quantity: parseFloat(document.getElementById('fpoMember1')?.value) || 20 },
        { name: "Farmer Suresh", quantity: parseFloat(document.getElementById('fpoMember2')?.value) || 15 },
        { name: "Farmer Anil", quantity: parseFloat(document.getElementById('fpoMember3')?.value) || 15 }
      ];
    }

    const payload = {
      commodityId,
      commodityName: crop.name,
      quantity,
      unit,
      qualityGrade,
      location,
      expectedMinimumPrice,
      availableUntil,
      sellerType,
      fpoName: sellerType === "FPO / Producer Group" ? "Kurnool Kisan Producer FPO" : null,
      fpoMembers
    };

    const res = await ApiService.createLot(payload);
    const createdLot = res.lot;
    this.saveActiveLot(createdLot);

    // Show Lot Confirmation View in Modal
    const modalContent = document.getElementById('produceLotModalContent');
    if (modalContent) {
      modalContent.innerHTML = `
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 dark:border-slate-700 shadow-2xl relative text-center">
          <div class="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 text-3xl flex items-center justify-center mx-auto mb-4 shadow-inner">
            <i class="fa-solid fa-circle-check"></i>
          </div>

          <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 text-xs font-black mb-2">
            PRODUCE LOT CREATED
          </span>

          <h3 class="text-2xl font-black text-slate-900 dark:text-white">
            Lot Created Successfully!
          </h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Your lot is active and ready for institutional buyer matching and procurement inquiries.
          </p>

          <!-- Lot Details Confirmation Box -->
          <div class="my-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs space-y-2 text-left">
            <div class="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
              <span class="text-slate-500">Lot Identifier:</span>
              <span class="font-mono font-black text-emerald-600 dark:text-emerald-400">${createdLot.lotId}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
              <span class="text-slate-500">Commodity:</span>
              <span class="font-bold text-slate-900 dark:text-white">${createdLot.commodityName}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
              <span class="text-slate-500">Total Quantity:</span>
              <span class="font-bold text-slate-900 dark:text-white">${createdLot.quantity} ${createdLot.unit}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
              <span class="text-slate-500">Quality Grade:</span>
              <span class="font-bold text-slate-900 dark:text-white">Grade ${createdLot.qualityGrade}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
              <span class="text-slate-500">Seller Type:</span>
              <span class="font-bold text-blue-600 dark:text-blue-400">${createdLot.sellerType}</span>
            </div>
            <div class="flex justify-between py-1">
              <span class="text-slate-500">Lot Status:</span>
              <span class="font-black px-2 py-0.5 rounded bg-emerald-500 text-slate-950 text-[10px]">${createdLot.status}</span>
            </div>
          </div>

          <div class="space-y-2">
            <button 
              type="button"
              onclick="window.AgriApp.closeCreateLotModal(); window.AgriApp.navigateTo('/buyers');" 
              class="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-2"
            >
              <i class="fa-solid fa-handshake"></i>
              <span>Find Matching Buyers Now</span>
            </button>
            <button 
              type="button" 
              onclick="window.AgriApp.closeCreateLotModal()" 
              class="w-full py-2.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-bold"
            >
              Done / Close
            </button>
          </div>
        </div>
      `;
    }
  }

  closeCreateLotModal() {
    const modal = document.getElementById('produceLotModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  // =========================================================================
  // SEND INTEREST WORKFLOW & INTERACTION TIMELINE
  // =========================================================================
  async sendInterest(lotId, buyerId, buyerName) {
    const btn = document.getElementById(`interestBtn-${buyerId}`);
    if (btn) {
      btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>Sending Interest...</span>`;
    }

    const payload = {
      buyerId,
      buyerName,
      contactName: "Farmer Lead / FPO Representative",
      contactPhone: "+91 98765 43210",
      offeredPrice: this.activeLot?.expectedMinimumPrice || 3000,
      message: `Interested in supplying lot ${lotId} with verified ${this.activeLot?.qualityGrade} quality.`
    };

    const res = await ApiService.sendBuyerInterest(lotId, payload);
    const interest = res.interest;

    // Update button
    if (btn) {
      btn.className = "w-full py-2.5 px-4 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-500 font-black text-xs transition-all flex items-center justify-center gap-2";
      btn.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-600"></i> <span>✓ Interest Sent (Pending Response)</span>`;
    }

    // Open Interaction Timeline Modal
    this.openTimelineModal(lotId, buyerId, buyerName, interest);
  }

  openTimelineModal(lotId, buyerId, buyerName, interest) {
    const { modal, content: modalContent } = this.ensureModalContainer('timelineModal', 'timelineModalContent', 'max-w-xl');
    if (!modal || !modalContent) return;

    modalContent.innerHTML = `
      <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-xl w-full border border-slate-200 dark:border-slate-700 shadow-2xl relative text-left">
        
        <button onclick="window.AgriApp.closeTimelineModal()" class="absolute right-5 top-5 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center">
          <i class="fa-solid fa-xmark"></i>
        </button>

        <div class="pb-4 border-b border-slate-200 dark:border-slate-700">
          <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-black mb-2">
            <i class="fa-solid fa-paper-plane text-emerald-600"></i>
            <span>Interest Sent Successfully</span>
          </div>
          <h3 class="text-2xl font-black text-slate-900 dark:text-white">
            Procurement Interaction Workflow
          </h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Lot <b>${lotId}</b> interest recorded for <b>${buyerName}</b>.
          </p>
        </div>

        <!-- 4-Stage Interaction Timeline -->
        <div class="my-6 space-y-4">
          
          <!-- Stage 1 -->
          <div class="flex items-start gap-3">
            <div class="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-black shadow-md flex-shrink-0">
              ✓
            </div>
            <div>
              <div class="text-xs font-bold text-slate-900 dark:text-white">1. LOT CREATED</div>
              <div class="text-[11px] text-slate-500">Verified produce lot registered with ${this.activeLot?.quantity || 50} Quintals.</div>
            </div>
          </div>

          <!-- Stage 2 -->
          <div class="flex items-start gap-3">
            <div class="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-black shadow-md flex-shrink-0">
              ✓
            </div>
            <div>
              <div class="text-xs font-bold text-slate-900 dark:text-white">2. BUYER MATCHED</div>
              <div class="text-[11px] text-slate-500">100-point compatibility algorithm matched with ${buyerName}.</div>
            </div>
          </div>

          <!-- Stage 3 -->
          <div class="flex items-start gap-3">
            <div class="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-black shadow-md flex-shrink-0">
              ✓
            </div>
            <div>
              <div class="text-xs font-bold text-slate-900 dark:text-white">3. INTEREST SENT</div>
              <div class="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Offer inquiry transmitted to buyer fulfillment desk.</div>
            </div>
          </div>

          <!-- Stage 4 -->
          <div class="flex items-start gap-3">
            <div class="w-8 h-8 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-xs font-black shadow-md flex-shrink-0 animate-pulse">
              ⏳
            </div>
            <div>
              <div class="text-xs font-bold text-amber-600 dark:text-amber-400">4. BUYER RESPONSE (Pending)</div>
              <div class="text-[11px] text-slate-500">Estimated response & purchase confirmation within 4 business hours.</div>
            </div>
          </div>

        </div>

        <div class="pt-4 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row gap-2">
          <button 
            type="button" 
            onclick="window.AgriApp.closeTimelineModal(); window.AgriApp.openDealSlip('${buyerId}');" 
            class="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md transition-all flex items-center justify-center gap-2"
          >
            <i class="fa-solid fa-file-invoice"></i>
            <span>Generate Deal Summary Slip</span>
          </button>
          
          <button 
            type="button" 
            onclick="window.AgriApp.closeTimelineModal()" 
            class="px-5 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all"
          >
            Close
          </button>
        </div>

      </div>
    `;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  closeTimelineModal() {
    const modal = document.getElementById('timelineModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  // =========================================================================
  // BUYER DETAILS MODAL
  // =========================================================================
  openBuyerDetailsModal(buyerId) {
    const buyer = this.currentAnalysis?.buyers?.find(b => b.id === buyerId) || this.commodities[0];
    const { modal, content: modalContent } = this.ensureModalContainer('timelineModal', 'timelineModalContent', 'max-w-xl');
    if (!modal || !modalContent) return;

    modalContent.innerHTML = `
      <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-xl w-full border border-slate-200 dark:border-slate-700 shadow-2xl relative text-left">
        
        <button onclick="window.AgriApp.closeTimelineModal()" class="absolute right-5 top-5 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center">
          <i class="fa-solid fa-xmark"></i>
        </button>

        <div class="pb-4 border-b border-slate-200 dark:border-slate-700">
          <span class="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
            ${buyer.category || 'Institutional Buyer'}
          </span>
          <h3 class="text-2xl font-black text-slate-900 dark:text-white mt-2">
            ${buyer.name}
          </h3>
          <div class="text-xs text-slate-500 dark:text-slate-400 mt-1">
            ${buyer.location} • <b>${buyer.distanceKm} km from farm</b>
          </div>
        </div>

        <div class="my-5 space-y-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
          <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1.5">
            <div class="font-bold text-slate-900 dark:text-white">Procurement Parameters:</div>
            <div>• Min Batch: <b>${buyer.minQuantityQtl || 10} Quintals</b></div>
            <div>• Settlement: <b>${buyer.paymentTerms || 'Bank Transfer within 24 Hours'}</b></div>
            <div>• Reliability Rating: <b>${buyer.reliability || 'High SLA'}</b></div>
            <div>• Notes: ${buyer.notes || 'Direct collection from farm gate available.'}</div>
          </div>
        </div>

        <div class="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-end">
          <button 
            type="button" 
            onclick="window.AgriApp.closeTimelineModal()" 
            class="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all"
          >
            Close
          </button>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  // =========================================================================
  // DEAL SLIP MODAL GENERATOR
  // =========================================================================
  openDealSlip(buyerId) {
    const buyer = this.currentAnalysis?.buyers?.find(b => b.id === buyerId) || this.currentAnalysis?.buyers?.[0];
    if (!buyer) return;
    const { input, commodityInfo } = this.currentAnalysis;
    const lot = this.activeLot || {
      lotId: "AGRI-2026-1001",
      quantity: input.quantity || 50,
      qualityGrade: input.grade || "A"
    };

    const { modal, content: modalContent } = this.ensureModalContainer('dealSlipModal', 'dealSlipModalContent', 'max-w-lg');
    if (!modal || !modalContent) return;

    const slipId = `DEAL-${Math.floor(100000 + Math.random() * 900000)}`;
    const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    modalContent.innerHTML = `
      <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 dark:border-slate-700 shadow-2xl relative">
        
        <button onclick="window.AgriApp.closeDealSlip()" class="absolute right-5 top-5 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center">
          <i class="fa-solid fa-xmark"></i>
        </button>

        <div class="text-center pb-5 border-b border-dashed border-slate-300 dark:border-slate-700">
          <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-xs font-black mb-2">
            <i class="fa-solid fa-flask"></i>
            <span>Prototype AgriPredict AI Deal Slip</span>
          </div>
          <h3 class="text-2xl font-black text-slate-900 dark:text-white">
            Farmer-Buyer Purchase Confirmation
          </h3>
          <div class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Slip Reference: <span class="font-mono font-bold text-slate-700 dark:text-slate-300">${slipId}</span> • Lot Ref: <b>${lot.lotId}</b>
          </div>
        </div>

        <div class="my-5 space-y-3 text-xs sm:text-sm">
          
          <div class="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
            <span class="text-slate-500">Farmer Lot:</span>
            <span class="font-bold text-slate-900 dark:text-white">${commodityInfo.name.split(' ')[0]} (${lot.quantity} Qtl, Grade ${lot.qualityGrade})</span>
          </div>

          <div class="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
            <span class="text-slate-500">Matched Buyer:</span>
            <span class="font-bold text-emerald-600 dark:text-emerald-400">${buyer.name}</span>
          </div>

          <div class="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
            <span class="text-slate-500">Agreed Base Price:</span>
            <span class="font-bold text-slate-900 dark:text-white">₹${buyer.offerPricePerQtl.toLocaleString('en-IN')} / Quintal</span>
          </div>

          <div class="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
            <span class="text-slate-500">Gross Contract Value:</span>
            <span class="font-bold text-slate-900 dark:text-white">₹${(buyer.offerPricePerQtl * lot.quantity).toLocaleString('en-IN')}</span>
          </div>

          <div class="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800 text-red-500">
            <span>Estimated Transport (${buyer.distanceKm} km):</span>
            <span>- ₹${buyer.transportCostTotal.toLocaleString('en-IN')}</span>
          </div>

          <div class="flex justify-between py-2 bg-emerald-50 dark:bg-emerald-950/60 p-3 rounded-xl">
            <span class="font-bold text-emerald-900 dark:text-emerald-200">Net Expected In-Hand:</span>
            <span class="text-lg font-black text-emerald-600 dark:text-emerald-400">₹${buyer.netReturn.toLocaleString('en-IN')}</span>
          </div>

          <div class="flex justify-between py-1 text-[11px] text-slate-500">
            <span>Settlement:</span>
            <span class="font-medium text-slate-700 dark:text-slate-300">${buyer.paymentTerms}</span>
          </div>

        </div>

        <div class="space-y-2 pt-2">
          <button 
            onclick="window.print()" 
            class="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md transition-all flex items-center justify-center gap-2"
          >
            <i class="fa-solid fa-print"></i>
            <span>Print Demo Deal Confirmation</span>
          </button>
          
          <button 
            onclick="window.AgriApp.closeDealSlip()" 
            class="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all"
          >
            Close
          </button>
        </div>

      </div>
    `;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  closeDealSlip() {
    const modal = document.getElementById('dealSlipModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  // =========================================================================
  // VOICE NARRATION (WEB SPEECH API)
  // =========================================================================
  attachSpeechButton() {
    const btn = document.getElementById('voiceNarrateBtn') || document.getElementById('aiVoiceBtn');
    if (!btn) return;

    btn.addEventListener('click', () => {
      this.speakRecommendation();
    });
  }

  speakRecommendation() {
    if (!('speechSynthesis' in window)) {
      alert("Text-to-speech is not supported on this browser.");
      return;
    }

    if (this.isSpeaking) {
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
      return;
    }

    const { recommendation, pricing, input, commodityInfo } = this.currentAnalysis;
    const textToSpeak = `AgriPredict AI Recommendation for your ${input.quantity} quintals of ${commodityInfo.name.split(' ')[0]}. Recommendation is: ${recommendation.action}. Current market price is ${pricing.currentPrice} rupees per quintal. Target price is ${pricing.predictedPrice} rupees. ${recommendation.explanation}. Expected additional net profit is ${recommendation.expectedGain} rupees.`;

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      this.isSpeaking = true;
    };
    utterance.onend = () => {
      this.isSpeaking = false;
    };
    utterance.onerror = () => {
      this.isSpeaking = false;
    };

    window.speechSynthesis.speak(utterance);
  }
}

// Instantiate globally with readyState check
function initAgriApp() {
  if (!window.AgriApp) {
    window.AgriApp = new AgriPredictApp();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAgriApp);
} else {
  initAgriApp();
}
