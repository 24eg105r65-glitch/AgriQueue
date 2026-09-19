/**
 * AgriQueue: Quality Testing & Moisture Lab Module (SIH26032)
 * Module 3: Digital Moisture Analysis, Grain Grading, & FCI Compliance Certification
 */

(function () {
  'use strict';

  // 1. Official FCI & Government Procurement Quality Standards
  const FCI_QUALITY_STANDARDS = {
    paddy_a: {
      cropName: "Paddy (Grade A)",
      baseMsp: 2300,
      maxMoisture: 14.0,
      maxToleranceMoisture: 16.0,
      maxForeignMatter: 1.0,
      maxDamagedGrain: 4.0,
      optimalRange: "10.0% - 13.0%",
      deductionPerExcessPct: 35 // ₹ deduction per 1% moisture above 14%
    },
    wheat: {
      cropName: "Wheat (FAQ Sharbati)",
      baseMsp: 2275,
      maxMoisture: 12.0,
      maxToleranceMoisture: 14.0,
      maxForeignMatter: 0.75,
      maxDamagedGrain: 2.0,
      optimalRange: "9.0% - 11.5%",
      deductionPerExcessPct: 40
    },
    maize: {
      cropName: "Maize (Hybrid)",
      baseMsp: 2090,
      maxMoisture: 14.0,
      maxToleranceMoisture: 16.5,
      maxForeignMatter: 1.0,
      maxDamagedGrain: 4.5,
      optimalRange: "10.5% - 13.5%",
      deductionPerExcessPct: 30
    },
    chana: {
      cropName: "Chana (Gram / Chickpea)",
      baseMsp: 5440,
      maxMoisture: 12.0,
      maxToleranceMoisture: 13.5,
      maxForeignMatter: 1.0,
      maxDamagedGrain: 3.0,
      optimalRange: "9.0% - 11.0%",
      deductionPerExcessPct: 60
    },
    mustard: {
      cropName: "Mustard (Sarson)",
      baseMsp: 5650,
      maxMoisture: 8.0,
      maxToleranceMoisture: 9.5,
      maxForeignMatter: 0.5,
      maxDamagedGrain: 2.0,
      optimalRange: "6.0% - 7.5%",
      deductionPerExcessPct: 75
    }
  };

  // Seed Queue of Arrived Trolleys for Lab Inspection
  const INITIAL_LAB_SAMPLES = [
    {
      tokenId: "TK-1042",
      farmerId: "FAR-2026-8812",
      farmerName: "Ramesh Chand",
      farmerMobile: "9876543212",
      village: "Nilokheri, Karnal",
      land: "4.5 Acres",
      cropKey: "paddy_a",
      cropName: "Paddy (Grade A)",
      estimatedQty: 50.0,
      vehicleNo: "HR-05-T-9812",
      arrivedTime: "09:12 AM",
      hubName: "Karnal Central Hub",
      status: "PENDING", // PENDING, PASSED_GRADE_A, PASSED_DEDUCTION, REJECTED
      testedMoisture: null,
      testedForeignMatter: null,
      testedDamagedGrain: null,
      assignedLane: "Lane 2 (East Weighbridge)",
      timestamp: Date.now() - 15 * 60 * 1000
    },
    {
      tokenId: "TK-1045",
      farmerId: "FAR-2026-9044",
      farmerName: "Gurpreet Singh",
      farmerMobile: "9876543210",
      village: "Gharaunda, Karnal",
      land: "8.0 Acres",
      cropKey: "wheat",
      cropName: "Wheat (FAQ Sharbati)",
      estimatedQty: 75.0,
      vehicleNo: "PB-11-F-4410",
      arrivedTime: "09:25 AM",
      hubName: "Karnal Central Hub",
      status: "PENDING",
      testedMoisture: null,
      testedForeignMatter: null,
      testedDamagedGrain: null,
      assignedLane: "Lane 1 (North Weighbridge)",
      timestamp: Date.now() - 8 * 60 * 1000
    },
    {
      tokenId: "TK-1048",
      farmerId: "FAR-2026-7731",
      farmerName: "Jagdish Prasad",
      farmerMobile: "9876543211",
      village: "Taraori, Karnal",
      land: "6.2 Acres",
      cropKey: "mustard",
      cropName: "Mustard (Sarson)",
      estimatedQty: 35.0,
      vehicleNo: "HR-06-K-1029",
      arrivedTime: "09:40 AM",
      hubName: "Karnal Central Hub",
      status: "PENDING",
      testedMoisture: null,
      testedForeignMatter: null,
      testedDamagedGrain: null,
      assignedLane: "Lane 2 (East Weighbridge)",
      timestamp: Date.now() - 3 * 60 * 1000
    },
    {
      tokenId: "TK-1051",
      farmerId: "FAR-2026-6629",
      farmerName: "Rajeshwar Rao",
      farmerMobile: "9876543215",
      village: "Indri, Karnal",
      land: "5.0 Acres",
      cropKey: "maize",
      cropName: "Maize (Hybrid)",
      estimatedQty: 90.0,
      vehicleNo: "HR-05-M-5520",
      arrivedTime: "09:55 AM",
      hubName: "Karnal Central Hub",
      status: "PENDING",
      testedMoisture: null,
      testedForeignMatter: null,
      testedDamagedGrain: null,
      assignedLane: "Lane 1 (North Weighbridge)",
      timestamp: Date.now() - 1 * 60 * 1000
    },
    {
      tokenId: "TK-0988",
      farmerId: "FAR-2026-5120",
      farmerName: "Baldev Singh",
      farmerMobile: "9876543219",
      village: "Assandh, Karnal",
      land: "12.0 Acres",
      cropKey: "wheat",
      cropName: "Wheat (FAQ Sharbati)",
      estimatedQty: 60.0,
      vehicleNo: "HR-05-AB-9102",
      arrivedTime: "08:45 AM",
      hubName: "Karnal Central Hub",
      status: "PASSED_GRADE_A",
      testedMoisture: 10.4,
      testedForeignMatter: 0.3,
      testedDamagedGrain: 0.8,
      assignedLane: "Lane 1 (North Weighbridge)",
      timestamp: Date.now() - 45 * 60 * 1000
    }
  ];

  // State
  let samplesQueue = [];
  let currentSampleId = null;
  let activeFilter = 'ALL';
  let searchTerm = '';

  // DOM Elements cache
  const el = {};

  function init() {
    cacheDom();
    loadSamples();
    attachEvents();
    startLiveClock();
    renderQueue();
    if (samplesQueue.length > 0) {
      selectSample(samplesQueue[0].tokenId);
    }
    updateTopMetrics();
  }

  function cacheDom() {
    el.liveClock = document.getElementById("qc-live-clock");
    el.samplesList = document.getElementById("qc-samples-list");
    el.sampleCountBadge = document.getElementById("qc-queue-count");
    el.statPending = document.getElementById("stat-pending-tests");
    el.statPassed = document.getElementById("stat-passed-grade-a");
    el.statDeduction = document.getElementById("stat-deductions");
    el.statRejected = document.getElementById("stat-rejected");
    
    // Active workbench
    el.workbenchBanner = document.getElementById("active-sample-banner");
    el.cropTag = document.getElementById("qc-crop-tag");
    el.tokenTag = document.getElementById("qc-token-tag");
    el.farmerName = document.getElementById("qc-farmer-name");
    el.farmerMeta = document.getElementById("qc-farmer-meta");
    el.vehicleNo = document.getElementById("qc-vehicle-no");
    el.arrivedAt = document.getElementById("qc-arrived-at");
    
    // Moisture Meter inputs
    el.moistureInput = document.getElementById("qc-moisture-input");
    el.moistureSlider = document.getElementById("qc-moisture-slider");
    el.btnProbeScan = document.getElementById("btn-probe-scan");
    el.gaugeVal = document.getElementById("gauge-moisture-val");
    el.gaugeNeedle = document.getElementById("gauge-needle-arc");
    el.gaugeStatusPill = document.getElementById("gauge-status-pill");
    
    // Physical purity inputs
    el.foreignInput = document.getElementById("qc-foreign-input");
    el.foreignSlider = document.getElementById("qc-foreign-slider");
    el.damagedInput = document.getElementById("qc-damaged-input");
    el.damagedSlider = document.getElementById("qc-damaged-slider");
    
    // Standards reference
    el.standardLimitText = document.getElementById("qc-standard-limit");
    el.standardOptimalText = document.getElementById("qc-standard-optimal");
    el.standardDeductionRule = document.getElementById("qc-standard-deduction-rule");
    
    // Decision Summary
    el.decisionBadge = document.getElementById("qc-decision-badge");
    el.calcBaseMsp = document.getElementById("qc-calc-base-msp");
    el.calcDeduction = document.getElementById("qc-calc-deduction");
    el.calcFinalRate = document.getElementById("qc-calc-final-rate");
    el.calcTotalPayout = document.getElementById("qc-calc-total-payout");
    el.decisionNotice = document.getElementById("qc-decision-notice");
    
    // Buttons
    el.btnCertifyGradeA = document.getElementById("btn-certify-grade-a");
    el.btnApproveDeduction = document.getElementById("btn-approve-deduction");
    el.btnRejectSample = document.getElementById("btn-reject-sample");
    el.btnViewCert = document.getElementById("btn-view-cert");
    
    // Search & filter
    el.searchInput = document.getElementById("qc-search-input");
    el.filterChips = document.querySelectorAll(".qc-filter-chip");
    
    // Certificate Modal
    el.certModal = document.getElementById("qc-cert-modal");
    el.modalClose = document.getElementById("modal-close-btn");
    el.btnPrintCert = document.getElementById("btn-print-certificate");
  }

  function loadSamples() {
    const raw = localStorage.getItem("agriqueue_qc_samples");
    if (raw) {
      try {
        samplesQueue = JSON.parse(raw);
      } catch (e) {
        samplesQueue = INITIAL_LAB_SAMPLES;
      }
    } else {
      samplesQueue = INITIAL_LAB_SAMPLES;
      saveSamples();
    }
  }

  function saveSamples() {
    localStorage.setItem("agriqueue_qc_samples", JSON.stringify(samplesQueue));
    updateTopMetrics();
  }

  function attachEvents() {
    // Search & Filter
    if (el.searchInput) {
      el.searchInput.addEventListener("input", (e) => {
        searchTerm = e.target.value.toLowerCase().trim();
        renderQueue();
      });
    }

    if (el.filterChips) {
      el.filterChips.forEach(chip => {
        chip.addEventListener("click", () => {
          el.filterChips.forEach(c => c.classList.remove("active"));
          chip.classList.add("active");
          activeFilter = chip.dataset.filter || 'ALL';
          renderQueue();
        });
      });
    }

    // Moisture inputs sync
    if (el.moistureInput && el.moistureSlider) {
      el.moistureInput.addEventListener("input", (e) => {
        let val = parseFloat(e.target.value);
        if (isNaN(val)) val = 12.0;
        val = Math.max(5.0, Math.min(25.0, val));
        el.moistureSlider.value = val;
        recalculateQuality();
      });

      el.moistureSlider.addEventListener("input", (e) => {
        el.moistureInput.value = parseFloat(e.target.value).toFixed(1);
        recalculateQuality();
      });
    }

    // Foreign matter sync
    if (el.foreignInput && el.foreignSlider) {
      el.foreignInput.addEventListener("input", (e) => {
        let val = parseFloat(e.target.value) || 0;
        el.foreignSlider.value = val;
        recalculateQuality();
      });
      el.foreignSlider.addEventListener("input", (e) => {
        el.foreignInput.value = parseFloat(e.target.value).toFixed(2);
        recalculateQuality();
      });
    }

    // Damaged grain sync
    if (el.damagedInput && el.damagedSlider) {
      el.damagedInput.addEventListener("input", (e) => {
        let val = parseFloat(e.target.value) || 0;
        el.damagedSlider.value = val;
        recalculateQuality();
      });
      el.damagedSlider.addEventListener("input", (e) => {
        el.damagedInput.value = parseFloat(e.target.value).toFixed(1);
        recalculateQuality();
      });
    }

    // Probe Scan Simulation Button
    if (el.btnProbeScan) {
      el.btnProbeScan.addEventListener("click", runDigitalProbeSimulation);
    }

    // Preset quick buttons
    document.querySelectorAll(".btn-preset-moisture").forEach(btn => {
      btn.addEventListener("click", () => {
        const val = parseFloat(btn.dataset.val);
        if (!isNaN(val)) {
          el.moistureInput.value = val.toFixed(1);
          el.moistureSlider.value = val;
          recalculateQuality();
        }
      });
    });

    // Action buttons
    if (el.btnCertifyGradeA) {
      el.btnCertifyGradeA.addEventListener("click", () => completeInspection("PASSED_GRADE_A"));
    }
    if (el.btnApproveDeduction) {
      el.btnApproveDeduction.addEventListener("click", () => completeInspection("PASSED_DEDUCTION"));
    }
    if (el.btnRejectSample) {
      el.btnRejectSample.addEventListener("click", () => completeInspection("REJECTED"));
    }
    if (el.btnViewCert) {
      el.btnViewCert.addEventListener("click", openCertificateModal);
    }

    // Modal close
    if (el.modalClose) {
      el.modalClose.addEventListener("click", closeCertificateModal);
    }
    if (el.certModal) {
      el.certModal.addEventListener("click", (e) => {
        if (e.target === el.certModal) closeCertificateModal();
      });
    }
    if (el.btnPrintCert) {
      el.btnPrintCert.addEventListener("click", () => {
        window.print();
      });
    }
  }

  function startLiveClock() {
    function tick() {
      const now = new Date();
      const options = { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
      if (el.liveClock) {
        el.liveClock.textContent = now.toLocaleString('en-IN', options);
      }
    }
    tick();
    setInterval(tick, 1000);
  }

  function getFilteredSamples() {
    return samplesQueue.filter(s => {
      const matchSearch = !searchTerm || 
        s.tokenId.toLowerCase().includes(searchTerm) || 
        s.farmerName.toLowerCase().includes(searchTerm) || 
        s.cropName.toLowerCase().includes(searchTerm) ||
        s.vehicleNo.toLowerCase().includes(searchTerm);

      if (!matchSearch) return false;

      if (activeFilter === 'ALL') return true;
      if (activeFilter === 'PENDING') return s.status === 'PENDING';
      if (activeFilter === 'PASSED') return s.status === 'PASSED_GRADE_A';
      if (activeFilter === 'DEDUCTION') return s.status === 'PASSED_DEDUCTION';
      if (activeFilter === 'REJECTED') return s.status === 'REJECTED';
      return true;
    });
  }

  function renderQueue() {
    if (!el.samplesList) return;

    const filtered = getFilteredSamples();
    if (el.sampleCountBadge) {
      el.sampleCountBadge.textContent = `${filtered.length} Arrived`;
    }

    if (filtered.length === 0) {
      el.samplesList.innerHTML = `
        <div style="text-align: center; padding: 2rem 1rem; color: #64748b; font-size: 0.85rem;">
          <span class="material-symbols-outlined" style="font-size: 2.2rem; color: #cbd5e1; display: block; margin-bottom: 0.5rem;">inbox</span>
          No samples matching selected filter.
        </div>`;
      return;
    }

    el.samplesList.innerHTML = filtered.map(s => {
      const isSelected = s.tokenId === currentSampleId;
      let statusBadge = '';
      if (s.status === 'PENDING') {
        statusBadge = `<span class="qc-badge qc-badge-pending">⏳ Testing Pending</span>`;
      } else if (s.status === 'PASSED_GRADE_A') {
        statusBadge = `<span class="qc-badge qc-badge-pass">✓ Grade A (${s.testedMoisture}%)</span>`;
      } else if (s.status === 'PASSED_DEDUCTION') {
        statusBadge = `<span class="qc-badge qc-badge-deduction">⚠️ Grade B (${s.testedMoisture}%)</span>`;
      } else if (s.status === 'REJECTED') {
        statusBadge = `<span class="qc-badge qc-badge-reject">⛔ Rejected (${s.testedMoisture}%)</span>`;
      }

      return `
        <div class="qc-queue-card ${isSelected ? 'active' : ''}" data-token="${s.tokenId}">
          <div class="qc-card-top">
            <div class="qc-card-token">${s.tokenId}</div>
            ${statusBadge}
          </div>
          <div class="qc-card-farmer">${s.farmerName}</div>
          <div class="qc-card-details">
            <span>🌾 <strong>${s.cropName}</strong></span> • 
            <span>⚖️ <strong>${s.estimatedQty} Qtl</strong></span> • 
            <span>🚛 <strong>${s.vehicleNo}</strong></span>
          </div>
          <div class="qc-card-footer">
            <span>🕒 Arrived: ${s.arrivedTime}</span>
            <span style="color: var(--color-primary-dark); font-weight: 600;">${s.assignedLane}</span>
          </div>
        </div>
      `;
    }).join("");

    // Add click listeners to cards
    el.samplesList.querySelectorAll(".qc-queue-card").forEach(card => {
      card.addEventListener("click", () => {
        selectSample(card.dataset.token);
      });
    });
  }

  function selectSample(tokenId) {
    currentSampleId = tokenId;
    const sample = samplesQueue.find(s => s.tokenId === tokenId);
    if (!sample) return;

    // Highlight card
    renderQueue();

    // Populate Banner
    if (el.cropTag) el.cropTag.textContent = sample.cropName;
    if (el.tokenTag) el.tokenTag.textContent = sample.tokenId;
    if (el.farmerName) el.farmerName.textContent = sample.farmerName;
    if (el.farmerMeta) el.farmerMeta.textContent = `ID: ${sample.farmerId} • Mobile: ${sample.farmerMobile} • Land: ${sample.land} (${sample.village})`;
    if (el.vehicleNo) el.vehicleNo.textContent = sample.vehicleNo;
    if (el.arrivedAt) el.arrivedAt.textContent = sample.arrivedTime;

    // Update Standards widget for this crop
    const std = FCI_QUALITY_STANDARDS[sample.cropKey] || FCI_QUALITY_STANDARDS.paddy_a;
    if (el.standardLimitText) el.standardLimitText.textContent = `≤ ${std.maxMoisture.toFixed(1)}%`;
    if (el.standardOptimalText) el.standardOptimalText.textContent = std.optimalRange;
    if (el.standardDeductionRule) el.standardDeductionRule.textContent = `₹${std.deductionPerExcessPct} / Qtl for each 1.0% excess moisture (up to ${std.maxToleranceMoisture}% max limit).`;

    // Populate inputs (use existing tested values or defaults)
    if (sample.testedMoisture !== null) {
      el.moistureInput.value = sample.testedMoisture.toFixed(1);
      el.moistureSlider.value = sample.testedMoisture;
    } else {
      // Default initial value
      el.moistureInput.value = (std.maxMoisture - 1.8).toFixed(1);
      el.moistureSlider.value = std.maxMoisture - 1.8;
    }

    if (sample.testedForeignMatter !== null) {
      el.foreignInput.value = sample.testedForeignMatter.toFixed(2);
      el.foreignSlider.value = sample.testedForeignMatter;
    } else {
      el.foreignInput.value = "0.40";
      el.foreignSlider.value = 0.40;
    }

    if (sample.testedDamagedGrain !== null) {
      el.damagedInput.value = sample.testedDamagedGrain.toFixed(1);
      el.damagedSlider.value = sample.testedDamagedGrain;
    } else {
      el.damagedInput.value = "0.8";
      el.damagedSlider.value = 0.8;
    }

    recalculateQuality();
  }

  function runDigitalProbeSimulation() {
    if (!el.btnProbeScan) return;
    const sample = samplesQueue.find(s => s.tokenId === currentSampleId);
    if (!sample) return;

    const std = FCI_QUALITY_STANDARDS[sample.cropKey] || FCI_QUALITY_STANDARDS.paddy_a;

    // Button loading state
    el.btnProbeScan.disabled = true;
    el.btnProbeScan.innerHTML = `<span class="material-symbols-outlined spin-animation" style="font-size: 1.1rem; vertical-align: middle;">sync</span> Reading Probe Sensors...`;

    // Play beep sound simulation
    playChime(600, 0.1);

    setTimeout(() => {
      // Generate realistic calibrated value centered near standard
      const randomOffset = (Math.random() * 2.8) - 1.4; // -1.4 to +1.4
      const simulatedMoisture = parseFloat((std.maxMoisture - 1.2 + randomOffset).toFixed(1));
      const simulatedForeign = parseFloat((0.2 + (Math.random() * 0.5)).toFixed(2));
      const simulatedDamaged = parseFloat((0.4 + (Math.random() * 0.9)).toFixed(1));

      el.moistureInput.value = simulatedMoisture.toFixed(1);
      el.moistureSlider.value = simulatedMoisture;
      el.foreignInput.value = simulatedForeign.toFixed(2);
      el.foreignSlider.value = simulatedForeign;
      el.damagedInput.value = simulatedDamaged.toFixed(1);
      el.damagedSlider.value = simulatedDamaged;

      el.btnProbeScan.disabled = false;
      el.btnProbeScan.innerHTML = `<span class="material-symbols-outlined" style="font-size: 1.15rem; vertical-align: middle;">sensors</span> ⚡ Read from Digital Moisture Meter (Probe)`;

      playChime(880, 0.2);
      recalculateQuality();
    }, 900);
  }

  function recalculateQuality() {
    const sample = samplesQueue.find(s => s.tokenId === currentSampleId);
    if (!sample) return;

    const std = FCI_QUALITY_STANDARDS[sample.cropKey] || FCI_QUALITY_STANDARDS.paddy_a;
    const moisture = parseFloat(el.moistureInput.value) || 12.0;
    const foreign = parseFloat(el.foreignInput.value) || 0.4;
    const damaged = parseFloat(el.damagedInput.value) || 0.8;

    // Update Live Gauge Visual
    if (el.gaugeVal) el.gaugeVal.textContent = `${moisture.toFixed(1)}%`;

    // Angle calculation: 5% = -90deg (far left), 25% = 90deg (far right)
    // Range 5% to 25% (span = 20)
    const normalized = Math.max(0, Math.min(1, (moisture - 5.0) / 20.0));
    const angleDeg = -90 + (normalized * 180);
    if (el.gaugeNeedle) {
      el.gaugeNeedle.style.transform = `rotate(${angleDeg}deg)`;
    }

    // Determine status zone
    let decision = 'PASS_GRADE_A';
    let deductionPerQtl = 0;
    let badgeHtml = '';
    let noticeText = '';

    if (moisture <= std.maxMoisture && foreign <= std.maxForeignMatter && damaged <= std.maxDamagedGrain) {
      // 100% Grade A Pass
      decision = 'PASS_GRADE_A';
      deductionPerQtl = 0;
      if (el.gaugeStatusPill) {
        el.gaugeStatusPill.className = "gauge-pill status-pill-optimal";
        el.gaugeStatusPill.textContent = "✓ Optimal Moisture (Grade A)";
      }
      badgeHtml = `<span class="qc-decision-badge badge-grade-a">✓ Grade A (100% Government MSP - No Deduction)</span>`;
      noticeText = `✅ Moisture (${moisture.toFixed(1)}%) is within standard FCI limits (≤ ${std.maxMoisture}%). Eligible for 100% MSP payout without value cut.`;
      
      el.btnCertifyGradeA.style.display = "inline-flex";
      el.btnApproveDeduction.style.display = "none";
      el.btnRejectSample.style.display = "none";

    } else if (moisture <= std.maxToleranceMoisture && foreign <= (std.maxForeignMatter + 1.0)) {
      // Grade B with deduction
      decision = 'PASS_DEDUCTION';
      const excessMoisture = Math.max(0, moisture - std.maxMoisture);
      deductionPerQtl = Math.round(excessMoisture * std.deductionPerExcessPct);

      if (el.gaugeStatusPill) {
        el.gaugeStatusPill.className = "gauge-pill status-pill-warning";
        el.gaugeStatusPill.textContent = `⚠️ Moderate Moisture (+${excessMoisture.toFixed(1)}% Excess)`;
      }
      badgeHtml = `<span class="qc-decision-badge badge-grade-b">⚠️ Grade B Pass (Moisture Deduction: -₹${deductionPerQtl}/Qtl)</span>`;
      noticeText = `⚠️ Moisture (${moisture.toFixed(1)}%) exceeds standard limit of ${std.maxMoisture}% by +${excessMoisture.toFixed(1)}%. Government value cut of ₹${deductionPerQtl}/Qtl applied.`;

      el.btnCertifyGradeA.style.display = "none";
      el.btnApproveDeduction.style.display = "inline-flex";
      el.btnRejectSample.style.display = "none";

    } else {
      // Reject
      decision = 'REJECTED';
      deductionPerQtl = 0;
      if (el.gaugeStatusPill) {
        el.gaugeStatusPill.className = "gauge-pill status-pill-danger";
        el.gaugeStatusPill.textContent = `⛔ High Moisture (Unsafe for Mandi Storage)`;
      }
      badgeHtml = `<span class="qc-decision-badge badge-grade-reject">⛔ REJECTED (High Moisture & Mold Hazard)</span>`;
      noticeText = `⛔ Moisture (${moisture.toFixed(1)}%) exceeds max permissible safety limit (${std.maxToleranceMoisture}%). Mandi storage risk. Recommended sun-drying: 12-18 daylight hours before re-inspection.`;

      el.btnCertifyGradeA.style.display = "none";
      el.btnApproveDeduction.style.display = "none";
      el.btnRejectSample.style.display = "inline-flex";
    }

    if (el.decisionBadge) el.decisionBadge.innerHTML = badgeHtml;
    if (el.decisionNotice) el.decisionNotice.textContent = noticeText;

    // Financial calculations
    const baseMsp = std.baseMsp;
    const finalRate = Math.max(0, baseMsp - deductionPerQtl);
    const totalPayout = Math.round(sample.estimatedQty * finalRate);

    if (el.calcBaseMsp) el.calcBaseMsp.textContent = `₹${baseMsp.toLocaleString("en-IN")} / Qtl`;
    if (el.calcDeduction) {
      el.calcDeduction.textContent = deductionPerQtl > 0 ? `- ₹${deductionPerQtl} / Qtl` : "₹0 (No Deduction)";
      el.calcDeduction.style.color = deductionPerQtl > 0 ? "var(--status-danger)" : "var(--status-success)";
    }
    if (el.calcFinalRate) el.calcFinalRate.textContent = `₹${finalRate.toLocaleString("en-IN")} / Qtl`;
    if (el.calcTotalPayout) el.calcTotalPayout.textContent = `₹${totalPayout.toLocaleString("en-IN")}`;
  }

  function completeInspection(decisionStatus) {
    const sample = samplesQueue.find(s => s.tokenId === currentSampleId);
    if (!sample) return;

    const moisture = parseFloat(el.moistureInput.value);
    const foreign = parseFloat(el.foreignInput.value);
    const damaged = parseFloat(el.damagedInput.value);
    const std = FCI_QUALITY_STANDARDS[sample.cropKey] || FCI_QUALITY_STANDARDS.paddy_a;

    sample.status = decisionStatus;
    sample.testedMoisture = moisture;
    sample.testedForeignMatter = foreign;
    sample.testedDamagedGrain = damaged;

    // Save to local storage queue
    saveSamples();
    renderQueue();

    // Sync with Shared Farmer Batches (`kisan_procurement_batches`)
    syncWithSharedFarmerBatches(sample, decisionStatus, moisture, std);

    // Speak announcement
    announceQCResult(sample, decisionStatus, moisture);

    // Show Certificate
    openCertificateModal();
  }

  function syncWithSharedFarmerBatches(sample, decisionStatus, moisture, std) {
    try {
      const raw = localStorage.getItem("kisan_procurement_batches");
      let batches = raw ? JSON.parse(raw) : [];

      let matched = batches.find(b => b.token === sample.tokenId || b.id === sample.tokenId);
      const isPass = decisionStatus === 'PASSED_GRADE_A' || decisionStatus === 'PASSED_DEDUCTION';

      if (matched) {
        matched.step = isPass ? 4 : 3;
        matched.moisture = `${moisture.toFixed(1)}% (${isPass ? 'Grade A Passed' : 'Moisture High'})`;
        matched.status = isPass ? "Quality Certified (Weighment in Progress)" : "Quality Recheck Required";
        matched.dbtStatus = isPass ? "Approved by Quality Lab" : "QC Hold";
      } else {
        // Add new synchronized record
        batches.unshift({
          id: `PROC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
          token: sample.tokenId,
          cropKey: sample.cropKey,
          crop: sample.cropName,
          qty: sample.estimatedQty,
          centre: sample.hubName,
          slot: "Today Active Slot",
          status: isPass ? "Quality Certified (Weighment in Progress)" : "Quality Hold",
          moisture: `${moisture.toFixed(1)}% (${isPass ? 'Grade A Pass' : 'Recheck'})`,
          rate: std.baseMsp,
          total: Math.round(sample.estimatedQty * std.baseMsp),
          dbtStatus: isPass ? "QC Verified • Weighbridge Dispatched" : "QC Hold",
          step: isPass ? 4 : 3
        });
      }

      localStorage.setItem("kisan_procurement_batches", JSON.stringify(batches));
    } catch (e) {
      console.warn("Could not sync with shared batches", e);
    }
  }

  function announceQCResult(sample, decisionStatus, moisture) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    let text = "";
    if (decisionStatus === 'PASSED_GRADE_A') {
      text = `Token ${sample.tokenId}, farmer ${sample.farmerName}. Crop ${sample.cropName} quality certified Grade A. Moisture ${moisture.toFixed(1)} percent. Proceeding to Weighbridge Lane 2.`;
    } else if (decisionStatus === 'PASSED_DEDUCTION') {
      text = `Token ${sample.tokenId}, quality approved Grade B with moisture deduction. Moisture ${moisture.toFixed(1)} percent. Proceeding to weighment.`;
    } else {
      text = `Token ${sample.tokenId}, quality rejected due to high moisture ${moisture.toFixed(1)} percent. Drying advice slip generated.`;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  }

  function updateTopMetrics() {
    let pending = 0;
    let passed = 0;
    let deduction = 0;
    let rejected = 0;

    samplesQueue.forEach(s => {
      if (s.status === 'PENDING') pending++;
      else if (s.status === 'PASSED_GRADE_A') passed++;
      else if (s.status === 'PASSED_DEDUCTION') deduction++;
      else if (s.status === 'REJECTED') rejected++;
    });

    if (el.statPending) el.statPending.textContent = pending;
    if (el.statPassed) el.statPassed.textContent = passed;
    if (el.statDeduction) el.statDeduction.textContent = deduction;
    if (el.statRejected) el.statRejected.textContent = rejected;
  }

  function openCertificateModal() {
    const sample = samplesQueue.find(s => s.tokenId === currentSampleId);
    if (!sample || !el.certModal) return;

    const std = FCI_QUALITY_STANDARDS[sample.cropKey] || FCI_QUALITY_STANDARDS.paddy_a;
    const moisture = sample.testedMoisture || parseFloat(el.moistureInput.value);
    const foreign = sample.testedForeignMatter || parseFloat(el.foreignInput.value);
    const damaged = sample.testedDamagedGrain || parseFloat(el.damagedInput.value);

    const isGradeA = sample.status === 'PASSED_GRADE_A';
    const isReject = sample.status === 'REJECTED';

    const certContent = document.getElementById("certificate-print-area");
    if (certContent) {
      certContent.innerHTML = `
        <div class="cert-box">
          <div class="cert-header">
            <div style="font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b;">Government of India • Ministry of Agriculture & Farmers Welfare</div>
            <h2 style="font-size: 1.35rem; color: var(--color-primary-dark); margin: 0.35rem 0;">OFFICIAL GRAIN QUALITY & MOISTURE CERTIFICATE</h2>
            <div style="font-size: 0.82rem; color: #334155;">Food Corporation of India (FCI) Standards • Central Procurement Hub: <strong>${sample.hubName}</strong></div>
          </div>

          <div class="cert-meta-grid">
            <div>
              <span class="cert-label">Certificate ID:</span>
              <strong class="cert-val" style="font-family: var(--font-mono);">QC-2026-${sample.tokenId.replace('TK-', '')}-88</strong>
            </div>
            <div>
              <span class="cert-label">Date & Time:</span>
              <strong class="cert-val">${new Date().toLocaleString('en-IN')}</strong>
            </div>
            <div>
              <span class="cert-label">Token / Lot No:</span>
              <strong class="cert-val" style="font-family: var(--font-mono); color: var(--color-primary-dark);">${sample.tokenId}</strong>
            </div>
            <div>
              <span class="cert-label">Farmer Name & ID:</span>
              <strong class="cert-val">${sample.farmerName} (${sample.farmerId})</strong>
            </div>
            <div>
              <span class="cert-label">Crop & Variety:</span>
              <strong class="cert-val">${sample.cropName}</strong>
            </div>
            <div>
              <span class="cert-label">Vehicle / Trolley:</span>
              <strong class="cert-val">${sample.vehicleNo}</strong>
            </div>
          </div>

          <table class="cert-table">
            <thead>
              <tr>
                <th>Quality Parameter</th>
                <th>Prescribed FCI Limit</th>
                <th>Observed Lab Reading</th>
                <th>Compliance Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Moisture Content</strong></td>
                <td>≤ ${std.maxMoisture.toFixed(1)}%</td>
                <td><strong style="font-family: var(--font-mono); font-size: 1rem;">${moisture.toFixed(1)}%</strong></td>
                <td><span style="color: ${moisture <= std.maxMoisture ? '#16a34a' : '#ea580c'}; font-weight: 700;">${moisture <= std.maxMoisture ? '✓ Within Limit' : '⚠️ Excess Moisture'}</span></td>
              </tr>
              <tr>
                <td><strong>Foreign Matter / Chaff</strong></td>
                <td>≤ ${std.maxForeignMatter.toFixed(2)}%</td>
                <td>${foreign.toFixed(2)}%</td>
                <td><span style="color: #16a34a; font-weight: 700;">✓ Pass</span></td>
              </tr>
              <tr>
                <td><strong>Damaged / Discolored Grains</strong></td>
                <td>≤ ${std.maxDamagedGrain.toFixed(1)}%</td>
                <td>${damaged.toFixed(1)}%</td>
                <td><span style="color: #16a34a; font-weight: 700;">✓ Pass</span></td>
              </tr>
            </tbody>
          </table>

          <div class="cert-decision-box ${isReject ? 'cert-box-reject' : 'cert-box-pass'}">
            <div style="font-size: 1.1rem; font-weight: 800; color: ${isReject ? '#dc2626' : '#137547'};">
              ${isReject ? '⛔ STATUS: REJECTED FOR PROCUREMENT' : (isGradeA ? '✓ STATUS: CERTIFIED GRADE A (FULL MSP ELIGIBLE)' : '⚠️ STATUS: CERTIFIED GRADE B (WITH APPLICABLE DEDUCTIONS)')}
            </div>
            <div style="font-size: 0.82rem; color: #475569; margin-top: 0.35rem;">
              ${isReject ? 'Grain moisture exceeds maximum permissible storage limit. Direct farmer to drying platform.' : `Assigned Weighbridge: <strong>${sample.assignedLane}</strong>. Moisture Certificate cryptographically signed.`}
            </div>
          </div>

          <div class="cert-footer">
            <div style="text-align: left;">
              <div style="font-size: 0.75rem; color: #64748b;">Digital Barcode Signature:</div>
              <div style="font-family: var(--font-mono); font-size: 0.85rem; font-weight: 700; color: #334155; margin-top: 0.2rem;">||||||| | ||||| |||| |||||||| |||</div>
              <div style="font-size: 0.72rem; color: #94a3b8;">Auth Hash: sha256:7f8e12ac449901</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 0.78rem; font-weight: 700; color: var(--color-primary-dark);">Dr. Ananya Sharma</div>
              <div style="font-size: 0.72rem; color: #64748b;">Chief Quality Inspector (ID: QC-LAB-402)</div>
              <div style="font-size: 0.7rem; color: #16a34a; font-weight: 700;">✓ Digitally Signed on Mandi Portal</div>
            </div>
          </div>
        </div>
      `;
    }

    el.certModal.style.display = "flex";
  }

  function closeCertificateModal() {
    if (el.certModal) {
      el.certModal.style.display = "none";
    }
  }

  function playChime(freq, duration) {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {}
  }

  // Initialize on DOM load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
