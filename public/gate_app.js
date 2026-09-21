/**
 * AgriQueue: Gate Entry & Electronic Weighbridge Module (SIH26032)
 * Module 2: QR Token Scanner, Vehicle Intake, Gross/Tare Scales & Weight Slip Generator
 *
 * Data layer: AgriQueueStore (ops_store.js), shared with the Farmer portal, the Quality Lab and the
 * Mandi Admin. This page is a view over the store: bookings made on the farmer portal appear here,
 * weighing waits for the Quality Lab decision, lanes closed by the Mandi Secretary are not offered,
 * and check-ins / weighments are visible to the admin dashboard.
 */

(function () {
  'use strict';

  const store = window.AgriQueueStore;
  const HUB = store.GATE_HUB_ID;

  const SCALE_LABEL = { 1: 'WB-01 (Electronic 60T Platform)', 2: 'WB-02 (Electronic 80T Platform)' };

  function laneNumber(text) {
    const m = /(?:WB-0|Lane\s*)(\d+)/i.exec(text || '');
    return m ? parseInt(m[1], 10) : null;
  }

  function scaleLabelFor(lane) {
    const n = laneNumber(lane);
    return SCALE_LABEL[n] || `WB-0${n || 1} (Electronic Platform)`;
  }

  // The weighbridge counter (managed by the Mandi Secretary) behind a scale option
  function laneForScale(scaleValue) {
    const n = laneNumber(scaleValue);
    return store.countersFor(HUB).find(c => c.type === 'weigh' && laneNumber(c.name) === n) || null;
  }

  const fmt = (ts) => (ts ? store.fmtTime(ts) : null);

  // Store token -> the record shape this page's UI has always read
  function toRecord(t) {
    const w = t.weighmentReport;
    const part = t.weighing || {};
    const ready = store.weighReadiness(t);
    let status = 'SCHEDULED';
    if (t.status === 'WEIGHMENT_COMPLETED') status = 'COMPLETED';
    else if (t.status !== 'BOOKED') status = part.gross > 0 ? 'GROSS_WEIGHED' : 'GATE_CHECKED_IN';

    const base = store.CROPS[t.cropKey].msp;
    return {
      tokenId: t.tokenId,
      farmerId: t.farmerId,
      farmerName: t.farmerName,
      farmerMobile: t.farmerMobile,
      village: t.village,
      land: t.land,
      cropKey: t.cropKey,
      cropName: t.cropName,
      estimatedQty: t.estimatedQty,
      vehicleNo: t.vehicleNo || 'Not recorded',
      hasVehicle: !!t.vehicleNo,
      slotTime: t.slotTime,
      hubId: t.hubId,
      hubName: t.hubName,
      status,
      ready,                                   // { ok, reason } from the Quality Lab decision
      rejected: t.qcOutcome === 'REJECTED',
      gateInTime: fmt(t.statusTimeline.gateInAt),
      gateLane: t.entryGate || (t.status !== 'BOOKED' ? 'Gate 1 (North Entrance)' : null),
      weighbridgeScale: t.lane ? scaleLabelFor(t.lane) : null,
      scaleId: w ? w.scaleId : (t.lane ? store.scaleIdFor(t.lane) : null),
      grossWeight: w ? w.grossWeightQtl : (part.gross != null ? part.gross : null),
      tareWeight: w ? w.tareWeightQtl : (part.tare != null ? part.tare : null),
      netWeight: w ? w.netWeightQtl : null,
      grossTime: fmt(w ? w.grossAt : part.grossAt),
      tareTime: fmt(w ? w.tareAt : part.tareAt),
      moisturePct: t.qualityReport ? t.qualityReport.moisturePct : null,
      qcGrade: t.qualityReport ? t.qualityReport.grade : 'Pending QC',
      baseMsp: base,
      deductionRate: Math.max(0, base - t.financials.mspPerQtl),   // Grade B moisture deduction from the Quality Lab
      totalAmount: w ? Math.round(w.netWeightQtl * t.financials.mspPerQtl) : null,
      weighedToday: t.weighedToday
    };
  }

  function getRecord(tokenId) {
    const t = tokenId ? store.getToken(tokenId) : null;
    return t ? toRecord(t) : null;
  }

  // State
  let gateRecords = [];
  let currentRecordId = null;
  let activeFilter = 'ALL';
  let searchTerm = '';
  let scaleMode = 'GROSS'; // 'GROSS' or 'TARE'
  let isScanningCamera = false;
  let weighLock = null; // reason text while the selected trolley cannot be weighed yet

  // DOM Elements cache
  const el = {};

  function init() {
    cacheDom();
    refreshRecords();
    attachEvents();
    startLiveClock();
    renderQueue();
    if (gateRecords.length > 0) {
      selectRecord(gateRecords[0].tokenId);
    }
    updateTopMetrics();
    store.onChange(onExternalChange);
  }

  function cacheDom() {
    el.liveClock = document.getElementById("gate-live-clock");
    el.queueList = document.getElementById("gate-queue-list");
    el.queueCountBadge = document.getElementById("gate-queue-count");
    
    // Top KPIs
    el.statArrived = document.getElementById("stat-arrived-count");
    el.statAwaitingWeigh = document.getElementById("stat-awaiting-weigh");
    el.statCompleted = document.getElementById("stat-completed-weigh");
    el.statNetQuintals = document.getElementById("stat-net-quintals");
    
    // Search & Filter
    el.searchInput = document.getElementById("gate-search-input");
    el.filterChips = document.querySelectorAll(".gate-filter-chip");
    
    // Scanner Station
    el.scannerInput = document.getElementById("scan-token-input");
    el.btnLookupToken = document.getElementById("btn-lookup-token");
    el.btnToggleCamera = document.getElementById("btn-toggle-camera");
    el.cameraViewfinder = document.getElementById("camera-viewfinder-box");
    el.quickScanPresets = document.querySelectorAll(".btn-quick-scan");
    
    // Workbench / Active Vehicle
    el.activeBanner = document.getElementById("active-vehicle-banner");
    el.farmerName = document.getElementById("gate-farmer-name");
    el.farmerMeta = document.getElementById("gate-farmer-meta");
    el.tokenTag = document.getElementById("gate-token-tag");
    el.cropTag = document.getElementById("gate-crop-tag");
    el.vehicleTag = document.getElementById("gate-vehicle-tag");
    el.statusBadge = document.getElementById("gate-status-badge");
    el.slotTimeDisplay = document.getElementById("gate-slot-display");
    
    // Check-in Controls
    el.checkinCard = document.getElementById("gate-checkin-controls-card");
    el.gateLaneSelect = document.getElementById("select-entry-gate");
    el.scaleSelect = document.getElementById("select-weighbridge-scale");
    el.btnConfirmGateIn = document.getElementById("btn-confirm-gate-in");
    
    // Weighbridge Controls
    el.scaleDisplayVal = document.getElementById("scale-digital-display-val");
    el.scaleStatusPill = document.getElementById("scale-status-pill");
    el.btnModeGross = document.getElementById("btn-mode-gross");
    el.btnModeTare = document.getElementById("btn-mode-tare");
    el.btnCaptureScale = document.getElementById("btn-capture-scale-reading");
    el.btnZeroScale = document.getElementById("btn-zero-scale");
    el.scaleWeightSlider = document.getElementById("scale-weight-slider");
    el.scaleWeightInput = document.getElementById("scale-weight-input");
    
    // Weighment Calculation Summary
    el.calcGrossDisplay = document.getElementById("calc-gross-weight");
    el.calcTareDisplay = document.getElementById("calc-tare-weight");
    el.calcNetDisplay = document.getElementById("calc-net-weight");
    el.calcVarianceDisplay = document.getElementById("calc-weight-variance");
    el.calcTotalAmount = document.getElementById("calc-total-payout-amount");
    
    // Action Buttons
    el.btnSaveGross = document.getElementById("btn-save-gross-weighment");
    el.btnCertifyTare = document.getElementById("btn-certify-tare-weighment");
    el.btnViewWeightSlip = document.getElementById("btn-view-weight-slip");
    
    // Weight Slip Modal
    el.slipModal = document.getElementById("weight-slip-modal");
    el.modalClose = document.getElementById("slip-modal-close-btn");
    el.btnPrintSlip = document.getElementById("btn-print-weight-slip");
  }

  // Vehicles of this hub, most actionable first: ready to weigh, in lab, scheduled, rejected, completed
  const RANK = { GROSS_WEIGHED: 0, READY: 1, LAB: 2, SCHEDULED: 3, REJECTED: 4, COMPLETED: 5 };
  function rankOf(r) {
    if (r.status === 'GATE_CHECKED_IN') return r.rejected ? RANK.REJECTED : (r.ready.ok ? RANK.READY : RANK.LAB);
    return RANK[r.status];
  }

  function refreshRecords() {
    // Simulated trolleys (Module 4 surge demo) are admin-only and never appear at the gate desk
    gateRecords = store.getTokens()
      .filter(t => t.hubId === HUB && !t.simulated)
      .map(toRecord)
      .sort((a, b) => (rankOf(a) - rankOf(b)) || a.tokenId.localeCompare(b.tokenId));
    relabelQuickScans();
  }

  // The four quick-scan buttons point at the next vehicles still to arrive (farmer-booked ones first)
  function nextScheduled() {
    const booked = {};
    store.readBatches().forEach(b => { booked[b.token] = true; });
    return gateRecords.filter(r => r.status === 'SCHEDULED')
      .sort((a, b) => (booked[a.tokenId] ? 0 : 1) - (booked[b.tokenId] ? 0 : 1));
  }

  function relabelQuickScans() {
    if (!el.quickScanPresets) return;
    const next = nextScheduled();
    el.quickScanPresets.forEach((btn, i) => {
      const r = next[i];
      btn.style.display = r ? "" : "none";
      if (!r) return;
      btn.dataset.token = r.tokenId;
      btn.textContent = `${r.tokenId} (${r.farmerName.split(' ')[0]})`;
    });
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

    // Manual Scanner Lookup
    if (el.btnLookupToken) {
      el.btnLookupToken.addEventListener("click", () => {
        const query = el.scannerInput.value.trim().toUpperCase();
        if (query) lookupAndSelect(query);
      });
    }
    if (el.scannerInput) {
      el.scannerInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          const query = el.scannerInput.value.trim().toUpperCase();
          if (query) lookupAndSelect(query);
        }
      });
    }

    // Camera Scan Toggle Simulation
    if (el.btnToggleCamera) {
      el.btnToggleCamera.addEventListener("click", toggleCameraScan);
    }

    // Quick presets
    el.quickScanPresets.forEach(btn => {
      btn.addEventListener("click", () => {
        const token = btn.dataset.token;
        if (token) lookupAndSelect(token);
      });
    });

    // Confirm Gate-In Entry
    if (el.btnConfirmGateIn) {
      el.btnConfirmGateIn.addEventListener("click", confirmGateInCheckin);
    }

    // Scale Mode Switcher (Gross vs Tare)
    if (el.btnModeGross) {
      el.btnModeGross.addEventListener("click", () => setScaleMode('GROSS'));
    }
    if (el.btnModeTare) {
      el.btnModeTare.addEventListener("click", () => setScaleMode('TARE'));
    }

    // Scale manual inputs sync
    if (el.scaleWeightSlider && el.scaleWeightInput) {
      el.scaleWeightSlider.addEventListener("input", (e) => {
        el.scaleWeightInput.value = parseFloat(e.target.value).toFixed(2);
        updateScaleDisplay(parseFloat(e.target.value));
      });
      el.scaleWeightInput.addEventListener("input", (e) => {
        let val = parseFloat(e.target.value) || 0;
        el.scaleWeightSlider.value = val;
        updateScaleDisplay(val);
      });
    }

    // Scale Reading Probe Button
    if (el.btnCaptureScale) {
      el.btnCaptureScale.addEventListener("click", runWeighbridgeSensorSimulation);
    }

    // Zero Scale Button
    if (el.btnZeroScale) {
      el.btnZeroScale.addEventListener("click", () => {
        playBeep(440, 0.08);
        updateScaleDisplay(0.00);
        if (el.scaleWeightInput) el.scaleWeightInput.value = "0.00";
        if (el.scaleWeightSlider) el.scaleWeightSlider.value = 0;
      });
    }

    // Save Gross Weighment
    if (el.btnSaveGross) {
      el.btnSaveGross.addEventListener("click", saveGrossWeighment);
    }

    // Certify Tare & Complete Weighment
    if (el.btnCertifyTare) {
      el.btnCertifyTare.addEventListener("click", certifyTareWeighment);
    }

    // View Weight Slip
    if (el.btnViewWeightSlip) {
      el.btnViewWeightSlip.addEventListener("click", openWeightSlipModal);
    }

    // Modal close
    if (el.modalClose) {
      el.modalClose.addEventListener("click", closeWeightSlipModal);
    }
    if (el.slipModal) {
      el.slipModal.addEventListener("click", (e) => {
        if (e.target === el.slipModal) closeWeightSlipModal();
      });
    }
    if (el.btnPrintSlip) {
      el.btnPrintSlip.addEventListener("click", () => {
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

  function lookupAndSelect(query) {
    const matched = store.findTokens(query)[0];

    if (matched) {
      playBeep(980, 0.15);
      selectRecord(matched.tokenId);
    } else {
      playBeep(300, 0.3);
      alert(`Token / Vehicle "${query}" not found in today's booked schedule.`);
    }
  }

  function toggleCameraScan() {
    isScanningCamera = !isScanningCamera;
    if (el.cameraViewfinder) {
      el.cameraViewfinder.style.display = isScanningCamera ? "block" : "none";
    }
    if (isScanningCamera) {
      playBeep(700, 0.1);
      // Simulate automatic QR detection after 1.8 seconds
      setTimeout(() => {
        if (isScanningCamera) {
          const randomPending = nextScheduled()[0] || gateRecords[0];
          if (randomPending) lookupAndSelect(randomPending.tokenId);
          toggleCameraScan();
        }
      }, 1800);
    }
  }

  // Badge class + text for a vehicle (Quality Lab outcome shown while it is inside the yard)
  function statusText(r) {
    if (r.status === 'SCHEDULED') return { cls: 'badge-scheduled', short: '⏳ Awaiting Gate Entry', long: 'Awaiting Gate Entry' };
    if (r.status === 'GATE_CHECKED_IN') {
      if (r.rejected) return { cls: 'badge-weighing', short: '⛔ Quality Rejected', long: 'Quality Rejected • Not Weighable' };
      if (r.ready.ok) return { cls: 'badge-pass', short: '✅ Ready to Weigh', long: 'Quality Cleared • Ready to Weigh' };
      return { cls: 'badge-lab', short: '🔬 In Quality Lab', long: 'Inside Yard (In Quality Lab)' };
    }
    if (r.status === 'GROSS_WEIGHED') return { cls: 'badge-weighing', short: `⚖️ Gross Weighed (${r.grossWeight} Q)`, long: `Gross Weighed (${r.grossWeight} Qtl)` };
    return { cls: 'badge-pass', short: `✓ Net: ${r.netWeight} Qtl`, long: `Weighment Certified (Net: ${r.netWeight} Qtl)` };
  }

  function getFilteredQueue() {
    return gateRecords.filter(r => {
      const matchSearch = !searchTerm ||
        r.tokenId.toLowerCase().includes(searchTerm) ||
        r.farmerName.toLowerCase().includes(searchTerm) ||
        r.vehicleNo.toLowerCase().includes(searchTerm) ||
        r.cropName.toLowerCase().includes(searchTerm);

      if (!matchSearch) return false;

      if (activeFilter === 'ALL') return true;
      if (activeFilter === 'SCHEDULED') return r.status === 'SCHEDULED';
      if (activeFilter === 'IN_LAB') return r.status === 'GATE_CHECKED_IN';
      if (activeFilter === 'WEIGHING') return r.status === 'GROSS_WEIGHED';
      if (activeFilter === 'COMPLETED') return r.status === 'COMPLETED';
      return true;
    });
  }

  function renderQueue() {
    if (!el.queueList) return;

    const filtered = getFilteredQueue();
    if (el.queueCountBadge) {
      el.queueCountBadge.textContent = `${filtered.length} Vehicles`;
    }

    if (filtered.length === 0) {
      el.queueList.innerHTML = `
        <div style="text-align: center; padding: 2rem 1rem; color: #64748b; font-size: 0.85rem;">
          <span class="material-symbols-outlined" style="font-size: 2.2rem; color: #cbd5e1; display: block; margin-bottom: 0.5rem;">inbox</span>
          No vehicles matching filter.
        </div>`;
      return;
    }

    el.queueList.innerHTML = filtered.map(r => {
      const isSelected = r.tokenId === currentRecordId;
      const st = statusText(r);
      const statusBadge = `<span class="gate-badge ${st.cls}">${st.short}</span>`;

      return `
        <div class="gate-queue-card ${isSelected ? 'active' : ''}" data-token="${r.tokenId}">
          <div class="gate-card-top">
            <div class="gate-card-token">${r.tokenId}</div>
            ${statusBadge}
          </div>
          <div class="gate-card-farmer">${r.farmerName}</div>
          <div class="gate-card-details">
            <span>🌾 <strong>${r.cropName}</strong></span> • 
            <span>⚖️ <strong>${r.estimatedQty} Qtl</strong></span> • 
            <span>🚛 <strong>${r.vehicleNo}</strong></span>
          </div>
          <div class="gate-card-footer">
            <span>🕒 Slot: ${r.slotTime}</span>
            <span style="color: var(--color-primary-dark); font-weight: 700;">${r.gateInTime ? 'Arrived ' + r.gateInTime : 'Not In Yard'}</span>
          </div>
        </div>
      `;
    }).join("");

    el.queueList.querySelectorAll(".gate-queue-card").forEach(card => {
      card.addEventListener("click", () => {
        selectRecord(card.dataset.token);
      });
    });
  }

  function selectRecord(tokenId, opts) {
    const keepInputs = !!(opts && opts.keepInputs);
    currentRecordId = tokenId;
    const record = getRecord(tokenId);
    if (!record) return;

    renderQueue();

    // Populate active banner
    if (el.farmerName) el.farmerName.textContent = record.farmerName;
    if (el.farmerMeta) el.farmerMeta.textContent = `ID: ${record.farmerId} • Mobile: ${record.farmerMobile} • Land: ${record.land} (${record.village})`;
    if (el.tokenTag) el.tokenTag.textContent = record.tokenId;
    if (el.cropTag) el.cropTag.textContent = record.cropName;
    if (el.vehicleTag) el.vehicleTag.textContent = record.vehicleNo;
    if (el.slotTimeDisplay) el.slotTimeDisplay.textContent = record.slotTime;

    // Status Badge
    if (el.statusBadge) {
      const st = statusText(record);
      el.statusBadge.className = "gate-badge " + st.cls;
      el.statusBadge.textContent = st.long;
    }

    // Toggle Check-in controls visibility
    if (el.checkinCard) {
      el.checkinCard.style.display = (record.status === 'SCHEDULED') ? "block" : "none";
    }
    applyScaleOptions(keepInputs);

    // The Quality Lab decision gates the weighbridge
    weighLock = weighLockFor(record);
    if (el.btnCaptureScale) el.btnCaptureScale.disabled = !!weighLock;

    if (keepInputs) {
      // Something else changed (e.g. the QC result arrived): keep what the operator is typing
      updateScaleDisplay(parseFloat(el.scaleWeightInput.value) || 0);
    } else if (record.status === 'SCHEDULED' || record.status === 'GATE_CHECKED_IN') {
      // Setup scale mode and default values
      setScaleMode('GROSS');
      const defGross = record.grossWeight || (record.estimatedQty + 8.20);
      updateScaleInputs(defGross);
    } else if (record.status === 'GROSS_WEIGHED') {
      setScaleMode('TARE');
      const defTare = record.tareWeight || 8.20;
      updateScaleInputs(defTare);
    } else if (record.status === 'COMPLETED') {
      setScaleMode('TARE');
      updateScaleInputs(record.tareWeight || 8.20);
    }

    recalculateWeighment();
  }

  // Short reason shown on the scale while weighing is locked (null = weighing allowed)
  function weighLockFor(record) {
    if (record.status === 'COMPLETED') return null;
    if (record.status === 'SCHEDULED') return 'Check-in required first';
    if (!record.ready.ok) return record.rejected ? 'Quality rejected' : 'Awaiting quality test';
    return null;
  }

  // Refuses a weighing action (with the reason) until the trolley is checked in and passed by the Quality Lab
  function ensureWeighable(record) {
    if (!record) return false;
    if (record.status === 'COMPLETED') return false;
    if (record.status === 'SCHEDULED') {
      alert("Please confirm gate-in for this vehicle first.");
      return false;
    }
    if (!record.ready.ok) {
      alert(`⛔ Weighing blocked: ${record.ready.reason}.`);
      return false;
    }
    return true;
  }

  // Offer only the scales whose weighbridge lane the Mandi Secretary has left open
  function applyScaleOptions(keepChoice) {
    if (!el.scaleSelect) return;
    const previous = keepChoice ? el.scaleSelect.value : null;
    const auto = store.pickLane(HUB);
    let firstOpen = null;
    let autoOption = null;
    let previousOk = false;

    Array.from(el.scaleSelect.options).forEach(opt => {
      const lane = laneForScale(opt.value);
      const open = !!(lane && lane.open);
      opt.disabled = !open;
      opt.textContent = opt.value + (open ? "" : " — closed by admin");
      if (open && !firstOpen) firstOpen = opt.value;
      if (open && lane.name === auto) autoOption = opt.value;
      if (open && opt.value === previous) previousOk = true;
    });

    const choice = previousOk ? previous : (autoOption || firstOpen);
    if (choice) el.scaleSelect.value = choice;
  }

  function setScaleMode(mode) {
    scaleMode = mode;
    if (el.btnModeGross) {
      el.btnModeGross.classList.toggle("active", mode === 'GROSS');
    }
    if (el.btnModeTare) {
      el.btnModeTare.classList.toggle("active", mode === 'TARE');
    }

    const record = getRecord(currentRecordId);
    if (!record) return;

    if (mode === 'GROSS') {
      const val = record.grossWeight || (record.estimatedQty + 8.20);
      updateScaleInputs(val);
      if (el.btnSaveGross) el.btnSaveGross.style.display = (record.status !== 'COMPLETED') ? "inline-flex" : "none";
      if (el.btnCertifyTare) el.btnCertifyTare.style.display = "none";
    } else {
      const val = record.tareWeight || 8.20;
      updateScaleInputs(val);
      if (el.btnSaveGross) el.btnSaveGross.style.display = "none";
      if (el.btnCertifyTare) el.btnCertifyTare.style.display = (record.status !== 'COMPLETED' && record.grossWeight !== null) ? "inline-flex" : "none";
    }

    recalculateWeighment();
  }

  function updateScaleInputs(val) {
    if (el.scaleWeightInput) el.scaleWeightInput.value = val.toFixed(2);
    if (el.scaleWeightSlider) el.scaleWeightSlider.value = val;
    updateScaleDisplay(val);
  }

  function updateScaleDisplay(val) {
    if (el.scaleDisplayVal) {
      el.scaleDisplayVal.textContent = val.toFixed(2);
    }
    if (el.scaleStatusPill) {
      if (weighLock) {
        el.scaleStatusPill.className = "scale-pill scale-pill-tare";
        el.scaleStatusPill.textContent = `⛔ WEIGHING LOCKED • ${weighLock.toUpperCase()}`;
      } else if (scaleMode === 'GROSS') {
        el.scaleStatusPill.className = "scale-pill scale-pill-gross";
        el.scaleStatusPill.textContent = "⚖️ GROSS WEIGHT (LOADED VEHICLE)";
      } else {
        el.scaleStatusPill.className = "scale-pill scale-pill-tare";
        el.scaleStatusPill.textContent = "🚛 TARE WEIGHT (EMPTY VEHICLE)";
      }
    }
  }

  function runWeighbridgeSensorSimulation() {
    const record = getRecord(currentRecordId);
    if (!record || !el.btnCaptureScale) return;
    if (!ensureWeighable(record)) return;

    el.btnCaptureScale.disabled = true;
    el.btnCaptureScale.innerHTML = `<span class="material-symbols-outlined spin-animation" style="font-size: 1.1rem; vertical-align: middle;">sync</span> Weighbridge Platform Stabilizing...`;

    playBeep(520, 0.15);

    setTimeout(() => {
      let simulated = 0;
      if (scaleMode === 'GROSS') {
        // Base gross = estimatedQty + 7.80 to 8.60 tare + minor variation
        const randomVar = (Math.random() * 1.5) - 0.75;
        simulated = parseFloat((record.estimatedQty + 8.20 + randomVar).toFixed(2));
      } else {
        // Tare = 7.90 to 8.40 Qtl
        const randomTare = (Math.random() * 0.4) - 0.2;
        simulated = parseFloat((8.20 + randomTare).toFixed(2));
      }

      updateScaleInputs(simulated);
      el.btnCaptureScale.disabled = false;
      el.btnCaptureScale.innerHTML = `<span class="material-symbols-outlined" style="font-size: 1.15rem; vertical-align: middle;">sensors</span> ⚡ Read from Electronic Weighbridge Scale`;

      playBeep(880, 0.25);
      recalculateWeighment();
    }, 1000);
  }

  function confirmGateInCheckin() {
    const record = getRecord(currentRecordId);
    if (!record || record.status !== 'SCHEDULED') return;

    const lane = laneForScale(el.scaleSelect ? el.scaleSelect.value : "");
    if (!lane || !lane.open) {
      alert("⛔ No open weighbridge lane for that scale. Ask the Mandi Secretary to open one.");
      return;
    }
    if (record.hubId && record.hubId !== HUB && !confirm(`This token was booked for ${record.hubName}, not ${store.centreById(HUB).short}. Check it in here anyway?`)) {
      return;
    }

    // The farmer's booking normally carries the plate; ask only when an older booking has none
    let vehicleNo;
    if (!record.hasVehicle) {
      vehicleNo = (window.prompt(`Vehicle / trolley number for ${record.tokenId}:`) || "").trim();
      if (!vehicleNo) return;
    }

    const res = store.checkIn(record.tokenId, {
      vehicleNo,
      lane: lane.name,
      entryGate: el.gateLaneSelect ? el.gateLaneSelect.value : null,
      hubId: HUB
    });
    if (!res.ok) {
      alert(`⛔ ${res.error}.`);
      return;
    }

    refreshRecords();
    selectRecord(record.tokenId);
    updateTopMetrics();

    const entryGate = el.gateLaneSelect ? el.gateLaneSelect.value : "Gate 1 (North Entrance)";
    announceGateEvent(`Token ${record.tokenId}, vehicle ${res.entry.vehicleNo} checked in at ${entryGate}. Proceed to Quality Lab Counter 2 for moisture testing.`);
  }

  function saveGrossWeighment() {
    const record = getRecord(currentRecordId);
    if (!ensureWeighable(record)) return;

    const grossVal = parseFloat(el.scaleWeightInput.value) || (record.estimatedQty + 8.20);
    if (!(grossVal > 0)) {
      alert("Please capture a valid gross weight first!");
      return;
    }

    store.saveWeighing(record.tokenId, { gross: store.round2(grossVal) });
    refreshRecords();
    renderQueue();
    updateTopMetrics();
    selectRecord(record.tokenId, { keepInputs: true }); // refresh the status badge, keep the scale reading

    setScaleMode('TARE');
    announceGateEvent(`Gross weight for token ${record.tokenId} recorded as ${grossVal.toFixed(2)} quintals. Proceed to grain unloading bay.`);
  }

  function certifyTareWeighment() {
    const record = getRecord(currentRecordId);
    if (!ensureWeighable(record)) return;

    if (record.grossWeight === null) {
      alert("Please capture and save Gross Weight first!");
      return;
    }

    const tareVal = parseFloat(el.scaleWeightInput.value) || 8.20;
    if (tareVal >= record.grossWeight) {
      alert("⚠️ Tare weight must be less than the gross weight. Please re-read the scale.");
      return;
    }

    const res = store.recordWeighment(record.tokenId, { gross: record.grossWeight, tare: tareVal });
    if (!res.ok) {
      alert(`⛔ ${res.error}.`);
      return;
    }

    refreshRecords();
    renderQueue();
    selectRecord(record.tokenId);
    updateTopMetrics();

    announceGateEvent(`Weighment complete for ${record.farmerName}. Net crop weight ${res.weighment.net.toFixed(2)} quintals certified. Official weighment slip issued.`);

    openWeightSlipModal();
  }

  function recalculateWeighment() {
    const record = getRecord(currentRecordId);
    if (!record) return;

    let gross = record.grossWeight;
    let tare = record.tareWeight;

    if (scaleMode === 'GROSS') {
      gross = parseFloat(el.scaleWeightInput.value) || (record.estimatedQty + 8.20);
    } else {
      tare = parseFloat(el.scaleWeightInput.value) || 8.20;
    }

    if (el.calcGrossDisplay) {
      el.calcGrossDisplay.textContent = gross ? `${gross.toFixed(2)} Qtl` : '--';
    }
    if (el.calcTareDisplay) {
      el.calcTareDisplay.textContent = tare ? `${tare.toFixed(2)} Qtl` : '--';
    }

    let net = null;
    if (gross !== null && tare !== null) {
      net = Math.max(0, gross - tare);
    } else if (record.netWeight) {
      net = record.netWeight;
    }

    if (el.calcNetDisplay) {
      el.calcNetDisplay.textContent = net !== null ? `${net.toFixed(2)} Qtl` : '--';
    }

    if (el.calcVarianceDisplay) {
      if (net !== null) {
        const diff = (net - record.estimatedQty).toFixed(2);
        const sign = diff >= 0 ? `+${diff}` : `${diff}`;
        el.calcVarianceDisplay.textContent = `${sign} Qtl (${Math.abs(diff) <= 2.0 ? '✓ Match' : '⚠️ Variation'})`;
        el.calcVarianceDisplay.style.color = Math.abs(diff) <= 2.0 ? 'var(--status-success)' : 'var(--status-warning)';
      } else {
        el.calcVarianceDisplay.textContent = '--';
      }
    }

    const rate = (record.baseMsp || 2300) - (record.deductionRate || 0);
    if (el.calcTotalAmount) {
      if (net !== null) {
        const total = Math.round(net * rate);
        el.calcTotalAmount.textContent = `₹${total.toLocaleString("en-IN")}`;
      } else {
        const estTotal = Math.round(record.estimatedQty * rate);
        el.calcTotalAmount.textContent = `~₹${estTotal.toLocaleString("en-IN")}`;
      }
    }
  }



  function announceGateEvent(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  }

  function updateTopMetrics() {
    let arrived = 0;
    let awaitingWeigh = 0;
    let completed = 0;
    let totalQuintals = 0;

    gateRecords.forEach(r => {
      if (r.status !== 'SCHEDULED') arrived++;
      if ((r.status === 'GATE_CHECKED_IN' || r.status === 'GROSS_WEIGHED') && !r.rejected) awaitingWeigh++;
      if (r.status === 'COMPLETED' && r.weighedToday) {
        completed++;
        totalQuintals += (r.netWeight || r.estimatedQty);
      }
    });

    if (el.statArrived) el.statArrived.textContent = arrived;
    if (el.statAwaitingWeigh) el.statAwaitingWeigh.textContent = awaitingWeigh;
    if (el.statCompleted) el.statCompleted.textContent = completed;
    if (el.statNetQuintals) el.statNetQuintals.textContent = `${totalQuintals.toFixed(1)} Q`;
  }

  // Another tab (farmer booking, Quality Lab result, admin lane change) changed shared data
  function onExternalChange() {
    const before = getRecord(currentRecordId);
    refreshRecords();
    renderQueue();
    updateTopMetrics();
    const after = getRecord(currentRecordId);
    if (!after) return;
    if (!before || before.status !== after.status) {
      selectRecord(currentRecordId);
    } else {
      selectRecord(currentRecordId, { keepInputs: true });
    }
  }

  function openWeightSlipModal() {
    const record = getRecord(currentRecordId);
    if (!record || !el.slipModal) return;

    const gross = record.grossWeight || (record.estimatedQty + 8.20);
    const tare = record.tareWeight || 8.20;
    const net = record.netWeight || (gross - tare);
    const rate = (record.baseMsp || 2300) - (record.deductionRate || 0);
    const totalAmount = record.totalAmount || Math.round(net * rate);

    const slipContent = document.getElementById("weight-slip-print-area");
    if (slipContent) {
      slipContent.innerHTML = `
        <div class="slip-box">
          <div class="slip-header">
            <div style="font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b;">Haryana State Agricultural Marketing Board • Government of India</div>
            <h2 style="font-size: 1.35rem; color: var(--color-primary-dark); margin: 0.35rem 0;">OFFICIAL ELECTRONIC WEIGHBRIDGE CERTIFICATE (J-WEIGH SLIP)</h2>
            <div style="font-size: 0.82rem; color: #334155;">Central Procurement Hub: <strong>${record.hubName}</strong> • Scale: <strong>${record.weighbridgeScale}</strong></div>
          </div>

          <div class="slip-meta-grid">
            <div>
              <span class="slip-label">Slip No:</span>
              <strong class="slip-val" style="font-family: var(--font-mono);">WB-2026-${record.tokenId.replace('TK-', '')}-99</strong>
            </div>
            <div>
              <span class="slip-label">Date & Time:</span>
              <strong class="slip-val">${new Date().toLocaleString('en-IN')}</strong>
            </div>
            <div>
              <span class="slip-label">Digital Token:</span>
              <strong class="slip-val" style="font-family: var(--font-mono); color: var(--color-primary-dark);">${record.tokenId}</strong>
            </div>
            <div>
              <span class="slip-label">Farmer Name:</span>
              <strong class="slip-val">${record.farmerName} (${record.farmerId})</strong>
            </div>
            <div>
              <span class="slip-label">Crop & Variety:</span>
              <strong class="slip-val">${record.cropName}</strong>
            </div>
            <div>
              <span class="slip-label">Vehicle Plate / Trolley:</span>
              <strong class="slip-val" style="font-family: var(--font-mono);">${record.vehicleNo}</strong>
            </div>
          </div>

          <table class="slip-table">
            <thead>
              <tr>
                <th>Weighment Stage</th>
                <th>Electronic Scale Timestamp</th>
                <th>Certified Weight (Quintals)</th>
                <th>Operator Verified</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>1. Gross Weight (Loaded Trolley)</strong></td>
                <td>${record.grossTime || '—'}</td>
                <td><strong style="font-family: var(--font-mono); font-size: 1.05rem;">${gross.toFixed(2)} Qtl</strong></td>
                <td><span style="color: #16a34a; font-weight: 700;">✓ Scale ${record.scaleId || 'WB-01'} Certified</span></td>
              </tr>
              <tr>
                <td><strong>2. Tare Weight (Empty Vehicle)</strong></td>
                <td>${record.tareTime || '—'}</td>
                <td><strong style="font-family: var(--font-mono); font-size: 1.05rem;">${tare.toFixed(2)} Qtl</strong></td>
                <td><span style="color: #16a34a; font-weight: 700;">✓ Scale ${record.scaleId || 'WB-01'} Certified</span></td>
              </tr>
              <tr style="background: #f0fdf4;">
                <td><strong style="color: var(--color-primary-dark); font-size: 1rem;">3. CERTIFIED NET CROP QUANTITY</strong></td>
                <td>Official Net Weight</td>
                <td><strong style="font-family: var(--font-mono); font-size: 1.25rem; color: var(--color-primary-dark);">${net.toFixed(2)} Qtl</strong></td>
                <td><span style="color: #16a34a; font-weight: 800;">✓ 100% Verified</span></td>
              </tr>
            </tbody>
          </table>

          <div class="slip-financial-box">
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.95rem;">
              <span>Government MSP Rate: <strong>₹${rate.toLocaleString("en-IN")} / Qtl</strong>${record.deductionRate > 0 ? ` <span style="font-size: 0.75rem; color: #64748b;">(after ₹${record.deductionRate} / Qtl moisture deduction)</span>` : ''}</span>
              <span>Quality Grade: <strong style="color: #16a34a;">${record.qcGrade} (Moisture: ${record.moisturePct != null ? record.moisturePct + '%' : '—'})</strong></span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 1.15rem; font-weight: 800; color: var(--color-primary-dark); margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px dashed var(--color-primary-border);">
              <span>TOTAL CERTIFIED MSP DIRECT BENEFIT TRANSFER:</span>
              <span style="font-family: var(--font-mono);">₹${totalAmount.toLocaleString("en-IN")}</span>
            </div>
          </div>

          <div class="slip-footer">
            <div style="text-align: left;">
              <div style="font-size: 0.75rem; color: #64748b;">Digital Barcode Signature:</div>
              <div style="font-family: var(--font-mono); font-size: 0.85rem; font-weight: 700; color: #334155; margin-top: 0.2rem;">|||||| |||||||| ||||| |||||| ||||||||</div>
              <div style="font-size: 0.72rem; color: #94a3b8;">Auth Token Hash: sha256:9b3f48aa019283</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 0.78rem; font-weight: 700; color: var(--color-primary-dark);">Subhash Chandra (Weighbridge In-charge)</div>
              <div style="font-size: 0.72rem; color: #64748b;">Mandi Board Certified Scale Operator (ID: WB-OP-108)</div>
              <div style="font-size: 0.7rem; color: #16a34a; font-weight: 700;">✓ Cryptographically Recorded to Mandi Ledger</div>
            </div>
          </div>
        </div>
      `;
    }

    el.slipModal.style.display = "flex";
  }

  function closeWeightSlipModal() {
    if (el.slipModal) {
      el.slipModal.style.display = "none";
    }
  }

  function playBeep(freq, duration) {
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

  // Initialize on load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
