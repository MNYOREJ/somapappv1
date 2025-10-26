importScripts("https://www.gstatic.com/firebasejs/9.6.10/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.6.10/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBhONntRE_aRsU0y1YcPZzWud3CBfwH_a8",
  authDomain: "somaptestt.firebaseapp.com",
  databaseURL: "https://somaptestt-default-rtdb.firebaseio.com",
  projectId: "somaptestt",
  storageBucket: "somaptestt.appspot.com",
  messagingSenderId: "105526245138",
  appId: "1:105526245138:web:b8e7c0cb82a46e861965cb",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title = "🚍 Bus update", body, data = {} } = payload.notification || {};
  const options = {
    body: body || (payload.data ? payload.data.body : ""),
    data,
  };
  self.registration.showNotification(title, options);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl =
    "/transporthtml/parent/transporttrack_bus.html" +
    (event.notification.data?.vid
      ? `?vid=${event.notification.data.vid}&eta=${event.notification.data.eta || ""}`
      : "");
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes("/transporthtml/parent")) {
            client.focus();
            client.postMessage(event.notification.data);
            return;
          }
        }
        return clients.openWindow(targetUrl);
      })
  );
});
