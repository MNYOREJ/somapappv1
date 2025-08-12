// firebase.js

// This file assumes you load Firebase compat SDK scripts in your HTML:
// <script src="https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js"></script>
// <script src="https://www.gstatic.com/firebasejs/10.8.1/firebase-database-compat.js"></script>

// Your Firebase config (with databaseURL added)
var firebaseConfig = {
  apiKey: "AIzaSyBhONntRE_aRsU0y1YcPZzWud3CBfwH_a8",
  authDomain: "somaptestt.firebaseapp.com",
  databaseURL: "https://somaptestt-default-rtdb.firebaseio.com",
  projectId: "somaptestt",
  storageBucket: "somaptestt.firebasestorage.app",
  messagingSenderId: "105526245138",
  appId: "1:105526245138:web:b8e7c0cb82a46e861965cb",
  measurementId: "G-4HKX7KN6Q3"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Optional: Enable analytics if you want
if (typeof firebase.analytics === "function") {
  firebase.analytics();
}
