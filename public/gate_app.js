/**
 * AgriQueue: Gate Entry & Electronic Weighbridge Module (SIH26032)
 * Module 2: QR Token Scanner, Vehicle Intake, Gross/Tare Scales & Weight Slip Generator
 */

(function () {
  'use strict';

  // Seed Gate Records & Trolley Queue
  const INITIAL_GATE_RECORDS = [
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
      driverName: "Ramesh Chand",
      slotTime: "Today 10:00 AM - 11:00 AM",
      hubName: "Karnal Central Procurement Hub",
      status: "IN_LAB", // SCHEDULED, GATE_CHECKED_IN, IN_LAB, GROSS_WEIGHED, TARE_WEIGHED, COMPLETED
      gateInTime: "09:12 AM",
      gateLane: "Gate 1 (North Entrance)",
      weighbridgeScale: "WB-01 (Electronic 60T Platform)",
      grossWeight: 58.20,
      tareWeight: null,
      netWeight: null,
      grossTime: "09:18 AM",
      tareTime: null,
      moisturePct: 11.8,
      qcGrade: "Grade A",
      baseMsp: 2300,
      deductionRate: 0,
      totalAmount: 115000,
      timestamp: Date.now() - 25 * 60 * 1000
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
      driverName: "Gurpreet Singh",
      slotTime: "Today 10:00 AM - 11:00 AM",
      hubName: "Karnal Central Procurement Hub",
      status: "GATE_CHECKED_IN",
      gateInTime: "09:25 AM",
      gateLane: "Gate 2 (East Entrance)",
      weighbridgeScale: "WB-02 (Electronic 80T Platform)",
      grossWeight: null,
      tareWeight: null,
      netWeight: null,
      grossTime: null,
      tareTime: null,
      moisturePct: null,
      qcGrade: "Pending QC",
      baseMsp: 2275,
      deductionRate: 0,
      totalAmount: null,
      timestamp: Date.now() - 18 * 60 * 1000
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
      driverName: "Jagdish Prasad",
      slotTime: "Today 11:00 AM - 12:00 PM",
      hubName: "Karnal Central Procurement Hub",
      status: "SCHEDULED",
      gateInTime: null,
      gateLane: "Gate 1 (North Entrance)",
      weighbridgeScale: "WB-01 (Electronic 60T Platform)",
      grossWeight: null,
      tareWeight: null,
      netWeight: null,
      grossTime: null,
      tareTime: null,
      moisturePct: null,
      qcGrade: "Pending Gate Entry",
      baseMsp: 5650,
      deductionRate: 0,
      totalAmount: null,
      timestamp: Date.now() - 5 * 60 * 1000
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
      driverName: "Rajeshwar Rao",
      slotTime: "Today 11:00 AM - 12:00 PM",
      hubName: "Karnal Central Procurement Hub",
      status: "SCHEDULED",
      gateInTime: null,
      gateLane: "Gate 2 (East Entrance)",
      weighbridgeScale: "WB-02 (Electronic 80T Platform)",
      grossWeight: null,
      tareWeight: null,
      netWeight: null,
      grossTime: null,
      tareTime: null,
      moisturePct: null,
      qcGrade: "Pending Gate Entry",
      baseMsp: 2090,
      deductionRate: 0,
      totalAmount: null,
      timestamp: Date.now() - 2 * 60 * 1000
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
      driverName: "Baldev Singh",
      slotTime: "Yesterday 08:30 AM",
      hubName: "Karnal Central Procurement Hub",
      status: "COMPLETED",
      gateInTime: "08:40 AM",
      gateLane: "Gate 1 (North Entrance)",
      weighbridgeScale: "WB-01 (Electronic 60T Platform)",
      grossWeight: 69.20,
      tareWeight: 9.20,
      netWeight: 60.00,
      grossTime: "08:48 AM",
      tareTime: "09:32 AM",
      moisturePct: 10.4,
      qcGrade: "Grade A",
      baseMsp: 2275,
      deductionRate: 0,
      totalAmount: 136500,
      timestamp: Date.now() - 60 * 60 * 1000
    }
  ];

  // State
  let gateRecords = [];
  let currentRecordId = null;
  let activeFilter = 'ALL';
  let searchTerm = '';
  let scaleMode = 'GROSS'; // 'GROSS' or 'TARE'
  let isScanningCamera = false;

  // DOM Elements cache
  const el = {};

  function init() {
    cacheDom();
    loadGateRecords();
    attachEvents();
    startLiveClock();
    renderQueue();
    if (gateRecords.length > 0) {
      selectRecord(gateRecords[0].tokenId);
    }
    updateTopMetrics();
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

  function loadGateRecords() {
    const raw = localStorage.getItem("agriqueue_gate_records");
    if (raw) {
      try {
        gateRecords = JSON.parse(raw);
      } catch (e) {
        gateRecords = INITIAL_GATE_RECORDS;
      }
    } else {
      gateRecords = INITIAL_GATE_RECORDS;
      saveGateRecords();
    }
  }

  function saveGateRecords() {
    localStorage.setItem("agriqueue_gate_records", JSON.stringify(gateRecords));
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
    const matched = gateRecords.find(r => 
      r.tokenId.toUpperCase() === query || 
      r.vehicleNo.toUpperCase() === query || 
      r.farmerName.toUpperCase().includes(query) ||
      r.farmerMobile.includes(query)
    );

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
          const randomPending = gateRecords.find(r => r.status === 'SCHEDULED') || gateRecords[0];
          lookupAndSelect(randomPending.tokenId);
          toggleCameraScan();
        }
      }, 1800);
    }
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
      if (activeFilter === 'IN_LAB') return r.status === 'GATE_CHECKED_IN' || r.status === 'IN_LAB';
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
      let statusBadge = '';
      
      if (r.status === 'SCHEDULED') {
        statusBadge = `<span class="gate-badge badge-scheduled">⏳ Awaiting Gate Entry</span>`;
      } else if (r.status === 'GATE_CHECKED_IN' || r.status === 'IN_LAB') {
        statusBadge = `<span class="gate-badge badge-lab">🔬 In Quality Lab</span>`;
      } else if (r.status === 'GROSS_WEIGHED') {
        statusBadge = `<span class="gate-badge badge-weighing">⚖️ Gross Weighed (${r.grossWeight} Q)</span>`;
      } else if (r.status === 'COMPLETED') {
        statusBadge = `<span class="gate-badge badge-pass">✓ Net: ${r.netWeight} Qtl</span>`;
      }

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

  function selectRecord(tokenId) {
    currentRecordId = tokenId;
    const record = gateRecords.find(r => r.tokenId === tokenId);
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
      if (record.status === 'SCHEDULED') {
        el.statusBadge.className = "gate-badge badge-scheduled";
        el.statusBadge.textContent = "Awaiting Gate Entry";
      } else if (record.status === 'GATE_CHECKED_IN' || record.status === 'IN_LAB') {
        el.statusBadge.className = "gate-badge badge-lab";
        el.statusBadge.textContent = "Inside Yard (In Quality Lab)";
      } else if (record.status === 'GROSS_WEIGHED') {
        el.statusBadge.className = "gate-badge badge-weighing";
        el.statusBadge.textContent = `Gross Weighed (${record.grossWeight} Qtl)`;
      } else if (record.status === 'COMPLETED') {
        el.statusBadge.className = "gate-badge badge-pass";
        el.statusBadge.textContent = `Weighment Certified (Net: ${record.netWeight} Qtl)`;
      }
    }

    // Toggle Check-in controls visibility
    if (el.checkinCard) {
      el.checkinCard.style.display = (record.status === 'SCHEDULED') ? "block" : "none";
    }

    // Setup scale mode and default values
    if (record.status === 'SCHEDULED' || record.status === 'GATE_CHECKED_IN' || record.status === 'IN_LAB') {
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

  function setScaleMode(mode) {
    scaleMode = mode;
    if (el.btnModeGross) {
      el.btnModeGross.classList.toggle("active", mode === 'GROSS');
    }
    if (el.btnModeTare) {
      el.btnModeTare.classList.toggle("active", mode === 'TARE');
    }

    const record = gateRecords.find(r => r.tokenId === currentRecordId);
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
      if (scaleMode === 'GROSS') {
        el.scaleStatusPill.className = "scale-pill scale-pill-gross";
        el.scaleStatusPill.textContent = "⚖️ GROSS WEIGHT (LOADED VEHICLE)";
      } else {
        el.scaleStatusPill.className = "scale-pill scale-pill-tare";
        el.scaleStatusPill.textContent = "🚛 TARE WEIGHT (EMPTY VEHICLE)";
      }
    }
  }

  function runWeighbridgeSensorSimulation() {
    const record = gateRecords.find(r => r.tokenId === currentRecordId);
    if (!record || !el.btnCaptureScale) return;

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
    const record = gateRecords.find(r => r.tokenId === currentRecordId);
    if (!record) return;

    const nowTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    record.gateInTime = nowTime;
    record.gateLane = el.gateLaneSelect ? el.gateLaneSelect.value : "Gate 1 (North Entrance)";
    record.weighbridgeScale = el.scaleSelect ? el.scaleSelect.value : "WB-01 (Electronic 60T Platform)";
    record.status = "GATE_CHECKED_IN";

    saveGateRecords();
    syncWithQCAndFarmer(record, "GATE_CHECKED_IN");
    renderQueue();
    selectRecord(record.tokenId);

    announceGateEvent(`Token ${record.tokenId}, vehicle ${record.vehicleNo} checked in at ${record.gateLane}. Proceed to Quality Lab Counter 2 for moisture testing.`);
  }

  function saveGrossWeighment() {
    const record = gateRecords.find(r => r.tokenId === currentRecordId);
    if (!record) return;

    const grossVal = parseFloat(el.scaleWeightInput.value) || (record.estimatedQty + 8.20);
    const nowTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    record.grossWeight = grossVal;
    record.grossTime = nowTime;
    record.status = "GROSS_WEIGHED";

    saveGateRecords();
    syncWithQCAndFarmer(record, "GROSS_WEIGHED");
    renderQueue();

    setScaleMode('TARE');
    announceGateEvent(`Gross weight for token ${record.tokenId} recorded as ${grossVal.toFixed(2)} quintals. Proceed to grain unloading bay.`);
  }

  function certifyTareWeighment() {
    const record = gateRecords.find(r => r.tokenId === currentRecordId);
    if (!record) return;

    if (record.grossWeight === null) {
      alert("Please capture and save Gross Weight first!");
      return;
    }

    const tareVal = parseFloat(el.scaleWeightInput.value) || 8.20;
    const netVal = parseFloat((record.grossWeight - tareVal).toFixed(2));
    const nowTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    record.tareWeight = tareVal;
    record.tareTime = nowTime;
    record.netWeight = netVal;
    record.status = "COMPLETED";

    const rate = (record.baseMsp || 2300) - (record.deductionRate || 0);
    record.totalAmount = Math.round(netVal * rate);

    saveGateRecords();
    syncWithQCAndFarmer(record, "COMPLETED");
    renderQueue();
    selectRecord(record.tokenId);

    announceGateEvent(`Weighment complete for ${record.farmerName}. Net crop weight ${netVal.toFixed(2)} quintals certified. Official weighment slip issued.`);

    openWeightSlipModal();
  }

  function recalculateWeighment() {
    const record = gateRecords.find(r => r.tokenId === currentRecordId);
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

  function syncWithQCAndFarmer(record, eventType) {
    try {
      // 1. Sync with Farmer Batches in localStorage
      const rawBatches = localStorage.getItem("kisan_procurement_batches");
      let batches = rawBatches ? JSON.parse(rawBatches) : [];
      let matched = batches.find(b => b.token === record.tokenId || b.id === record.tokenId);

      if (matched) {
        if (eventType === "GATE_CHECKED_IN") {
          matched.step = 2;
          matched.status = "Inside Mandi Yard (In Quality Lab)";
        } else if (eventType === "GROSS_WEIGHED") {
          matched.step = 4;
          matched.status = `Gross Weighed (${record.grossWeight} Qtl)`;
        } else if (eventType === "COMPLETED") {
          matched.step = 5;
          matched.qty = record.netWeight;
          matched.total = record.totalAmount;
          matched.status = "Procured & Weighed (J-Form Issued)";
          matched.dbtStatus = "Approved for DBT Disbursement";
        }
      } else {
        batches.unshift({
          id: `PROC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
          token: record.tokenId,
          cropKey: record.cropKey,
          crop: record.cropName,
          qty: record.netWeight || record.estimatedQty,
          centre: record.hubName,
          slot: record.slotTime,
          status: eventType === "COMPLETED" ? "Procured & Weighed (J-Form Issued)" : "In Yard (Weighment Station)",
          moisture: `${record.moisturePct || 11.8}% (Grade A)`,
          rate: record.baseMsp,
          total: record.totalAmount || Math.round(record.estimatedQty * record.baseMsp),
          dbtStatus: eventType === "COMPLETED" ? "Approved for DBT Disbursement" : "Gate Check-in Complete",
          step: eventType === "COMPLETED" ? 5 : 2
        });
      }
      localStorage.setItem("kisan_procurement_batches", JSON.stringify(batches));

      // 2. Sync with QC Samples Queue
      const rawQC = localStorage.getItem("agriqueue_qc_samples");
      let qcSamples = rawQC ? JSON.parse(rawQC) : [];
      let qcMatched = qcSamples.find(s => s.tokenId === record.tokenId);
      if (!qcMatched && eventType === "GATE_CHECKED_IN") {
        qcSamples.unshift({
          tokenId: record.tokenId,
          farmerId: record.farmerId,
          farmerName: record.farmerName,
          farmerMobile: record.farmerMobile,
          village: record.village,
          land: record.land,
          cropKey: record.cropKey,
          cropName: record.cropName,
          estimatedQty: record.estimatedQty,
          vehicleNo: record.vehicleNo,
          arrivedTime: record.gateInTime || "Just Now",
          hubName: record.hubName,
          status: "PENDING",
          testedMoisture: null,
          testedForeignMatter: null,
          testedDamagedGrain: null,
          assignedLane: record.weighbridgeScale
        });
        localStorage.setItem("agriqueue_qc_samples", JSON.stringify(qcSamples));
      }
    } catch (e) {
      console.warn("Could not sync gate event with shared batches", e);
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
      if (r.status === 'GATE_CHECKED_IN' || r.status === 'IN_LAB' || r.status === 'GROSS_WEIGHED') awaitingWeigh++;
      if (r.status === 'COMPLETED') {
        completed++;
        totalQuintals += (r.netWeight || r.estimatedQty);
      }
    });

    if (el.statArrived) el.statArrived.textContent = arrived;
    if (el.statAwaitingWeigh) el.statAwaitingWeigh.textContent = awaitingWeigh;
    if (el.statCompleted) el.statCompleted.textContent = completed;
    if (el.statNetQuintals) el.statNetQuintals.textContent = `${totalQuintals.toFixed(1)} Q`;
  }

  function openWeightSlipModal() {
    const record = gateRecords.find(r => r.tokenId === currentRecordId);
    if (!record || !el.slipModal) return;

    const gross = record.grossWeight || (record.estimatedQty + 8.20);
    const tare = record.tareWeight || 8.20;
    const net = record.netWeight || (gross - tare);
    const rate = record.baseMsp || 2300;
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
                <td>${record.grossTime || '09:18 AM'}</td>
                <td><strong style="font-family: var(--font-mono); font-size: 1.05rem;">${gross.toFixed(2)} Qtl</strong></td>
                <td><span style="color: #16a34a; font-weight: 700;">✓ Scale WB-01 Certified</span></td>
              </tr>
              <tr>
                <td><strong>2. Tare Weight (Empty Vehicle)</strong></td>
                <td>${record.tareTime || '09:32 AM'}</td>
                <td><strong style="font-family: var(--font-mono); font-size: 1.05rem;">${tare.toFixed(2)} Qtl</strong></td>
                <td><span style="color: #16a34a; font-weight: 700;">✓ Scale WB-01 Certified</span></td>
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
              <span>Government MSP Rate: <strong>₹${rate.toLocaleString("en-IN")} / Qtl</strong></span>
              <span>Quality Grade: <strong style="color: #16a34a;">${record.qcGrade} (Moisture: ${record.moisturePct || 11.8}%)</strong></span>
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
