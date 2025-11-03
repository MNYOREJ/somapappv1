(function(){
  // Month multiplier table (1=Jan ... 12=Dec)
  const MONTH_MULTIPLIERS = { 1:1.5, 2:1.0, 3:1.0, 4:0.8, 5:1.0, 6:0.0, 7:1.5, 8:1.0, 9:0.8, 10:1.0, 11:1.25, 12:0.0 };
  const getMonthMultiplier = m => MONTH_MULTIPLIERS[m] || 1.0;

  const daysInMonth = (y, m) => new Date(y, m, 0).getDate();
  const parseYMD = s => { const [y,m,d] = String(s||'').split('-').map(n=>parseInt(n,10)); return {y,m,d}; };

  // Transport stop base pricing (per time) derived from UI groups in transport.html
  // These are unmultiplied base amounts.
  const STOP_PRICE = (function(){
    const map = Object.create(null);
    function add(stops, price){ stops.forEach(s=>{ map[String(s).toLowerCase()] = price; }); }
    add([
      'jirani na shule','mazengo','mbezi','msikitini','mlimani rc','uswahilini kanisani','international','kona dampo','mauwa','mwisho wa fensi','ghati','mnara wa halotel'
    ], 17000);
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
    const key = String(stopName||'').toLowerCase();
    return STOP_PRICE[key] || 0;
  }

  // baseMonthlyFee is unmultiplied (sum of morning+evening base)
  function dueForMonth({year, month, baseMonthlyFee, startDate}){
    const mult = getMonthMultiplier(month);
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

  // Build annual ledger (Jan..Dec) using payments array [{month, amount, ...}]
  function buildLedger({year, baseMonthlyFee, startDate, payments}){
    const paidByMonth = {};
    (payments||[]).forEach(p => {
      const m = parseInt(p.month,10);
      if (m>=1 && m<=12) paidByMonth[m] = (paidByMonth[m]||0) + (Number(p.amount)||0);
    });

    const months = [];
    let totalDue=0, totalPaid=0;

    for(let m=1; m<=12; m++){
      const due = dueForMonth({year, month:m, baseMonthlyFee, startDate});
      const paid = paidByMonth[m] || 0;
      const balance = Math.max(0, +(due - paid).toFixed(2));
      const status = (due===0) ? 'SKIP' : (paid<=0 ? 'UNPAID' : (balance>0?'PARTIAL':'PAID'));
      months.push({month:m, multiplier:getMonthMultiplier(m), due:+due.toFixed(2), paid:+paid.toFixed(2), balance, status});
      totalDue += due; totalPaid += paid;
    }

    return {
      months,
      totals: { due:+totalDue.toFixed(2), paid:+totalPaid.toFixed(2), balance:+Math.max(0,totalDue-totalPaid).toFixed(2) }
    };
  }

  // Legacy helpers used by existing pages
  function expectedForMonth(amStop, pmStop, month){
    const base = (priceForStop(amStop) + priceForStop(pmStop));
    return base * getMonthMultiplier(month);
  }

  window.TransportPricing = {
    MONTH_MULTIPLIERS,
    getMonthMultiplier,
    priceForStop,
    expectedForMonth,
    dueForMonth,
    buildLedger
  };
})();

(() => {
  // Pricing per time (morning OR evening), per month in TZS
  const PRICING_BANDS = {
    "1 KM": 17000,
    "1.5 KM": 18500,
    "2 KM": 21000,
    "3–4 KM": 24000,
    "5–6 KM": 25000,
    "6–10 KM": 28000,
    "10–15 KM": 38000,
    "NJE YA MAENEO HAYA": 44000,
  };

  // Price per stop per time (morning OR evening) per month
  const STOP_PRICE_LOOKUP = new Map([
    // 1 KM - 17,000 TZS per month per time
    ["jirani na shule", 17000],
    ["mazengo", 17000],
    ["mbezi", 17000],
    ["msikitini", 17000],
    ["mlimani rc", 17000],
    ["uswahilini kanisani", 17000],
    ["international", 17000],
    ["kona dampo", 17000],
    ["mauwa", 17000],
    ["mwisho wa fensi", 17000],
    ["ghati", 17000],
    ["mnara wa halotel", 17000],

    // 1.5 KM - 18,500 TZS per month per time
    ["sinoni", 18500],
    ["kidem", 18500],
    ["kidemi", 18500],
    ["soko mjinga", 18500],
    ["mnara wa voda", 18500],
    ["mbugani kwenye lami tu", 18500],

    // 2 KM - 21,000 TZS per month per time
    ["glorious", 21000],
    ["ushirika", 21000],
    ["tanga kona", 21000],
    ["njia mtoni", 21000],
    ["kaburi moja", 21000],
    ["kwa malaika", 21000],
    ["savanna", 21000],
    ["dampo", 21000],
    ["darajani", 21000],
    ["kikwete road", 21000],
    ["boma kubwa", 21000],
    ["kiwetu pazuri", 21000],
    ["umoja road", 21000],
    ["njiro ndogo", 21000],
    ["king david", 21000],

    // 3-4 KM - 24,000 TZS per month per time
    ["chavda", 24000],
    ["matokeo", 24000],
    ["milano", 24000],
    ["jamhuri", 24000],
    ["felix mrema", 24000],
    ["lemara", 24000],
    ["bonisite", 24000],
    ["intel", 24000],
    ["patel", 24000],
    ["terrati", 24000],
    ["si mbaoil", 24000],

    // 5-6 KM - 25,000 TZS per month per time
    ["mapambazuko", 25000],
    ["mkono wa madukani", 25000],
    ["soweto", 25000],
    ["mianzini barabarani", 25000],
    ["eliboru jr", 25000],
    ["green valley", 25000],
    ["country coffee", 25000],
    ["maua", 25000],
    ["pepsi", 25000],
    ["majengo", 25000],

    // 6-10 KM - 28,000 TZS per month per time
    ["sanawari", 28000],
    ["sekei", 28000],
    ["shabani", 28000],
    ["kimandolu", 28000],
    ["kijenge", 28000],
    ["mkono wa shuleni", 28000],

    // 10-15 KM - 38,000 TZS per month per time
    ["suye", 38000],
    ["moshono", 38000],
    ["nado", 38000],
    ["mwanama reli", 38000],
    ["kisongo", 38000],

    // NJE YA MAENEO HAYA - 44,000 TZS per month per time
    ["kiserian", 44000],
    ["chekereni", 44000],
    ["duka bovu", 44000],
    ["tengeru", 44000],
    ["ngulelo", 44000],
    ["kwamrefu", 44000],
    ["shangarai atomic", 44000],
  ]);

  const MONTH_MULTIPLIERS = {
    1: 1.5,
    2: 1,
    3: 1,
    4: 0.8,
    5: 1,
    6: 0,
    7: 1.5,
    8: 1,
    9: 0.8,
    10: 1,
    11: 1.25,
    12: 0,
  };

  const MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  function normalizeStop(stop) {
    return (stop || "")
      .toString()
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  }

  function priceForStop(stopName) {
    if (!stopName) return PRICING_BANDS["6–10 KM"];
    const normalized = normalizeStop(stopName);
    if (STOP_PRICE_LOOKUP.has(normalized)) {
      return STOP_PRICE_LOOKUP.get(normalized);
    }

    for (const [key, value] of STOP_PRICE_LOOKUP.entries()) {
      if (normalized.includes(key)) {
        return value;
      }
    }

    return PRICING_BANDS["6–10 KM"];
  }

  // Calculate expected payment for a month based on AM/PM usage
  // If both AM and PM, add both prices; otherwise use the single period price
  function expectedForMonth(amStop, pmStop, monthIndex) {
    const amPrice = amStop ? priceForStop(amStop) : 0;
    const pmPrice = pmStop ? priceForStop(pmStop) : 0;
    const base = amPrice + pmPrice; // Add both if both exist
    const multiplier = MONTH_MULTIPLIERS[monthIndex] ?? 1;
    return Math.round(base * multiplier);
  }

  function scheduleForYear(year, amStop, pmStop) {
    const months = [];
    let totalExpected = 0;
    let totalBase = 0;

    for (let index = 1; index <= 12; index += 1) {
      const amPrice = amStop ? priceForStop(amStop) : 0;
      const pmPrice = pmStop ? priceForStop(pmStop) : 0;
      const base = amPrice + pmPrice; // Add both periods
      const multiplier = MONTH_MULTIPLIERS[index] ?? 1;
      const expected = Math.round(base * multiplier);

      months.push({
        month: MONTH_NAMES[index - 1],
        index,
        base,
        multiplier,
        expected,
      });

      totalExpected += expected;
      totalBase += base;
    }

    return {
      year,
      months,
      totals: {
        base: totalBase,
        expected: totalExpected,
      },
    };
  }

  window.TransportPricing = {
    PRICING_BANDS,
    MONTH_MULTIPLIERS,
    priceForStop,
    expectedForMonth,
    scheduleForYear,
  };
})();
