# SoMAp Workers Hub

This directory contains the complete Workers Hub for SoMAp (no build step, plain HTML/CSS/JS). Every page loads Firebase compat v9.6.10 directly from CDNs and expects `workershtml/firebase/firebase-config.js` to expose your public Firebase config.

```
workershtml/
  workersdashboard.html          -> Landing page for mapped workers
  workersadmission.html          -> Admin admission & KYC
  workersattendance.html         -> Check-in/out + penalties
  workertasks.html               -> Daily tasks & 8h SLA
  workersleaves.html             -> Leave requests + 90 day logic
  workerscontracts.html          -> Contract review + HTML2PDF acceptance
  workerssalary.html             -> Pay breakdown, payslips
  workerspayroll_admin.html      -> Admin payroll runs
  workersnssf.html               -> Statutory configuration & receipts
  workersperformance.html        -> Performance leaderboard
  workersstorekeeper.html        -> Stock receive/issue
  workerscooks.html              -> Kitchen hub (menus, variance, grievances)
  workersmlinzi.html             -> Guard handover & asset sweep
  workersmsafi.html              -> Cleaner checklist & consumables
  workersapprovals_admin.html    -> Unified approvals queue
  workersgenerateid.html         -> Generate ID cards with photos/PDF
  css/workers.css                -> Shared styling
  modules/*.js                   -> Helper modules (helpers, validation, payroll, ui, etc)
  modules/policies.json          -> Default policy knobs
  modules/assets_baseline.json   -> Guard asset baseline
  firebase/firebase-config.js    -> **Fill with your web config**
  rtdb/*.json                    -> Security rules (testing & production)
  scripts/seed_workers_settings.html -> Seeder for settings/workers
  firebase-messaging-sw.js       -> Optional FCM service worker
```

## 1. Configure Firebase

Edit `firebase/firebase-config.js` and paste your Firebase config values (`apiKey`, `projectId`, `databaseURL`, ...). The script automatically calls `firebase.initializeApp` when the config is present.

## 2. Routing from `index.html`

Add the following snippet immediately after Firebase initialization in `index.html`. It routes logged-in users to the proper hub based on their role mapping. Workers authenticate by THREE NAMES (uppercase) + phone, and their device mapping is stored under `/devices`.

```html
<!-- After firebase.initializeApp(firebaseConfig); -->
<script type="module">
  import './workershtml/modules/workers_helpers.js';
  const TZ = 'Africa/Nairobi';

  firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) return;
    const db = firebase.database();
    const uid = user.uid;
    const adminsSnap = await db.ref(`admins/${uid}`).once('value');
    if (adminsSnap.exists() && adminsSnap.val() === true) {
      window.location.href = 'dashboard.html';
      return;
    }
    const deviceSnap = await db.ref(`devices/${uid}/workerId`).once('value');
    if (deviceSnap.exists()) {
      window.location.href = 'workershtml/workersdashboard.html';
      return;
    }
    const parentSnap = await db.ref(`parents/${uid}`).once('value');
    if (parentSnap.exists()) {
      window.location.href = 'parent.html';
    }
  });

  document.getElementById('workerLoginForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.target;
    const fullName = form.elements.fullName.value.trim();
    const phone = form.elements.phone.value.trim();
    const nameTokens = fullName.split(/\s+/).filter(Boolean);
    if (nameTokens.length !== 3) {
      alert('Tafadhali andika majina matatu kamili (FIRST MIDDLE LAST).');
      return;
    }
    if (!/^\+2550\d{9}$/.test(phone)) {
      alert('Namba ya simu lazima ianze na +2550 kisha tarakimu 9.');
      return;
    }
    const fullNameUpper = nameTokens.map(t => t.toUpperCase()).join(' ');
    const encoder = new TextEncoder();
    const data = encoder.encode(`${fullNameUpper}|${phone}`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    const indexSnap = await firebase.database().ref(`workers_index_by_loginKey/${hashHex}`).once('value');
    if (!indexSnap.exists()) {
      alert('Hatukupata taarifa zako. Wasiliana na HR.');
      return;
    }
    const workerId = indexSnap.val().workerId;
    const authUser = firebase.auth().currentUser || await firebase.auth().signInAnonymously();
    await firebase.database().ref(`devices/${authUser.uid}`).update({
      workerId,
      linkedTs: Date.now()
    });
    window.location.href = 'workershtml/workersdashboard.html';
  });
</script>
```

