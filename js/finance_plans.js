/**
 * Unified Finance Plans Service
 * Provides consistent read/write functions for fee plans, class defaults, and student overrides
 * All operations are scoped to the selected academic year
 */

// Year range constants
const SOMAP_ALLOWED_YEARS = Array.from({ length: 20 }, (_, i) => 2023 + i);
const SOMAP_DEFAULT_YEAR = 2025;

/**
 * Get the currently selected year from the global year context
 */
async function getYear() {
  return String(window.somapYearContext?.getSelectedYear?.() || SOMAP_DEFAULT_YEAR);
}

/**
 * Get the Firebase database reference root for finance data
 * Supports multi-school via window.currentSchoolId if present
 */
function financeRoot(y) {
  const year = String(y || SOMAP_DEFAULT_YEAR);
  const basePath = window.currentSchoolId 
    ? `schools/${window.currentSchoolId}/finance/${year}` 
    : `finance/${year}`;
  
  // Fallback to old structure if new structure doesn't exist
  // This allows gradual migration
  const oldBasePath = window.currentSchoolId
    ? `schools/${window.currentSchoolId}`
    : '';
  
  let db = window.db;
  if (!db && typeof firebase !== 'undefined' && firebase.database) {
    try {
      db = firebase.database();
    } catch (e) {
      console.error('Firebase database initialization error:', e);
    }
  }
  if (!db) {
    console.error('Firebase database not initialized. Ensure firebase.js or firebase SDK is loaded.');
    return null;
  }
  
  return {
    new: db.ref(basePath),
    old: {
      plans: db.ref(oldBasePath ? `${oldBasePath}/installmentPlans/${year}` : `installmentPlans/${year}`),
      classes: db.ref(oldBasePath ? `${oldBasePath}/feesStructure/${year}` : `feesStructure/${year}`),
      overrides: db.ref(oldBasePath ? `${oldBasePath}/studentOverrides/${year}` : `studentOverrides/${year}`),
      ledgers: db.ref(oldBasePath ? `${oldBasePath}/financeLedgers/${year}` : `financeLedgers/${year}`),
      carryForward: db.ref(oldBasePath ? `${oldBasePath}/financeCarryForward/${year}` : `financeCarryForward/${year}`)
    }
  };
}

/**
 * Get class default plan ID
 * Reads from /finance/{year}/classes/{className}/defaultPlanId or fallback paths
 */
async function getClassDefaultPlanId(className) {
  const y = await getYear();
  const root = financeRoot(y);
  if (!root) return null;
  
  try {
    // Try new structure first
    const snap = await root.new.child(`classes/${className}/defaultPlanId`).once('value');
    const val = snap.val();
    if (val) return val;
    
    // Fallback to old structure
    const oldSnap = await root.old.classes.child(className).once('value');
    const oldData = oldSnap.val() || {};
    return oldData.defaultPlanId || oldData.defaultPlan || null;
  } catch (err) {
    console.error('Error reading class default plan:', err);
    return null;
  }
}

/**
 * Set class default plan ID
 * Writes to /finance/{year}/classes/{className}/defaultPlanId
 */
async function setClassDefaultPlanId(className, planId, meta = {}) {
  const y = await getYear();
  const root = financeRoot(y);
  if (!root) throw new Error('Database not initialized');
  
  const updates = {
    defaultPlanId: planId,
    updatedAt: Date.now(),
    updatedBy: meta.by || window.currentUserId || 'system'
  };
  
  // Write to new structure
  await root.new.child(`classes/${className}`).update(updates);
  
  // Also update old structure for backward compatibility during migration
  await root.old.classes.child(className).update({
    defaultPlanId: planId,
    defaultPlan: planId,
    updatedAt: updates.updatedAt,
    updatedBy: updates.updatedBy
  });
  
  return updates;
}

/**
 * Get class fee per year
 */
async function getClassFeePerYear(className) {
  const y = await getYear();
  const root = financeRoot(y);
  if (!root) return 0;
  
  try {
    // Try new structure first
    const snap = await root.new.child(`classes/${className}/feePerYear`).once('value');
    const val = snap.val();
    if (val !== null && val !== undefined) return Number(val) || 0;
    
    // Fallback to old structure
    const oldSnap = await root.old.classes.child(className).once('value');
    const oldData = oldSnap.val() || {};
    return Number(oldData.feePerYear || 0);
  } catch (err) {
    console.error('Error reading class fee:', err);
    return 0;
  }
}

/**
 * Set class fee per year
 */
