// Canonical names (keys must be EXACT). We fix typos like "Health Arec".
const SUBJECT_ALIASES = {
  'health arec': 'Health Care',
  'healtharec': 'Health Care',
  'healthcare': 'Health Care',
  'health': 'Health Care',
  'health  care': 'Health Care',
  'heath care': 'Health Care',
  'health.care': 'Health Care'
};

// Base subject lists by class (UI labels). Adjust to stay in sync with Scoresheet.
export const SUBJECTS_BY_CLASS = {
  // Early years (exact labels match your UI)
  'Baby Class': ['Arithmetic', 'Communication', 'Relation', 'CRN', 'Health Care', 'Arts'],
  'Middle Class': ['Arithmetic', 'Communication', 'Relation', 'CRN', 'Health Care', 'Arts'],
  'Pre-Unit': ['Arithmetic', 'Communication', 'Relation', 'CRN', 'Health Care', 'Arts'],
  // Lower primary
  'Class 1': ['Writing Skills', 'Arithmetic', 'Developing Sports & Arts', 'Health Care', 'Kusoma', 'Listening'],
  'Class 2': ['Writing Skills', 'Arithmetic', 'Developing Sports & Arts', 'Health Care', 'Kusoma', 'Listening'],
  // Upper primary (keep in sync with live Scoresheet subjects)
  'Class 3': ['Math', 'English', 'Kiswahili', 'Science', 'Geography', 'Arts', 'History', 'French'],
  'Class 4': ['Math', 'English', 'Kiswahili', 'Science', 'Geography', 'Arts', 'History', 'French'],
  'Class 5': ['Math', 'English', 'Kiswahili', 'Science', 'Geography', 'Historia', 'DSA'],
  'Class 6': ['Math', 'English', 'Kiswahili', 'Science', 'Social Studies', 'Civics & Morals'],
  'Class 7': ['Math', 'English', 'Kiswahili', 'Science', 'Social Studies', 'Civics & Morals']
};

const L = (s) => String(s || '').trim().toLowerCase();

/** Return canonical subject label (fixes "Health Arec" -> "Health Care"). */
export function canonSubject(label) {
  const raw = String(label || '').replace(/[._]/g, ' ');
  const k = L(raw);
  return SUBJECT_ALIASES[k] || label || '';
}

/** Normalize class display names used around the app. */
export function canonClass(name) {
  const s = L(name);
  if (s.includes('pre-unit') || s.includes('pre unit') || s.includes('preunit')) return 'Pre-Unit';
  if (s.includes('pre') && s.includes('unit')) return 'Pre-Unit';
  if (s.includes('middle')) return 'Middle Class';
  if (s.includes('baby')) return 'Baby Class';
  if (s.includes('kg')) return 'Baby Class';
  // Class 1..7 (handles "Class 1 AB", "1AB", "Grade 1", etc.)
  const m = s.match(/(class|grade|std|standard)?\s*([1-7])/);
  if (m && m[2]) return `Class ${m[2]}`;
  return name || '';
}

/** Subjects for a class in the selected year. (Branch by year if syllabus changes.) */
export function getSubjectsForClass(className, year) {
  const key = canonClass(className);
  const y = Number(year) || new Date().getFullYear();

  // Special handling for Class 5 legacy syllabus through 2025
  if (key === 'Class 5' && y <= 2025) {
    const legacy = ['Math', 'English', 'Kiswahili', 'Science', 'SST', 'CME', 'VSkills'];
    return legacy.map(canonSubject);
  }

  const list = SUBJECTS_BY_CLASS[key] || [];
  return list.map(canonSubject);
}
