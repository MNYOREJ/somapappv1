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
