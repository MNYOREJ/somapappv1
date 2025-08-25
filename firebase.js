<!-- Put these SDKs in your HTML HEAD once per page that talks to Firebase -->
<script src="https://www.gstatic.com/firebasejs/9.6.10/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.6.10/firebase-database-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.6.10/firebase-storage-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.6.10/firebase-analytics-compat.js"></script>

<script>
// One canonical config for all your pages
const firebaseConfig = {
  apiKey: "AIzaSyDqU_zl2K4SKV-Ty0yd1KIaFkjpLs6KlYo",
  authDomain: "somaptestt.firebaseapp.com",
  databaseURL: "https://somaptestt-default-rtdb.firebaseio.com",
  projectId: "somaptestt",
  storageBucket: "somaptestt.appspot.com", // ✅ FIXED
  messagingSenderId: "48563861599",
  appId: "1:48563861599:web:27c9dff2c9ab6de67b7c24",
  measurementId: ""
};

// Initialize once
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
window.db = firebase.database();
window.storage = firebase.storage();
</script>
