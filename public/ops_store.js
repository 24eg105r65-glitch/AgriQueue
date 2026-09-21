/**
 * AgriQueue: Shared Ops Store (SIH26032)
 * Data layer for Module 2 (Gate & Weighbridge) and Module 4 (Mandi Admin).
 *
 * Reads/writes the localStorage keys the finished modules already use:
 *   kisan_procurement_batches  (Farmer portal: booking records, keyed by `token`)
 *   agriqueue_qc_samples       (Quality Lab: lab queue + results, keyed by `tokenId`)
 * and adds two keys of its own:
 *   agriqueue_gate_state       (gate check-ins, weighments, expected arrivals)
 *   agriqueue_admin_state      (counter open/close state, congestion alert log)
 *
 * getTokens() returns ONE merged view shaped like the TokenSchema in ARCHITECTURE.md
 * section 4, with `status` taken from the section 2 state machine
 * (BOOKED > ARRIVED > QUALITY_INSPECTED > WEIGHMENT_COMPLETED). The stage is derived from
 * gate entries + the QC result, never from the farmer record's numeric `step`.
 */

(function (root) {
  'use strict';

  const KEYS = {
    batches: 'kisan_procurement_batches',
    qc: 'agriqueue_qc_samples',
    gate: 'agriqueue_gate_state',
    admin: 'agriqueue_admin_state',
    authUser: 'kisan_auth_user'
  };

  const GATE_HUB_ID = 'PC-101';
  const OPERATOR_ID = 'GATE-OP-01';
  const HOUR_MS = 3600000;

  // Same crops / MSP as the farmer portal (CROPS_MSP) and the Quality Lab (FCI_QUALITY_STANDARDS)
  const CROPS = {
    paddy_a: { name: 'Paddy (Grade A)', msp: 2300 },
    wheat: { name: 'Wheat (FAQ Sharbati)', msp: 2275 },
    maize: { name: 'Maize (Hybrid)', msp: 2090 },
    chana: { name: 'Chana (Gram / Chickpea)', msp: 5440 },
    mustard: { name: 'Mustard (Sarson)', msp: 5650 }
  };

  // Share of a centre's daily capacity targeted at each crop (state target split)
  const QUOTA_SHARE = { paddy_a: 0.35, wheat: 0.30, maize: 0.15, chana: 0.10, mustard: 0.10 };

  // Trolleys per hour that ONE counter / lane / desk can process
  const SERVICE_RATE_PER_HR = { gate: 20, lab: 10, weigh: 12 };

  // Same six centres as PROCUREMENT_CENTRES in farmer_app.js (that array is private to its IIFE).
  // `baseline` is seeded yard load for centres that have no live tokens in this browser.
  const CENTRES = [
    { id: 'PC-101', name: 'Karnal Central Procurement Hub', short: 'Karnal Central Hub', keyword: 'karnal', district: 'Karnal, Haryana',
      dailyCapacityQtl: 2500, gateDesks: 2, lab: { open: 2, spare: 1 }, weigh: { open: 2, spare: 0 },
      weighNames: ['Lane 1 (North Weighbridge)', 'Lane 2 (East Weighbridge)'],
      baseline: { lab: 0, weigh: 0, arrivalsPerHr: 0, procuredPct: 0 } },
    { id: 'PC-102', name: 'Gharaunda Agri Mandi Centre', short: 'Gharaunda Mandi Centre', keyword: 'gharaunda', district: 'Gharaunda, Karnal',
      dailyCapacityQtl: 1800, gateDesks: 1, lab: { open: 1, spare: 1 }, weigh: { open: 1, spare: 1 },
      baseline: { lab: 3, weigh: 1, arrivalsPerHr: 8, procuredPct: 0.41 } },
    { id: 'PC-103', name: 'Taraori Grain Market Hub', short: 'Taraori Grain Hub', keyword: 'taraori', district: 'Taraori, Karnal',
      dailyCapacityQtl: 2000, gateDesks: 1, lab: { open: 2, spare: 0 }, weigh: { open: 2, spare: 0 },
      baseline: { lab: 1, weigh: 0, arrivalsPerHr: 4, procuredPct: 0.27 } },
    { id: 'PC-104', name: 'Kurukshetra District Procurement Mandi', short: 'Kurukshetra Mandi', keyword: 'kurukshetra', district: 'Kurukshetra, Haryana',
      dailyCapacityQtl: 3500, gateDesks: 2, lab: { open: 3, spare: 1 }, weigh: { open: 3, spare: 1 },
      baseline: { lab: 9, weigh: 4, arrivalsPerHr: 26, procuredPct: 0.52 } },
    { id: 'PC-105', name: 'Panipat Agro Commodity Terminal', short: 'Panipat Terminal', keyword: 'panipat', district: 'Panipat, Haryana',
      dailyCapacityQtl: 2200, gateDesks: 1, lab: { open: 2, spare: 1 }, weigh: { open: 2, spare: 0 },
      baseline: { lab: 3, weigh: 2, arrivalsPerHr: 12, procuredPct: 0.36 } },
    { id: 'PC-106', name: 'Warangal Central Agri Procurement Yard', short: 'Warangal Yard', keyword: 'warangal', district: 'Warangal, Telangana',
      dailyCapacityQtl: 2800, gateDesks: 2, lab: { open: 2, spare: 0 }, weigh: { open: 2, spare: 1 },
      baseline: { lab: 2, weigh: 1, arrivalsPerHr: 9, procuredPct: 0.31 } }
  ];

  // Copy of DEFAULT_PROC_BATCHES in farmer_app.js, used when the farmer key has never been written
  const DEFAULT_FARMER_BATCHES = [
    { id: 'PROC-2026-9041', token: 'TK-1042', cropKey: 'paddy_a', crop: 'Paddy Grade A', qty: 50.0,
      centre: 'Karnal Central Procurement Hub', slot: 'Today 10:00 AM - 11:00 AM', status: 'In Queue (Weighment Pending)',
      moisture: '11.8% (Grade A)', rate: 2300, total: 115000, dbtStatus: 'Approved by Officer', step: 3 },
    { id: 'PROC-2026-8812', token: 'TK-0988', cropKey: 'wheat', crop: 'Wheat FAQ', qty: 60.0,
      centre: 'Gharaunda Mandi Centre', slot: 'Yesterday 02:00 PM', status: 'Procured & Paid',
      moisture: '10.4% (Grade A)', rate: 2275, total: 136500, dbtStatus: 'Disbursed (UTR-2026-SBIN-882910)', step: 5 }
  ];

  // The five trolleys already in the Quality Lab's seed queue (same people, vehicles and lanes)
  const SEED_TROLLEYS = [
    { tokenId: 'TK-1042', farmerId: 'FAR-2026-8812', farmerName: 'Ramesh Chand', farmerMobile: '9876543212', village: 'Nilokheri, Karnal', land: '4.5 Acres',
      cropKey: 'paddy_a', estimatedQty: 50.0, vehicleNo: 'HR-05-T-9812', arrivedLabel: '09:12 AM', minsAgo: 15,
      lane: 'Lane 2 (East Weighbridge)', qc: { status: 'PENDING' } },
    { tokenId: 'TK-1045', farmerId: 'FAR-2026-9044', farmerName: 'Gurpreet Singh', farmerMobile: '9876543210', village: 'Gharaunda, Karnal', land: '8.0 Acres',
      cropKey: 'wheat', estimatedQty: 75.0, vehicleNo: 'PB-11-F-4410', arrivedLabel: '09:25 AM', minsAgo: 8,
      lane: 'Lane 1 (North Weighbridge)', qc: { status: 'PENDING' } },
    { tokenId: 'TK-1048', farmerId: 'FAR-2026-7731', farmerName: 'Jagdish Prasad', farmerMobile: '9876543211', village: 'Taraori, Karnal', land: '6.2 Acres',
      cropKey: 'mustard', estimatedQty: 35.0, vehicleNo: 'HR-06-K-1029', arrivedLabel: '09:40 AM', minsAgo: 3,
      lane: 'Lane 2 (East Weighbridge)', qc: { status: 'PENDING' } },
    { tokenId: 'TK-1051', farmerId: 'FAR-2026-6629', farmerName: 'Rajeshwar Rao', farmerMobile: '9876543215', village: 'Indri, Karnal', land: '5.0 Acres',
      cropKey: 'maize', estimatedQty: 90.0, vehicleNo: 'HR-05-M-5520', arrivedLabel: '09:55 AM', minsAgo: 1,
      lane: 'Lane 1 (North Weighbridge)', qc: { status: 'PENDING' } },
    { tokenId: 'TK-0988', farmerId: 'FAR-2026-5120', farmerName: 'Baldev Singh', farmerMobile: '9876543219', village: 'Assandh, Karnal', land: '12.0 Acres',
      cropKey: 'wheat', estimatedQty: 60.0, vehicleNo: 'HR-05-AB-9102', arrivedLabel: '08:45 AM', minsAgo: 45,
      lane: 'Lane 1 (North Weighbridge)', qc: { status: 'PASSED_GRADE_A', moisture: 10.4, foreign: 0.3, damaged: 0.8 } }
  ];

  // Trolleys already weighed earlier today (drive the quota "actuals")
  const WEIGHED_SEEDS = [
    { tokenId: 'TK-0931', name: 'Balwinder Singh', village: 'Nilokheri, Karnal', cropKey: 'wheat', est: 62.0, gross: 70.45, tare: 8.30, vehicleNo: 'HR-05-B-3011', lane: 1, gateMins: 235, weighMins: 205 },
    { tokenId: 'TK-0934', name: 'Ram Prakash', village: 'Indri, Karnal', cropKey: 'paddy_a', est: 48.0, gross: 56.10, tare: 8.10, vehicleNo: 'HR-06-T-2204', lane: 2, gateMins: 215, weighMins: 188 },
    { tokenId: 'TK-0938', name: 'Gurmeet Kaur', village: 'Assandh, Karnal', cropKey: 'maize', est: 71.0, gross: 79.60, tare: 8.55, vehicleNo: 'HR-05-M-7710', lane: 1, gateMins: 190, weighMins: 160 },
    { tokenId: 'TK-0941', name: 'Devinder Sharma', village: 'Taraori, Karnal', cropKey: 'chana', est: 33.0, gross: 41.20, tare: 8.00, vehicleNo: 'HR-05-D-1188', lane: 2, gateMins: 160, weighMins: 134 },
    { tokenId: 'TK-0944', name: 'Satnam Singh', village: 'Gharaunda, Karnal', cropKey: 'mustard', est: 26.0, gross: 34.35, tare: 8.40, vehicleNo: 'PB-11-S-6402', lane: 1, gateMins: 130, weighMins: 108 },
    { tokenId: 'TK-0947', name: 'Om Prakash', village: 'Nilokheri, Karnal', cropKey: 'wheat', est: 58.0, gross: 66.60, tare: 8.20, vehicleNo: 'HR-05-O-9021', lane: 2, gateMins: 105, weighMins: 82 },
    { tokenId: 'TK-0952', name: 'Vijay Kumar', village: 'Indri, Karnal', cropKey: 'paddy_a', est: 80.0, gross: 88.70, tare: 8.60, vehicleNo: 'HR-06-V-5530', lane: 1, gateMins: 80, weighMins: 58 },
    { tokenId: 'TK-0955', name: 'Lakhwinder Singh', village: 'Assandh, Karnal', cropKey: 'wheat', est: 45.0, gross: 53.35, tare: 8.15, vehicleNo: 'HR-05-L-4417', lane: 2, gateMins: 62, weighMins: 50 }
  ];

  // Bookings that have not reached the gate yet
  const EXPECTED_SEEDS = [
    { tokenId: 'TK-1053', farmerId: 'FAR-2026-6710', farmerName: 'Harjinder Singh', farmerMobile: '9876543221', village: 'Nilokheri, Karnal',
      cropKey: 'wheat', estimatedQty: 45.0, vehicleNo: 'HR-05-C-3321', slotTime: 'Today 10:00 AM - 11:00 AM' },
    { tokenId: 'TK-1056', farmerId: 'FAR-2026-6788', farmerName: 'Mohan Lal', farmerMobile: '9876543222', village: 'Indri, Karnal',
      cropKey: 'paddy_a', estimatedQty: 65.0, vehicleNo: 'HR-06-T-2210', slotTime: 'Today 10:00 AM - 11:00 AM' },
    { tokenId: 'TK-1059', farmerId: 'FAR-2026-6802', farmerName: 'Suresh Kumar', farmerMobile: '9876543223', village: 'Taraori, Karnal',
      cropKey: 'mustard', estimatedQty: 28.0, vehicleNo: 'HR-05-K-7781', slotTime: 'Today 11:00 AM - 12:00 PM' },
    { tokenId: 'TK-1062', farmerId: 'FAR-2026-6851', farmerName: 'Anil Kumar', farmerMobile: '9876543224', village: 'Gharaunda, Karnal',
      cropKey: 'chana', estimatedQty: 40.0, vehicleNo: 'HR-05-M-4410', slotTime: 'Today 11:00 AM - 12:00 PM' }
  ];

  const STAGE_LABEL = {
    BOOKED: 'Expected',
    ARRIVED: 'At Gate • Awaiting Lab',
    QUALITY_INSPECTED: 'Quality Inspected',
    WEIGHMENT_COMPLETED: 'Weighed'
  };

  // ---------------------------------------------------------------------------------------------
  // Pure helpers
  // ---------------------------------------------------------------------------------------------

  const clone = (v) => JSON.parse(JSON.stringify(v));
  const round2 = (n) => Math.round(n * 100) / 100;

  function startOfDay(ts) {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  function hubIdFor(name) {
    if (!name) return null;
    const s = String(name).toLowerCase();
    const c = CENTRES.find((x) => s.includes(x.keyword));
    return c ? c.id : null;
  }

  function centreById(id) {
    return CENTRES.find((c) => c.id === id) || null;
  }

  function fmtTime(ts) {
    if (!ts) return '—';
    return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  function scaleIdFor(lane) {
    const m = /lane\s*(\d+)/i.exec(lane || '');
    return `WB-0${m ? m[1] : 1}`;
  }

  function buildCounters(centre) {
    const list = [];
    const labTotal = centre.lab.open + centre.lab.spare;
    for (let i = 1; i <= labTotal; i++) {
      list.push({ id: `${centre.id}-LAB-${i}`, type: 'lab', name: `Lab Counter ${i}`, open: i <= centre.lab.open, spare: i > centre.lab.open });
    }
    const weighTotal = centre.weigh.open + centre.weigh.spare;
    for (let i = 1; i <= weighTotal; i++) {
      const name = (centre.weighNames && centre.weighNames[i - 1]) || `Lane ${i} Weighbridge`;
      list.push({ id: `${centre.id}-WB-${i}`, type: 'weigh', name, open: i <= centre.weigh.open, spare: i > centre.weigh.open });
    }
    return list;
  }

  function quotaTargets(hubId) {
    const c = centreById(hubId);
    const out = {};
    Object.keys(CROPS).forEach((k) => {
      out[k] = c ? Math.round(c.dailyCapacityQtl * QUOTA_SHARE[k]) : 0;
    });
    return out;
  }

  // ---------------------------------------------------------------------------------------------
  // Store factory (storage + clock are injectable so the logic can be tested in node)
  // ---------------------------------------------------------------------------------------------

  function createStore(opts) {
    const ls = opts.storage;
    const nowFn = opts.now || (() => Date.now());

    function read(key, fallback) {
      try {
        const raw = ls.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (e) {
        return fallback;
      }
    }

    function write(key, value) {
      ls.setItem(key, JSON.stringify(value));
    }

    // ----- Farmer portal records -----
    function readBatches() {
      const v = read(KEYS.batches, null);
      return Array.isArray(v) ? v : clone(DEFAULT_FARMER_BATCHES);
    }

    function writeBatches(batches) {
      write(KEYS.batches, batches);
    }

    function updateBatchByToken(tokenId, patch) {
      const batches = readBatches();
      const b = batches.find((x) => x.token === tokenId || x.id === tokenId);
      if (!b) return false;
      Object.assign(b, typeof patch === 'function' ? patch(b) : patch);
      writeBatches(batches);
      return true;
    }

    // ----- Quality Lab samples -----
    function qcSeedSamples(now) {
      return SEED_TROLLEYS.map((t) => ({
        tokenId: t.tokenId,
        farmerId: t.farmerId,
        farmerName: t.farmerName,
        farmerMobile: t.farmerMobile,
        village: t.village,
        land: t.land,
        cropKey: t.cropKey,
        cropName: CROPS[t.cropKey].name,
        estimatedQty: t.estimatedQty,
        vehicleNo: t.vehicleNo,
        arrivedTime: t.arrivedLabel,
        hubName: centreById(GATE_HUB_ID).short,
        status: t.qc.status,
        testedMoisture: t.qc.moisture !== undefined ? t.qc.moisture : null,
        testedForeignMatter: t.qc.foreign !== undefined ? t.qc.foreign : null,
        testedDamagedGrain: t.qc.damaged !== undefined ? t.qc.damaged : null,
        assignedLane: t.lane,
        timestamp: now - t.minsAgo * 60000
      }));
    }

    function readQcSamples() {
      const v = read(KEYS.qc, null);
      return Array.isArray(v) ? v : qcSeedSamples(nowFn());
    }

    function writeQcSamples(list) {
      write(KEYS.qc, list);
    }

    function appendQcSample(sample) {
      const list = readQcSamples();
      if (list.some((s) => s.tokenId === sample.tokenId)) return false;
      list.push(sample);
      writeQcSamples(list);
      return true;
    }

    // ----- Gate state -----
    function seedGateState(now) {
      const entries = {};
      SEED_TROLLEYS.forEach((t) => {
        entries[t.tokenId] = {
          hubId: GATE_HUB_ID, vehicleNo: t.vehicleNo, lane: t.lane, gateInAt: now - t.minsAgo * 60000, operator: OPERATOR_ID,
          farmer: { farmerId: t.farmerId, farmerName: t.farmerName, farmerMobile: t.farmerMobile, village: t.village },
          cropKey: t.cropKey, estimatedQty: t.estimatedQty, slotTime: 'Today 09:00 AM - 10:00 AM', bookedHubId: GATE_HUB_ID
        };
      });
      WEIGHED_SEEDS.forEach((w, i) => {
        const lane = w.lane === 1 ? 'Lane 1 (North Weighbridge)' : 'Lane 2 (East Weighbridge)';
        entries[w.tokenId] = {
          hubId: GATE_HUB_ID, vehicleNo: w.vehicleNo, lane, gateInAt: now - w.gateMins * 60000, operator: OPERATOR_ID, seeded: true,
          farmer: { farmerId: `FAR-2026-${4100 + i * 13}`, farmerName: w.name, farmerMobile: `98765432${30 + i}`, village: w.village },
          cropKey: w.cropKey, estimatedQty: w.est, slotTime: 'Today 08:00 AM - 09:00 AM', bookedHubId: GATE_HUB_ID,
          weighment: { gross: w.gross, tare: w.tare, net: round2(w.gross - w.tare), scaleId: scaleIdFor(lane), at: now - w.weighMins * 60000 }
        };
      });
      return {
        version: 1,
        seededAt: now,
        entries,
        expected: EXPECTED_SEEDS.map((e) => Object.assign({ hubId: GATE_HUB_ID }, e))
      };
    }

    function getGateState() {
      const s = read(KEYS.gate, null);
      if (s && s.entries && Array.isArray(s.expected)) return s;
      const fresh = seedGateState(nowFn());
      write(KEYS.gate, fresh);
      return fresh;
    }

    function saveGateState(state) {
      write(KEYS.gate, state);
    }

    // ----- Admin state -----
    function seedAdminState() {
      const counters = {};
      CENTRES.forEach((c) => { counters[c.id] = buildCounters(c); });
      return { version: 1, counters, alerts: [], activeAlerts: {} };
    }

    function getAdminState() {
      const s = read(KEYS.admin, null);
      if (s && s.counters && Array.isArray(s.alerts)) return s;
      const fresh = seedAdminState();
      write(KEYS.admin, fresh);
      return fresh;
    }

    function saveAdminState(state) {
      write(KEYS.admin, state);
    }

    function countersFor(hubId) {
      return getAdminState().counters[hubId] || [];
    }

    function setCounterOpen(hubId, counterId, open) {
      const admin = getAdminState();
      const list = admin.counters[hubId] || [];
      const c = list.find((x) => x.id === counterId);
      if (!c) return { ok: false, error: 'Counter not found' };
      if (!open && c.open) {
        const stillOpen = list.filter((x) => x.type === c.type && x.open && x.id !== counterId).length;
        if (stillOpen === 0) return { ok: false, error: `Cannot close the last open ${c.type === 'lab' ? 'moisture counter' : 'weighbridge lane'}` };
      }
      c.open = !!open;
      saveAdminState(admin);
      return { ok: true, counter: c };
    }

    // ----- Merged token view -----
    function readAuthUser() {
      return read(KEYS.authUser, null);
    }

    function resolveFarmer(q, entry, exp) {
      if (q && q.farmerName) {
        return { farmerId: q.farmerId, farmerName: q.farmerName, farmerMobile: q.farmerMobile, village: q.village };
      }
      if (entry && entry.farmer) return entry.farmer;
      if (exp) return { farmerId: exp.farmerId, farmerName: exp.farmerName, farmerMobile: exp.farmerMobile, village: exp.village };
      // Portal bookings carry no identity: use the logged-in farmer, else the portal's default profile
      const u = readAuthUser();
      if (u && u.name) return { farmerId: u.id, farmerName: u.name, farmerMobile: u.phone, village: u.village };
      return { farmerId: 'FAR-2026-8812', farmerName: 'Ramesh Chand', farmerMobile: '9876543212', village: 'Nilokheri (Karnal)' };
    }

    function guessCropKey(label) {
      const s = String(label || '').toLowerCase();
      if (s.includes('wheat')) return 'wheat';
      if (s.includes('maize')) return 'maize';
      if (s.includes('chana') || s.includes('gram')) return 'chana';
      if (s.includes('mustard') || s.includes('sarson')) return 'mustard';
      return 'paddy_a';
    }

    function gradeLabel(status) {
      if (status === 'PASSED_GRADE_A') return 'Grade A';
      if (status === 'PASSED_DEDUCTION') return 'Grade B';
      if (status === 'REJECTED') return 'Rejected';
      return null;
    }

    function getTokens() {
      const batches = readBatches();
      const qc = readQcSamples();
      const gate = getGateState();

      const batchBy = {};
      batches.forEach((b) => { if (b.token) batchBy[b.token] = b; });
      const qcBy = {};
      qc.forEach((s) => { qcBy[s.tokenId] = s; });
      const expBy = {};
      gate.expected.forEach((e) => { expBy[e.tokenId] = e; });

      const ids = new Set([].concat(Object.keys(batchBy), Object.keys(qcBy), Object.keys(gate.entries), Object.keys(expBy)));
      const out = [];

      ids.forEach((id) => {
        const b = batchBy[id];
        const q = qcBy[id];
        const entry = gate.entries[id];
        const exp = expBy[id];

        const farmer = resolveFarmer(q, entry, exp);
        const cropKey = (q && q.cropKey) || (entry && entry.cropKey) || (exp && exp.cropKey) || (b && (b.cropKey || guessCropKey(b.crop))) || 'paddy_a';
        const estimatedQty = firstNumber(q && q.estimatedQty, entry && entry.estimatedQty, exp && exp.estimatedQty, b && b.qty);
        const hubId = (entry && entry.hubId) || hubIdFor(q && q.hubName) || (exp && exp.hubId) || hubIdFor(b && b.centre) || null;
        const weighment = (entry && entry.weighment) || null;
        const qcStatus = q ? q.status : null;
        const tested = !!q && q.status !== 'PENDING';

        let status = 'BOOKED';
        if (weighment) status = 'WEIGHMENT_COMPLETED';
        else if (tested) status = 'QUALITY_INSPECTED';
        else if (entry || q) status = 'ARRIVED';

        const passed = tested ? q.status !== 'REJECTED' : null;
        const rate = (b && b.rate) || CROPS[cropKey].msp;
        const net = weighment ? weighment.net : null;
        const centre = centreById(hubId);

        out.push({
          tokenId: id,
          farmerId: farmer.farmerId,
          farmerName: farmer.farmerName,
          farmerMobile: farmer.farmerMobile,
          village: farmer.village,
          cropKey,
          cropName: CROPS[cropKey].name,
          estimatedQty,
          hubId,
          hubName: centre ? centre.name : ((q && q.hubName) || (b && b.centre) || '—'),
          slotTime: (exp && exp.slotTime) || (entry && entry.slotTime) || (b && b.slot) || '—',
          vehicleNo: (entry && entry.vehicleNo) || (q && q.vehicleNo) || (b && b.vehicleNo) || (exp && exp.vehicleNo) || '',
          lane: (entry && entry.lane) || (q && q.assignedLane) || null,
          status,
          qcOutcome: tested ? qcStatus : null,
          statusTimeline: {
            bookedAt: null,
            gateInAt: entry ? entry.gateInAt : (q ? q.timestamp : null),
            labTestedAt: null,
            weighedAt: weighment ? weighment.at : null,
            paidAt: null
          },
          qualityReport: tested ? {
            moisturePct: q.testedMoisture,
            foreignMatterPct: q.testedForeignMatter,
            damagedGrainPct: q.testedDamagedGrain,
            grade: gradeLabel(q.status),
            passed,
            inspectorId: null
          } : null,
          weighmentReport: weighment ? {
            grossWeightQtl: weighment.gross,
            tareWeightQtl: weighment.tare,
            netWeightQtl: weighment.net,
            scaleId: weighment.scaleId
          } : null,
          weighing: (entry && entry.weighing) || null,
          financials: {
            mspPerQtl: rate,
            totalAmount: Math.round((net !== null ? net : estimatedQty) * rate),
            dbtStatus: (b && b.dbtStatus) || null
          },
          simulated: !!(entry && entry.simulated),
          weighedToday: !!weighment && (weighment.at >= startOfDay(nowFn()) || !!(entry && entry.seeded)),
          inYard: !weighment && (status === 'ARRIVED' || (status === 'QUALITY_INSPECTED' && passed === true))
        });
      });

      return out;
    }

    function firstNumber() {
      for (let i = 0; i < arguments.length; i++) {
        const v = arguments[i];
        if (typeof v === 'number' && !isNaN(v)) return v;
      }
      return 0;
    }

    function getToken(tokenId) {
      const id = String(tokenId || '').trim().toUpperCase();
      return getTokens().find((t) => t.tokenId.toUpperCase() === id) || null;
    }

    // ----- Gate & weighbridge actions -----
    function pickLane(hubId) {
      const open = countersFor(hubId).filter((c) => c.type === 'weigh' && c.open);
      if (!open.length) return null;
      const tokens = getTokens().filter((t) => t.hubId === hubId && t.inYard);
      let best = null;
      let bestLoad = Infinity;
      open.forEach((c) => {
        const load = tokens.filter((t) => t.lane === c.name).length;
        if (load < bestLoad) { best = c.name; bestLoad = load; }
      });
      return best;
    }

    function weighReadiness(tk) {
      if (!tk) return { ok: false, reason: 'Token not found' };
      if (tk.status === 'BOOKED') return { ok: false, reason: 'Vehicle has not been checked in at the gate' };
      if (tk.status === 'ARRIVED') return { ok: false, reason: 'Awaiting quality test in the Moisture Lab' };
      if (tk.status === 'QUALITY_INSPECTED' && tk.qcOutcome === 'REJECTED') {
        return { ok: false, reason: 'Quality rejected — direct farmer to the drying platform, then re-test' };
      }
      if (tk.status === 'WEIGHMENT_COMPLETED') return { ok: false, reason: 'Weighment already completed' };
      return { ok: true, reason: '' };
    }

    function checkIn(tokenId, o) {
      const tk = getToken(tokenId);
      if (!tk) return { ok: false, error: 'Token not found' };
      if (tk.status !== 'BOOKED') return { ok: false, error: `Token ${tk.tokenId} is already ${STAGE_LABEL[tk.status].toLowerCase()}` };
      const vehicleNo = String((o && o.vehicleNo) || '').trim().toUpperCase();
      if (!vehicleNo) return { ok: false, error: 'Enter the vehicle / trolley registration number' };
      const lane = o && o.lane;
      const hubId = (o && o.hubId) || GATE_HUB_ID;
      if (!lane) return { ok: false, error: 'No open weighbridge lane available — ask the Mandi Secretary to open one' };

      const now = nowFn();
      const gate = getGateState();
      gate.entries[tk.tokenId] = {
        hubId, vehicleNo, lane, gateInAt: now, operator: OPERATOR_ID,
        farmer: { farmerId: tk.farmerId, farmerName: tk.farmerName, farmerMobile: tk.farmerMobile, village: tk.village },
        cropKey: tk.cropKey, estimatedQty: tk.estimatedQty, slotTime: tk.slotTime, bookedHubId: tk.hubId
      };
      gate.expected = gate.expected.filter((e) => e.tokenId !== tk.tokenId);
      saveGateState(gate);

      appendQcSample({
        tokenId: tk.tokenId, farmerId: tk.farmerId, farmerName: tk.farmerName, farmerMobile: tk.farmerMobile,
        village: tk.village, land: '—', cropKey: tk.cropKey, cropName: tk.cropName, estimatedQty: tk.estimatedQty,
        vehicleNo, arrivedTime: fmtTime(now), hubName: (centreById(hubId) || centreById(GATE_HUB_ID)).short,
        status: 'PENDING', testedMoisture: null, testedForeignMatter: null, testedDamagedGrain: null,
        assignedLane: lane, timestamp: now
      });

      updateBatchByToken(tk.tokenId, (b) => ({
        step: Math.max(b.step || 1, 2),
        status: 'Arrived at Gate (Awaiting Quality Test)',
        vehicleNo,
        lane
      }));

      return { ok: true, entry: gate.entries[tk.tokenId] };
    }

    function saveWeighing(tokenId, partial) {
      const gate = getGateState();
      const entry = gate.entries[tokenId];
      if (!entry) return false;
      entry.weighing = Object.assign({}, entry.weighing, partial);
      saveGateState(gate);
      return true;
    }

    function recordWeighment(tokenId, o) {
      const tk = getToken(tokenId);
      const ready = weighReadiness(tk);
      if (!ready.ok) return { ok: false, error: ready.reason };
      const gross = Number(o && o.gross);
      const tare = Number(o && o.tare);
      if (!(gross > 0) || !(tare >= 0)) return { ok: false, error: 'Capture both the gross and tare weights first' };
      if (gross <= tare) return { ok: false, error: 'Gross weight must be greater than tare weight' };

      const now = nowFn();
      const gate = getGateState();
      const entry = gate.entries[tk.tokenId];
      const net = round2(gross - tare);
      entry.weighment = { gross: round2(gross), tare: round2(tare), net, scaleId: scaleIdFor(entry.lane), at: now };
      delete entry.weighing;
      saveGateState(gate);

      updateBatchByToken(tk.tokenId, (b) => ({
        step: Math.max(b.step || 1, 4),
        status: 'Weighment Completed (J-Form Pending)',
        qty: net,
        total: Math.round(net * (b.rate || CROPS[tk.cropKey].msp)),
        weighment: { gross: round2(gross), tare: round2(tare), net }
      }));

      return { ok: true, weighment: entry.weighment };
    }

    // ----- Admin simulation helpers -----
    function simulateSurge(hubId, count) {
      const gate = getGateState();
      const now = nowFn();
      const cropKeys = Object.keys(CROPS);
      let seq = Object.keys(gate.entries).filter((k) => k.indexOf('SIM-') === 0).length;
      for (let i = 0; i < count; i++) {
        seq += 1;
        const id = `SIM-${String(seq).padStart(3, '0')}`;
        gate.entries[id] = {
          hubId, vehicleNo: id, lane: null, gateInAt: now - ((i * 3) % 8) * 60000, operator: 'SIMULATION', simulated: true,
          farmer: { farmerId: 'SIM', farmerName: 'Simulated Farmer', farmerMobile: '—', village: '—' },
          cropKey: cropKeys[i % cropKeys.length], estimatedQty: 40 + ((i * 7) % 50), slotTime: '—', bookedHubId: hubId
        };
      }
      saveGateState(gate);
      return count;
    }

    function clearSimulated() {
      const gate = getGateState();
      let n = 0;
      Object.keys(gate.entries).forEach((k) => {
        if (gate.entries[k].simulated) { delete gate.entries[k]; n += 1; }
      });
      saveGateState(gate);
      return n;
    }

    return {
      KEYS, CROPS, CENTRES, SERVICE_RATE_PER_HR, QUOTA_SHARE, GATE_HUB_ID, OPERATOR_ID, STAGE_LABEL, HOUR_MS,
      hubIdFor, centreById, fmtTime, scaleIdFor, quotaTargets, startOfDay, round2,
      readBatches, writeBatches, updateBatchByToken,
      readQcSamples, writeQcSamples, appendQcSample,
      getGateState, saveGateState, saveWeighing,
      getAdminState, saveAdminState, countersFor, setCounterOpen,
      getTokens, getToken, pickLane, weighReadiness, checkIn, recordWeighment,
      simulateSurge, clearSimulated,
      now: nowFn
    };
  }

  function browserStorage() {
    try {
      const probe = '__aq_probe__';
      root.localStorage.setItem(probe, '1');
      root.localStorage.removeItem(probe);
      return root.localStorage;
    } catch (e) {
      const mem = {};
      return { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } };
    }
  }

  const api = { createStore, KEYS, CENTRES, CROPS };

  if (typeof window !== 'undefined') {
    const store = createStore({ storage: browserStorage() });

    // Fire `cb` when another tab changes any AgriQueue key (the `storage` event never fires in the writing tab)
    store.onChange = function (cb) {
      const watched = Object.keys(KEYS).map((k) => KEYS[k]);
      window.addEventListener('storage', (e) => {
        if (e.key === null || watched.indexOf(e.key) !== -1) cb(e);
      });
    };

    root.AgriQueueStore = store;
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
