// firebase.js
// SDKs are loaded in index.html (firebase-app-compat.js, firebase-database-compat.js, etc.)

// Firebase config (your real config here)
const firebaseConfig = {
  apiKey: "AIzaSyBhONntRE_aRsU0y1YcPZzWud3CBfwH_a8",
  authDomain: "somaptestt.firebaseapp.com",
  databaseURL: "https://somaptestt-default-rtdb.firebaseio.com",
  projectId: "somaptestt",
  storageBucket: "somaptestt.appspot.com",
  messagingSenderId: "105526245138",
  appId: "1:105526245138:web:b8e7c0cb82a46e861965cb",
};

// Initialize Firebase once
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();
window.db = db; // make sure schoolerp.html sees it
console.log("✅ Firebase initialized, DB ready:", db);