async function setClassFeePerYear(className, feePerYear, meta = {}) {
  const y = await getYear();
  const root = financeRoot(y);
  if (!root) throw new Error('Database not initialized');
  
  const updates = {
    feePerYear: Number(feePerYear) || 0,
    updatedAt: Date.now(),
    updatedBy: meta.by || window.currentUserId || 'system'
  };
  
  // Write to new structure
  await root.new.child(`classes/${className}`).update(updates);
  
  // Also update old structure
  await root.old.classes.child(className).update(updates);
  
  return updates;
}

/**
 * Upsert a plan blueprint
 * Writes to /finance/{year}/plans/{planId}
 */
async function upsertPlan(planId, planObj) {
  const y = await getYear();
  const root = financeRoot(y);
  if (!root) throw new Error('Database not initialized');
  
  const payload = {
    ...planObj,
    updatedAt: Date.now(),
    updatedBy: planObj.updatedBy || window.currentUserId || 'system',
    createdAt: planObj.createdAt || Date.now()
  };
  
  // Write to new structure
  await root.new.child(`plans/${planId}`).set(payload);
  
  // Also write to old structure for backward compatibility
  await root.old.plans.child(planId).set(payload);
  
  return payload;
}

/**
 * Get a plan blueprint
 * Reads from /finance/{year}/plans/{planId} or fallback paths
 */
async function getPlan(planId) {
  const y = await getYear();
  const root = financeRoot(y);
  if (!root) return null;
  
  try {
    // Try new structure first
    const snap = await root.new.child(`plans/${planId}`).once('value');
    const val = snap.val();
    if (val) return val;
    
    // Fallback to old structure
    const oldSnap = await root.old.plans.child(planId).once('value');
    return oldSnap.val() || null;
  } catch (err) {
    console.error('Error reading plan:', err);
    return null;
  }
}

/**
 * Get all plans for the current year
 */
async function getAllPlans() {
  const y = await getYear();
  const root = financeRoot(y);
  if (!root) return {};
  
  try {
    // Try new structure first
    const snap = await root.new.child('plans').once('value');
    const val = snap.val();
    if (val && Object.keys(val).length) return val;
    
    // Fallback to old structure
    const oldSnap = await root.old.plans.once('value');
    return oldSnap.val() || {};
  } catch (err) {
    console.error('Error reading plans:', err);
    return {};
  }
}

/**
 * Assign a plan to a student (override)
 * Writes to /finance/{year}/studentPlans/{studentId}
 */
async function assignStudentPlan(studentId, planId, meta = {}) {
  const y = await getYear();
  const root = financeRoot(y);
  if (!root) throw new Error('Database not initialized');
  
  const payload = {
    planId,
    updatedAt: Date.now(),
    updatedBy: meta.by || window.currentUserId || 'system'
  };
  
  // Write to new structure
  await root.new.child(`studentPlans/${studentId}`).set(payload);
  
  // Also update old structure
  const oldOverride = await root.old.overrides.child(studentId).once('value').then(s => s.val() || {});
  await root.old.overrides.child(studentId).set({
    ...oldOverride,
    planId,
    updatedAt: payload.updatedAt,
    updatedBy: payload.updatedBy
  });
  
  return payload;
}

/**
 * Get student plan override
 */
async function getStudentPlan(studentId) {
  const y = await getYear();
  const root = financeRoot(y);
  if (!root) return null;
  
  try {
    // Try new structure first
    const snap = await root.new.child(`studentPlans/${studentId}`).once('value');
    const val = snap.val();
    if (val) return val.planId || null;
    
    // Fallback to old structure
    const oldSnap = await root.old.overrides.child(studentId).once('value');
    const oldData = oldSnap.val() || {};
    return oldData.planId || null;
  } catch (err) {
    console.error('Error reading student plan:', err);
    return null;
  }
}

/**
 * Set student fee override
 * Writes to /finance/{year}/studentFees/{studentId}
 */
async function setStudentFee(studentId, feePerYear, meta = {}) {
  const y = await getYear();
  const root = financeRoot(y);
  if (!root) throw new Error('Database not initialized');
  
  const payload = {
    feePerYear: Number(feePerYear) || 0,
    updatedAt: Date.now(),
    updatedBy: meta.by || window.currentUserId || 'system'
  };
  
  // Write to new structure
  await root.new.child(`studentFees/${studentId}`).set(payload);
  
  // Also update old structure
  const oldOverride = await root.old.overrides.child(studentId).once('value').then(s => s.val() || {});
  await root.old.overrides.child(studentId).set({
    ...oldOverride,
    feePerYear: payload.feePerYear,
    updatedAt: payload.updatedAt,
    updatedBy: payload.updatedBy
  });
  
  return payload;
}

