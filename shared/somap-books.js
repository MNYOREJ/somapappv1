(function SomapBooksModule(global){
  'use strict';

  const fallbackYear = global.SOMAP_DEFAULT_YEAR || 2025;
  const fallbackClasses = global.CLASS_ORDER || [
    'Baby Class','Class 1','Class 2','Class 3','Class 4','Class 5','Class 6','Class 7'
  ];
  const lower = global.L || (s => String(s || '').trim().toLowerCase());

  function canonicalClassName(name){
    if (!name) return '';
    const normalized = lower(name);
    return fallbackClasses.find(c => lower(c) === normalized) || name;
  }

  function ensureDb(){
    if (global.db) return global.db;
    if (global.firebase?.apps?.length){
      const instance = global.firebase.database();
      global.db = instance;
      return instance;
    }
    throw new Error('Firebase database is not initialized. Load firebase.js first.');
  }

  async function loadCommonYear(targetYear, studentId){
    const db = ensureDb();
    const ctx = global.somapYearContext;
    const y = String(targetYear || (ctx?.getSelectedYear?.() ?? fallbackYear));
    const studentPath = studentId ? `students/${studentId}` : 'students';
    const [studentsSnap, anchorSnap, yearSnap] = await Promise.all([
      db.ref(studentPath).once('value'),
      db.ref(`enrollments/${fallbackYear}`).once('value'),
      db.ref(`enrollments/${y}`).once('value').catch(()=>({ val: ()=>null }))
    ]);
    const safeVal = snap => (snap && snap.val ? snap.val() : null) || {};
    const studentsRaw = safeVal(studentsSnap);
    const students = studentId ? { [studentId]: studentsRaw } : studentsRaw;
    return {
      y,
      students: students || {},
      enrollAnchor: safeVal(anchorSnap),
      enrollYear: safeVal(yearSnap)
    };
  }

  function resolveClassForYear(studentId, anchorMap = {}, yearMap = {}, targetYear = fallbackYear){
    const sid = String(studentId || '');
    if (!sid) return 'Baby Class';
    const explicit = yearMap[sid] || {};
    if (explicit.className || explicit.classLevel){
      return explicit.className || explicit.classLevel;
    }
    const anchor = anchorMap[sid] || {};
    const baseClass = anchor.className || anchor.classLevel || 'Baby Class';
    const delta = Number(targetYear) - fallbackYear;
    if (typeof global.shiftClass === 'function'){
      return global.shiftClass(baseClass, delta);
    }
    return baseClass;
  }

  const shelfCache = new Map();
  const storagePrefix = 'somap_books_';

  function shelfCacheKey(year, className, subject){
    return `${String(year)}::${lower(className)}::${lower(subject || '')}`;
  }

  function fromStorage(key){
    try{
      const raw = sessionStorage.getItem(storagePrefix + key);
      return raw ? JSON.parse(raw) : null;
    }catch(_err){
      return null;
    }
  }

  function toStorage(key, data){
    try{
      sessionStorage.setItem(storagePrefix + key, JSON.stringify(data));
    }catch(_err){
      /* ignore quota errors */
    }
  }

  function hydrateShelf(key){
    if (shelfCache.has(key)) return shelfCache.get(key);
    const stored = fromStorage(key);
    if (stored){
      shelfCache.set(key, stored);
      return stored;
    }
    return null;
  }

  function normalizeBook(record, className, year){
    const meta = record.meta || {};
    const title = record.title || meta.title || record.name || record.fileName || 'Untitled';
    const subject = record.subject || meta.subject || 'General';
    const pageFrom = record.pageFrom || meta.pageFrom || null;
    const pageTo = record.pageTo || meta.pageTo || null;
    const url = record.url || record.secure_url || meta.secure_url || null;
    const publicId = record.cloudinaryPublicId || meta.cloudinaryPublicId || record.public_id || null;
    const uploadedAt = Number(record.uploadedAt || record.createdAt || meta.uploadedAt || meta.timestamp || 0) || 0;
    const sourceTag = record._src || (record.path ? 'uploads/files' : 'indexed');
    return {
      title,
      subject,
      className,
      year,
      pageFrom,
      pageTo,
      url,
      publicId,
      uploadedAt,
      _src: sourceTag
    };
  }

  function collectClassHints(record){
    const meta = record.meta || {};
    const arrays = [];
    if (Array.isArray(record.tags)) arrays.push(record.tags);
    if (Array.isArray(meta.tags)) arrays.push(meta.tags);
    const strings = [
      record.className, record.class, record.classLevel, record.level, record.grade,
      meta.className, meta.class, meta.classLevel, meta.level, meta.grade, meta.standard
    ];
    return [
      ...strings.filter(Boolean).map(lower),
      ...arrays.flat().filter(Boolean).map(lower)
    ];
  }

  function metaMatches(record, targetClass, year, subjectOpt){
    const normalizedClass = lower(targetClass);
    const hints = collectClassHints(record);
    const classNumber = (targetClass.match(/\d+/) || [])[0] || '';
    const synonyms = new Set([normalizedClass]);
    if (normalizedClass === 'baby class'){
      ['baby','nursery','pre unit','pre-unit','preunit','middle','middle class','class 0','class zero'].forEach(s => synonyms.add(s));
    }
    if (classNumber){
      [`class-${classNumber}`, `class${classNumber}`, `class ${classNumber}`, `grade ${classNumber}`, `grade-${classNumber}`, `std ${classNumber}`, `standard ${classNumber}`]
        .forEach(s => synonyms.add(lower(s)));
    }
    const classOk = hints.some(h => synonyms.has(h));
    if (!classOk) return false;
    const metaYear = record.year || record.session || record.term || record.meta?.year;
    const yearOk = !metaYear || String(metaYear) === String(year);
    if (!yearOk) return false;
    if (!subjectOpt) return true;
    const recordSubject = record.subject || record.meta?.subject || record.meta?.Subject || '';
    return lower(recordSubject) === lower(subjectOpt);
  }

  async function tryPaths(paths){
    const db = ensureDb();
    for (const path of paths){
      try{
        const snap = await db.ref(path).once('value');
        const payload = snap.val();
        if (payload && Object.keys(payload).length){
          return payload;
        }
      }catch(err){
        console.warn('SomapBooks: unable to read', path, err);
      }
    }
    return null;
  }

  async function fetchBooksForClass(year, className, subjectOpt, options = {}){
    const y = String(year || fallbackYear);
    const canonical = canonicalClassName(className || 'Baby Class');
    const cacheKey = shelfCacheKey(y, canonical, subjectOpt);
    if (!options.force){
      const cached = hydrateShelf(cacheKey);
      if (cached) return cached;
    }

    const tryList = [
      `booksIndex/${y}/${canonical}`,
      `uploads/books/${y}/${canonical}`,
      `uploads/booksShared/${canonical}`
    ];

    let rawItems = await tryPaths(tryList);
    let list = [];
    if (rawItems){
      list = Object.values(rawItems).filter(Boolean).map(item => ({ ...item, _src: item._src || 'indexed' }));
    }else{
      try{
        const db = ensureDb();
        const snap = await db.ref('uploads/files').once('value');
        const files = snap.val() || {};
        list = Object.values(files).filter(item => {
          const hasLink = !!(item.url || item.secure_url || item.cloudinaryPublicId || item.meta?.cloudinaryPublicId);
          if (!hasLink) return false;
          return metaMatches(item, canonical, y, subjectOpt);
        }).map(item => ({ ...item, _src: 'uploads/files' }));
      }catch(err){
        console.warn('SomapBooks: fallback lookup failed', err);
        list = [];
      }
    }

    const normalized = list
      .map(item => {
        const n = normalizeBook(item, canonical, y);
        if (!n.url && n.publicId && typeof global.cloudinaryFileUrl === 'function'){
          n.url = global.cloudinaryFileUrl(n.publicId);
        }
        return n;
      })
      .filter(book => !!(book.url || book.publicId));
    normalized.sort((a, b) => Number(b.uploadedAt || 0) - Number(a.uploadedAt || 0));

    shelfCache.set(cacheKey, normalized);
    toStorage(cacheKey, normalized);
    return normalized;
  }

  function invalidateShelf(year, className, subjectOpt){
    const key = shelfCacheKey(String(year || fallbackYear), canonicalClassName(className || 'Baby Class'), subjectOpt);
    shelfCache.delete(key);
    try{ sessionStorage.removeItem(storagePrefix + key); }catch(_err){ /* ignore */ }
  }

  global.SomapBooks = Object.assign(global.SomapBooks || {}, {
    loadCommonYear,
    resolveClassForYear,
    fetchBooksForClass,
    invalidateShelf
  });
})(window);
