/**
 * SoMAp Finance Plans Module
 * Centralizes year-scoped finance reads and writes so every page
 * resolves class defaults, student overrides, and payment plans consistently.
 *
 * This module works with Firebase Realtime Database (compat SDK).
 * It exports helper functions for ESM consumers and also exposes a
 * `window.financePlansService` object so existing non-module scripts keep working.
 */

export const SOMAP_ALLOWED_YEARS = Array.from({ length: 20 }, (_, i) => 2023 + i); // 2023..2042
export const SOMAP_DEFAULT_YEAR = 2025;

const financeCache = new Map(); // year -> { data } or { promise }

const noop = () => {};

function toYearString(year) {
  const y = Number(year);
  if (Number.isFinite(y)) return String(y);
  return String(SOMAP_DEFAULT_YEAR);
}

function currentTimestamp() {
  return Date.now();
}

function withSchoolPrefix(path) {
  if (!path) return path;
  return window.currentSchoolId ? `schools/${window.currentSchoolId}/${path}` : path;
}

function getFirebaseDB() {
  if (window.db) return window.db;
  if (window.firebase?.database) {
    try {
      const db = window.firebase.database();
      window.db = db;
      return db;
    } catch (err) {
      console.error('financeplans: failed to init firebase database', err);
    }
  }
  throw new Error('Firebase database not initialized. Ensure firebase compat SDK + firebase.js loaded.');
}

export function getSelectedYear() {
  const fallback = SOMAP_DEFAULT_YEAR;
  try {
    const ctx = window.somapYearContext;
    if (ctx && typeof ctx.getSelectedYear === 'function') {
      return String(ctx.getSelectedYear() || fallback);
    }
  } catch (_) {
    /* ignore */
  }
  return String(fallback);
}

export function pathFinance(year = getSelectedYear()) {
  const yearStr = toYearString(year);
  return withSchoolPrefix(`finance/${yearStr}`);
}

function pathFinanceLedgers(year = getSelectedYear()) {
  const yearStr = toYearString(year);
  return withSchoolPrefix(`financeLedgers/${yearStr}`);
}

function pathFinanceCarry(year = getSelectedYear()) {
  const yearStr = toYearString(year);
  return withSchoolPrefix(`financeCarryForward/${yearStr}`);
}

function normalizeKey(value) {
  return String(value || '').trim().toLowerCase();
}

function findClassConfig(classes = {}, className) {
  if (!className) return null;
  if (classes[className]) return classes[className];
  const target = normalizeKey(className);
  for (const [name, cfg] of Object.entries(classes)) {
    if (normalizeKey(name) === target) return cfg;
  }
  return null;
}

function ensureCacheEntry(year) {
  const key = toYearString(year);
  const entry = financeCache.get(key);
  if (entry && entry.data) return entry;
  if (entry && entry.promise) return entry;
  financeCache.set(key, {});
  return financeCache.get(key);
}

async function ensureFinanceData(year = getSelectedYear()) {
  const key = toYearString(year);
  const entry = ensureCacheEntry(key);
  if (entry.data) return entry.data;
  if (!entry.promise) {
    const db = getFirebaseDB();
    const basePath = pathFinance(key);
    const promise = Promise.all([
      db.ref(`${basePath}/classes`).once('value'),
      db.ref(`${basePath}/plans`).once('value'),
      db.ref(`${basePath}/studentFees`).once('value'),
      db.ref(`${basePath}/studentPlans`).once('value'),
    ]).then(([classesSnap, plansSnap, feesSnap, planSnap]) => {
      const data = {
        classes: classesSnap.val() || {},
        plans: plansSnap.val() || {},
        studentFees: feesSnap.val() || {},
        studentPlans: planSnap.val() || {},
      };
      entry.data = data;
      delete entry.promise;
      return data;
    }).catch((err) => {
      financeCache.delete(key);
      throw err;
    });
    entry.promise = promise;
  }
  return entry.promise;
}

function invalidateFinanceCache(year = getSelectedYear()) {
  const key = toYearString(year);
  financeCache.delete(key);
}

export async function readClassConfig(className, options = {}) {
  const year = options.year ? toYearString(options.year) : getSelectedYear();
  const data = await ensureFinanceData(year);
  const cfg = findClassConfig(data.classes, className);
  return cfg ? { ...cfg } : null;
}

export async function readStudentFeeOverride(studentId, options = {}) {
  if (!studentId) return null;
  const year = options.year ? toYearString(options.year) : getSelectedYear();
  const data = await ensureFinanceData(year);
  const override = data.studentFees?.[studentId];
  return override ? { ...override } : null;
}

