// app.js — zero-build SoMAp using Firebase v9 modular SDK
// Replace firebaseConfig with the object you provided

// Firebase config (you provided this)
const firebaseConfig = {
  apiKey: "AIzaSyBhONntRE_aRsU0y1YcPZzWud3CBfwH_a8",
  authDomain: "somaptestt.firebaseapp.com",
  projectId: "somaptestt",
  storageBucket: "somaptestt.firebasestorage.app",
  messagingSenderId: "105526245138",
  appId: "1:105526245138:web:b8e7c0cb82a46e861965cb",
  measurementId: "G-4HKX7KN6Q3"
}

// load firebase modules from CDN
// Note: this uses the compatibility CDN for simplicity
const script = document.createElement('script')
script.src = "https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"
document.head.appendChild(script)

const script2 = document.createElement('script')
script2.src = "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js"
document.head.appendChild(script2)

const script3 = document.createElement('script')
script3.src = "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js"
document.head.appendChild(script3)

script3.onload = () => {
  // init
  firebase.initializeApp(firebaseConfig)
  const auth = firebase.auth()
  const db = firebase.firestore()

  // UI refs
  const authArea = document.getElementById('auth-area')
  const authCard = document.getElementById('auth-card')
  const main = document.getElementById('main')
  const emailInput = document.getElementById('email')
  const passInput = document.getElementById('password')
  const btnSignIn = document.getElementById('btnSignIn')
  const btnSignOut = document.getElementById('btnSignOut')
  const userEmailSpan = document.getElementById('userEmail')
  const userRoleSpan = document.getElementById('userRole')
  const studentsTableBody = document.querySelector('#studentsTable tbody')
  const selectedStudentDiv = document.getElementById('selectedStudent')
  const noticeText = document.getElementById('noticeText')
  const noticesList = document.getElementById('noticesList')
  const activityList = document.getElementById('activityList')
  const btnAddStudent = document.getElementById('btnAddStudent')
  const btnPostNotice = document.getElementById('btnPostNotice')
  const btnSeedDemo = document.getElementById('btnSeedDemo')

  let currentUser = null
  let currentUserDoc = null

  // Auth handlers
  btnSignIn.onclick = async () => {
    const email = emailInput.value.trim()
    const pass = passInput.value.trim()
    if (!email || !pass) return alert('Enter email and password')
    try {
      await auth.signInWithEmailAndPassword(email, pass)
    } catch (e) {
      alert('Sign-in error: ' + e.message)
    }
  }

  btnSignOut.onclick = async () => {
    await auth.signOut()
  }

  auth.onAuthStateChanged(async (user) => {
    currentUser = user
    if (user) {
      authArea.textContent = user.email
      btnSignOut.style.display = 'inline-block'
      btnSignIn.style.display = 'none'
      // fetch user doc to read role
      const udoc = await db.collection('users').doc(user.uid).get()
      currentUserDoc = udoc.exists ? udoc.data() : null
      userEmailSpan.textContent = user.email
      userRoleSpan.textContent = currentUserDoc && currentUserDoc.role ? currentUserDoc.role : 'unknown'
      authCard.style.display = 'none'
      main.style.display = 'block'
      loadStudents()
      loadNotices()
    } else {
      authArea.textContent = 'Not signed in'
      btnSignOut.style.display = 'none'
      btnSignIn.style.display = 'inline-block'
      btnAddStudent.disabled = true
      main.style.display = 'none'
    }
  })

  // Students
  async function loadStudents() {
    studentsTableBody.innerHTML = '<tr><td colspan="6" class="muted">Loading…</td></tr>'
    const snap = await db.collection('students').orderBy('createdAt','desc').get()
    const rows = []
    snap.forEach(doc => {
      const s = { id: doc.id, ...doc.data() }
      rows.push(s)
    })
    renderStudents(rows)
  }

  function renderStudents(students) {
    studentsTableBody.innerHTML = ''
    if (!students.length) {
      studentsTableBody.innerHTML = '<tr><td colspan="6" class="muted">No students yet</td></tr>'
      return
    }
    students.forEach(s => {
      const tr = document.createElement('tr')
      tr.innerHTML = `
        <td>${s.studentId || s.id}</td>
        <td>${s.name || ''}</td>
        <td>${s.form || ''}</td>
        <td>${s.feesDue || 0}</td>
        <td>${s.attendanceToday || ''}</td>
        <td><button data-id="${s.id}" class="viewBtn">View</button> <button data-id="${s.id}" class="payBtn">Pay 5k</button></td>
      `
      studentsTableBody.appendChild(tr)
    })

    Array.from(document.getElementsByClassName('viewBtn')).forEach(b => b.onclick = async (ev) => {
      const id = ev.target.dataset.id
      const doc = await db.collection('students').doc(id).get()
      selectedStudentDiv.innerHTML = `<pre>${JSON.stringify({ id: doc.id, ...doc.data() }, null, 2)}</pre>`
    })

    Array.from(document.getElementsByClassName('payBtn')).forEach(b => b.onclick = async (ev) => {
      const id = ev.target.dataset.id
      const docRef = db.collection('students').doc(id)
      const doc = await docRef.get()
      if (!doc.exists) return alert('Student not found')
      const data = doc.data()
      const newDue = Math.max(0, (data.feesDue || 0) - 5000)
      await docRef.update({ feesDue: newDue })
      await db.collection('payments').add({ studentId: id, amount: 5000, createdAt: new Date(), recordedBy: currentUser ? currentUser.uid : null })
      addActivity(`${data.name || id} paid 5,000`)
      await loadStudents()
    })
  }

  // Add student (simple prompt flow)
  btnAddStudent.onclick = async () => {
    if (!currentUser) return alert('Sign in first')
    const name = prompt('Student name')
    if (!name) return
    const form = promp