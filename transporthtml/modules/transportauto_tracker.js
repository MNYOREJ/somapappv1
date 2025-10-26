(() => {
  const TZ = "Africa/Nairobi";
  const DEFAULT_WINDOWS = [
    { start: "04:00", end: "10:00" },
    { start: "14:00", end: "22:00" },
  ];
  const DEFAULT_ACTIVE_DAYS = [1, 2, 3, 4, 5]; // Mon-Fri (0 = Sunday)

  const state = {
    uid: null,
    vehicleId: null,
    enabled: false,
    activeDays: DEFAULT_ACTIVE_DAYS,
    windows: DEFAULT_WINDOWS,
    watchId: null,
    lastSent: null,
    disconnectHandle: null,
  };

  const db = () => firebase.database();

  function log(...args) {
    console.debug("[transportauto_tracker]", ...args);
  }

  function minutesSinceMidnight(date) {
    const tzDate = new Date(
      date.toLocaleString("en-US", { timeZone: TZ })
    );
    return tzDate.getHours() * 60 + tzDate.getMinutes();
  }

  function dayInTz(date) {
    const tzDate = new Date(
      date.toLocaleString("en-US", { timeZone: TZ })
    );
    return tzDate.getDay();
  }

  function parseWindow(window) {
    const [startH, startM] = (window.start || "00:00").split(":").map(Number);
    const [endH, endM] = (window.end || "23:59").split(":").map(Number);
    return {
      start: startH * 60 + startM,
      end: endH * 60 + endM,
    };
  }

  function isWithinWindow(now = new Date()) {
    if (!state.enabled) return false;
    const currentDay = dayInTz(now);
    if (!state.activeDays.includes(currentDay)) return false;

    const minutes = minutesSinceMidnight(now);
    return state.windows.some((window) => {
      const { start, end } = parseWindow(window);
      if (end < start) {
        // window crosses midnight
        return minutes >= start || minutes <= end;
      }
      return minutes >= start && minutes <= end;
    });
  }

  function getUrlVehicleId() {
    const params = new URLSearchParams(window.location.search);
    const vid = params.get("vid");
    if (vid) {
      try {
        localStorage.setItem("somap_vehicleId", TransportHelpers.slug(vid));
      } catch (err) {
        console.warn("Unable to persist vehicleId", err);
      }
      return TransportHelpers.slug(vid);
    }
    return null;
  }

  async function resolveVehicleId(uid) {
    const devicePath = TransportHelpers.paths.deviceVehicle(uid);
    try {
      const snapshot = await db().ref(devicePath).get();
      if (snapshot.exists()) {
        return snapshot.val();
      }
    } catch (err) {
      console.error("Failed to read device mapping", err);
    }

    const fromUrl = getUrlVehicleId();
    if (fromUrl) return fromUrl;

    try {
      const local = localStorage.getItem("somap_vehicleId");
      if (local) return local;
    } catch (err) {
      console.warn("Unable to read vehicleId from storage", err);
    }

    return null;
  }

  function stopTracking() {
    if (state.watchId !== null) {
      navigator.geolocation.clearWatch(state.watchId);
      state.watchId = null;
      log("Stopped geolocation watch");
    }
    if (state.vehicleId && state.disconnectHandle) {
      state.disconnectHandle.cancel();
      state.disconnectHandle = null;
    }
    if (state.vehicleId) {
      db()
        .ref(TransportHelpers.paths.busLatest(state.vehicleId))
        .update({
          status: "offline",
          ts: firebase.database.ServerValue.TIMESTAMP,
        })
        .catch((err) => console.warn("Failed to set offline status", err));
    }
  }

  function shouldSendUpdate(position) {
    const { latitude, longitude } = position.coords;
    const nowTs = Date.now();

    if (!state.lastSent) {
      state.lastSent = { lat: latitude, lng: longitude, ts: nowTs };
      return true;
    }

    const distanceKm = TransportHelpers.computeHaversineKm(
      state.lastSent.lat,
      state.lastSent.lng,
      latitude,
      longitude
    );

    const distanceMeters = distanceKm * 1000;
    const elapsed = nowTs - state.lastSent.ts;

    if (distanceMeters >= 25 || elapsed >= 20000) {
      state.lastSent = { lat: latitude, lng: longitude, ts: nowTs };
      return true;
    }

    return false;
  }

  function startTracking() {
    if (!navigator.geolocation) {
      console.warn("Geolocation not supported on this device");
      return;
    }
    if (state.watchId !== null) {
      return;
    }

    state.watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (!isWithinWindow()) {
          log("Outside schedule window, skipping update");
          return;
        }

        if (!shouldSendUpdate(position)) {
          return;
        }

        const payload = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          speed: Number(position.coords.speed || 0),
          heading: Number(position.coords.heading || 0),
          accuracy: Number(position.coords.accuracy || 0),
          ts: Date.now(),
          status: "online",
        };

        const ref = db().ref(TransportHelpers.paths.busLatest(state.vehicleId));
        if (!state.disconnectHandle) {
          state.disconnectHandle = ref.onDisconnect();
          state.disconnectHandle.update({
            status: "offline",
            ts: firebase.database.ServerValue.TIMESTAMP,
          });
        }

        ref
          .set(payload)
          .catch((err) => console.error("Failed to write bus latest", err));
      },
      (error) => {
        console.warn("Geolocation error", error);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      }
    );

    log("Started geolocation watch");
  }

  function refreshTrackingState() {
    if (!state.vehicleId) {
      stopTracking();
      return;
    }
    if (state.enabled && isWithinWindow()) {
      startTracking();
    } else {
      stopTracking();
    }
  }

  function subscribeSettings() {
    const ref = db().ref(TransportHelpers.paths.transportSettings());
    ref.on(
      "value",
      (snapshot) => {
        const data = snapshot.val() || {};
        state.enabled = Boolean(data.enabled);
        state.activeDays = Array.isArray(data.activeDays)
          ? data.activeDays.map((n) => Number(n))
          : DEFAULT_ACTIVE_DAYS;
        state.windows = Array.isArray(data.windows) && data.windows.length
          ? data.windows
          : DEFAULT_WINDOWS;
        refreshTrackingState();
      },
      (err) => console.error("Failed to subscribe settings", err)
    );
  }

  function init() {
    firebase.auth().onAuthStateChanged(async (user) => {
      if (!user) {
        stopTracking();
        return;
      }
      state.uid = user.uid;
      state.vehicleId = await resolveVehicleId(user.uid);

      if (!state.vehicleId) {
        log("No vehicle mapping for this user, tracker idle");
        return;
      }

      subscribeSettings();
      refreshTrackingState();
    });

    window.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        refreshTrackingState();
      }
    });
  }

  if (document.readyState === "complete" || document.readyState === "interactive") {
    init();
  } else {
    document.addEventListener("DOMContentLoaded", init);
  }
})();
