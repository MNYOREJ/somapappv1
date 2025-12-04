/**
 * Global grading utilities (no dependencies).
 * Attach to window.Grading for easy use across pages.
 *
 * Grade bands (inclusive ranges as specified):
 *  A : 80.5 – 100
 *  B : 60.5 – 80.4
 *  C : 40.5 – 60.4
 *  D : 20.5 – 40.4
 *  F :  0.0 – 20.4
 *
 * Percent is computed ONLY from subjects actually attempted:
 *  - score = 0 is valid (counts)
 *  - missing/blank/NaN score is ignored
 *  - max must be > 0 to count
 */
(function(){
  function clamp01(x){ return Math.max(0, Math.min(100, Number(x) || 0)); }

  function percent(pairs){
    // pairs: [{score, max}, ...]
    let s = 0, m = 0;
    for (const it of (pairs || [])){
      const rawScore = it?.score;
      const rawMax = it?.max;
      const sc = Number(rawScore);
      const mx = Number(rawMax);
      if (!Number.isFinite(mx) || mx <= 0) continue;     // invalid max -> ignore
      const missingScore = rawScore === '' || rawScore === null || rawScore === undefined || Number.isNaN(sc);
      if (missingScore || sc < 0) continue;              // missing -> ignore
      s += sc; m += mx;
    }
    return m > 0 ? (s * 100.0) / m : 0;
  }

  function gradeFromPercent(p){
    const x = clamp01(p);
    if (x >= 80.5) return 'A';
    if (x >= 60.5) return 'B';
    if (x >= 40.5) return 'C';
    if (x >= 20.5) return 'D';
    return 'F';
  }

  function letterAndPercent(pairs){
    const pct = percent(pairs);
    return { percent: pct, grade: gradeFromPercent(pct) };
  }

  // Optional self-check (use in console if needed)
  function _selfTest(){
    const edges = [
      {p:100, g:'A'}, {p:80.5, g:'A'}, {p:80.4, g:'B'},
      {p:60.5, g:'B'}, {p:60.4, g:'C'}, {p:40.5, g:'C'},
      {p:40.4, g:'D'}, {p:20.5, g:'D'}, {p:20.4, g:'F'}, {p:0, g:'F'}
    ];
    const ok = edges.every(e => gradeFromPercent(e.p) === e.g);
    // Missing subject ignored, zero counted:
    const pct1 = percent([{score:50,max:100},{score:0,max:100},{score:null,max:100}]); // 50/200 = 25%
    return { ok, pct1, g1: gradeFromPercent(pct1) };
  }

  window.Grading = { percent, gradeFromPercent, letterAndPercent, _selfTest };
})();
