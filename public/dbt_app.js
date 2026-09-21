/**
 * AgriQueue: FCI & Government DBT Settlement Portal (SIH26032)
 * Module 5: batch J-Form approval, held payments, a simulated PFMS banking engine
 * (Dispatched -> In Transit -> Settled with UTR numbers), audit log and CSV / PDF export.
 * Works on AgriQueueStore (ops_store.js): certified procurements come from the Gate (Module 2),
 * the quality result from the Quality Lab (Module 3), and settlement updates the farmer's record.
 */

(function () {
  "use strict";

  const store = window.AgriQueueStore;
  const T = store.DBT_TIMING;

  const el = {};
  let tokens = [];
  let currentId = null;
  let activeFilter = "ALL";
  let searchTerm = "";
  const selected = new Set();

  function init() {
    cacheDom();
    el.officer.textContent = `${store.DBT_OFFICER.role} • ${store.DBT_OFFICER.id}`;
    el.timingNote.textContent = `Simulated PFMS: In Transit after ${T.inTransitAfterMs / 1000} s, Settled after ${T.settledAfterMs / 1000} s. Use "Fast-forward bank" to skip the wait in a demo.`;
    attachEvents();
    refreshData();
    const first = filtered()[0];
    if (first) currentId = first.tokenId;
    render();
    updateClock();
    setInterval(tick, 1000);
    store.onChange(() => { refreshData(); render(); });
  }

  function cacheDom() {
    const ids = {
      officer: "db-officer", liveClock: "db-live-clock",
      kpiAwaiting: "db-kpi-awaiting", kpiAwaitingSub: "db-kpi-awaiting-sub",
      kpiIssued: "db-kpi-issued", kpiIssuedSub: "db-kpi-issued-sub",
      kpiTransit: "db-kpi-transit", kpiTransitSub: "db-kpi-transit-sub",
      kpiSettled: "db-kpi-settled", kpiSettledSub: "db-kpi-settled-sub",
      list: "db-list", queueCount: "db-queue-count", searchInput: "db-search-input",
      selectAll: "db-select-all", selCount: "db-sel-count", clearSel: "db-clear-sel",
      batchCount: "db-batch-count", batchQty: "db-batch-qty", batchAmount: "db-batch-amount",
      batchActionable: "db-batch-actionable", batchNotice: "db-batch-notice",
      btnHold: "btn-hold", btnRelease: "btn-release", btnApprove: "btn-approve", btnDisburse: "btn-disburse",
      farmerName: "db-farmer-name", farmerMeta: "db-farmer-meta", tokenTag: "db-token-tag", cropTag: "db-crop-tag",
      vehicleTag: "db-vehicle-tag", hubTag: "db-hub-tag", stagePill: "db-stage-pill",
      checklist: "db-checklist", tracker: "db-tracker", btnViewJForm: "btn-view-jform",
      txBody: "db-tx-body", btnFastForward: "btn-fast-forward", timingNote: "db-timing-note",
      auditLog: "db-audit-log", auditCount: "db-audit-count",
      exportScope: "db-export-scope", btnExportCsv: "btn-export-csv", btnExportPdf: "btn-export-pdf",
      docModal: "db-doc-modal", docTitle: "db-doc-title", docClose: "db-doc-close", docPrint: "db-doc-print", docArea: "certificate-print-area"
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

  const inr = (n) => `₹${Math.round(n).toLocaleString("en-IN")}`;
  const qtl = (n) => `${Number(n).toFixed(2)} Qtl`;
  const dt = (ts) => (ts ? new Date(ts).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }) : "—");
  const stamp = (ts) => {
    if (!ts) return "";
    const d = new Date(ts);
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  };

  const amountOf = (t) => (t.jForm ? t.jForm.amount : t.financials.totalAmount);

  // AWAITING (certified, no J-Form) | HELD | ISSUED (J-Form, not dispatched) | TRANSIT (dispatched / in transit) | SETTLED
  function stageOf(t) {
    if (t.status === "DBT_DISBURSED") return "SETTLED";
    if (t.payment) return "TRANSIT";
    if (t.status === "J_FORM_ISSUED") return "ISSUED";
    if (t.hold) return "HELD";
    return "AWAITING";
  }

  function stageMeta(t) {
    const s = stageOf(t);
    if (s === "AWAITING") return { key: s, badge: "op-badge-pending", short: "⏳ Awaiting J-Form", pill: "status-pill-warning", long: "Awaiting J-Form approval" };
    if (s === "HELD") return { key: s, badge: "op-badge-reject", short: "⛔ On Hold", pill: "status-pill-danger", long: "On hold" };
    if (s === "ISSUED") return { key: s, badge: "op-badge-deduction", short: "📄 J-Form Issued", pill: "status-pill-warning", long: "J-Form issued • awaiting disbursal" };
    if (s === "TRANSIT") {
      const inTransit = t.payment.stage === "IN_TRANSIT";
      return { key: s, badge: "op-badge-pending", short: inTransit ? "🏦 In Transit" : "🏦 Dispatched", pill: "status-pill-warning", long: inTransit ? "Payment in transit" : "Payment dispatched" };
    }
    return { key: s, badge: "op-badge-pass", short: "✓ Settled", pill: "status-pill-optimal", long: "Settled • credited to the farmer" };
  }

  const RANK = { AWAITING: 0, HELD: 1, ISSUED: 2, TRANSIT: 3, SETTLED: 4 };

  function refreshData() {
    store.getDbtState();          // seeds the settlement ledger on the first visit
    store.advancePayments();
    tokens = store.getTokens()
      .filter((t) => t.weighmentReport && !t.simulated)
      .sort((a, b) => {
        const d = RANK[stageOf(a)] - RANK[stageOf(b)];
        if (d !== 0) return d;
        const early = RANK[stageOf(a)] <= 2;
        return early ? a.statusTimeline.weighedAt - b.statusTimeline.weighedAt : b.statusTimeline.weighedAt - a.statusTimeline.weighedAt;
      });
    Array.from(selected).forEach((id) => { if (!tokens.some((t) => t.tokenId === id)) selected.delete(id); });
  }

  function filtered() {
    return tokens.filter((t) => {
      const s = stageOf(t);
      if (activeFilter !== "ALL" && s !== activeFilter) return false;
      if (!searchTerm) return true;
      const hay = [t.tokenId, t.farmerName, t.cropName, t.payment && t.payment.utr, t.jForm && t.jForm.jFormId, t.hubName].join(" ").toLowerCase();
      return hay.includes(searchTerm);
    });
  }

  function selectedTokens() {
    return tokens.filter((t) => selected.has(t.tokenId));
  }

  function currentToken() {
    return tokens.find((t) => t.tokenId === currentId) || null;
  }

  // ---------------------------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------------------------

  function render() {
    renderKpis();
    renderList();
    renderBatch();
    renderDetail();
    renderConsole();
    renderAudit();
    el.exportScope.textContent = `${filtered().length} of ${tokens.length} procurements` + (activeFilter !== "ALL" || searchTerm ? " (filtered)" : "");
  }

  function renderKpis() {
    const sum = (key) => {
      const list = tokens.filter((t) => stageOf(t) === key);
      return { n: list.length, amt: list.reduce((a, t) => a + amountOf(t), 0) };
    };
    const aw = sum("AWAITING");
    const is = sum("ISSUED");
    const tr = sum("TRANSIT");
    const se = sum("SETTLED");
    el.kpiAwaiting.textContent = aw.n;
    el.kpiAwaitingSub.textContent = `Awaiting J-Form approval • ${inr(aw.amt)}`;
    el.kpiIssued.textContent = is.n;
    el.kpiIssuedSub.textContent = `J-Forms issued, to disburse • ${inr(is.amt)}`;
    el.kpiTransit.textContent = tr.n;
    el.kpiTransitSub.textContent = `Payments in transit • ${inr(tr.amt)}`;
    el.kpiSettled.textContent = se.n;
    el.kpiSettledSub.textContent = `Settled to farmers • ${inr(se.amt)}`;
  }

  function renderList() {
    const list = filtered();
    el.queueCount.textContent = `${list.length} of ${tokens.length}`;
    const scroll = el.list.scrollTop;

    if (list.length === 0) {
      el.list.innerHTML = `
        <div style="text-align: center; padding: 2rem 1rem; color: #64748b; font-size: 0.85rem;">
          <span class="material-symbols-outlined" style="font-size: 2.2rem; color: #cbd5e1; display: block; margin-bottom: 0.5rem;">inbox</span>
          No procurements match this filter.
        </div>`;
    } else {
      el.list.innerHTML = list.map((t) => {
        const m = stageMeta(t);
        const ref = t.payment ? `UTR ${t.payment.utr}` : (t.jForm ? t.jForm.jFormId : (t.hold ? esc(t.hold.reason) : "Certified " + new Date(t.statusTimeline.weighedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })));
        return `
          <div class="op-queue-card ${t.tokenId === currentId ? "active" : ""}" data-token="${esc(t.tokenId)}">
            <div class="op-card-top">
              <label class="db-sel"><input type="checkbox" data-sel="${esc(t.tokenId)}" ${selected.has(t.tokenId) ? "checked" : ""}><span class="op-card-token">${esc(t.tokenId)}</span></label>
              <span class="op-badge ${m.badge}">${m.short}</span>
            </div>
            <div class="op-card-farmer">${esc(t.farmerName)}</div>
            <div class="op-card-details">
              <span>🌾 <strong>${esc(t.cropName)}</strong></span> •
              <span>⚖️ <strong>${t.weighmentReport.netWeightQtl.toFixed(2)} Qtl</strong></span> •
              <span>💰 <strong>${inr(amountOf(t))}</strong></span>
            </div>
            <div class="op-card-footer">
              <span>🏛️ ${esc(t.hubName)}</span>
              <span style="color: var(--color-primary-dark); font-weight: 600;">${ref}</span>
            </div>
          </div>`;
      }).join("");
    }
    el.list.scrollTop = scroll;

    const shownIds = list.map((t) => t.tokenId);
    el.selectAll.checked = shownIds.length > 0 && shownIds.every((id) => selected.has(id));
    el.selCount.textContent = `${selected.size} selected`;
  }

  function setNotice(text, kind) {
    el.batchNotice.textContent = text;
    const palette = {
      ok: ["#f0fdf4", "var(--color-primary-border)", "var(--color-primary-dark)"],
      warn: ["var(--status-warning-bg)", "#fde68a", "#92400e"],
      danger: ["var(--status-danger-bg)", "#fca5a5", "#991b1b"]
    }[kind || "ok"];
    el.batchNotice.style.cssText = `font-size: 0.8rem; margin-bottom: 1.25rem; padding: 0.7rem 0.9rem; border-radius: var(--radius-md); border: 1px solid ${palette[1]}; background: ${palette[0]}; color: ${palette[2]};`;
  }

  function eligibleFor(kind) {
    const want = { approve: "AWAITING", hold: "AWAITING", release: "HELD", disburse: "ISSUED" }[kind];
    return selectedTokens().filter((t) => stageOf(t) === want);
  }

  function renderBatch() {
    const sel = selectedTokens();
    el.batchCount.textContent = sel.length;
    el.batchQty.textContent = `${sel.reduce((a, t) => a + t.weighmentReport.netWeightQtl, 0).toFixed(2)} Qtl`;
    el.batchAmount.textContent = inr(sel.reduce((a, t) => a + amountOf(t), 0));

    const nA = eligibleFor("approve").length;
    const nR = eligibleFor("release").length;
    const nD = eligibleFor("disburse").length;
    const parts = [];
    if (nA) parts.push(`${nA} to approve`);
    if (nD) parts.push(`${nD} to disburse`);
    if (nR) parts.push(`${nR} on hold`);
    el.batchActionable.textContent = parts.length ? parts.join(" • ") : "—";

    const label = (icon, text, n) => `<span class="material-symbols-outlined">${icon}</span><span>${text}${n ? ` (${n})` : ""}</span>`;
    el.btnHold.innerHTML = label("pause_circle", "Place on Hold", nA);
    el.btnRelease.innerHTML = label("play_circle", "Release Hold", nR);
    el.btnApprove.innerHTML = label("verified", "✓ Approve & Issue J-Forms", nA);
    el.btnDisburse.innerHTML = label("payments", "⚡ Disburse via PFMS", nD);
    el.btnHold.disabled = nA === 0;
    el.btnRelease.disabled = nR === 0;
    el.btnApprove.disabled = nA === 0;
    el.btnDisburse.disabled = nD === 0;
  }

  function checkRow(c) {
    const cls = c.ok ? "db-check-ok" : (c.blocking ? "db-check-fail" : "db-check-warn");
    const icon = c.ok ? "check_circle" : (c.blocking ? "cancel" : "warning");
    return `
      <div class="db-check ${cls}">
        <span class="material-symbols-outlined" style="font-size: 1.15rem;">${icon}</span>
        <div><div style="font-weight: 700;">${esc(c.label)}</div><div class="db-check-sub">${esc(c.detail)}</div></div>
      </div>`;
  }

  function trackerHtml(t) {
    const p = t.payment;
    const step = !p ? 0 : (p.stage === "DISPATCHED" ? 1 : (p.stage === "IN_TRANSIT" ? 2 : 3));
    const item = (n, label, when) => {
      const cls = n <= step ? "step-done" : (step >= 1 && n === step + 1 ? "step-active" : "");
      return `<div class="step-item ${cls}"><div class="step-circle">${n <= step ? "✓" : n}</div><div class="step-label">${label}<br><span style="font-weight: 600; color: var(--text-muted);">${when ? new Date(when).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }) : ""}</span></div></div>`;
    };

    const rate = t.financials.mspPerQtl;
    const base = t.jForm ? t.jForm.baseRate : store.CROPS[t.cropKey].msp;
    const summary = `
      <div class="op-calc-grid" style="margin-bottom: 0.85rem;">
        <div class="op-calc-item"><div class="lbl">Net Weight</div><div class="val" style="font-size: 1rem;">${qtl(t.weighmentReport.netWeightQtl)}</div></div>
        <div class="op-calc-item"><div class="lbl">MSP Rate</div><div class="val" style="font-size: 1rem;">${inr(base)}</div></div>
        <div class="op-calc-item"><div class="lbl">Moisture Cut</div><div class="val" style="font-size: 1rem;">${base - rate > 0 ? "−" + inr(base - rate) : "₹0"}</div></div>
        <div class="op-calc-item"><div class="lbl">Payable</div><div class="val" style="font-size: 1rem; color: var(--color-primary-dark);">${inr(amountOf(t))}</div></div>
      </div>`;

    let detail;
    if (!p) {
      const msg = t.status === "J_FORM_ISSUED"
        ? `J-Form ${esc(t.jForm.jFormId)} issued. Select it and click "Disburse via PFMS" to pay ${esc(t.farmerName)}.`
        : (t.hold ? `On hold: ${esc(t.hold.reason)}.` : "Approve the J-Form to make this payment eligible for disbursal.");
      detail = `<div style="font-size: 0.8rem; color: #475569; margin-top: 0.4rem;">${msg}</div>`;
    } else {
      const elapsed = store.now() - p.dispatchedAt;
      const pct = p.stage === "SETTLED" ? 100 : Math.max(0, Math.min(100, (elapsed / T.settledAfterMs) * 100));
      const left = Math.max(0, Math.ceil((T.settledAfterMs - elapsed) / 1000));
      detail = `
        <div class="db-bar-track" style="margin: 0.2rem 0 0.35rem;"><div class="db-bar-fill" id="db-progress-fill" style="width: ${pct}%;"></div></div>
        <div id="db-progress-text" style="font-size: 0.76rem; font-weight: 700; color: var(--text-muted); margin-bottom: 0.7rem;">${p.stage === "SETTLED" ? "✓ Settled" : `Settles in about ${left} s`}</div>
        <div class="op-calc-grid" style="grid-template-columns: repeat(2, 1fr); text-align: left;">
          <div class="op-calc-item"><div class="lbl">UTR Number</div><div class="val" style="font-size: 0.95rem;">${esc(p.utr)}</div></div>
          <div class="op-calc-item"><div class="lbl">Credited To</div><div class="val" style="font-size: 0.95rem;">${esc(p.bank)} • XXXX ${esc(p.last4)}</div></div>
          <div class="op-calc-item"><div class="lbl">PFMS Batch</div><div class="val" style="font-size: 0.95rem;">${esc(p.batchId)}</div></div>
          <div class="op-calc-item"><div class="lbl">Amount</div><div class="val" style="font-size: 0.95rem; color: var(--color-primary-dark);">${inr(p.amount)}</div></div>
        </div>`;
    }

    return `
      ${summary}
      <div class="queue-stepper" style="margin: 0.9rem 0 0.75rem;">
        ${item(1, "Dispatched", p && p.dispatchedAt)}
        ${item(2, "In Transit", p && (p.inTransitAt || (p.stage !== "DISPATCHED" ? p.dispatchedAt + T.inTransitAfterMs : null)))}
        ${item(3, "Settled", p && (p.settledAt || (p.stage === "SETTLED" ? p.dispatchedAt + T.settledAfterMs : null)))}
      </div>
      ${detail}`;
  }

  function renderDetail() {
    const t = currentToken();
    el.btnViewJForm.disabled = !(t && t.jForm);
    if (!t) {
      el.farmerName.textContent = "Select a procurement";
      el.farmerMeta.textContent = "Choose a certified procurement from the list to verify it and track its payment.";
      el.tokenTag.textContent = "TK-—";
      el.cropTag.textContent = "🌾 —";
      el.vehicleTag.textContent = "—";
      el.hubTag.textContent = "—";
      el.stagePill.className = "gauge-pill status-pill-warning";
      el.stagePill.textContent = "—";
      el.checklist.innerHTML = "";
      el.tracker.innerHTML = "";
      return;
    }
    const m = stageMeta(t);
    el.farmerName.textContent = t.farmerName;
    el.farmerMeta.textContent = `ID: ${t.farmerId} • Mobile: ${t.farmerMobile} • ${t.village}`;
    el.tokenTag.textContent = t.tokenId;
    el.cropTag.textContent = `🌾 ${t.cropName}`;
    el.vehicleTag.textContent = t.vehicleNo || "—";
    el.hubTag.textContent = t.hubName;
    el.stagePill.className = `gauge-pill ${m.pill}`;
    el.stagePill.style.marginTop = "0";
    el.stagePill.textContent = m.long;
    el.checklist.innerHTML = store.verifyForJForm(t).map(checkRow).join("");
    el.tracker.innerHTML = trackerHtml(t);
  }

  function renderConsole() {
    const pays = tokens.filter((t) => t.payment).sort((a, b) => b.payment.dispatchedAt - a.payment.dispatchedAt).slice(0, 8);
    if (!pays.length) {
      el.txBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #64748b;">No PFMS transactions yet. Approve J-Forms, then disburse.</td></tr>`;
      return;
    }
    el.txBody.innerHTML = pays.map((t) => {
      const m = stageMeta(t);
      return `
        <tr class="db-tx-row" data-token="${esc(t.tokenId)}">
          <td style="font-family: var(--font-mono); font-weight: 700;">${esc(t.payment.utr)}</td>
          <td>${esc(t.farmerName)}<div style="font-size: 0.72rem; color: #64748b;">${esc(t.tokenId)}</div></td>
          <td style="font-family: var(--font-mono);">${esc(t.payment.bank)} • ${esc(t.payment.last4)}</td>
          <td style="font-family: var(--font-mono); font-weight: 700;">${inr(t.payment.amount)}</td>
          <td><span class="op-badge ${m.badge}">${m.short}</span></td>
        </tr>`;
    }).join("");
  }

  const AUDIT_BADGE = {
    JFORM_APPROVED: ["op-badge-pass", "J-Form"], HOLD: ["op-badge-reject", "Hold"], RELEASED: ["op-badge-pending", "Released"],
    DBT_DISPATCHED: ["op-badge-deduction", "Dispatched"], IN_TRANSIT: ["op-badge-pending", "In Transit"], SETTLED: ["op-badge-pass", "Settled"],
    FAST_FORWARD: ["op-badge-pending", "Demo"], EXPORT: ["op-badge-pending", "Export"]
  };

  function renderAudit() {
    const dbt = store.readDbtState();
    const rows = dbt ? dbt.audit : [];
    el.auditCount.textContent = `${rows.length} entr${rows.length === 1 ? "y" : "ies"}`;
    if (!rows.length) {
      el.auditLog.innerHTML = `<div style="text-align: center; padding: 1.5rem 1rem; color: #64748b; font-size: 0.85rem;">No activity yet.</div>`;
      return;
    }
    el.auditLog.innerHTML = rows.slice(0, 10).map((a) => {
      const b = AUDIT_BADGE[a.kind] || ["op-badge-pending", a.kind];
      return `
        <div class="db-log-row">
          <span class="op-badge ${b[0]}">${b[1]}</span>
          <span>${esc(a.text)}<div style="font-size: 0.7rem; color: #94a3b8;">${esc(a.actor)}</div></span>
          <span class="db-log-time">${dt(a.ts)}</span>
        </div>`;
    }).join("");
  }

  // Cheap per-second refresh of the running payment's progress bar (full render only on a stage change)
  function updateProgress() {
    const t = currentToken();
    if (!t || !t.payment || t.payment.stage === "SETTLED") return;
    const elapsed = store.now() - t.payment.dispatchedAt;
    const fill = document.getElementById("db-progress-fill");
    const text = document.getElementById("db-progress-text");
    if (fill) fill.style.width = `${Math.max(0, Math.min(100, (elapsed / T.settledAfterMs) * 100))}%`;
    if (text) text.textContent = `Settles in about ${Math.max(0, Math.ceil((T.settledAfterMs - elapsed) / 1000))} s`;
  }

  function updateClock() {
    if (el.liveClock) {
      el.liveClock.textContent = new Date().toLocaleString("en-IN", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
    }
  }

  function tick() {
    updateClock();
    const changes = store.advancePayments();
    if (changes.length) {
      refreshData();
      render();
    } else {
      updateProgress();
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------------------------

  function skippedText(skipped) {
    if (!skipped.length) return "";
    return ` Skipped ${skipped.length}: ` + skipped.slice(0, 3).map((s) => `${s.tokenId} (${s.reason})`).join("; ") + (skipped.length > 3 ? "…" : ".");
  }

  function approveSelected() {
    const list = eligibleFor("approve");
    if (!list.length) return;
    const total = list.reduce((a, t) => a + amountOf(t), 0);
    if (!confirm(`Approve ${list.length} certified procurement${list.length === 1 ? "" : "s"} totalling ${inr(total)} and issue J-Forms?`)) return;
    const res = store.approveJForms(list.map((t) => t.tokenId));
    refreshData();
    if (res.approved.length && !currentToken()) currentId = res.approved[0];
    if (res.approved.length) currentId = res.approved[0];
    render();
    setNotice(res.approved.length
      ? `✅ ${res.approved.length} J-Form${res.approved.length === 1 ? "" : "s"} issued (${inr(res.total)}). Now select them and disburse.${skippedText(res.skipped)}`
      : `⛔ No J-Form was issued.${skippedText(res.skipped)}`, res.skipped.length ? "warn" : "ok");
  }

  function disburseSelected() {
    const list = eligibleFor("disburse");
    if (!list.length) return;
    const total = list.reduce((a, t) => a + amountOf(t), 0);
    if (!confirm(`Disburse ${inr(total)} to ${list.length} farmer${list.length === 1 ? "" : "s"}' Aadhaar-linked bank account${list.length === 1 ? "" : "s"} via PFMS?`)) return;
    const res = store.disburse(list.map((t) => t.tokenId));
    refreshData();
    if (res.dispatched.length) currentId = res.dispatched[0];
    render();
    setNotice(res.dispatched.length
      ? `⚡ ${inr(res.total)} dispatched to ${res.dispatched.length} account${res.dispatched.length === 1 ? "" : "s"} in batch ${res.batchId}. Payments move to In Transit and Settled automatically.${skippedText(res.skipped)}`
      : `⛔ Nothing was dispatched.${skippedText(res.skipped)}`, res.skipped.length ? "warn" : "ok");
  }

  function holdSelected() {
    const list = eligibleFor("hold");
    if (!list.length) return;
    const reason = window.prompt(`Reason for placing ${list.length} procurement${list.length === 1 ? "" : "s"} on hold:`, "Held for review");
    if (reason === null) return;
    const res = store.holdTokens(list.map((t) => t.tokenId), reason.trim() || "Held for review");
    refreshData();
    render();
    setNotice(`⏸️ ${res.held.length} procurement${res.held.length === 1 ? "" : "s"} placed on hold.${skippedText(res.skipped)}`, "warn");
  }

  function releaseSelected() {
    const list = eligibleFor("release");
    if (!list.length) return;
    const res = store.releaseHold(list.map((t) => t.tokenId));
    refreshData();
    render();
    setNotice(`▶️ Hold released for ${res.released.length} procurement${res.released.length === 1 ? "" : "s"}. They are ready for J-Form approval.`, "ok");
  }

  function fastForward() {
    const inFlight = tokens.filter((t) => t.payment && t.payment.stage !== "SETTLED").length;
    if (!inFlight) {
      setNotice("No payments are in flight. Disburse a J-Form first, then fast-forward the bank.", "warn");
      return;
    }
    store.fastForwardPayments();
    refreshData();
    render();
    setNotice(`⏩ Bank processing fast-forwarded: ${inFlight} payment${inFlight === 1 ? "" : "s"} settled.`, "ok");
  }

  // ---------------------------------------------------------------------------------------------
  // Documents and export
  // ---------------------------------------------------------------------------------------------

  function openDoc(title, html) {
    el.docTitle.textContent = title;
    el.docArea.innerHTML = html;
    el.docModal.style.display = "flex";
  }

  function openJForm() {
    const t = currentToken();
    if (!t || !t.jForm) return;
    const f = t.jForm;
    const w = t.weighmentReport;
    const p = t.payment;
    openDoc(`J-Form ${f.jFormId}`, `
      <div class="cert-box">
        <div class="cert-header">
          <div style="font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b;">AgriQueue • Government MSP Procurement</div>
          <h2 style="font-size: 1.35rem; color: var(--color-primary-dark); margin: 0.35rem 0;">J-FORM: PROCUREMENT RECEIPT & PAYMENT AUTHORISATION</h2>
          <div style="font-size: 0.82rem; color: #334155;">Procurement Centre: <strong>${esc(t.hubName)}</strong></div>
        </div>

        <div class="cert-meta-grid">
          <div><span class="cert-label">J-Form No:</span><strong class="cert-val" style="font-family: var(--font-mono);">${esc(f.jFormId)}</strong></div>
          <div><span class="cert-label">Approved On:</span><strong class="cert-val">${esc(dt(f.approvedAt))}</strong></div>
          <div><span class="cert-label">Token / Lot No:</span><strong class="cert-val" style="font-family: var(--font-mono); color: var(--color-primary-dark);">${esc(t.tokenId)}</strong></div>
          <div><span class="cert-label">Farmer Name & ID:</span><strong class="cert-val">${esc(t.farmerName)} (${esc(t.farmerId)})</strong></div>
          <div><span class="cert-label">Crop & Variety:</span><strong class="cert-val">${esc(t.cropName)}</strong></div>
          <div><span class="cert-label">Vehicle / Trolley:</span><strong class="cert-val">${esc(t.vehicleNo || "—")}</strong></div>
          <div><span class="cert-label">Bank Account:</span><strong class="cert-val">${t.bank ? esc(t.bank.name) + " • " + esc(t.bank.masked) : "—"}</strong></div>
          <div><span class="cert-label">Approving Officer:</span><strong class="cert-val">${esc(store.DBT_OFFICER.role)} (${esc(f.officerId)})</strong></div>
        </div>

        <table class="cert-table">
          <thead><tr><th>Particulars</th><th>Value</th></tr></thead>
          <tbody>
            <tr><td>Gross weight (loaded trolley)</td><td style="font-family: var(--font-mono);">${w.grossWeightQtl.toFixed(2)} Qtl</td></tr>
            <tr><td>Tare weight (empty trolley)</td><td style="font-family: var(--font-mono);">${w.tareWeightQtl.toFixed(2)} Qtl</td></tr>
            <tr><td><strong>Certified net quantity</strong> (scale ${esc(w.scaleId)})</td><td><strong style="font-family: var(--font-mono);">${f.net.toFixed(2)} Qtl</strong></td></tr>
            <tr><td>Quality grade / moisture</td><td>${esc(f.grade || "—")} / ${f.moisturePct != null ? f.moisturePct + "%" : "—"}</td></tr>
            <tr><td>Government MSP</td><td style="font-family: var(--font-mono);">${inr(f.baseRate)} / Qtl</td></tr>
            <tr><td>Moisture deduction</td><td style="font-family: var(--font-mono);">${f.deduction > 0 ? "− " + inr(f.deduction) + " / Qtl" : "₹0"}</td></tr>
            <tr><td>Net rate payable</td><td style="font-family: var(--font-mono);">${inr(f.rate)} / Qtl</td></tr>
          </tbody>
        </table>

        <div class="cert-decision-box cert-box-pass">
          <div style="font-size: 1.1rem; font-weight: 800; color: #137547;">PAYABLE MSP AMOUNT: ${inr(f.amount)}</div>
          <div style="font-size: 0.82rem; color: #475569; margin-top: 0.35rem;">
            ${p ? `${p.stage === "SETTLED" ? "Credited" : "Dispatched"} via PFMS • UTR <strong>${esc(p.utr)}</strong> • ${esc(p.bank)} XXXX ${esc(p.last4)}` : "Awaiting disbursal via PFMS."}
          </div>
        </div>

        <div class="cert-footer">
          <div style="text-align: left;">
            <div style="font-size: 0.75rem; color: #64748b;">Approved digitally in AgriQueue</div>
            <div style="font-size: 0.72rem; color: #94a3b8;">Amounts are frozen at approval • PFMS integration simulated</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.78rem; font-weight: 700; color: var(--color-primary-dark);">${esc(store.DBT_OFFICER.role)}</div>
            <div style="font-size: 0.72rem; color: #64748b;">ID: ${esc(f.officerId)}</div>
          </div>
        </div>
      </div>`);
  }

  // A text cell starting with = + - @ (or tab / CR) is read by Excel and Sheets as a formula, and farmer names are typed by users
  function csvCell(v) {
    let s = v === null || v === undefined ? "" : String(v);
    if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  const CSV_HEAD = ["J-Form No", "Token", "Farmer ID", "Farmer", "Mobile", "Village", "Crop", "Procurement Centre", "Vehicle",
    "Gross (Qtl)", "Tare (Qtl)", "Net (Qtl)", "Quality Grade", "Moisture (%)", "MSP Rate (Rs/Qtl)", "Moisture Deduction (Rs/Qtl)", "Amount (Rs)",
    "Bank", "Account", "Status", "Payment Stage", "UTR", "PFMS Batch", "Weighed At", "J-Form Approved At", "Dispatched At", "Settled At"];

  function csvRow(t) {
    const w = t.weighmentReport;
    const q = t.qualityReport;
    const p = t.payment;
    const base = store.CROPS[t.cropKey].msp;
    return [t.jForm ? t.jForm.jFormId : "", t.tokenId, t.farmerId, t.farmerName, t.farmerMobile, t.village, t.cropName, t.hubName, t.vehicleNo,
      w.grossWeightQtl.toFixed(2), w.tareWeightQtl.toFixed(2), w.netWeightQtl.toFixed(2), q ? q.grade : "", q ? q.moisturePct : "",
      t.financials.mspPerQtl, Math.max(0, base - t.financials.mspPerQtl), amountOf(t),
      t.bank ? t.bank.name : "", t.bank ? t.bank.masked : "", stageMeta(t).long, p ? p.stage : "", p ? p.utr : "", p ? p.batchId : "",
      stamp(t.statusTimeline.weighedAt), stamp(t.jForm && t.jForm.approvedAt), stamp(p && p.dispatchedAt), stamp(p && p.settledAt)];
  }

  function exportCsv() {
    const rows = filtered();
    if (!rows.length) return;
    const csv = [CSV_HEAD].concat(rows.map(csvRow)).map((r) => r.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agriqueue_procurement_register_${stamp(store.now()).slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    store.addAudit("EXPORT", `Procurement register exported to CSV (${rows.length} row${rows.length === 1 ? "" : "s"}, ${inr(rows.reduce((s, t) => s + amountOf(t), 0))})`);
    renderAudit();
  }

  function exportPdf() {
    const rows = filtered();
    if (!rows.length) return;
    const total = rows.reduce((s, t) => s + amountOf(t), 0);
    openDoc("Procurement Register", `
      <div class="cert-box">
        <div class="cert-header">
          <div style="font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b;">AgriQueue • DBT Settlement Register</div>
          <h2 style="font-size: 1.35rem; color: var(--color-primary-dark); margin: 0.35rem 0;">PROCUREMENT & PAYMENT REGISTER</h2>
          <div style="font-size: 0.82rem; color: #334155;">Generated ${esc(dt(store.now()))} • ${rows.length} procurement${rows.length === 1 ? "" : "s"} • Total <strong>${inr(total)}</strong></div>
        </div>
        <table class="cert-table" style="font-size: 0.72rem;">
          <thead><tr><th>Token</th><th>Farmer</th><th>Crop</th><th>Net Qtl</th><th>Amount</th><th>Status</th><th>UTR</th></tr></thead>
          <tbody>
            ${rows.map((t) => `<tr><td style="font-family: var(--font-mono);">${esc(t.tokenId)}</td><td>${esc(t.farmerName)}</td><td>${esc(t.cropName)}</td>
              <td style="font-family: var(--font-mono);">${t.weighmentReport.netWeightQtl.toFixed(2)}</td><td style="font-family: var(--font-mono);">${inr(amountOf(t))}</td>
              <td>${esc(stageMeta(t).long)}</td><td style="font-family: var(--font-mono);">${t.payment ? esc(t.payment.utr) : "—"}</td></tr>`).join("")}
          </tbody>
        </table>
        <div class="cert-footer">
          <div style="text-align: left; font-size: 0.72rem; color: #64748b;">Prepared by the DBT Settlement Portal • PFMS integration simulated</div>
          <div style="text-align: right; font-size: 0.78rem; font-weight: 700; color: var(--color-primary-dark);">${esc(store.DBT_OFFICER.role)} (${esc(store.DBT_OFFICER.id)})</div>
        </div>
      </div>`);
    store.addAudit("EXPORT", `Procurement register opened for PDF (${rows.length} row${rows.length === 1 ? "" : "s"}, ${inr(total)})`);
    renderAudit();
  }

  // ---------------------------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------------------------

  function attachEvents() {
    el.searchInput.addEventListener("input", (e) => {
      searchTerm = e.target.value.toLowerCase().trim();
      render();
    });

    el.filterChips.forEach((chip) => {
      chip.addEventListener("click", () => {
        el.filterChips.forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        activeFilter = chip.dataset.filter || "ALL";
        render();
      });
    });

    el.list.addEventListener("click", (e) => {
      const box = e.target.closest("[data-sel]");
      if (box) {
        if (box.checked) selected.add(box.dataset.sel); else selected.delete(box.dataset.sel);
        renderList();
        renderBatch();
        return;
      }
      if (e.target.closest(".db-sel")) return;
      const card = e.target.closest(".op-queue-card");
      if (card) {
        currentId = card.dataset.token;
        renderList();
        renderDetail();
      }
    });

    el.selectAll.addEventListener("change", () => {
      filtered().forEach((t) => { if (el.selectAll.checked) selected.add(t.tokenId); else selected.delete(t.tokenId); });
      renderList();
      renderBatch();
    });

    el.clearSel.addEventListener("click", (e) => {
      e.preventDefault();
      selected.clear();
      renderList();
      renderBatch();
    });

    el.txBody.addEventListener("click", (e) => {
      const row = e.target.closest("[data-token]");
      if (row) {
        currentId = row.dataset.token;
        renderList();
        renderDetail();
      }
    });

    el.btnApprove.addEventListener("click", approveSelected);
    el.btnDisburse.addEventListener("click", disburseSelected);
    el.btnHold.addEventListener("click", holdSelected);
    el.btnRelease.addEventListener("click", releaseSelected);
    el.btnFastForward.addEventListener("click", fastForward);
    el.btnViewJForm.addEventListener("click", openJForm);
    el.btnExportCsv.addEventListener("click", exportCsv);
    el.btnExportPdf.addEventListener("click", exportPdf);

    el.docClose.addEventListener("click", () => { el.docModal.style.display = "none"; });
    el.docModal.addEventListener("click", (e) => { if (e.target === el.docModal) el.docModal.style.display = "none"; });
    el.docPrint.addEventListener("click", () => window.print());
  }

  // Initialize on DOM load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
