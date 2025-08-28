// firebase.js — unified Firebase bootstrap for SoMApv2.0
// Make sure the SDKs are loaded BEFORE this file (firebase-app-compat, database-compat, storage-compat).

(function () {
  const firebaseConfig = {
    apiKey: "AIzaSyBhONntRE_aRsU0y1YcPZzWud3CBfwH_a8",
    authDomain: "somaptestt.firebaseapp.com",
    databaseURL: "https://somaptestt-default-rtdb.firebaseio.com/",
    projectId: "somaptestt",
    storageBucket: "somaptestt.appspot.com",
    messagingSenderId: "105526245138",
    appId: "1:105526245138:web:6f3767d3d8fa7fb8aab862"
  };

  // Initialize once
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  // Expose handles on window so ALL pages/scripts reuse the same instances
  window.db = firebase.database();
  window.storage = firebase.storage();
})();
