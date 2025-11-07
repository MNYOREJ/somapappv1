(function SomapBooksModule(global){
  'use strict';

  const defaultYears = Array.from({ length: 20 }, (_, i) => 2023 + i);
  const fallbackClasses = ['Baby Class','Class 1','Class 2','Class 3','Class 4','Class 5','Class 6','Class 7'];
  const allowedYears = global.SOMAP_ALLOWED_YEARS || defaultYears;
  const fallbackYear = Number(global.SOMAP_DEFAULT_YEAR) || 2025;
  const classOrder = global.CLASS_ORDER || fallbackClasses;
  const lower = global.L || (s => String(s || '').trim().toLowerCase());

  if (!global.SOMAP_ALLOWED_YEARS) global.SOMAP_ALLOWED_YEARS = allowedYears;
  if (!global.SOMAP_DEFAULT_YEAR) global.SOMAP_DEFAULT_YEAR = fallbackYear;
  if (!global.CLASS_ORDER) global.CLASS_ORDER = classOrder;
  if (!global.L) global.L = lower;

  function fallbackShift(baseClass, deltaYears){
    const norm = lower(baseClass || '');
    const idx = classOrder.findIndex(c => lower(c) === norm);
    if (idx < 0) return baseClass || '';
    const next = idx + Number(deltaYears || 0);
    if (next < 0) return 'PRE-ADMISSION';
    if (next >= classOrder.length) return 'GRADUATED';
    return classOrder[next];
  }

  if (typeof global.shiftClass !== 'function'){
    global.shiftClass = fallbackShift;
  }

  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const withTimeout = (promise, ms = 30000) => Promise.race([
    promise,
    wait(ms).then(() => { throw new Error('timeout'); })
  ]);

  function ensureDb(){
    if (global.db) return global.db;
    if (global.firebase?.apps?.length){
      global.db = global.firebase.database();
      return global.db;
    }
    throw new Error('Firebase database is not initialized. Load firebase.js first.');
  }

  function canonicalClassName(name){
    const trimmed = String(name || '').trim();
    if (!trimmed) return classOrder[0] || 'Baby Class';
    const norm = lower(trimmed);
    const match = classOrder.find(c => lower(c) === norm);
    return match || trimmed;
  }

  function classKeyVariants(name){
    const raw = String(name || '').trim();
    if (!raw) return [''];
    const variants = [
      raw,
      raw.toLowerCase(),
      raw.replace(/\s+/g, ''),
      raw.replace(/\s+/g, '_'),
      raw.replace(/\s+/g, '-'),
      encodeURIComponent(raw),
      encodeURIComponent(raw.toLowerCase())
    ].filter(Boolean);
    return Array.from(new Set(variants));
  }

  async function tryFirstNonEmpty(paths){
    const db = ensureDb();
    for (const path of paths){
      try{
        const snap = await withTimeout(db.ref(path).once('value'));
        const payload = snap && snap.val ? snap.val() : null;
        if (payload && Object.keys(payload).length){
          return { path, data: payload };
        }
      }catch(err){
        console.warn('SomapBooks: unable to read path', path, err?.message || err);
      }
    }
    return null;
  }

  function normalizeBook(record, year, className, source){
    const meta = record.meta || {};
    const title = record.title || record.name || record.fileName || meta.title || 'Untitled';
    const subject = record.subject || meta.subject || 'General';
    const pageFrom = record.pageFrom ?? meta.pageFrom ?? null;
    const pageTo = record.pageTo ?? meta.pageTo ?? null;
    const url = record.url || record.secure_url || meta.url || meta.secure_url || null;
    const publicId = record.cloudinaryPublicId || record.cloudinary_public_id ||
      meta.cloudinaryPublicId || meta.cloudinary_public_id ||
      record.public_id || meta.public_id || null;
    const uploadedAt = Number(
      record.uploadedAt || record.createdAt || record.timestamp ||
      meta.uploadedAt || meta.createdAt || meta.timestamp || 0
    ) || 0;
    const link = url || (publicId && typeof global.cloudinaryFileUrl === 'function'
      ? global.cloudinaryFileUrl(publicId)
      : null);
    return {
      title,
      subject,
      className,
      year: String(year),
      pageFrom,
      pageTo,
      url: link,
      publicId,
      uploadedAt,
      _src: record._src || source || 'indexed',
      raw: record
    };
  }

  function collectClassHints(record){
    const meta = record.meta || {};
    const strings = [
      record.className, record.class, record.classLevel, record.level, record.grade,
      meta.className, meta.class, meta.classLevel, meta.level, meta.grade, meta.standard
    ].filter(Boolean);
    const arrays = [];
    if (Array.isArray(record.tags)) arrays.push(record.tags);
    if (Array.isArray(meta.tags)) arrays.push(meta.tags);
    return [
      ...strings.map(lower),
      ...arrays.flat().filter(Boolean).map(lower)
    ];
  }

  function recordMatches(record, className, year, subjectOpt){
    const target = lower(className);
    const hints = collectClassHints(record);
    const synonyms = new Set([target]);
    const classNumber = (String(className).match(/\d+/) || [])[0];
    if (target === 'baby class'){
      ['baby','nursery','pre unit','pre-unit','preunit','class 0','class zero','pre class']
        .forEach(s => synonyms.add(s));
    }
    if (classNumber){
      [`class-${classNumber}`, `class${classNumber}`, `class ${classNumber}`,
        `grade ${classNumber}`, `grade-${classNumber}`, `std ${classNumber}`, `standard ${classNumber}`]
        .forEach(s => synonyms.add(lower(s)));
    }
    const classOk = hints.some(h => synonyms.has(h));
    if (!classOk) return false;
    const meta = record.meta || {};
    const yearField = record.year || meta.year || record.session || record.term;
    const yearOk = !yearField || String(yearField) === String(year);
    if (!yearOk) return false;
    if (!subjectOpt) return true;
    const recordSubject = record.subject || meta.subject || meta.Subject || '';
    return lower(recordSubject) === lower(subjectOpt);
  }

  async function fetchFromUploadsFallback(year, className, subjectOpt){
    try{
      const db = ensureDb();
      const snap = await withTimeout(db.ref('uploads/files').once('value'));
      const payload = snap && snap.val ? snap.val() : {};
      return Object.values(payload || {})
        .filter(item => recordMatches(item, className, year, subjectOpt))
        .map(item => normalizeBook(item, year, className, 'uploads/files'));
    }catch(err){
      console.warn('SomapBooks: uploads fallback failed', err?.message || err);
      return [];
    }
  }

  const shelfCache = new Map();
  const storagePrefix = 'somap_books_cache::';

  function shelfCacheKey(year, className, subject){
    return `${String(year)}::${lower(className)}::${lower(subject || '')}`;
  }

  function readFromStorage(key){
    try{
      const raw = sessionStorage.getItem(storagePrefix + key);
      return raw ? JSON.parse(raw) : null;
    }catch(_err){
      return null;
    }
  }

  function writeToStorage(key, value){
    try{
      sessionStorage.setItem(storagePrefix + key, JSON.stringify(value));
    }catch(_err){
      /* ignore quota issues */
    }
  }

  function hydrateShelf(key){
    if (shelfCache.has(key)) return shelfCache.get(key);
    const stored = readFromStorage(key);
    if (stored){
      shelfCache.set(key, stored);
      return stored;
    }
    return null;
  }

  function rememberShelf(key, payload){
    shelfCache.set(key, payload);
    writeToStorage(key, payload);
  }

  async function fetchBooksForClass(year, className, subjectOpt, options = {}){
    const yStr = String(year || fallbackYear);
    const canonical = canonicalClassName(className || 'Baby Class');
    const cacheKey = shelfCacheKey(yStr, canonical, subjectOpt);
    if (!options.force){
      const cached = hydrateShelf(cacheKey);
      if (cached) return cached;
    }

    const variants = classKeyVariants(canonical);
    const candidatePaths = [];
    variants.forEach(v => candidatePaths.push(`class_books/${yStr}/${v}`));
    variants.forEach(v => candidatePaths.push(`class_books/${v}`));
    variants.forEach(v => candidatePaths.push(`booksIndex/${yStr}/${v}`));
    variants.forEach(v => candidatePaths.push(`uploads/books/${yStr}/${v}`));
    variants.forEach(v => candidatePaths.push(`uploads/booksShared/${v}`));

    const hit = await tryFirstNonEmpty(candidatePaths);
    let books = [];
    if (hit){
      books = Object.values(hit.data || {})
        .filter(Boolean)
        .map(entry => normalizeBook(entry, yStr, canonical, hit.path));
    }else{
      books = await fetchFromUploadsFallback(yStr, canonical, subjectOpt);
    }

    const ready = books
      .filter(b => !!(b.url || b.publicId))
      .sort((a, b) => Number(b.uploadedAt || 0) - Number(a.uploadedAt || 0));
    rememberShelf(cacheKey, ready);
    return ready;
  }

  function invalidateShelf(year, className, subjectOpt){
    const key = shelfCacheKey(String(year || fallbackYear), canonicalClassName(className || 'Baby Class'), subjectOpt);
    shelfCache.delete(key);
    try{ sessionStorage.removeItem(storagePrefix + key); }catch(_err){ /* ignore */ }
  }

  async function loadCommonYear(targetYear){
    const db = ensureDb();
    const ctx = global.somapYearContext;
    let desired = targetYear || (ctx?.getSelectedYear?.() ?? fallbackYear);
    desired = String(desired);
    if (!allowedYears.map(String).includes(desired)){
      desired = String(fallbackYear);
    }
    const [studentsSnap, anchorSnap, yearSnap] = await Promise.all([
      db.ref('students').once('value'),
      db.ref(`enrollments/${fallbackYear}`).once('value'),
      db.ref(`enrollments/${desired}`).once('value').catch(()=>({ val: ()=>null }))
    ]);
    return {
      y: desired,
      students: (studentsSnap && studentsSnap.val ? studentsSnap.val() : {}) || {},
      enrollAnchor: (anchorSnap && anchorSnap.val ? anchorSnap.val() : {}) || {},
      enrollYear: (yearSnap && yearSnap.val ? yearSnap.val() : {}) || {}
    };
  }

  function resolveClassForYear(studentId, anchorMap = {}, yearMap = {}, targetYear = fallbackYear){
    const sid = String(studentId || '').trim();
    if (!sid) return 'Baby Class';
    const explicit = yearMap[sid];
    if (explicit?.className || explicit?.classLevel){
      return explicit.className || explicit.classLevel;
    }
    const anchor = anchorMap[sid] || {};
    const base = anchor.className || anchor.classLevel || 'Baby Class';
    const delta = Number(targetYear) - Number(fallbackYear);
    return (typeof global.shiftClass === 'function' ? global.shiftClass : fallbackShift)(base, delta);
  }

  global.SomapBooks = Object.assign(global.SomapBooks || {}, {
    fetchBooksForClass,
    loadCommonYear,
    resolveClassForYear,
    invalidateShelf,
    classKeyVariants,
    withTimeout
  });
})(window);
