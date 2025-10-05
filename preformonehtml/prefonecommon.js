// Shared for all Preform One files
const firebaseConfig = {
  apiKey: "AIzaSyBhONntRE_aRsU0y1YcPZzWud3CBfwH_a8",
  authDomain: "somapv2i.com",
  databaseURL: "https://somaptestt-default-rtdb.firebaseio.com",
  projectId: "somaptestt",
  storageBucket: "somaptestt.appspot.com",
  messagingSenderId: "105526245138",
  appId: "1:105526245138:web:b8e7c0cb82a46e861965cb"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database(); window.db = db;
const storage = firebase.storage(); window.storage = storage;

// Cloudinary Unsigned Upload (updated for presets)
function uploadToCloudinary(file, folder = 'preformone', preset = 'somap_unsigned') {  // Default somap_unsigned for photos
  if (file.name.toLowerCase().includes('book') || file.type === 'application/pdf') {
    preset = 'books_unsigned';  // For books/files
  }
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', preset);
  formData.append('folder', folder);
  return fetch('https://api.cloudinary.com/v1_1/dg7vnrkgd/upload', { method: 'POST', body: formData })
    .then(res => res.json()).then(data => data.secure_url);
}

// Year Selector (global)
let currentYear = new Date().getFullYear();
function loadYear(year) {
  currentYear = year;
  // Reload data for all components
  location.reload(); // Simple for HTML
}

// Subjects
const subjects = ['Physics', 'Chemistry', 'Biology', 'Historia ya Tanzania', 'French', 'Geography', 'Basic Mathematics', 'English Course', 'English Language', 'Computer Course', 'Business Studies'];

// Fee Calc
function calculateTotalFee(reportingDate) {
  const start = new Date(reportingDate);
  const end = new Date(currentYear, 11, 15); // Dec 15
  let total = 0;
  let current = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  while (current <= end) {
    if (current.getMonth() === 11) { // Dec pro-rate
      const daysInDec = 15;
      const daysEnrolled = Math.min(16 - current.getDate(), daysInDec); // To 15th
      total += (daysEnrolled / 30) * 15000;
    } else {
      total += 15000;
    }
    current.setMonth(current.getMonth() + 1);
  }
  return Math.round(total);
}

// Auto ADM No
function generateAdmNo() { return 'PF1-' + Date.now(); }

// Names Match (for parent auth)
function namesMatch(studentNames, inputNames) {
  const student = (studentNames.first + ' ' + studentNames.middle + ' ' + studentNames.last).toLowerCase().split(' ');
  const inputs = inputNames.toLowerCase().split(' ').slice(0,2);
  return inputs.every(name => student.includes(name));
}

// PDF Gen (jsPDF CDN in HTMLs)
function generatePDF(content, filename) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.text(content, 10, 10);
  doc.save(filename);
}

// CSV Export
function exportCSV(data, filename) {
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
}