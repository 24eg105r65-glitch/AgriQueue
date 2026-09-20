/**
 * AgriQueue: Gate & Weighbridge Operator Terminal (SIH26032)
 * Module 2: Token check-in, vehicle entry / lane assignment, and gross - tare = net weighment.
 * Reads and writes through AgriQueueStore (ops_store.js), which shares state with the
 * Farmer portal (bookings) and the Quality Lab (arrived-trolley queue and results).
 */

(function () {
  "use strict";

  const store = window.AgriQueueStore;
  const HUB = store.GATE_HUB_ID;

  // State
  let tokens = [];
  let currentId = null;
  let activeFilter = "ALL";
  let searchTerm = "";

  // DOM Elements cache
  const el = {};

  function init() {
    cacheDom();
    attachEvents();
    startLiveClock();
    refreshData();

    // Start on the trolley that needs the operator most
    const first = getFilteredTokens()[0];
    if (first) selectToken(first.tokenId);
    else renderTokenPanels(null, true);

    store.onChange(onExternalChange);
  }

  function cacheDom() {
    const ids = {
      liveClock: "gt-live-clock",
      samplesList: "gt-samples-list",
      queueCount: "gt-queue-count",
      statExpected: "gt-stat-expected",
      statInYard: "gt-stat-inyard",
      statReady: "gt-stat-ready",
      statWeighed: "gt-stat-weighed",
      searchInput: "gt-search-input",
      farmerName: "gt-farmer-name",
      farmerMeta: "gt-farmer-meta",
      cropTag: "gt-crop-tag",
      tokenTag: "gt-token-tag",
      vehicleTag: "gt-vehicle-tag",
      timeTag: "gt-time-tag",
      btnViewSlip: "btn-view-slip",
      stagePill: "gt-stage-pill",
      tokenInput: "gt-token-input",
      btnLoadToken: "btn-load-token",
      btnSimulateScan: "btn-simulate-scan",
      vehicleInput: "gt-vehicle-input",
      laneSelect: "gt-lane-select",
      laneNote: "gt-lane-note",
      checkinNote: "gt-checkin-note",
      btnCheckIn: "btn-check-in",
      weighStatus: "gt-weigh-status",
      btnReadGross: "btn-read-gross",
      btnReadTare: "btn-read-tare",
      grossInput: "gt-gross-input",
      tareInput: "gt-tare-input",
      calcGross: "gt-calc-gross",
      calcTare: "gt-calc-tare",
      calcNet: "gt-calc-net",
      calcPayout: "gt-calc-payout",
      weighNotice: "gt-weigh-notice",
      btnComplete: "btn-complete-weighment",
      slipModal: "gt-slip-modal",
      slipClose: "gt-modal-close-btn",
      slipPrint: "gt-print-slip",
      slipArea: "certificate-print-area"
    };
    Object.keys(ids).forEach((k) => { el[k] = document.getElementById(ids[k]); });
    el.filterChips = document.querySelectorAll(".op-filter-chip");
  }

  // ---------------------------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------------------------

  function esc(s) {
    return String(s === undefined || s === null ? "" : s).replace(/[&<>"']/g, (c) => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));
  }

  function fmtQtl(n) {
    return `${Number(n).toFixed(2)} Qtl`;
  }

  function fmtInr(n) {
    return `₹${Math.round(n).toLocaleString("en-IN")}`;
  }

  function stageOf(t) {
    if (t.status === "BOOKED") return "EXPECTED";
    if (t.status === "ARRIVED") return "LAB";
    if (t.status === "QUALITY_INSPECTED") return t.qcOutcome === "REJECTED" ? "REJECTED" : "READY";
    return "WEIGHED";
  }

  const STAGE_ORDER = { READY: 0, LAB: 1, EXPECTED: 2, REJECTED: 3, WEIGHED: 4 };

  function currentToken() {
    return currentId ? store.getToken(currentId) : null;
  }

  // ---------------------------------------------------------------------------------------------
  // Data + queue rendering
  // ---------------------------------------------------------------------------------------------

  function refreshData() {
    // Simulated trolleys (Module 4 surge demo) are admin-only and never appear at the gate desk
    tokens = store.getTokens().filter((t) => t.hubId === HUB && !t.simulated);
    renderQueue();
    updateStats();
  }

  function getFilteredTokens() {
    return tokens.filter((t) => {
      const matchSearch = !searchTerm ||
        t.tokenId.toLowerCase().includes(searchTerm) ||
        t.farmerName.toLowerCase().includes(searchTerm) ||
        t.cropName.toLowerCase().includes(searchTerm) ||
        t.vehicleNo.toLowerCase().includes(searchTerm);
      if (!matchSearch) return false;

      const stage = stageOf(t);
      if (activeFilter === "ALL") return true;
      if (activeFilter === "EXPECTED") return stage === "EXPECTED";
      if (activeFilter === "INYARD") return t.inYard;
      if (activeFilter === "READY") return stage === "READY";
      if (activeFilter === "WEIGHED") return stage === "WEIGHED";
      return true;
    }).sort((a, b) => {
      const d = STAGE_ORDER[stageOf(a)] - STAGE_ORDER[stageOf(b)];
      if (d !== 0) return d;
      const ta = a.statusTimeline.gateInAt || Infinity;
      const tb = b.statusTimeline.gateInAt || Infinity;
      return ta !== tb ? ta - tb : a.tokenId.localeCompare(b.tokenId);
    });
  }

  function stageBadge(t) {
    const stage = stageOf(t);
    if (stage === "EXPECTED") return `<span class="op-badge op-badge-pending">🗓 Expected</span>`;
    if (stage === "LAB") return `<span class="op-badge op-badge-deduction">⏳ Awaiting Lab</span>`;
    if (stage === "READY") return `<span class="op-badge op-badge-pass">⚖️ Ready to Weigh</span>`;
    if (stage === "REJECTED") return `<span class="op-badge op-badge-reject">⛔ Rejected</span>`;
    return `<span class="op-badge op-badge-pass">✓ Weighed ${t.weighmentReport.netWeightQtl.toFixed(2)} Qtl</span>`;
  }

  function renderQueue() {
    if (!el.samplesList) return;

    const filtered = getFilteredTokens();
    if (el.queueCount) el.queueCount.textContent = `${filtered.length} Trolleys`;

    if (filtered.length === 0) {
      el.samplesList.innerHTML = `
        <div style="text-align: center; padding: 2rem 1rem; color: #64748b; font-size: 0.85rem;">
          <span class="material-symbols-outlined" style="font-size: 2.2rem; color: #cbd5e1; display: block; margin-bottom: 0.5rem;">inbox</span>
          No trolleys matching selected filter.
        </div>`;
      return;
    }

    el.samplesList.innerHTML = filtered.map((t) => {
      const footerLeft = t.status === "BOOKED"
        ? `🗓 ${esc(t.slotTime)}`
        : `🕒 Arrived: ${store.fmtTime(t.statusTimeline.gateInAt)}`;
      return `
        <div class="op-queue-card ${t.tokenId === currentId ? "active" : ""}" data-token="${esc(t.tokenId)}">
          <div class="op-card-top">
            <div class="op-card-token">${esc(t.tokenId)}</div>
            ${stageBadge(t)}
          </div>
          <div class="op-card-farmer">${esc(t.farmerName)}</div>
          <div class="op-card-details">
            <span>🌾 <strong>${esc(t.cropName)}</strong></span> •
            <span>⚖️ <strong>${t.estimatedQty} Qtl</strong></span> •
            <span>🚛 <strong>${esc(t.vehicleNo || "—")}</strong></span>
          </div>
          <div class="op-card-footer">
            <span>${footerLeft}</span>
            <span style="color: var(--color-primary-dark); font-weight: 600;">${esc(t.lane || "Lane on check-in")}</span>
          </div>
        </div>`;
    }).join("");

    el.samplesList.querySelectorAll(".op-queue-card").forEach((card) => {
      card.addEventListener("click", () => selectToken(card.dataset.token));
    });
  }

  function updateStats() {
    let expected = 0, inYard = 0, ready = 0, weighed = 0;
    tokens.forEach((t) => {
      const stage = stageOf(t);
      if (stage === "EXPECTED") expected++;
      if (t.inYard) inYard++;
      if (stage === "READY") ready++;
      if (t.weighedToday) weighed++;
    });
    el.statExpected.textContent = expected;
    el.statInYard.textContent = inYard;
    el.statReady.textContent = ready;
    el.statWeighed.textContent = weighed;
  }

  // ---------------------------------------------------------------------------------------------
  // Selected token panels
  // ---------------------------------------------------------------------------------------------

  function selectToken(tokenId) {
    currentId = tokenId;
    renderQueue();
    renderTokenPanels(currentToken(), true);
  }

  function setNote(text, kind) {
    el.checkinNote.textContent = text;
    const palette = {
      ok: ["#f0fdf4", "var(--color-primary-border)", "var(--color-primary-dark)"],
      warn: ["var(--status-warning-bg)", "#fde68a", "#92400e"],
      danger: ["var(--status-danger-bg)", "#fca5a5", "#991b1b"]
    }[kind || "ok"];
    el.checkinNote.style.background = palette[0];
    el.checkinNote.style.borderColor = palette[1];
    el.checkinNote.style.color = palette[2];
  }

  function setPill(node, cls, text) {
    node.className = `gauge-pill ${cls}`;
    node.textContent = text;
  }

  // Lane dropdown: only lanes the Mandi Secretary has left open (Module 4 can close them)
  function populateLanes(t, keepValue) {
    const open = store.countersFor(HUB).filter((c) => c.type === "weigh" && c.open).map((c) => c.name);
    const assigned = t && t.status !== "BOOKED" ? t.lane : null;
    const previous = keepValue ? el.laneSelect.value : null;

    const names = open.slice();
    if (assigned && names.indexOf(assigned) === -1) names.push(assigned);

    if (names.length === 0) {
      el.laneSelect.innerHTML = `<option value="">No open lane</option>`;
      el.laneNote.textContent = "⚠️ All weighbridge lanes are closed. Ask the Mandi Secretary to open one.";
      return;
    }

    const auto = store.pickLane(HUB);
    const selected = assigned || (previous && open.indexOf(previous) !== -1 ? previous : auto);
    el.laneSelect.innerHTML = names.map((n) => (
      `<option value="${esc(n)}" ${n === selected ? "selected" : ""}>${esc(n)}${open.indexOf(n) === -1 ? " (closed)" : ""}</option>`
    )).join("");
    el.laneNote.textContent = assigned
      ? "Lane assigned at check-in."
      : `Auto-assigned to the least-loaded open lane (${auto || "—"}). You can override.`;
  }

  function renderTokenPanels(t, reset) {
    if (!t) {
      el.farmerName.textContent = "Select or scan a token";
      el.farmerMeta.textContent = "Choose a trolley from the queue, or enter the farmer's token number below.";
      el.cropTag.textContent = "🌾 —";
      el.tokenTag.textContent = "TK-—";
      el.vehicleTag.textContent = "—";
      el.timeTag.textContent = "—";
      el.btnViewSlip.disabled = true;
      setPill(el.stagePill, "status-pill-warning", "No token selected");
      populateLanes(null, false);
      el.btnCheckIn.disabled = true;
      el.vehicleInput.disabled = true;
      el.laneSelect.disabled = true;
      renderWeigh(null, reset);
      return;
    }

    // Banner
    el.farmerName.textContent = t.farmerName;
    el.farmerMeta.textContent = `ID: ${t.farmerId} • Mobile: ${t.farmerMobile} • ${t.village} • ${t.hubName}`;
    el.cropTag.textContent = `🌾 ${t.cropName}`;
    el.tokenTag.textContent = t.tokenId;
    el.vehicleTag.textContent = t.vehicleNo || "—";
    el.timeTag.textContent = t.status === "BOOKED" ? `Slot: ${t.slotTime}` : `Arrived: ${store.fmtTime(t.statusTimeline.gateInAt)}`;
    el.btnViewSlip.disabled = t.status !== "WEIGHMENT_COMPLETED";
    if (reset) el.tokenInput.value = t.tokenId;

    // Step 1: check-in
    const stage = stageOf(t);
    if (stage === "EXPECTED") setPill(el.stagePill, "status-pill-warning", "🗓 Expected • Not yet checked in");
    else if (stage === "LAB") setPill(el.stagePill, "status-pill-warning", "⏳ In yard • Awaiting quality test");
    else if (stage === "READY") setPill(el.stagePill, "status-pill-optimal", "✓ Quality passed • Ready to weigh");
    else if (stage === "REJECTED") setPill(el.stagePill, "status-pill-danger", "⛔ Quality rejected");
    else setPill(el.stagePill, "status-pill-optimal", "✓ Weighed");

    const canCheckIn = t.status === "BOOKED";
    el.vehicleInput.disabled = !canCheckIn;
    el.laneSelect.disabled = !canCheckIn;
    if (reset) el.vehicleInput.value = t.vehicleNo || "";
    populateLanes(t, !reset);

    if (canCheckIn) {
      const mismatch = t.hubId !== HUB;
      el.btnCheckIn.disabled = false;
      if (mismatch) {
        setNote(`⚠️ This token was booked for ${t.hubName}, not Karnal Central Hub. You can still check it in here.`, "warn");
      } else {
        setNote(`📋 Booked slot: ${t.slotTime} • ${t.cropName} • ${t.estimatedQty} Qtl estimated. Confirm the vehicle number and check in.`, "ok");
      }
    } else {
      el.btnCheckIn.disabled = true;
      setNote(`✅ Checked in at ${store.fmtTime(t.statusTimeline.gateInAt)} • ${t.lane || "Lane not recorded"} • Vehicle ${t.vehicleNo || "—"}.`, "ok");
    }

    renderWeigh(t, reset);
  }

  // ---------------------------------------------------------------------------------------------
  // Step 2: weighbridge
  // ---------------------------------------------------------------------------------------------

  function readNumber(input) {
    const v = parseFloat(input.value);
    return isNaN(v) ? null : v;
  }

  function renderWeigh(t, reset) {
    if (!t) {
      setPill(el.weighStatus, "status-pill-warning", "No token selected");
      [el.grossInput, el.tareInput, el.btnReadGross, el.btnReadTare, el.btnComplete].forEach((n) => { n.disabled = true; });
      if (reset) { el.grossInput.value = ""; el.tareInput.value = ""; }
      recompute();
      return;
    }

    const ready = store.weighReadiness(t);
    const weighed = t.status === "WEIGHMENT_COMPLETED";

    if (reset) {
      const src = weighed
        ? { gross: t.weighmentReport.grossWeightQtl, tare: t.weighmentReport.tareWeightQtl }
        : (t.weighing || {});
      el.grossInput.value = src.gross !== undefined && src.gross !== null ? Number(src.gross).toFixed(2) : "";
      el.tareInput.value = src.tare !== undefined && src.tare !== null ? Number(src.tare).toFixed(2) : "";
    }

    if (weighed) {
      setPill(el.weighStatus, "status-pill-optimal", `✓ Weighment completed • Scale ${t.weighmentReport.scaleId}`);
    } else if (ready.ok) {
      const grade = t.qualityReport && t.qualityReport.grade ? t.qualityReport.grade : "Passed";
      setPill(el.weighStatus, "status-pill-optimal", `✓ Cleared for weighment • ${grade}`);
    } else if (t.qcOutcome === "REJECTED") {
      setPill(el.weighStatus, "status-pill-danger", "⛔ Blocked • Quality rejected");
    } else {
      setPill(el.weighStatus, "status-pill-warning", t.status === "BOOKED" ? "Check-in required first" : "⏳ Blocked • Awaiting quality test");
    }

    const open = ready.ok;
    el.grossInput.disabled = !open;
    el.btnReadGross.disabled = !open;
    recompute(t, ready);
  }

  function recompute(t, ready) {
    const tk = t || currentToken();
    const rd = ready || store.weighReadiness(tk);
    const gross = readNumber(el.grossInput);
    const tare = readNumber(el.tareInput);
    const weighed = !!tk && tk.status === "WEIGHMENT_COMPLETED";
    const open = !!tk && rd.ok;

    // Tare is only captured after the trolley is unloaded, i.e. once a gross weight exists
    el.tareInput.disabled = !(open && gross !== null && gross > 0);
    el.btnReadTare.disabled = el.tareInput.disabled;

    el.calcGross.textContent = gross !== null && gross > 0 ? fmtQtl(gross) : "—";
    el.calcTare.textContent = tare !== null && tare >= 0 && el.tareInput.value !== "" ? fmtQtl(tare) : "—";

    let net = null;
    if (gross !== null && tare !== null && el.tareInput.value !== "" && gross > tare) net = store.round2(gross - tare);
    el.calcNet.textContent = net !== null ? fmtQtl(net) : "—";

    const rate = tk ? tk.financials.mspPerQtl : 0;
    el.calcPayout.textContent = net !== null && tk ? fmtInr(net * rate) : "—";

    let notice = "⚖️ Weighing opens once the trolley has passed the Moisture Lab.";
    if (weighed) {
      const v = ((tk.weighmentReport.netWeightQtl - tk.estimatedQty) / tk.estimatedQty) * 100;
      notice = `✅ Net ${fmtQtl(tk.weighmentReport.netWeightQtl)} recorded on scale ${tk.weighmentReport.scaleId} (${v >= 0 ? "+" : ""}${v.toFixed(1)}% vs booked ${tk.estimatedQty} Qtl). Ready for J-Form issue.`;
    } else if (tk && !rd.ok) {
      notice = `⛔ ${rd.reason}.`;
    } else if (gross !== null && tare !== null && el.tareInput.value !== "" && gross <= tare) {
      notice = "⚠️ Gross weight must be greater than tare weight. Re-read the scale.";
    } else if (net !== null && tk) {
      const v = ((net - tk.estimatedQty) / tk.estimatedQty) * 100;
      notice = Math.abs(v) <= 10
        ? `✅ Net ${fmtQtl(net)} is within 10% of the booked ${tk.estimatedQty} Qtl (${v >= 0 ? "+" : ""}${v.toFixed(1)}%).`
        : `⚠️ Net ${fmtQtl(net)} differs from the booked ${tk.estimatedQty} Qtl by ${v >= 0 ? "+" : ""}${v.toFixed(1)}%. Verify before completing.`;
    } else if (open && (gross === null || gross <= 0)) {
      notice = "⚖️ Drive the loaded trolley onto the scale and capture the gross weight.";
    } else if (open) {
      notice = "⚖️ Unload the trolley, drive back onto the scale and capture the tare weight.";
    }
    el.weighNotice.textContent = notice;

    el.btnComplete.disabled = !(open && net !== null);
  }

  function persistPartial(kind, value) {
    if (!currentId || value === null || value <= 0) return;
    const t = currentToken();
    if (!t || !store.weighReadiness(t).ok) return;
    const patch = {};
    patch[kind] = store.round2(value);
    store.saveWeighing(currentId, patch);
  }

  function simulateRead(kind) {
    const t = currentToken();
    if (!t || !store.weighReadiness(t).ok) return;

    const btn = kind === "gross" ? el.btnReadGross : el.btnReadTare;
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="material-symbols-outlined spin-animation" style="font-size: 1.05rem;">sync</span><span>Reading...</span>`;
    playChime(600, 0.1);

    setTimeout(() => {
      let value;
      if (kind === "gross") {
        // Loaded trolley: booked quantity + trolley tare, with normal scale noise
        value = t.estimatedQty + 8.2 + (Math.random() - 0.5) * 0.08 * t.estimatedQty;
        el.grossInput.value = value.toFixed(2);
      } else {
        // Empty tractor-trolley
        value = 7.8 + Math.random() * 1.4;
        el.tareInput.value = value.toFixed(2);
      }
      btn.innerHTML = original;
      playChime(880, 0.2);
      persistPartial(kind, parseFloat(value.toFixed(2)));
      recompute();
    }, 900);
  }

  function completeWeighment() {
    const t = currentToken();
    if (!t) return;
    const res = store.recordWeighment(t.tokenId, { gross: readNumber(el.grossInput), tare: readNumber(el.tareInput) });
    if (!res.ok) {
      el.weighNotice.textContent = `⛔ ${res.error}.`;
      return;
    }
    playChime(880, 0.25);
    refreshData();
    selectToken(t.tokenId);
    announce(`Token ${t.tokenId}, ${t.farmerName}. Weighment complete. Net ${res.weighment.net.toFixed(2)} quintals. Please collect the weighment slip.`);
    openSlipModal(currentToken());
  }

  // ---------------------------------------------------------------------------------------------
  // Check-in
  // ---------------------------------------------------------------------------------------------

  function loadTokenFromInput() {
    const id = el.tokenInput.value.trim().toUpperCase();
    if (!id) {
      setNote("Enter a token number first, e.g. TK-1053.", "warn");
      return;
    }
    const t = store.getToken(id);
    if (!t) {
      setNote(`❌ Token ${id} was not found in the procurement bookings.`, "danger");
      return;
    }
    selectToken(t.tokenId);
  }

  function simulateScan() {
    const waiting = tokens.filter((t) => t.status === "BOOKED");
    // Prefer bookings made on the farmer portal in this browser, then the seeded expected arrivals
    const booked = {};
    store.readBatches().forEach((b) => { booked[b.token] = true; });
    const next = waiting.find((t) => booked[t.tokenId]) || waiting[0];
    if (!next) {
      setNote("📭 No booked trolleys are waiting to arrive.", "warn");
      return;
    }

    const btn = el.btnSimulateScan;
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="material-symbols-outlined spin-animation" style="font-size: 1.05rem;">sync</span><span>Scanning...</span>`;
    playChime(600, 0.1);
    setTimeout(() => {
      btn.disabled = false;
      btn.innerHTML = original;
      playChime(880, 0.2);
      selectToken(next.tokenId);
    }, 700);
  }

  function checkIn() {
    const t = currentToken();
    if (!t) return;
    const res = store.checkIn(t.tokenId, { vehicleNo: el.vehicleInput.value, lane: el.laneSelect.value, hubId: HUB });
    if (!res.ok) {
      setNote(`⛔ ${res.error}.`, "danger");
      return;
    }
    playChime(880, 0.2);
    refreshData();
    selectToken(t.tokenId);
    announce(`Token ${t.tokenId}, ${t.farmerName}. Checked in. Proceed to ${res.entry.lane}, then to the Moisture Lab.`);
  }

  // ---------------------------------------------------------------------------------------------
  // Weighment slip
  // ---------------------------------------------------------------------------------------------

  function openSlipModal(t) {
    if (!t || t.status !== "WEIGHMENT_COMPLETED" || !el.slipModal) return;
    const w = t.weighmentReport;
    const variance = ((w.netWeightQtl - t.estimatedQty) / t.estimatedQty) * 100;
    const payout = w.netWeightQtl * t.financials.mspPerQtl;
    const weighedAt = new Date(t.statusTimeline.weighedAt).toLocaleString("en-IN");

    el.slipArea.innerHTML = `
      <div class="cert-box">
        <div class="cert-header">
          <div style="font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b;">AgriQueue • Smart Procurement Platform (SIH26032)</div>
          <h2 style="font-size: 1.35rem; color: var(--color-primary-dark); margin: 0.35rem 0;">ELECTRONIC WEIGHMENT SLIP</h2>
          <div style="font-size: 0.82rem; color: #334155;">Central Procurement Hub: <strong>${esc(t.hubName)}</strong></div>
        </div>

        <div class="cert-meta-grid">
          <div><span class="cert-label">Slip ID:</span><strong class="cert-val" style="font-family: var(--font-mono);">WS-2026-${esc(t.tokenId.replace("TK-", ""))}</strong></div>
          <div><span class="cert-label">Date & Time:</span><strong class="cert-val">${esc(weighedAt)}</strong></div>
          <div><span class="cert-label">Token / Lot No:</span><strong class="cert-val" style="font-family: var(--font-mono); color: var(--color-primary-dark);">${esc(t.tokenId)}</strong></div>
          <div><span class="cert-label">Farmer Name & ID:</span><strong class="cert-val">${esc(t.farmerName)} (${esc(t.farmerId)})</strong></div>
          <div><span class="cert-label">Crop & Variety:</span><strong class="cert-val">${esc(t.cropName)}</strong></div>
          <div><span class="cert-label">Vehicle / Trolley:</span><strong class="cert-val">${esc(t.vehicleNo || "—")}</strong></div>
          <div><span class="cert-label">Lane & Scale:</span><strong class="cert-val">${esc(t.lane || "—")} • ${esc(w.scaleId)}</strong></div>
          <div><span class="cert-label">Quality Grade:</span><strong class="cert-val">${esc(t.qualityReport ? t.qualityReport.grade : "—")}</strong></div>
        </div>

        <table class="cert-table">
          <thead>
            <tr><th>Weighing</th><th>Weight (Quintals)</th><th>Note</th></tr>
          </thead>
          <tbody>
            <tr><td><strong>Gross Weight</strong></td><td style="font-family: var(--font-mono);">${w.grossWeightQtl.toFixed(2)}</td><td>Loaded trolley on arrival</td></tr>
            <tr><td><strong>Tare Weight</strong></td><td style="font-family: var(--font-mono);">${w.tareWeightQtl.toFixed(2)}</td><td>Empty trolley after unloading</td></tr>
            <tr><td><strong>Net Crop Quantity</strong></td><td><strong style="font-family: var(--font-mono); font-size: 1rem;">${w.netWeightQtl.toFixed(2)}</strong></td><td>Gross − Tare</td></tr>
            <tr><td><strong>Booked Estimate</strong></td><td style="font-family: var(--font-mono);">${Number(t.estimatedQty).toFixed(2)}</td><td>${variance >= 0 ? "+" : ""}${variance.toFixed(1)}% variance</td></tr>
          </tbody>
        </table>

        <div class="cert-decision-box cert-box-pass">
          <div style="font-size: 1.1rem; font-weight: 800; color: #137547;">✓ WEIGHMENT COMPLETED • NET ${w.netWeightQtl.toFixed(2)} QUINTALS</div>
          <div style="font-size: 0.82rem; color: #475569; margin-top: 0.35rem;">
            Certified quantity for J-Form issue. Estimated MSP payout <strong>${fmtInr(payout)}</strong> at ${fmtInr(t.financials.mspPerQtl)}/Qtl, subject to Mandi Officer review.
          </div>
        </div>

        <div class="cert-footer">
          <div style="text-align: left;">
            <div style="font-size: 0.75rem; color: #64748b;">Generated by AgriQueue Gate & Weighbridge Terminal</div>
            <div style="font-size: 0.72rem; color: #94a3b8;">Scale ${esc(w.scaleId)} • Operator ${esc(store.OPERATOR_ID)}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.78rem; font-weight: 700; color: var(--color-primary-dark);">Gate & Weighbridge Operator</div>
            <div style="font-size: 0.72rem; color: #64748b;">Karnal Central Hub • ${esc(store.OPERATOR_ID)}</div>
          </div>
        </div>
      </div>
    `;

    el.slipModal.style.display = "flex";
  }

  function closeSlipModal() {
    if (el.slipModal) el.slipModal.style.display = "none";
  }

  // ---------------------------------------------------------------------------------------------
  // Events, clock, audio
  // ---------------------------------------------------------------------------------------------

  function attachEvents() {
    el.searchInput.addEventListener("input", (e) => {
      searchTerm = e.target.value.toLowerCase().trim();
      renderQueue();
    });

    el.filterChips.forEach((chip) => {
      chip.addEventListener("click", () => {
        el.filterChips.forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        activeFilter = chip.dataset.filter || "ALL";
        renderQueue();
      });
    });

    el.btnLoadToken.addEventListener("click", loadTokenFromInput);
    el.tokenInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); loadTokenFromInput(); }
    });
    el.btnSimulateScan.addEventListener("click", simulateScan);
    el.btnCheckIn.addEventListener("click", checkIn);

    el.btnReadGross.addEventListener("click", () => simulateRead("gross"));
    el.btnReadTare.addEventListener("click", () => simulateRead("tare"));
    el.grossInput.addEventListener("input", () => recompute());
    el.tareInput.addEventListener("input", () => recompute());
    el.grossInput.addEventListener("change", () => persistPartial("gross", readNumber(el.grossInput)));
    el.tareInput.addEventListener("change", () => persistPartial("tare", readNumber(el.tareInput)));
    el.btnComplete.addEventListener("click", completeWeighment);

    el.btnViewSlip.addEventListener("click", () => openSlipModal(currentToken()));
    el.slipClose.addEventListener("click", closeSlipModal);
    el.slipModal.addEventListener("click", (e) => {
      if (e.target === el.slipModal) closeSlipModal();
    });
    el.slipPrint.addEventListener("click", () => window.print());
  }

  // Another tab (QC lab, admin, farmer portal) changed shared data
  function onExternalChange() {
    const before = currentToken();
    refreshData();
    const after = currentToken();
    if (after && before && before.status !== after.status) {
      renderTokenPanels(after, true);
    } else {
      renderTokenPanels(after, false);
    }
  }

  function startLiveClock() {
    function tick() {
      const now = new Date();
      const options = { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true };
      if (el.liveClock) el.liveClock.textContent = now.toLocaleString("en-IN", options);
    }
    tick();
    setInterval(tick, 1000);
  }

  function announce(text) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
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
