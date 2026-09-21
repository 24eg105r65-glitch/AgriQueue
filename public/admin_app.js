/**
 * AgriQueue: Mandi Secretary & District Admin Portal (SIH26032)
 * Module 4: live yard heatmap, dynamic counter management, procurement quotas vs actuals,
 * and a predictive congestion warning (M/M/c Erlang-C wait model from queue_engine.js).
 * Reads shared state through AgriQueueStore (ops_store.js): farmer bookings, Quality Lab results
 * and gate / weighbridge records.
 */

(function () {
  "use strict";

  const store = window.AgriQueueStore;
  const engine = window.AgriQueueEngine;
  const RATE = store.SERVICE_RATE_PER_HR;

  const WATCH_MIN = 30;          // amber: predicted wait at or above this
  const ALERT_MIN = 45;          // red: congestion alert threshold from the specification
  const CLEAR_MIN = 40;          // an alert clears only once the wait falls below this (hysteresis)
  const WATCH_UTIL = 0.85;       // amber: station utilisation at or above this
  const DEFAULT_PASS_SHARE = 0.9;
  const WAIT_CAP_MIN = 60;       // displayed / summed wait is capped here (overloaded queues grow without bound)
  const HUB_PREF_KEY = "agriqueue_admin_hub";

  // How baseline (non-live) procurement is spread over crops
  const CROP_FACTOR = { paddy_a: 1.1, wheat: 1.0, maize: 0.8, chana: 0.6, mustard: 0.5 };

  const STATION_META = {
    gate: { label: "Gate Entry", icon: "sensor_door", sub: "Token check-in desks" },
    lab: { label: "Moisture Lab", icon: "science", sub: "Digital moisture counters" },
    weigh: { label: "Weighbridge", icon: "scale", sub: "Electronic weighing lanes" }
  };

  let hubId = store.GATE_HUB_ID;
  const el = {};

  function init() {
    cacheDom();
    try {
      const saved = localStorage.getItem(HUB_PREF_KEY);
      if (saved && store.centreById(saved)) hubId = saved;
    } catch (e) {}

    el.hubSelect.innerHTML = store.CENTRES.map((c) => `<option value="${c.id}">${c.id}: ${esc(c.short)}</option>`).join("");
    el.hubSelect.value = hubId;

    attachEvents();
    startLiveClock();
    render();

    store.onChange(render);
    setInterval(render, 20000);
  }

  function cacheDom() {
    const ids = {
      hubSelect: "ad-hub-select", liveClock: "ad-live-clock",
      banner: "ad-banner", bannerSub: "ad-banner-sub",
      kpiYard: "ad-kpi-yard", kpiWait: "ad-kpi-wait", kpiThroughput: "ad-kpi-throughput",
      kpiProcured: "ad-kpi-procured", kpiProcuredSub: "ad-kpi-procured-sub",
      heatHub: "ad-heat-hub", heatGrid: "ad-heat-grid",
      recs: "ad-recs", counters: "ad-counters", counterMsg: "ad-counter-msg",
      quotas: "ad-quotas", quotaTotal: "ad-quota-total",
      districtBody: "ad-district-body", alertLog: "ad-alert-log",
      surgeSlider: "ad-surge-slider", surgeInput: "ad-surge-input",
      btnSurge: "btn-surge", btnClearSim: "btn-clear-sim", simNote: "ad-sim-note"
    };
    Object.keys(ids).forEach((k) => { el[k] = document.getElementById(ids[k]); });
  }

  // ---------------------------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------------------------

  function esc(s) {
    return String(s === undefined || s === null ? "" : s).replace(/[&<>"']/g, (c) => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));
  }

  const inr = (n) => `${Math.round(n).toLocaleString("en-IN")}`;

  function fmtWait(min) {
    if (!isFinite(min) || min > WAIT_CAP_MIN) return `${WAIT_CAP_MIN}+ min`;
    return `${Math.round(min)} min`;
  }

  function fmtUtil(rho) {
    if (!isFinite(rho) || rho >= 1) return "100%+";
    return `${Math.round(rho * 100)}%`;
  }

  function cappedWait(est) {
    return est.overloaded || !isFinite(est.waitMin) ? WAIT_CAP_MIN : Math.min(est.waitMin, WAIT_CAP_MIN);
  }

  const SEV = {
    alert: { color: "var(--status-danger)", pill: "status-pill-danger", label: "Congested", badge: "op-badge-reject" },
    watch: { color: "var(--status-warning)", pill: "status-pill-warning", label: "Watch", badge: "op-badge-deduction" },
    ok: { color: "var(--color-primary)", pill: "status-pill-optimal", label: "Normal", badge: "op-badge-pass" }
  };

  function severityOf(est) {
    if (est.overloaded || est.waitMin >= ALERT_MIN) return "alert";
    if (est.waitMin >= WATCH_MIN || est.rho >= WATCH_UTIL) return "watch";
    return "ok";
  }

  const SEV_RANK = { ok: 0, watch: 1, alert: 2 };

  // ---------------------------------------------------------------------------------------------
  // Metrics model: live tokens + seeded baselines -> per-station queue model -> predicted waits
  // ---------------------------------------------------------------------------------------------

  function computeHub(centre, tokens, admin, now) {
    const base = centre.baseline;
    const mine = tokens.filter((t) => t.hubId === centre.id);
    const counters = admin.counters[centre.id] || [];

    const arrivalsPerHr = base.arrivalsPerHr + mine.filter((t) => {
      const at = t.statusTimeline.gateInAt;
      return at && now - at <= store.HOUR_MS && at <= now + 60000;
    }).length;

    const labQueue = base.lab + mine.filter((t) => t.status === "ARRIVED").length;
    const weighQueue = base.weigh + mine.filter((t) => t.status === "QUALITY_INSPECTED" && t.qcOutcome !== "REJECTED").length;

    const tested = mine.filter((t) => t.qualityReport);
    const passShare = tested.length >= 3
      ? tested.filter((t) => t.qualityReport.passed).length / tested.length
      : DEFAULT_PASS_SHARE;

    const labOpen = counters.filter((c) => c.type === "lab" && c.open).length;
    const weighOpen = counters.filter((c) => c.type === "weigh" && c.open).length;

    function station(key, servers, total, lambdaPerHr, inSystem) {
      const params = { lambdaPerHr, muPerHr: RATE[key], servers, inSystem };
      const est = engine.estimateWait(params);
      return Object.assign({ key, params, est, servers, total, lambdaPerHr, muPerHr: RATE[key], inSystem, severity: severityOf(est) }, STATION_META[key]);
    }

    const stations = {
      gate: station("gate", centre.gateDesks, centre.gateDesks, arrivalsPerHr, 0),
      lab: station("lab", labOpen, counters.filter((c) => c.type === "lab").length, arrivalsPerHr, labQueue),
      weigh: station("weigh", weighOpen, counters.filter((c) => c.type === "weigh").length, arrivalsPerHr * passShare, weighQueue)
    };
    stations.gate.inSystem = null;

    // Procurement quotas: weighed today (+ seeded baseline for hubs without live tokens)
    const targets = store.quotaTargets(centre.id);
    const quotas = {};
    let procured = 0;
    let targetTotal = 0;
    Object.keys(targets).forEach((crop) => {
      const live = mine.filter((t) => t.cropKey === crop && t.weighedToday).reduce((a, t) => a + t.weighmentReport.netWeightQtl, 0);
      const seeded = Math.round(targets[crop] * base.procuredPct * CROP_FACTOR[crop]);
      const pipeline = mine.filter((t) => t.cropKey === crop && t.status === "QUALITY_INSPECTED" && t.qcOutcome !== "REJECTED")
        .reduce((a, t) => a + t.estimatedQty, 0);
      quotas[crop] = { target: targets[crop], actual: live + seeded, pipeline };
      procured += live + seeded;
      targetTotal += targets[crop];
    });

    const totalWait = cappedWait(stations.gate.est) + cappedWait(stations.lab.est) + cappedWait(stations.weigh.est);
    const worst = ["gate", "lab", "weigh"].reduce((w, k) => (SEV_RANK[stations[k].severity] > SEV_RANK[w] ? stations[k].severity : w), "ok");

    return {
      centre, counters, stations, quotas, procured, targetTotal,
      inYard: labQueue + weighQueue,
      throughput: arrivalsPerHr,
      totalWait,
      severity: worst,
      labOpen, weighOpen
    };
  }

  // Suggest what to do about a watch/alert station
  function recommend(hub, all) {
    const recs = [];
    ["lab", "weigh"].forEach((key) => {
      const st = hub.stations[key];
      if (st.severity === "ok") return;
      const closed = hub.counters.find((c) => c.type === key && !c.open);
      if (closed) {
        const wi = engine.whatIfExtraCounter(st.params);
        recs.push({ kind: "open", severity: st.severity, station: st, counter: closed, before: cappedWait(wi.before), after: cappedWait(wi.after) });
      } else {
        const best = all.filter((h) => h.centre.id !== hub.centre.id).sort((a, b) => a.totalWait - b.totalWait)[0];
        recs.push({ kind: "divert", severity: st.severity, station: st, target: best });
      }
    });
    return recs;
  }

  // ---------------------------------------------------------------------------------------------
  // Alert log (persisted): raised when a station turns red, cleared once it recovers
  // ---------------------------------------------------------------------------------------------

  function pushLog(admin, entry) {
    admin.alerts.unshift(Object.assign({ ts: store.now() }, entry));
    if (admin.alerts.length > 40) admin.alerts.length = 40;
  }

  function syncAlerts(all, admin) {
    let changed = false;
    all.forEach((h) => {
      ["gate", "lab", "weigh"].forEach((key) => {
        const st = h.stations[key];
        const k = `${h.centre.id}:${key}`;
        const active = admin.activeAlerts[k];
        if (st.severity === "alert" && !active) {
          admin.activeAlerts[k] = store.now();
          pushLog(admin, { kind: "raised", hubId: h.centre.id, station: key, waitMin: cappedWait(st.est), text: `${st.label} predicted wait ${fmtWait(st.est.waitMin)} exceeds the ${ALERT_MIN}-minute limit` });
          changed = true;
        } else if (active && st.severity !== "alert" && !st.est.overloaded && st.est.waitMin < CLEAR_MIN) {
          delete admin.activeAlerts[k];
          pushLog(admin, { kind: "cleared", hubId: h.centre.id, station: key, waitMin: cappedWait(st.est), text: `${st.label} back to ${fmtWait(st.est.waitMin)}` });
          changed = true;
        }
      });
    });
    if (changed) store.saveAdminState(admin);
  }

  function logAction(text) {
    const admin = store.getAdminState();
    pushLog(admin, { kind: "action", hubId, station: null, waitMin: null, text });
    store.saveAdminState(admin);
  }

  // ---------------------------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------------------------

  function render() {
    const now = store.now();
    const tokens = store.getTokens();
    const admin = store.getAdminState();
    const all = store.CENTRES.map((c) => computeHub(c, tokens, admin, now));
    syncAlerts(all, admin);

    const hub = all.find((h) => h.centre.id === hubId) || all[0];
    const recs = recommend(hub, all);

    renderBanner(hub, all, recs);
    renderKpis(hub);
    renderHeatmap(hub);
    renderRecs(recs);
    renderCounters(hub);
    renderQuotas(hub);
    renderDistrict(all);
    renderLog(store.getAdminState());
    renderSimNote(tokens);
  }

  function renderBanner(hub, all, recs) {
    const red = ["gate", "lab", "weigh"].map((k) => hub.stations[k]).filter((s) => s.severity === "alert");
    const amber = ["gate", "lab", "weigh"].map((k) => hub.stations[k]).filter((s) => s.severity === "watch");

    if (red.length) {
      const worst = red.sort((a, b) => cappedWait(b.est) - cappedWait(a.est))[0];
      const open = recs.find((r) => r.kind === "open" && r.station.key === worst.key);
      const tip = open ? ` Recommended: open ${open.counter.name} (about ${fmtWait(open.before)} → ${fmtWait(open.after)}).` : "";
      el.banner.className = "op-decision-badge badge-grade-reject";
      el.banner.textContent = `⛔ CONGESTION ALERT • ${worst.label} predicted wait ${fmtWait(worst.est.waitMin)} (limit ${ALERT_MIN} min).${tip}`;
    } else if (amber.length) {
      const worst = amber.sort((a, b) => cappedWait(b.est) - cappedWait(a.est))[0];
      el.banner.className = "op-decision-badge badge-grade-b";
      el.banner.textContent = `⚠️ WATCH • ${worst.label} is filling up (predicted wait ${fmtWait(worst.est.waitMin)}, utilisation ${fmtUtil(worst.est.rho)}).`;
    } else {
      el.banner.className = "op-decision-badge badge-grade-a";
      el.banner.textContent = `✓ All stations at ${hub.centre.short} are within limits • end-to-end wait ${fmtWait(hub.totalWait)}`;
    }

    const others = all.filter((h) => h.centre.id !== hub.centre.id && h.severity === "alert");
    el.bannerSub.textContent = others.length
      ? `Also in alert: ${others.map((h) => `${h.centre.short} (${["gate", "lab", "weigh"].map((k) => h.stations[k]).filter((s) => s.severity === "alert").map((s) => s.label).join(", ")})`).join(" • ")}`
      : "No other centre is in congestion alert.";
  }

  function renderKpis(hub) {
    el.kpiYard.textContent = hub.inYard;
    el.kpiWait.textContent = fmtWait(hub.totalWait);
    el.kpiThroughput.textContent = Math.round(hub.throughput);
    const pct = hub.targetTotal ? Math.round((hub.procured / hub.targetTotal) * 100) : 0;
    el.kpiProcured.textContent = `${pct}%`;
    el.kpiProcuredSub.textContent = `Procured ${inr(hub.procured)} of ${inr(hub.targetTotal)} Qtl target`;
  }

  function renderHeatmap(hub) {
    el.heatHub.textContent = hub.centre.short;
    el.heatGrid.innerHTML = ["gate", "lab", "weigh"].map((key) => {
      const st = hub.stations[key];
      const sev = SEV[st.severity];
      const queue = st.inSystem === null ? "—" : `${st.inSystem} trolley${st.inSystem === 1 ? "" : "s"}`;
      const bg = st.severity === "alert" ? "#fef2f2" : "#ffffff";
      const util = !isFinite(st.est.rho) ? 100 : Math.min(100, Math.round(st.est.rho * 100));
      return `
        <div class="mandi-card" style="border-color: ${sev.color}; background: ${bg};">
          <div>
            <div class="mandi-header">
              <div class="mandi-icon-box" style="color: ${sev.color};">
                <span class="material-symbols-outlined" style="font-size: 1.4rem;">${st.icon}</span>
              </div>
              <div>
                <div class="mandi-name">${st.label}</div>
                <div class="mandi-location-text"><span>${st.sub}</span></div>
              </div>
            </div>

            <span class="gauge-pill ${sev.pill}" style="margin-top: 0; margin-bottom: 0.85rem;">${sev.label} • predicted wait ${fmtWait(st.est.waitMin)}</span>

            <div class="mandi-metrics-row">
              <div class="metric-item">
                <span class="metric-label">In Queue</span>
                <span class="metric-value">${queue}</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">Open Counters</span>
                <span class="metric-value">${st.servers} of ${st.total}</span>
              </div>
              <div class="metric-item" style="margin-top: 0.35rem;">
                <span class="metric-label">Arrivals / Hr</span>
                <span class="metric-value">${st.lambdaPerHr.toFixed(1)}</span>
              </div>
              <div class="metric-item" style="margin-top: 0.35rem;">
                <span class="metric-label">Utilisation</span>
                <span class="metric-value" style="color: ${sev.color};">${fmtUtil(st.est.rho)}</span>
              </div>
            </div>

            <div class="ad-bar-track"><div class="ad-bar-fill" style="width: ${util}%; background: ${sev.color};"></div></div>
          </div>
        </div>`;
    }).join("");
  }

  function renderRecs(recs) {
    if (!recs.length) {
      el.recs.innerHTML = `<div class="ad-rec" style="background: #f0fdf4; border: 1.5px solid var(--color-primary-border); color: var(--color-primary-dark);">✅ No action needed. Every station is within its wait limit.</div>`;
      return;
    }
    el.recs.innerHTML = recs.map((r) => {
      const cls = r.severity === "alert" ? "ad-rec-alert" : "ad-rec-watch";
      if (r.kind === "open") {
        return `
          <div class="ad-rec ${cls}">
            <span><strong>${r.station.label}:</strong> open <strong>${esc(r.counter.name)}</strong> to cut the predicted wait from ${fmtWait(r.before)} to about ${fmtWait(r.after)}.</span>
            <button type="button" class="btn-op-action btn-op-pass" style="padding: 0.4rem 0.85rem; font-size: 0.78rem; white-space: nowrap;" data-apply="${esc(r.counter.id)}" data-before="${Math.round(r.before)}" data-after="${Math.round(r.after)}">Apply</button>
          </div>`;
      }
      const t = r.target;
      const where = t ? `${esc(t.centre.short)} (about ${fmtWait(t.totalWait)} end-to-end)` : "another centre";
      return `
        <div class="ad-rec ${cls}">
          <span><strong>${r.station.label}:</strong> every counter is already open. Divert new bookings to <strong>${where}</strong>.</span>
          ${t ? `<button type="button" class="btn-op-action btn-op-secondary" style="padding: 0.4rem 0.85rem; font-size: 0.78rem; white-space: nowrap;" data-open-hub="${t.centre.id}">View hub</button>` : ""}
        </div>`;
    }).join("");
  }

  function renderCounters(hub) {
    const group = (type, title) => {
      const list = hub.counters.filter((c) => c.type === type);
      const open = list.filter((c) => c.open).length;
      const rows = list.map((c) => `
        <div class="ad-row">
          <div>
            <div class="ad-row-name">${esc(c.name)}</div>
            <div class="ad-row-sub">${c.spare ? "Standby counter • " : ""}${RATE[type]} trolleys / hr</div>
          </div>
          <div style="display: flex; align-items: center; gap: 0.6rem;">
            <span class="op-badge ${c.open ? "op-badge-pass" : "op-badge-reject"}">${c.open ? "Open" : "Closed"}</span>
            <button type="button" class="btn-op-action ${c.open ? "btn-op-secondary" : "btn-op-pass"}" style="padding: 0.35rem 0.8rem; font-size: 0.78rem;" data-toggle="${esc(c.id)}">${c.open ? "Close" : "Open"}</button>
          </div>
        </div>`).join("");
      return `<div class="ad-group-title">${title} • ${open} of ${list.length} open</div>${rows}`;
    };
    el.counters.innerHTML = group("lab", "Moisture Lab Counters") + group("weigh", "Weighbridge Lanes");
  }

  function renderQuotas(hub) {
    const pct = hub.targetTotal ? Math.round((hub.procured / hub.targetTotal) * 100) : 0;
    el.quotaTotal.textContent = `${inr(hub.procured)} / ${inr(hub.targetTotal)} Qtl • ${pct}%`;

    el.quotas.innerHTML = Object.keys(hub.quotas).map((crop) => {
      const q = hub.quotas[crop];
      const actualPct = q.target ? Math.min(100, (q.actual / q.target) * 100) : 0;
      const pipePct = q.target ? Math.min(100 - actualPct, (q.pipeline / q.target) * 100) : 0;
      return `
        <div style="margin-bottom: 0.95rem;">
          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.35rem;">
            <span style="font-size: 0.85rem; font-weight: 700; color: var(--text-main);">${esc(store.CROPS[crop].name)}</span>
            <span style="font-family: var(--font-mono); font-size: 0.78rem; font-weight: 700; color: var(--color-primary-dark);">
              ${inr(q.actual)} / ${inr(q.target)} Qtl • ${Math.round((q.actual / q.target) * 100)}%
            </span>
          </div>
          <div class="ad-bar-track">
            <div class="ad-bar-fill" style="width: ${actualPct}%;"></div>
            <div class="ad-bar-pipeline" style="width: ${pipePct}%;"></div>
          </div>
          ${q.pipeline > 0 ? `<div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 0.2rem;">+ ${inr(q.pipeline)} Qtl quality-passed, awaiting weighment</div>` : ""}
        </div>`;
    }).join("");
  }

  function renderDistrict(all) {
    el.districtBody.innerHTML = all.map((h) => {
      const sev = SEV[h.severity];
      const pct = h.targetTotal ? Math.round((h.procured / h.targetTotal) * 100) : 0;
      const labTotal = h.counters.filter((c) => c.type === "lab").length;
      const weighTotal = h.counters.filter((c) => c.type === "weigh").length;
      return `
        <tr class="ad-hub-row ${h.centre.id === hubId ? "active" : ""}" data-hub="${h.centre.id}">
          <td><strong>${esc(h.centre.short)}</strong><div style="font-size: 0.72rem; color: #64748b;">${h.centre.id} • ${esc(h.centre.district)}</div></td>
          <td style="font-family: var(--font-mono); font-weight: 700;">${h.inYard}</td>
          <td style="font-family: var(--font-mono); font-weight: 700;">${fmtWait(h.totalWait)}</td>
          <td style="font-family: var(--font-mono);">${h.labOpen}/${labTotal} • ${h.weighOpen}/${weighTotal}</td>
          <td style="font-family: var(--font-mono);">${inr(h.procured)} / ${inr(h.targetTotal)} (${pct}%)</td>
          <td><span class="op-badge ${sev.badge}">${sev.label}</span></td>
        </tr>`;
    }).join("");
  }

  function renderLog(admin) {
    const rows = admin.alerts.slice(0, 8);
    if (!rows.length) {
      el.alertLog.innerHTML = `<div style="text-align: center; padding: 1.5rem 1rem; color: #64748b; font-size: 0.85rem;">No congestion alerts yet. Use the simulation tools to raise one.</div>`;
      return;
    }
    const badge = { raised: ["op-badge-reject", "Raised"], cleared: ["op-badge-pass", "Cleared"], action: ["op-badge-pending", "Action"] };
    el.alertLog.innerHTML = rows.map((a) => {
      const c = store.centreById(a.hubId);
      const b = badge[a.kind] || badge.action;
      return `
        <div class="ad-log-row">
          <span class="op-badge ${b[0]}">${b[1]}</span>
          <span><strong>${esc(c ? c.short : "—")}</strong> • ${esc(a.text)}</span>
          <span class="ad-log-time">${store.fmtTime(a.ts)}</span>
        </div>`;
    }).join("");
  }

  function renderSimNote(tokens) {
    const n = tokens.filter((t) => t.simulated && t.hubId === hubId).length;
    el.simNote.textContent = n > 0
      ? `${n} simulated trolley${n === 1 ? "" : "s"} currently in this hub's yard.`
      : "No simulated trolleys in this hub's yard.";
  }

  // ---------------------------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------------------------

  function setHub(id) {
    hubId = id;
    el.hubSelect.value = id;
    try { localStorage.setItem(HUB_PREF_KEY, id); } catch (e) {}
    el.counterMsg.textContent = "";
    render();
  }

  function toggleCounter(counterId) {
    const list = store.countersFor(hubId);
    const c = list.find((x) => x.id === counterId);
    if (!c) return;
    const res = store.setCounterOpen(hubId, counterId, !c.open);
    if (!res.ok) {
      el.counterMsg.textContent = `⛔ ${res.error}.`;
      return;
    }
    el.counterMsg.textContent = "";
    logAction(`${c.name} ${res.counter.open ? "opened" : "closed"} by the Mandi Secretary`);
    render();
  }

  function applyRecommendation(counterId, before, after) {
    const c = store.countersFor(hubId).find((x) => x.id === counterId);
    if (!c) return;
    const res = store.setCounterOpen(hubId, counterId, true);
    if (!res.ok) {
      el.counterMsg.textContent = `⛔ ${res.error}.`;
      return;
    }
    el.counterMsg.textContent = "";
    logAction(`${c.name} opened on recommendation (predicted wait ${before} → ${after} min)`);
    render();
  }

  function injectSurge() {
    const raw = parseInt(el.surgeInput.value, 10);
    if (isNaN(raw) || raw < 1) {
      el.simNote.textContent = "Enter how many trolleys to add (1 to 60).";
      return;
    }
    const n = Math.min(60, raw);
    store.simulateSurge(hubId, n);
    logAction(`Simulated arrival surge of ${n} trolleys injected`);
    render();
  }

  function clearSimulated() {
    const n = store.clearSimulated();
    if (n > 0) logAction(`${n} simulated trolleys cleared`);
    render();
  }

  function attachEvents() {
    el.hubSelect.addEventListener("change", () => setHub(el.hubSelect.value));

    // Delegated clicks (the panels are re-rendered)
    document.addEventListener("click", (e) => {
      const toggle = e.target.closest("[data-toggle]");
      if (toggle) return toggleCounter(toggle.dataset.toggle);
      const apply = e.target.closest("[data-apply]");
      if (apply) return applyRecommendation(apply.dataset.apply, apply.dataset.before, apply.dataset.after);
      const open = e.target.closest("[data-open-hub]");
      if (open) return setHub(open.dataset.openHub);
      const row = e.target.closest("[data-hub]");
      if (row) return setHub(row.dataset.hub);
    });

    // Surge slider <-> number
    el.surgeSlider.addEventListener("input", () => { el.surgeInput.value = el.surgeSlider.value; });
    el.surgeInput.addEventListener("input", () => {
      const v = parseInt(el.surgeInput.value, 10);
      if (!isNaN(v)) el.surgeSlider.value = Math.max(2, Math.min(30, v));
    });

    el.btnSurge.addEventListener("click", injectSurge);
    el.btnClearSim.addEventListener("click", clearSimulated);
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

  // Initialize on DOM load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