/**
 * Get student fee override
 */
async function getStudentFee(studentId) {
  const y = await getYear();
  const root = financeRoot(y);
  if (!root) return null;
  
  try {
    // Try new structure first
    const snap = await root.new.child(`studentFees/${studentId}`).once('value');
    const val = snap.val();
    if (val) return val.feePerYear || null;
    
    // Fallback to old structure
    const oldSnap = await root.old.overrides.child(studentId).once('value');
    const oldData = oldSnap.val() || {};
    return oldData.feePerYear !== undefined ? Number(oldData.feePerYear) : null;
  } catch (err) {
    console.error('Error reading student fee:', err);
    return null;
  }
}

/**
 * Set custom schedule for a student
 * Writes to /finance/{year}/studentCustomSchedules/{studentId}
 */
async function setCustomSchedule(studentId, rows, note = '', meta = {}) {
  const y = await getYear();
  const root = financeRoot(y);
  if (!root) throw new Error('Database not initialized');
  
  const payload = {
    rows: Array.isArray(rows) ? rows : [],
    note: String(note || ''),
    updatedAt: Date.now(),
    updatedBy: meta.by || window.currentUserId || 'system'
  };
  
  // Write to new structure
  await root.new.child(`studentCustomSchedules/${studentId}`).set(payload);
  
  // Also update old structure
  const oldOverride = await root.old.overrides.child(studentId).once('value').then(s => s.val() || {});
  await root.old.overrides.child(studentId).set({
    ...oldOverride,
    customSchedule: payload.rows,
    updatedAt: payload.updatedAt,
    updatedBy: payload.updatedBy
  });
  
  return payload;
}

/**
 * Get custom schedule for a student
 */
async function getCustomSchedule(studentId) {
  const y = await getYear();
  const root = financeRoot(y);
  if (!root) return null;
  
  try {
    // Try new structure first
    const snap = await root.new.child(`studentCustomSchedules/${studentId}`).once('value');
    const val = snap.val();
    if (val && Array.isArray(val.rows) && val.rows.length) return val;
    
    // Fallback to old structure
    const oldSnap = await root.old.overrides.child(studentId).once('value');
    const oldData = oldSnap.val() || {};
    if (Array.isArray(oldData.customSchedule) && oldData.customSchedule.length) {
      return {
        rows: oldData.customSchedule,
        note: oldData.customScheduleNote || '',
        updatedAt: oldData.updatedAt,
        updatedBy: oldData.updatedBy
      };
    }
    
    return null;
  } catch (err) {
    console.error('Error reading custom schedule:', err);
    return null;
  }
}

/**
 * Get all class defaults for the current year
 */
async function getAllClassDefaults() {
  const y = await getYear();
  const root = financeRoot(y);
  if (!root) return {};
  
  try {
    // Try new structure first
    const snap = await root.new.child('classes').once('value');
    const val = snap.val();
    if (val && Object.keys(val).length) return val;
    
    // Fallback to old structure
    const oldSnap = await root.old.classes.once('value');
    return oldSnap.val() || {};
  } catch (err) {
    console.error('Error reading class defaults:', err);
    return {};
  }
}

/**
 * Get student payment ledger for the current year
 */
async function getStudentLedger(studentId) {
  const y = await getYear();
  const root = financeRoot(y);
  if (!root) return {};
  
  try {
    const snap = await root.old.ledgers.child(`${studentId}/payments`).once('value');
    return snap.val() || {};
  } catch (err) {
    console.error('Error reading student ledger:', err);
    return {};
  }
}

/**
 * Get student carry forward amount
 */
async function getStudentCarryForward(studentId) {
  const y = await getYear();
  const root = financeRoot(y);
  if (!root) return 0;
  
  try {
    const snap = await root.old.carryForward.child(studentId).once('value');
    const data = snap.val() || {};
    return Number(data.amount || data.balance || 0);
  } catch (err) {
    console.error('Error reading carry forward:', err);
    return 0;
  }
}

// Export for use in HTML files (non-module scripts) - expose immediately
if (typeof window !== 'undefined') {
  window.financePlansService = {
    getYear,
    getClassDefaultPlanId,
    setClassDefaultPlanId,
    getClassFeePerYear,
    setClassFeePerYear,
    upsertPlan,
    getPlan,
    getAllPlans,
    assignStudentPlan,
    getStudentPlan,
    setStudentFee,
    getStudentFee,
    setCustomSchedule,
    getCustomSchedule,
    getAllClassDefaults,
    getStudentLedger,
    getStudentCarryForward
  };
  console.log('✅ Finance Plans Service initialized');
}

