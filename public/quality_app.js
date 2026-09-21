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

  // Shared data layer (ops_store.js): farmer booking records, incl. their default seed records
  const store = window.AgriQueueStore;

  function esc(v) {
    return String(v === undefined || v === null ? "" : v).replace(/[&<>"']/g, (c) => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));
  }

  // ₹/Qtl value cut for moisture above the crop's standard limit (excess counted in whole tenths: no float noise)
  function deductionFor(std, moisture) {
    const tenths = Math.max(0, Math.round((moisture - std.maxMoisture) * 10));
    return Math.round(tenths * std.deductionPerExcessPct / 10);
  }

  // Foreign matter may exceed its limit by 1.0 and damaged grain by 2.0 before the lot is rejected outright
  const FOREIGN_TOLERANCE = 1.0;
  const DAMAGED_TOLERANCE = 2.0;

  // The single Grade A / Grade B / Reject decision, with the reasons behind it
  function evaluateSample(std, moisture, foreign, damaged) {
    const reject = [];
    if (moisture > std.maxToleranceMoisture) reject.push("moisture");
    if (foreign > std.maxForeignMatter + FOREIGN_TOLERANCE) reject.push("foreign");
    if (damaged > std.maxDamagedGrain + DAMAGED_TOLERANCE) reject.push("damaged");
    if (reject.length) return { decision: "REJECTED", status: "REJECTED", deduction: 0, reasons: reject };

    const over = [];
    if (moisture > std.maxMoisture) over.push("moisture");
    if (foreign > std.maxForeignMatter) over.push("foreign");
    if (damaged > std.maxDamagedGrain) over.push("damaged");
    if (!over.length) return { decision: "PASS_GRADE_A", status: "PASSED_GRADE_A", deduction: 0, reasons: [] };
    return { decision: "PASS_DEDUCTION", status: "PASSED_DEDUCTION", deduction: deductionFor(std, moisture), reasons: over };
  }

  const REASON_NAME = { moisture: "moisture", foreign: "foreign matter", damaged: "damaged grain" };
  const reasonList = (reasons) => reasons.map((r) => REASON_NAME[r]).join(" and ");

  // What the operator should tell the farmer, depending on why the lot failed
  function rejectAdvice(reasons) {
    const parts = [];
    if (reasons.indexOf("moisture") !== -1) parts.push("sun-dry the lot for 12-18 daylight hours");
    if (reasons.indexOf("foreign") !== -1) parts.push("clean / winnow out chaff, dust and mud");
    if (reasons.indexOf("damaged") !== -1) parts.push("sort out damaged and discoloured grain");
    return `Advice: ${parts.join(", ")}, then bring the lot back for re-inspection.`;
  }

  // Current sliders / inputs, clamped to their physical range. moisture is null while the field is blank.
  function currentReadings() {
    const read = (input, min, max, blank) => {
      const v = parseFloat(input.value);
      return isNaN(v) ? blank : Math.max(min, Math.min(max, v));
    };
    return {
      moisture: read(el.moistureInput, 5.0, 25.0, null),
      foreign: read(el.foreignInput, 0, 5.0, 0),
      damaged: read(el.damagedInput, 0, 10.0, 0)
    };
  }

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
        const parsed = JSON.parse(raw);
        samplesQueue = Array.isArray(parsed) ? parsed : INITIAL_LAB_SAMPLES;
      } catch (e) {
        samplesQueue = INITIAL_LAB_SAMPLES;
      }
    } else {
      samplesQueue = INITIAL_LAB_SAMPLES;
      saveSamples();
    }
  }

  // Trolleys checked in at the gate (Module 2) are appended to storage by another page;
  // keep them instead of overwriting the key with this page's older in-memory list.
  function mergeStoredSamples() {
    try {
      const stored = JSON.parse(localStorage.getItem("agriqueue_qc_samples") || "[]");
      (Array.isArray(stored) ? stored : []).forEach(s => {
        if (!samplesQueue.some(m => m.tokenId === s.tokenId)) samplesQueue.push(s);
      });
    } catch (e) {}
  }

  function saveSamples() {
    mergeStoredSamples();
    try {
      localStorage.setItem("agriqueue_qc_samples", JSON.stringify(samplesQueue));
    } catch (e) { /* storage blocked or full: the lab keeps working from memory */ }
    updateTopMetrics();
  }

  function attachEvents() {
    // New arrivals from the gate show up live (does not touch the sliders of the sample being tested)
    window.addEventListener("storage", (e) => {
      if (e.key !== "agriqueue_qc_samples") return;
      loadSamples();
      renderQueue();
      updateTopMetrics();
    });

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
        <div class="qc-queue-card ${isSelected ? 'active' : ''}" data-token="${esc(s.tokenId)}">
          <div class="qc-card-top">
            <div class="qc-card-token">${esc(s.tokenId)}</div>
            ${statusBadge}
          </div>
          <div class="qc-card-farmer">${esc(s.farmerName)}</div>
          <div class="qc-card-details">
            <span>🌾 <strong>${esc(s.cropName)}</strong></span> • 
            <span>⚖️ <strong>${esc(s.estimatedQty)} Qtl</strong></span> • 
            <span>🚛 <strong>${esc(s.vehicleNo)}</strong></span>
          </div>
          <div class="qc-card-footer">
            <span>🕒 Arrived: ${esc(s.arrivedTime)}</span>
            <span style="color: var(--color-primary-dark); font-weight: 600;">${esc(s.assignedLane)}</span>
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
    const r = currentReadings();
    const baseMsp = std.baseMsp;

    // A blank moisture field gives nothing to decide on (no invented reading)
    if (r.moisture === null) {
      el.btnCertifyGradeA.style.display = "none";
      el.btnApproveDeduction.style.display = "none";
      el.btnRejectSample.style.display = "none";
      if (el.decisionBadge) el.decisionBadge.innerHTML = `<span class="qc-decision-badge badge-grade-b">Enter the moisture reading to get a quality decision</span>`;
      if (el.decisionNotice) el.decisionNotice.textContent = "Use the moisture meter probe, a preset or type the reading from the analyzer.";
      if (el.calcBaseMsp) el.calcBaseMsp.textContent = `₹${baseMsp.toLocaleString("en-IN")} / Qtl`;
      if (el.calcDeduction) el.calcDeduction.textContent = "—";
      if (el.calcFinalRate) el.calcFinalRate.textContent = "—";
      if (el.calcTotalPayout) el.calcTotalPayout.textContent = "—";
      return;
    }
    const { moisture, foreign, damaged } = r;

    // Update Live Gauge Visual
    if (el.gaugeVal) el.gaugeVal.textContent = `${moisture.toFixed(1)}%`;

    // Angle calculation: 5% = -90deg (far left), 25% = 90deg (far right)
    // Range 5% to 25% (span = 20)
    const normalized = Math.max(0, Math.min(1, (moisture - 5.0) / 20.0));
    const angleDeg = -90 + (normalized * 180);
    if (el.gaugeNeedle) {
      el.gaugeNeedle.style.transform = `rotate(${angleDeg}deg)`;
    }

    const verdict = evaluateSample(std, moisture, foreign, damaged);
    const deductionPerQtl = verdict.deduction;
    let badgeHtml = '';
    let noticeText = '';

    if (verdict.decision === 'PASS_GRADE_A') {
      // 100% Grade A Pass
      if (el.gaugeStatusPill) {
        el.gaugeStatusPill.className = "gauge-pill status-pill-optimal";
        el.gaugeStatusPill.textContent = "✓ Optimal Moisture (Grade A)";
      }
      badgeHtml = `<span class="qc-decision-badge badge-grade-a">✓ Grade A (100% Government MSP - No Deduction)</span>`;
      noticeText = `✅ Moisture (${moisture.toFixed(1)}%) is within standard FCI limits (≤ ${std.maxMoisture}%). Eligible for 100% MSP payout without value cut.`;

      el.btnCertifyGradeA.style.display = "inline-flex";
      el.btnApproveDeduction.style.display = "none";
      el.btnRejectSample.style.display = "none";

    } else if (verdict.decision === 'PASS_DEDUCTION') {
      // Grade B (moisture cut and/or purity above the Grade A limits)
      const excessMoisture = Math.max(0, moisture - std.maxMoisture);
      const moistureOnly = verdict.reasons.length === 1 && verdict.reasons[0] === 'moisture';

      if (el.gaugeStatusPill) {
        el.gaugeStatusPill.className = "gauge-pill status-pill-warning";
        el.gaugeStatusPill.textContent = moistureOnly
          ? `⚠️ Moderate Moisture (+${excessMoisture.toFixed(1)}% Excess)`
          : (verdict.reasons.indexOf('moisture') !== -1 ? `⚠️ Moisture +${excessMoisture.toFixed(1)}% and Purity Below Grade A` : `⚠️ Purity Below Grade A (${reasonList(verdict.reasons)})`);
      }
      badgeHtml = deductionPerQtl > 0
        ? `<span class="qc-decision-badge badge-grade-b">⚠️ Grade B Pass (Moisture Deduction: -₹${deductionPerQtl}/Qtl)</span>`
        : `<span class="qc-decision-badge badge-grade-b">⚠️ Grade B Pass (${esc(reasonList(verdict.reasons))} above Grade A limit, no moisture cut)</span>`;
      noticeText = deductionPerQtl > 0
        ? `⚠️ Moisture (${moisture.toFixed(1)}%) exceeds standard limit of ${std.maxMoisture}% by +${excessMoisture.toFixed(1)}%. Government value cut of ₹${deductionPerQtl}/Qtl applied.`
        : `⚠️ ${reasonList(verdict.reasons)} above the Grade A limit (foreign matter ≤ ${std.maxForeignMatter}%, damaged grain ≤ ${std.maxDamagedGrain}%). Passed as Grade B without a moisture cut.`;
      if (deductionPerQtl > 0 && verdict.reasons.length > 1) noticeText += ` Also above Grade A limit: ${reasonList(verdict.reasons.filter(x => x !== 'moisture'))}.`;

      el.btnCertifyGradeA.style.display = "none";
      el.btnApproveDeduction.style.display = "inline-flex";
      el.btnRejectSample.style.display = "none";

    } else {
      // Reject
      const only = verdict.reasons.length === 1 ? verdict.reasons[0] : null;
      const pill = only === 'moisture' ? "⛔ High Moisture (Unsafe for Mandi Storage)"
        : only === 'foreign' ? "⛔ Excess Foreign Matter"
        : only === 'damaged' ? "⛔ Excess Damaged Grain"
        : "⛔ Fails Several FCI Limits";
      if (el.gaugeStatusPill) {
        el.gaugeStatusPill.className = "gauge-pill status-pill-danger";
        el.gaugeStatusPill.textContent = pill;
      }
      badgeHtml = only === 'moisture'
        ? `<span class="qc-decision-badge badge-grade-reject">⛔ REJECTED (High Moisture & Mold Hazard)</span>`
        : `<span class="qc-decision-badge badge-grade-reject">⛔ REJECTED (${esc(reasonList(verdict.reasons))} beyond permissible limit)</span>`;
      const facts = [];
      if (verdict.reasons.indexOf('moisture') !== -1) facts.push(`Moisture (${moisture.toFixed(1)}%) exceeds max permissible safety limit (${std.maxToleranceMoisture}%). Mandi storage risk.`);
      if (verdict.reasons.indexOf('foreign') !== -1) facts.push(`Foreign matter (${foreign.toFixed(2)}%) exceeds the permissible ${(std.maxForeignMatter + FOREIGN_TOLERANCE).toFixed(2)}%.`);
      if (verdict.reasons.indexOf('damaged') !== -1) facts.push(`Damaged grain (${damaged.toFixed(1)}%) exceeds the permissible ${(std.maxDamagedGrain + DAMAGED_TOLERANCE).toFixed(1)}%.`);
      noticeText = `⛔ ${facts.join(' ')} ${only === 'moisture' ? 'Recommended sun-drying: 12-18 daylight hours before re-inspection.' : rejectAdvice(verdict.reasons)}`;

      el.btnCertifyGradeA.style.display = "none";
      el.btnApproveDeduction.style.display = "none";
      el.btnRejectSample.style.display = "inline-flex";
    }

    if (el.decisionBadge) el.decisionBadge.innerHTML = badgeHtml;
    if (el.decisionNotice) el.decisionNotice.textContent = noticeText;

    // Financial calculations
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

    const r = currentReadings();
    if (r.moisture === null) {
      alert("Please enter the moisture reading first.");
      return;
    }
    // Once a lot has been weighed its quality result is part of the certified procurement
    if (store) {
      const tk = store.getToken(sample.tokenId);
      if (tk && tk.weighmentReport) {
        alert("This lot has already been weighed at the weighbridge, so its quality result can no longer be changed.");
        return;
      }
    }

    const std = FCI_QUALITY_STANDARDS[sample.cropKey] || FCI_QUALITY_STANDARDS.paddy_a;
    const verdict = evaluateSample(std, r.moisture, r.foreign, r.damaged);
    if (verdict.status !== decisionStatus) {
      // the readings no longer support the button that was pressed: show the right one instead
      recalculateQuality();
      return;
    }

    sample.status = verdict.status;
    sample.testedMoisture = r.moisture;
    sample.testedForeignMatter = r.foreign;
    sample.testedDamagedGrain = r.damaged;
    sample.decisionReasons = verdict.reasons;
    const moisture = r.moisture;

    // Save to local storage queue
    saveSamples();
    renderQueue();

    // Sync with Shared Farmer Batches (`kisan_procurement_batches`)
    syncWithSharedFarmerBatches(sample, verdict.status, moisture, std);

    // Speak announcement
    announceQCResult(sample, verdict.status, moisture);

    // Show Certificate
    openCertificateModal();
  }

  function syncWithSharedFarmerBatches(sample, decisionStatus, moisture, std) {
    try {
      // readBatches() falls back to the farmer portal's default records, so the first write never wipes them
      const batches = store.readBatches();

      let matched = batches.find(b => b.token === sample.tokenId || b.id === sample.tokenId);
      const isPass = decisionStatus === 'PASSED_GRADE_A' || decisionStatus === 'PASSED_DEDUCTION';
      const gradeName = decisionStatus === 'PASSED_DEDUCTION' ? 'Grade B' : 'Grade A';
      const deduction = decisionStatus === 'PASSED_DEDUCTION' ? deductionFor(std, moisture) : 0;
      const netRate = Math.max(0, std.baseMsp - deduction);
      const rejectLabel = (sample.decisionReasons || ['moisture']).indexOf('moisture') !== -1 ? 'Moisture High' : 'Purity Below Limit';

      if (matched) {
        // Steps: 1 Slot, 2 Gate, 3 Moisture, 4 Weight, 5 DBT. A pass completes step 3; a reject stays at the gate.
        matched.step = isPass ? Math.max(matched.step || 0, 3) : 2;
        matched.moisture = `${moisture.toFixed(1)}% (${isPass ? gradeName + ' Passed' : rejectLabel})`;
        matched.status = isPass ? "Quality Certified (Weighment in Progress)" : "Quality Recheck Required";
        matched.dbtStatus = isPass ? "Approved by Quality Lab" : "QC Hold";
        if (isPass) {
          matched.rate = netRate;
          matched.total = Math.round(matched.qty * netRate);
        }
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
          moisture: `${moisture.toFixed(1)}% (${isPass ? gradeName + ' Pass' : 'Recheck'})`,
          farmerId: sample.farmerId,
          farmerName: sample.farmerName,
          farmerMobile: sample.farmerMobile,
          village: sample.village,
          land: sample.land,
          vehicleNo: sample.vehicleNo,
          rate: netRate,
          total: Math.round(sample.estimatedQty * netRate),
          dbtStatus: isPass ? "QC Verified • Weighbridge Dispatched" : "QC Hold",
          step: isPass ? 3 : 2
        });
      }

      store.writeBatches(batches);
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
      const reasons = sample.decisionReasons || ['moisture'];
      text = reasons.length === 1 && reasons[0] === 'moisture'
        ? `Token ${sample.tokenId}, quality rejected due to high moisture ${moisture.toFixed(1)} percent. Drying advice slip generated.`
        : `Token ${sample.tokenId}, quality rejected: ${reasonList(reasons)} beyond the permissible limit. Advice slip generated.`;
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
    const live = currentReadings();
    const moisture = sample.testedMoisture !== null && sample.testedMoisture !== undefined ? sample.testedMoisture : (live.moisture === null ? 0 : live.moisture);
    const foreign = sample.testedForeignMatter !== null && sample.testedForeignMatter !== undefined ? sample.testedForeignMatter : live.foreign;
    const damaged = sample.testedDamagedGrain !== null && sample.testedDamagedGrain !== undefined ? sample.testedDamagedGrain : live.damaged;

    const isGradeA = sample.status === 'PASSED_GRADE_A';
    const isReject = sample.status === 'REJECTED';
    const reasons = sample.decisionReasons || (isReject ? ['moisture'] : []);

    // Compliance of each parameter against its FCI limit (no parameter is assumed to pass)
    const flag = (ok, okText, badText) => `<span style="color: ${ok ? '#16a34a' : '#ea580c'}; font-weight: 700;">${ok ? okText : badText}</span>`;

    const certContent = document.getElementById("certificate-print-area");
    if (certContent) {
      certContent.innerHTML = `
        <div class="cert-box">
          <div class="cert-header">
            <div style="font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b;">Government of India • Ministry of Agriculture & Farmers Welfare</div>
            <h2 style="font-size: 1.35rem; color: var(--color-primary-dark); margin: 0.35rem 0;">OFFICIAL GRAIN QUALITY & MOISTURE CERTIFICATE</h2>
            <div style="font-size: 0.82rem; color: #334155;">Food Corporation of India (FCI) Standards • Central Procurement Hub: <strong>${esc(sample.hubName)}</strong></div>
          </div>

          <div class="cert-meta-grid">
            <div>
              <span class="cert-label">Certificate ID:</span>
              <strong class="cert-val" style="font-family: var(--font-mono);">QC-2026-${esc(sample.tokenId.replace('TK-', ''))}-88</strong>
            </div>
            <div>
              <span class="cert-label">Date & Time:</span>
              <strong class="cert-val">${new Date().toLocaleString('en-IN')}</strong>
            </div>
            <div>
              <span class="cert-label">Token / Lot No:</span>
              <strong class="cert-val" style="font-family: var(--font-mono); color: var(--color-primary-dark);">${esc(sample.tokenId)}</strong>
            </div>
            <div>
              <span class="cert-label">Farmer Name & ID:</span>
              <strong class="cert-val">${esc(sample.farmerName)} (${esc(sample.farmerId)})</strong>
            </div>
            <div>
              <span class="cert-label">Crop & Variety:</span>
              <strong class="cert-val">${esc(sample.cropName)}</strong>
            </div>
            <div>
              <span class="cert-label">Vehicle / Trolley:</span>
              <strong class="cert-val">${esc(sample.vehicleNo)}</strong>
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
                <td>${flag(moisture <= std.maxMoisture, '✓ Within Limit', '⚠️ Excess Moisture')}</td>
              </tr>
              <tr>
                <td><strong>Foreign Matter / Chaff</strong></td>
                <td>≤ ${std.maxForeignMatter.toFixed(2)}%</td>
                <td>${foreign.toFixed(2)}%</td>
                <td>${flag(foreign <= std.maxForeignMatter, '✓ Within Limit', '⚠️ Above Limit')}</td>
              </tr>
              <tr>
                <td><strong>Damaged / Discolored Grains</strong></td>
                <td>≤ ${std.maxDamagedGrain.toFixed(1)}%</td>
                <td>${damaged.toFixed(1)}%</td>
                <td>${flag(damaged <= std.maxDamagedGrain, '✓ Within Limit', '⚠️ Above Limit')}</td>
              </tr>
            </tbody>
          </table>

          <div class="cert-decision-box ${isReject ? 'cert-box-reject' : 'cert-box-pass'}">
            <div style="font-size: 1.1rem; font-weight: 800; color: ${isReject ? '#dc2626' : '#137547'};">
              ${isReject ? '⛔ STATUS: REJECTED FOR PROCUREMENT' : (isGradeA ? '✓ STATUS: CERTIFIED GRADE A (FULL MSP ELIGIBLE)' : '⚠️ STATUS: CERTIFIED GRADE B (WITH APPLICABLE DEDUCTIONS)')}
            </div>
            <div style="font-size: 0.82rem; color: #475569; margin-top: 0.35rem;">
              ${isReject
                ? (reasons.length === 1 && reasons[0] === 'moisture'
                  ? 'Grain moisture exceeds maximum permissible storage limit. Direct farmer to drying platform.'
                  : `Lot fails the FCI limit for ${esc(reasonList(reasons))}. ${esc(rejectAdvice(reasons))}`)
                : `Assigned Weighbridge: <strong>${esc(sample.assignedLane)}</strong>. Moisture Certificate cryptographically signed.`}
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
