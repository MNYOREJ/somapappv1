(() => {
  let messagingInstance = null;

  function ensureMessaging() {
    if (!("Notification" in window)) {
      throw new Error("Notifications not supported on this browser");
    }
    if (!firebase.messaging) {
      throw new Error("Firebase messaging SDK not loaded");
    }
    if (!messagingInstance) {
      messagingInstance = firebase.messaging();
    }
    return messagingInstance;
  }

  async function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) {
      throw new Error("Service workers unavailable");
    }
    const scope = "/transporthtml/";
    const registration = await navigator.serviceWorker.register(
      "./firebase-messaging-sw.js",
      { scope }
    );
    return registration;
  }

  async function persistToken(uid, token) {
    if (!uid || !token) return;
    await firebase
      .database()
      .ref(`${TransportHelpers.paths.parent(uid)}/fcmToken`)
      .set({
        token,
        updatedAt: Date.now(),
      });
  }

  async function initFCMForParent(uid) {
    if (!uid) throw new Error("Missing uid");
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      throw new Error("Notification permission denied");
    }

    const messaging = ensureMessaging();
    const registration = await registerServiceWorker();
    if (messaging.useServiceWorker) {
      messaging.useServiceWorker(registration);
    }

    const vapidKey =
      window.SOMAP_FCM_VAPID_KEY ||
      (firebase?.messaging?.isSupported?.() ? undefined : undefined);

    const token = await messaging.getToken(
      vapidKey ? { vapidKey, serviceWorkerRegistration: registration } : { serviceWorkerRegistration: registration }
    );

    if (!token) {
      throw new Error("Unable to obtain FCM token");
    }

    await persistToken(uid, token);

    messaging.onTokenRefresh(async () => {
      try {
        const refreshed = await messaging.getToken(
          vapidKey
            ? { vapidKey, serviceWorkerRegistration: registration }
            : { serviceWorkerRegistration: registration }
        );
        await persistToken(uid, refreshed);
      } catch (err) {
        console.error("FCM token refresh failed", err);
      }
    });

    return token;
  }

  window.FCMClient = {
    initFCMForParent,
  };
})();

/*
Option A) Firebase Functions (paste inside functions/index.js):

exports.pushBusEta = functions.database
  .ref("/bus_locations/{vid}/latest")
  .onWrite(async (change, context) => {
    const after = change.after.val();
    if (!after) return null;
    const vid = context.params.vid;
    const etaMinutes = require("./helpers").etaMinutes; // implement similarly

    const parentsSnap = await admin
      .database()
      .ref("parents")
      .orderByChild("childVehicle")
      .equalTo(vid)
      .once("value");

    const promises = [];
    parentsSnap.forEach((child) => {
      const parent = child.val();
      if (!parent.fcmToken?.token) return;
      const stop = parent.stop;
      if (!stop?.lat || !stop?.lng) return;

      const distanceKm = computeHaversineKm(
        after.lat,
        after.lng,
        stop.lat,
        stop.lng
      );
      const eta = etaMinutes(distanceKm);
      if (eta < 1 || eta > 30) return;

      const prev = parent.lastNotified?.[vid];
      const now = Date.now();
      if (prev && now - prev.ts < 4 * 60 * 1000 && Math.abs(prev.eta - eta) < 2) {
        return;
      }

      promises.push(
        admin.messaging().send({
          token: parent.fcmToken.token,
          notification: {
            title: "🚍 Bus update",
            body: `Vehicle ${vid}: ≈ ${eta} min to your stop.`,
          },
          data: {
            vid,
            eta: String(eta),
            lat: String(after.lat),
            lng: String(after.lng),
          },
        })
      );

      promises.push(
        admin
          .database()
          .ref(`parents/${child.key}/lastNotified/${vid}`)
          .set({ ts: now, eta })
      );
    });

    return Promise.all(promises);
  });

Option B) Cloudflare Worker pseudo-code (deploy separately):

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const secret = request.headers.get("x-somap-secret");
  if (secret !== SOMAP_SECRET) return new Response("Forbidden", { status: 403 });
  const { vid, lat, lng, ts } = await request.json();
  const parentsRes = await fetch(
    `https://somaptestt-default-rtdb.firebaseio.com/parents.json?orderBy="childVehicle"&equalTo="${vid}"&print=pretty`
  );
  const parents = await parentsRes.json();
  const messages = [];
  for (const uid in parents) {
    const parent = parents[uid];
    if (!parent.fcmToken?.token) continue;
    // compute ETA + rate-limit same as above
    messages.push({
      message: {
        token: parent.fcmToken.token,
        notification: {
          title: "🚍 Bus update",
          body: `Vehicle ${vid}: ≈ ${parentEta} min to your stop.`,
        },
        data: { vid, eta: String(parentEta), lat: String(lat), lng: String(lng) },
      },
    });
  }
  if (!messages.length) return new Response("No subscribers", { status: 200 });
  const fcmRes = await fetch("https://fcm.googleapis.com/v1/projects/somaptestt/messages:send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await getAccessToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messages),
  });
  return new Response(fcmRes.statusText, { status: fcmRes.status });
}
*/
