(() => {
  const STATUS_COPY = {
    live: { text: "Live · Hai", tone: "ok" },
    stale: { text: "Stale · Imesimama", tone: "warn" },
    offline: { text: "Offline · Haipo Mtandaoni", tone: "bad" },
  };

  function attachBusLatest(vehicleId, onUpdate) {
    if (!vehicleId) return () => {};
    const ref = firebase
      .database()
      .ref(TransportHelpers.paths.busLatest(vehicleId));

    const listener = ref.on(
      "value",
      (snapshot) => {
        if (!snapshot.exists()) {
          onUpdate(null);
          return;
        }
        onUpdate(snapshot.val());
      },
      (err) => console.error("attachBusLatest error", err)
    );

    return () => ref.off("value", listener);
  }

  function etaMinutes(distanceKm, avgKmh = 30) {
    const safeAvg = Math.max(Number(avgKmh) || 0, 1);
    const minutes = (distanceKm / safeAvg) * 60;
    return Math.max(1, Math.round(minutes));
  }

  function statusChip(ts, status) {
    const age = Date.now() - Number(ts || 0);
    if (!ts || !Number.isFinite(age) || age < 0) {
      return STATUS_COPY.offline;
    }

    if (age < 2 * 60 * 1000 && status === "online") {
      return STATUS_COPY.live;
    }

    if (age < 10 * 60 * 1000) {
      return STATUS_COPY.stale;
    }

    return STATUS_COPY.offline;
  }

  async function saveParentStop(uid, stop) {
    if (!uid || !stop) return;
    const payload = {
      lat: stop.lat,
      lng: stop.lng,
      name: stop.name || null,
      updatedAt: Date.now(),
    };

    await firebase
      .database()
      .ref(`${TransportHelpers.paths.parent(uid)}/stop`)
      .set(payload);
  }

  window.ParentView = {
    attachBusLatest,
    computeHaversineKm: TransportHelpers.computeHaversineKm,
    etaMinutes,
    statusChip,
    saveParentStop,
  };
})();
