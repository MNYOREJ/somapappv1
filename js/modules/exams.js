// Canonical exam helpers, archive paths, grading, and derived exam math.
export const EXAM_TYPES = {
  MONTHLY: 'Monthly',
  MIDTERM1: 'Midterm 1',
  TERM1: 'Term 1',
  MIDTERM2: 'Midterm 2',
  ANNUAL: 'Annual'
};

export const EXAM_ALIASES = {
  'monthly exam': EXAM_TYPES.MONTHLY,
  'monthly': EXAM_TYPES.MONTHLY,
  'mid term 1': EXAM_TYPES.MIDTERM1,
  'midterm one': EXAM_TYPES.MIDTERM1,
  'mid term one': EXAM_TYPES.MIDTERM1,
  'midterm1': EXAM_TYPES.MIDTERM1,
  'terminal': EXAM_TYPES.TERM1,
  'term 1': EXAM_TYPES.TERM1,
  'mid term 2': EXAM_TYPES.MIDTERM2,
  'midterm2': EXAM_TYPES.MIDTERM2,
  'annual': EXAM_TYPES.ANNUAL,
  'end year': EXAM_TYPES.ANNUAL,
  'end-year': EXAM_TYPES.ANNUAL
};

export const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

const L = s => String(s || '').trim().toLowerCase();

export function canonExamType(label){
  const k = L(label);
  return EXAM_ALIASES[k] || Object.values(EXAM_TYPES).find(t => L(t) === k) || EXAM_TYPES.MONTHLY;
}

export function canonMonth(label){
  const i = MONTHS.findIndex(m => L(m) === L(label));
  return i >= 0 ? MONTHS[i] : null;
}

export function monthIndex(label){
  return MONTHS.findIndex(m => L(m) === L(label));
}

export function gradeFromPercent(pct){
  const x = Math.max(0, Math.min(100, Number(pct) || 0));
  if (x >= 80.5) return 'A';
  if (x >= 60.5) return 'B';
  if (x >= 40.5) return 'C';
  if (x >= 20.5) return 'D';
  return 'F';
}

export function percent(scoreList){
  let num = 0, den = 0;
  for (const it of scoreList){
    const s = Number(it?.score);
    const m = Number(it?.max);
    if (!Number.isFinite(m) || m <= 0) continue;
    if (!Number.isFinite(s) || s < 0) continue;
    num += s; den += m;
  }
  return den > 0 ? (num * 100.0) / den : 0;
}

export function classKeyOf(name){
  return String(name || '').trim().toLowerCase().replace(/\s+/g, '-');
}

export function pathMonthly(y, className, month){
  const ck = classKeyOf(className);
  const mm = canonMonth(month);
  return `scoresArchive/${y}/${ck}/${EXAM_TYPES.MONTHLY}/${mm}`;
}

export function pathDerived(y, className, examType){
  const ck = classKeyOf(className);
  const et = canonExamType(examType);
  return `scoresArchive/${y}/${ck}/${et}/_`;
}

export async function readLegacyIfAny(db, y, className, examType, month){
  return null;
}

export function mergeDeep(dst, src){
  if (!src || typeof src !== 'object') return dst;
  for (const k of Object.keys(src)){
    if (src[k] && typeof src[k] === 'object'){
      dst[k] = mergeDeep(dst[k] || {}, src[k]);
    } else {
      dst[k] = src[k];
    }
  }
  return dst;
}

export function rosterFromEnroll(enrollMap){
  return Object.keys(enrollMap || {});
}

export const DERIVED_RECIPES = {
  [EXAM_TYPES.MIDTERM1]: ['January','February','March'],
  [EXAM_TYPES.TERM1]:    ['January','February','March','April','May','June'],
  [EXAM_TYPES.MIDTERM2]: ['July','August','September'],
  [EXAM_TYPES.ANNUAL]:   ['January','February','March','April','May','June','July','August','September','October','November','December']
};

export function buildDerivedFromMonthly(monthlyBuckets){
  const out = {};
  for (const bucket of (monthlyBuckets || [])){
    if (!bucket) continue;
    for (const sid of Object.keys(bucket)){
      const perSubj = bucket[sid] || {};
      out[sid] = out[sid] || {};
      for (const subj of Object.keys(perSubj)){
        const r = perSubj[subj] || {};
        const prev = out[sid][subj] || { score: 0, max: 0 };
        const s = Number(r.score); const m = Number(r.max);
        if (Number.isFinite(s) && s >= 0 && Number.isFinite(m) && m > 0){
          prev.score += s;
          prev.max += m;
          out[sid][subj] = prev;
        }
      }
    }
  }
  return out;
}
