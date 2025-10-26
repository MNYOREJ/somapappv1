(() => {
  const PRICING_BANDS = {
    "1 KM": 33000,
    "1.5 KM": 36000,
    "2 KM": 41000,
    "3–4 KM": 46000,
    "5–6 KM": 49000,
    "6–10 KM": 54000,
    "10–15 KM": 74000,
    "NJE YA MAENEO HAYA": 88000,
  };

  const STOP_PRICE_LOOKUP = new Map([
    ["jirani na shule", 33000],
    ["mazengo", 33000],
    ["mbezi", 33000],
    ["msikitini", 33000],
    ["mlimani rc", 33000],
    ["uswahilini kanisani", 33000],
    ["international", 33000],
    ["kona dampo", 33000],
    ["mauwa", 33000],
    ["mwisho wa fensi", 33000],
    ["ghati", 33000],
    ["mnara wa halotel", 33000],

    ["sinoni", 36000],
    ["kidem", 36000],
    ["kidemi", 36000],
    ["soko mjinga", 36000],
    ["mnara wa voda", 36000],
    ["mbugani kwenye lami tu", 36000],

    ["glorious", 41000],
    ["ushirika", 41000],
    ["tanga kona", 41000],
    ["njia mtoni", 41000],
    ["kaburi moja", 41000],
    ["kwa malaika", 41000],
    ["savanna", 41000],
    ["dampo", 41000],
    ["darajani", 41000],
    ["kikwete road", 41000],
    ["boma kubwa", 41000],
    ["kiwetu pazuri", 41000],
    ["umoja road", 41000],
    ["njiro ndogo", 41000],
    ["king david", 41000],

    ["chavda", 46000],
    ["matokeo", 46000],
    ["milano", 46000],
    ["jamhuri", 46000],
    ["felix mrema", 46000],
    ["lemara", 46000],
    ["bonisite", 46000],
    ["intel", 46000],
    ["patel", 46000],
    ["terrati", 46000],
    ["si mbaoil", 46000],

    ["mapambazuko", 49000],
    ["mkono wa madukani", 49000],
    ["soweto", 49000],
    ["mianzini barabarani", 49000],
    ["eliboru jr", 49000],
    ["green valley", 49000],
    ["country coffee", 49000],
    ["maua", 49000],
    ["pepsi", 49000],
    ["majengo", 49000],

    ["sanawari", 54000],
    ["sekei", 54000],
    ["shabani", 54000],
    ["kimandolu", 54000],
    ["kijenge", 54000],
    ["mkono wa shuleni", 54000],

    ["suye", 74000],
    ["moshono", 74000],
    ["nado", 74000],
    ["mwanama reli", 74000],
    ["kisongo", 74000],

    ["kiserian", 88000],
    ["chekereni", 88000],
    ["duka bovu", 88000],
    ["tengeru", 88000],
    ["ngulelo", 88000],
    ["kwamrefu", 88000],
    ["shangarai atomic", 88000],
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

  function expectedForMonth(amStop, pmStop, monthIndex) {
    const amPrice = priceForStop(amStop);
    const pmPrice = priceForStop(pmStop);
    const base = Math.max(amPrice, pmPrice);
    const multiplier = MONTH_MULTIPLIERS[monthIndex] ?? 1;
    return Math.round(base * multiplier);
  }

  function scheduleForYear(year, amStop, pmStop) {
    const months = [];
    let totalExpected = 0;
    let totalBase = 0;

    for (let index = 1; index <= 12; index += 1) {
      const amPrice = priceForStop(amStop);
      const pmPrice = priceForStop(pmStop);
      const base = Math.max(amPrice, pmPrice);
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