export async function readStudentPlanOverride(studentId, options = {}) {
  if (!studentId) return null;
  const year = options.year ? toYearString(options.year) : getSelectedYear();
  const data = await ensureFinanceData(year);
  const override = data.studentPlans?.[studentId];
  return override ? { ...override } : null;
}

export async function readPlan(planId, options = {}) {
  if (!planId) return null;
  const year = options.year ? toYearString(options.year) : getSelectedYear();
  const entry = ensureCacheEntry(year);
  if (entry.data && entry.data.plans && entry.data.plans[planId]) {
    return { ...entry.data.plans[planId] };
  }
  const db = getFirebaseDB();
  const basePath = pathFinance(year);
  const snap = await db.ref(`${basePath}/plans/${planId}`).once('value');
  const val = snap.val() || null;
  if (entry.data) {
    entry.data.plans = entry.data.plans || {};
    entry.data.plans[planId] = val || null;
  }
  return val;
}

function coerceNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export async function resolveEffectiveFinance(studentId, className, options = {}) {
  const year = options.year ? toYearString(options.year) : getSelectedYear();
  const anchorClass = options.anchorClass || null;
  const data = await ensureFinanceData(year);
  const classCfg =
    findClassConfig(data.classes, className) ||
    (anchorClass ? findClassConfig(data.classes, anchorClass) : null);

  const override = data.studentFees?.[studentId] || null;
  const overrideLocked = override ? (override.locked === undefined ? true : Boolean(override.locked)) : false;
  const fee = override && overrideLocked
    ? coerceNumber(override.feePerYear, 0)
    : coerceNumber(classCfg?.feePerYear, 0);

  const planOverride = data.studentPlans?.[studentId] || null;
  let planId = planOverride?.planId || classCfg?.defaultPlanId || classCfg?.defaultPlan || null;

  return {
    fee,
    planId: planId || null,
    classCfg: classCfg ? { ...classCfg } : null,
    feeOverride: override ? { ...override } : null,
    planOverride: planOverride ? { ...planOverride } : null,
    year,
  };
}

export async function upsertClassFeeAndPlan(className, feePerYear, defaultPlanId, meta = {}) {
  if (!className) throw new Error('className required');
  const year = meta.year ? toYearString(meta.year) : getSelectedYear();
  const db = getFirebaseDB();
  const payload = {
    updatedAt: currentTimestamp(),
    updatedBy: meta.by || window.currentUserId || 'system',
  };
  if (feePerYear !== null && feePerYear !== undefined) {
    payload.feePerYear = coerceNumber(feePerYear, 0);
  }
  if (defaultPlanId !== null && defaultPlanId !== undefined) {
    payload.defaultPlanId = defaultPlanId || null;
  }
  await db.ref(`${pathFinance(year)}/classes/${className}`).update(payload);
  invalidateFinanceCache(year);
  return payload;
}

export async function setClassFeePerYear(className, feePerYear, meta = {}) {
  return upsertClassFeeAndPlan(className, feePerYear, null, meta);
}

export async function setClassDefaultPlanId(className, planId, meta = {}) {
  return upsertClassFeeAndPlan(className, null, planId, meta);
}

export async function getClassFeePerYear(className, options = {}) {
  const cfg = await readClassConfig(className, options);
  return cfg && cfg.feePerYear !== undefined ? coerceNumber(cfg.feePerYear, 0) : 0;
}

export async function getClassDefaultPlanId(className, options = {}) {
  const cfg = await readClassConfig(className, options);
  return cfg ? (cfg.defaultPlanId || cfg.defaultPlan || null) : null;
}

export async function setStudentFeeOverride(studentId, feePerYear, locked = false, meta = {}) {
  if (!studentId) throw new Error('studentId required');
  const year = meta.year ? toYearString(meta.year) : getSelectedYear();
  const db = getFirebaseDB();
  const ref = db.ref(`${pathFinance(year)}/studentFees/${studentId}`);

  if (feePerYear === null || feePerYear === undefined || Number(feePerYear) === 0) {
    await ref.remove();
    invalidateFinanceCache(year);
    return null;
  }

  const payload = {
    feePerYear: coerceNumber(feePerYear, 0),
    locked: Boolean(locked),
    updatedAt: currentTimestamp(),
    updatedBy: meta.by || window.currentUserId || 'system',
  };
  await ref.set(payload);
  invalidateFinanceCache(year);
  return payload;
}

