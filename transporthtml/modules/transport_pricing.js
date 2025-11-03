// Unified TransportPricing module (single source of truth)
(function(){
  const DEFAULT_MULTIPLIERS = { 1:1.5, 2:1.0, 3:1.0, 4:0.8, 5:1.0, 6:0.0, 7:1.5, 8:1.0, 9:0.8, 10:1.0, 11:1.25, 12:0.0 };

  const daysInMonth = (y, m) => new Date(y, m, 0).getDate();
  const parseYMD = s => { const [y,m,d] = String(s||'').split('-').map(n=>parseInt(n,10)); return {y,m,d}; };

  // Unmultiplied baseMonthlyFee = sum(morning+evening) before month multiplier
  function dueForMonth({year, month, baseMonthlyFee, startDate, multipliers}){
    const multMap = multipliers && typeof multipliers==='object' ? multipliers : DEFAULT_MULTIPLIERS;
    const mult = multMap[month] ?? 1.0;
    if (mult <= 0) return 0;

    const dim = daysInMonth(year, month);
    const start = startDate ? parseYMD(startDate) : {y:year,m:1,d:1};

    if (year < start.y) return 0;
    if (year === start.y && month < start.m) return 0;

    if (year === start.y && month === start.m){
      const activeDays = Math.max(0, dim - (start.d - 1));
      return (baseMonthlyFee * mult) * (activeDays / dim);
    }
    return baseMonthlyFee * mult;
  }

  function buildLedger({year, baseMonthlyFee, startDate, payments, multipliers}){
    const paidByMonth = {};
    (payments||[]).forEach(p => {
      const m = parseInt(p.month,10);
      if (m>=1 && m<=12) paidByMonth[m] = (paidByMonth[m]||0) + (Number(p.amount)||0);
    });

    const months = [];
    let totalDue=0, totalPaid=0;
    for(let m=1; m<=12; m++){
      const due = dueForMonth({year, month:m, baseMonthlyFee, startDate, multipliers});
      const paid = paidByMonth[m] || 0;
      const balance = Math.max(0, +(due - paid).toFixed(2));
      const status = (due===0) ? 'SKIP' : (paid<=0 ? 'UNPAID' : (balance>0?'PARTIAL':'PAID'));
      months.push({month:m, mult:(multipliers?.[m] ?? DEFAULT_MULTIPLIERS[m] ?? 1.0), due:+due.toFixed(2), paid:+paid.toFixed(2), balance, status});
      totalDue += due; totalPaid += paid;
    }
    return { months, totals: { due:+totalDue.toFixed(2), paid:+totalPaid.toFixed(2), balance:+Math.max(0,totalDue-totalPaid).toFixed(2) } };
  }

  // === DB helpers (Firebase compat assumed present on page) ===
  async function loadYearMultipliers(year){
    try{
      if (!window.firebase || !firebase.database) return DEFAULT_MULTIPLIERS;
      const snap = await firebase.database().ref(`transportSettings/${year}/monthMultipliers`).once('value');
      const val = snap.val();
      if (!val) return DEFAULT_MULTIPLIERS;
      // sanitize to numbers
      const out = {...DEFAULT_MULTIPLIERS};
      Object.keys(val).forEach(k=>{ const n=Number(val[k]); if(!Number.isNaN(n)) out[Number(k)] = n; });
      return out;
    }catch(_){ return DEFAULT_MULTIPLIERS; }
  }

  async function loadStopsForYear(year){
    try{
      if (!window.firebase || !firebase.database) return [];
      const snap = await firebase.database().ref(`transportCatalog/${year}/stops`).once('value');
      const stops = snap.val() || {};
      // normalize { stopId: {name, baseFee, active} }
      return Object.entries(stops).map(([id,s])=>({ id, name:s.name||id, baseFee:Number(s.baseFee)||0, active: s.active !== false }));
    }catch(_){ return []; }
  }

  // Helper to index stops by ID
  function indexStopsById(stops){
    const map = {};
    (stops||[]).forEach(s => { map[s.id] = s; });
    return map;
  }

  // Legacy compatibility: keep old priceForStop and expectedForMonth for backward compat
  const LEGACY_STOP_PRICE = (function(){
    const map = Object.create(null);
    function add(stops, price){ stops.forEach(s=>{ map[String(s).toLowerCase().trim()] = price; }); }
    add(['jirani na shule','mazengo','mbezi','msikitini','mlimani rc','uswahilini kanisani','international','kona dampo','mauwa','mwisho wa fensi','ghati','mnara wa halotel'], 17000);
    add(['sinoni','kidemi','soko mjinga','mnara wa voda','mbugani kwenye lami tu'], 18500);
    add(['glorious','ushirika','tanga kona','njia mtoni','kaburi moja','kwa malaika','savanna','dampo','darajani','kikwete road','boma kubwa','kiwetu pazuri','umoja road','njiro ndogo','king david'], 21000);
    add(['chavda','matokeo','milano','jamhuri','felix mrema','lemara','bonisite','intel','patel','terrati','si mbaoil'], 24000);
    add(['mapambazuko','mkono wa madukani','soweto','mianzini barabarani','eliboru jr','green valley','country coffee','maua','pepsi','majengo'], 25000);
    add(['sanawari','sekei','shabani','kimandolu','kijenge','mkono wa shuleni'], 28000);
    add(['suye','moshono','nado','mwanama reli','kisongo'], 38000);
    add(['kiserian','chekereni','duka bovu','tengeru','ngulelo','kwamrefu','shangarai atomic'], 44000);
    return map;
  })();

  function priceForStop(stopName){
    const key = String(stopName||'').toLowerCase().trim();
    if (LEGACY_STOP_PRICE[key]) return LEGACY_STOP_PRICE[key];
    // Fuzzy contains match fallback
    const hit = Object.keys(LEGACY_STOP_PRICE).find(k => key.includes(k));
    return hit ? LEGACY_STOP_PRICE[hit] : 28000; // default mid-band when unknown
  }

  function getMonthMultiplier(m) { return DEFAULT_MULTIPLIERS[m] || 1.0; }

  function expectedForMonth(amStop, pmStop, month){
    const base = (priceForStop(amStop) + priceForStop(pmStop));
    return Math.round(base * getMonthMultiplier(month));
  }

  function scheduleForYear(year, amStop, pmStop){
    const months = [];
    let totalExpected = 0; let totalBase = 0;
    for (let m=1; m<=12; m++){
      const base = priceForStop(amStop) + priceForStop(pmStop);
      const expected = Math.round(base * getMonthMultiplier(m));
      months.push({ month: m, base, multiplier: getMonthMultiplier(m), expected });
      totalExpected += expected; totalBase += base;
    }
    return { year, months, totals: { base: totalBase, expected: totalExpected } };
  }

  window.TransportPricing = {
    DEFAULT_MULTIPLIERS,
    MONTH_MULTIPLIERS: DEFAULT_MULTIPLIERS, // backward compat
    getMonthMultiplier,
    priceForStop,
    expectedForMonth,
    dueForMonth,
    buildLedger,
    scheduleForYear,
    loadYearMultipliers,
    loadStopsForYear,
    indexStopsById
  };
})();
