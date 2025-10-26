(() => {
  const RADIUS_EARTH_KM = 6371;

  function slug(str = "") {
    return str
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function fmtTZS(value = 0) {
    const number = Number.isFinite(value) ? value : 0;
    return `TZS ${number.toLocaleString("en-US")}`;
  }

  function todayYMD(tz = "Africa/Nairobi") {
    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
    return parts;
  }

  const paths = {
    transportSettings: () => "settings/transport",
    busLatest: (vehicleId) => `bus_locations/${vehicleId}/latest`,
    deviceVehicle: (uid) => `devices/${uid}/vehicleId`,
    parent: (uid) => `parents/${uid}`,
    student: (studentId) => `students/${studentId}`,
    enrollment: (studentId) => `transport_enrollments/${studentId}`,
    claim: (claimId) => `transport_payments_claims/${claimId}`,
    paymentReservation: (tranNum) => `payment_reservations/${slug(tranNum)}`,
    ledgerMonth: (studentId, year, month) =>
      `transport_ledgers/${studentId}/${year}/${month}`,
    fuelRequest: (reqId) => `fuel_requests/${reqId}`,
    fuelLedger: (vehicleId) => `fuel_ledger/${vehicleId}`,
    maintRequest: (reqId) => `maintenance_requests/${reqId}`,
    maintLedger: (vehicleId) => `maintenance_ledger/${vehicleId}`,
    boardingDayVehicleTrip: (ymd, vehicleId, tripId) =>
      `boarding_events/${ymd}/${vehicleId}/${tripId}`,
  };

  async function reserveTranOrFail(tranNum, meta = {}) {
    const normalized = slug(tranNum);
    if (!normalized) {
      throw new Error("INVALID_TRAN");
    }
    const ref = firebase.database().ref(paths.paymentReservation(normalized));

    const result = await ref.transaction((current) => {
      if (current) {
        return; // abort
      }
      return {
        createdAt: Date.now(),
        byUid: meta.byUid || null,
        claimId: meta.claimId || null,
        rawTran: tranNum,
      };
    });

    if (!result.committed) {
      const err = new Error("DUPLICATE_TRAN");
      err.code = "DUPLICATE_TRAN";
      throw err;
    }

    return result.snapshot.val();
  }

  function expectedMaxLitres(periodKm = 0, kmPerLitre = 8, margin = 0.25) {
    const effective = Math.max(Number(periodKm) || 0, 0);
    const efficiency = Math.max(Number(kmPerLitre) || 0, 0.0001);
    const buffer = Math.max(Number(margin) || 0, 0);
    const litres = (effective / efficiency) * (1 + buffer);
    return Math.ceil(litres);
  }

  function computeHaversineKm(lat1, lng1, lat2, lng2) {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δφ = toRad(lat2 - lat1);
    const Δλ = toRad(lng2 - lng1);

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return RADIUS_EARTH_KM * c;
  }

  window.TransportHelpers = {
    slug,
    fmtTZS,
    todayYMD,
    paths,
    reserveTranOrFail,
    expectedMaxLitres,
    computeHaversineKm,
  };
})();