Notes:
* Ensure the login form in `index.html` exposes inputs with `name="fullName"` and `name="phone"` plus `id="workerLoginForm"`.
* Workers do **not** use passwords or PINs. The SHA-256 hash of €œTHREE NAMES | phone€ is looked up in `workers_index_by_loginKey`.

## 3. Seeding default settings

1. Open `workershtml/scripts/seed_workers_settings.html` in your browser while signed in as an admin.
2. Click **Seed Settings** to create `settings/workers` with timezone, geofence, penalty settings, and statutory defaults.

## 4. Giving admin rights

Add a user UID under `/admins` with value `true`. Example using the Firebase console or the REST API:
```
admins/
  abcd1234UID : true
```
Only admins can access admissions, payroll, statutory, approvals, performance, and ID generation pages.

## 5. Security rules

Two rule sets reside in `rtdb/`:

* `workers.rules.testing.json` €” permissive enough for QA (workers may update their own records; admins edit everything).
* `workers.rules.production.json` €” locked-down; only admins can write shared data, workers can read/write only their own subtree. Workers cannot modify other workers€™ data, inventory, or approvals.

Deploy the appropriate file via the Firebase CLI:
```
firebase deploy --only database --project <projectId> --rules workershtml/rtdb/workers.rules.production.json
```

## 6. Linking from the main dashboard

Add a start card in `dashboard.html` (admin hub) that links to admissions or the worker dashboard. Example:
```html
<a class="card" href="workershtml/workersadmission.html">
  <h3>Workers Hub</h3>
  <p>Register staff, manage contracts, payroll, and attendance.</p>
</a>
```

## 7. ID cards

Use `workersgenerateid.html` to create PDF ID cards (with school branding, worker photo, contact). After generation the download link is stored in `workers/{workerId}/docs/idCardUrl` so the worker can access it from their dashboard.

## 8. Key behaviours

* **Admission** enforces LAZIMA fields, uploads docs to Storage, hashes login keys, and builds `/workers_index_by_loginKey`.
* **Attendance** captures photos + GPS, enforces geofence, auto-applies lateness penalties on even occurrences, and surfaces daily late list to admins.
* **Tasks** auto-penalizes missed tasks after 8 hours (even occurrences).
* **Leaves** apply rolling 90-day caps, auto-reject when limits exceeded without proof or explanation.
* **Cooks** log headcounts, menus, consumables, utensils, and grievances with variance auto-flagging.
* **Guards** capture shift handovers with photos/GPS, asset variance, incidents.
* **Cleaners** maintain checklist with before/after photos and consumable caps.
* **Storekeeper** enforces double-signature issues, ledger integrity, and discrepancy reporting.
* **Approvals** queues all flags (kitchen variance, guard incidents, cleaner overuse, store issues, leave escalations) for admin review with optional manual penalties.
* **Payroll** reads settings, penalties, statutory rates, generates payslips (PDF), and finalizes months.

## 9. Optional FCM

`firebase-messaging-sw.js` is included for optional Firebase Cloud Messaging reminders (e.g., 07:10 €œRemember to check-in€). Populate `firebaseConfig` and register messaging tokens under `workers/{workerId}/fcmToken` if you plan to use it.

---

**Remember:** keep all worker-related changes inside `workershtml/` as requested. No external build system is required€”open any HTML file directly in your browser (with Firebase config set) to interact with the module.