export async function setStudentPlanOverride(studentId, planId, meta = {}) {
  if (!studentId) throw new Error('studentId required');
  const year = meta.year ? toYearString(meta.year) : getSelectedYear();
  const db = getFirebaseDB();
  const ref = db.ref(`${pathFinance(year)}/studentPlans/${studentId}`);

  if (!planId) {
    await ref.remove();
    invalidateFinanceCache(year);
    return null;
  }

  const payload = {
    planId,
    updatedAt: currentTimestamp(),
    updatedBy: meta.by || window.currentUserId || 'system',
  };
  await ref.set(payload);
  invalidateFinanceCache(year);
  return payload;
}

export async function setStudentFee(studentId, feePerYear, meta = {}) {
  // Legacy alias expected by existing pages; defaults locked=true
  return setStudentFeeOverride(studentId, feePerYear, true, meta);
}

export async function getStudentFee(studentId, options = {}) {
  const override = await readStudentFeeOverride(studentId, options);
  if (!override) return null;
  return override.feePerYear !== undefined ? coerceNumber(override.feePerYear, 0) : null;
}

export async function assignStudentPlan(studentId, planId, meta = {}) {
  return setStudentPlanOverride(studentId, planId, meta);
}

export async function getStudentPlan(studentId, options = {}) {
  const override = await readStudentPlanOverride(studentId, options);
  return override ? (override.planId || null) : null;
}

export async function upsertPlan(planId, payload = {}, meta = {}) {
  if (!planId) throw new Error('planId required');
  const year = meta.year ? toYearString(meta.year) : getSelectedYear();
  const db = getFirebaseDB();
  const enriched = {
    ...payload,
    updatedAt: currentTimestamp(),
    updatedBy: meta.by || window.currentUserId || 'system',
  };
  await db.ref(`${pathFinance(year)}/plans/${planId}`).set(enriched);
  invalidateFinanceCache(year);
  return enriched;
}

export async function getAllPlans(options = {}) {
  const year = options.year ? toYearString(options.year) : getSelectedYear();
  const data = await ensureFinanceData(year);
  return { ...data.plans };
}

export async function setCustomSchedule(studentId, rows, note = '', meta = {}) {
  if (!studentId) throw new Error('studentId required');
  const year = meta.year ? toYearString(meta.year) : getSelectedYear();
  const db = getFirebaseDB();
  const payload = {
    rows: Array.isArray(rows) ? rows : [],
    note: String(note || ''),
    updatedAt: currentTimestamp(),
    updatedBy: meta.by || window.currentUserId || 'system',
  };
  await db.ref(`${pathFinance(year)}/studentCustomSchedules/${studentId}`).set(payload);
  return payload;
}

export async function getCustomSchedule(studentId, options = {}) {
  if (!studentId) return null;
  const year = options.year ? toYearString(options.year) : getSelectedYear();
  const db = getFirebaseDB();
  const snap = await db.ref(`${pathFinance(year)}/studentCustomSchedules/${studentId}`).once('value');
  const val = snap.val() || null;
  if (!val || !Array.isArray(val.rows) || !val.rows.length) return null;
  return val;
}

export async function getStudentLedger(studentId, options = {}) {
  if (!studentId) return {};
  const year = options.year ? toYearString(options.year) : getSelectedYear();
  const db = getFirebaseDB();
  const snap = await db.ref(`${pathFinanceLedgers(year)}/${studentId}`).once('value');
  return snap.val() || {};
}

export async function getStudentCarryForward(studentId, options = {}) {
  if (!studentId) return 0;
  const year = options.year ? toYearString(options.year) : getSelectedYear();
  const db = getFirebaseDB();
  const snap = await db.ref(`${pathFinanceCarry(year)}/${studentId}`).once('value');
  const val = snap.val() || {};
  return coerceNumber(val.amount ?? val.balance ?? 0, 0);
}

export const financePlansService = {
  SOMAP_ALLOWED_YEARS,
  SOMAP_DEFAULT_YEAR,
  getSelectedYear,
  pathFinance,
  readClassConfig,
  readStudentFeeOverride,
  readStudentPlanOverride,
  readPlan,
  upsertClassFeeAndPlan,
  setClassFeePerYear,
  setClassDefaultPlanId,
  getClassFeePerYear,
  getClassDefaultPlanId,
  setStudentFeeOverride,
  setStudentPlanOverride,
  setStudentFee,
  getStudentFee,
  assignStudentPlan,
  getStudentPlan,
  resolveEffectiveFinance,
  upsertPlan,
  getAllPlans,
  readPlanById: readPlan,
  setCustomSchedule,
  getCustomSchedule,
  getStudentLedger,
  getStudentCarryForward,
  invalidateCache: invalidateFinanceCache,
  getDB: () => {
    try { return getFirebaseDB(); } catch (err) { console.error(err); return null; }
  },
};

if (typeof window !== 'undefined') {
  window.financePlansService = window.financePlansService || financePlansService;
}

export default financePlansService;

