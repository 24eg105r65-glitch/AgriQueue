/**
 * AgriQueue: Queue Engine (SIH26032)
 * Erlang-C (M/M/c) wait-time model used by the Mandi Admin portal (Module 4).
 * Pure functions: no DOM, no storage. Rates are per hour, waits are in minutes.
 */

(function (root) {
  'use strict';

  /**
   * Steady-state M/M/c queue.
   * @param {number} lambdaPerHr arrivals per hour
   * @param {number} muPerHr     service rate of ONE server (trolleys per hour)
   * @param {number} servers     number of open servers (counters / lanes)
   * @returns {{rho:number, pWait:number, wqMin:number, overloaded:boolean}}
   */
  function erlangC(lambdaPerHr, muPerHr, servers) {
    const c = Math.floor(servers);
    if (!(muPerHr > 0) || c < 1) {
      return { rho: Infinity, pWait: 1, wqMin: Infinity, overloaded: true };
    }
    if (!(lambdaPerHr > 0)) {
      return { rho: 0, pWait: 0, wqMin: 0, overloaded: false };
    }

    const a = lambdaPerHr / muPerHr; // offered load in Erlangs
    const rho = a / c;
    if (rho >= 1) {
      return { rho, pWait: 1, wqMin: Infinity, overloaded: true };
    }

    // Erlang-B by recurrence (numerically stable), then convert to Erlang-C
    let b = 1;
    for (let k = 1; k <= c; k++) b = (a * b) / (k + a * b);
    const pWait = b / (1 - rho * (1 - b));
    const wqMin = (pWait / (c * muPerHr - lambdaPerHr)) * 60;
    return { rho, pWait, wqMin, overloaded: false };
  }

  /**
   * Minutes until a server frees up for a trolley joining behind `inSystem` others
   * (waiting + being served). Zero while a server is idle.
   */
  function backlogWaitMin(inSystem, muPerHr, servers) {
    const c = Math.floor(servers);
    if (!(muPerHr > 0) || c < 1) return Infinity;
    if (inSystem < c) return 0;
    return ((inSystem - c + 1) / (c * muPerHr)) * 60;
  }

  /**
   * Predicted wait = the larger of the steady-state model and the current backlog.
   * The model reacts to the arrival rate, the backlog reacts to the trolleys actually queued.
   */
  function estimateWait(p) {
    const model = erlangC(p.lambdaPerHr, p.muPerHr, p.servers);
    const backlog = backlogWaitMin(p.inSystem || 0, p.muPerHr, p.servers);
    return {
      rho: model.rho,
      overloaded: model.overloaded || backlog === Infinity,
      modelWaitMin: model.wqMin,
      backlogWaitMin: backlog,
      waitMin: Math.max(model.wqMin, backlog)
    };
  }

  /** What would opening one more counter do to the predicted wait? */
  function whatIfExtraCounter(p) {
    return {
      before: estimateWait(p),
      after: estimateWait(Object.assign({}, p, { servers: p.servers + 1 }))
    };
  }

  const api = { erlangC, backlogWaitMin, estimateWait, whatIfExtraCounter };
  root.AgriQueueEngine = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
