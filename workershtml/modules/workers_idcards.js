window.addEventListener('DOMContentLoaded', async () => {
  const appEl = document.getElementById('app');
  const gateEl = document.getElementById('authGate');

  // AUTH GATE (read-only for signed-in; restrict page behind login)
  firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
      gateEl.style.display = 'grid';
      appEl.style.display = 'none';
      return;
    }
    gateEl.style.display = 'none';
    appEl.style.display = '';
    initStudio();
  });
});

function pick(obj, pathList){
  for (const p of pathList){
    const v = (p.split('/').reduce((acc,k)=>acc && acc[k], obj));
    if (v) return v;
  }
  return null;
}

async function fetchWorkers(){
  const db = firebase.database();
  const tryPaths = ['workers','staff','employees'];
  for (const p of tryPaths){
    const snap = await db.ref(p).once('value');
    if (snap.exists()) return { path:p, map:snap.val() || {} };
  }
  return { path:'workers', map:{} }; // default empty
}

function normalize(wk, key){
  const first = wk.firstName || '';
  const mid   = wk.middleName || '';
  const last  = wk.lastName || wk.surname || '';
  const full  = [first, mid, last].join(' ').replace(/\s+/g,' ').trim() || (wk.name || '—');
  return {
    key,
    name: full,
    staffId: wk.staffId || wk.employeeId || key,
    role: wk.role || wk.title || 'Staff',
    department: wk.department || wk.dept || '—',
    phone: wk.phone || wk.contact || wk.mobile || '',
    photo: wk.photoUrl || wk.passportPhotoUrl || wk.avatarUrl || '',
    blood: wk.bloodGroup || '—',
    emergency: wk.emergencyContact || '',
    issued: wk.issuedAt ? new Date(wk.issuedAt).toLocaleDateString() : new Date().toLocaleDateString(),
    valid: wk.validTo ? new Date(wk.validTo).getFullYear() : (new Date().getFullYear() + 1)
  };
}

async function initStudio(){
  const { path, map } = await fetchWorkers();
  const list = Object.entries(map).map(([k,v]) => normalize(v,k));

  // Attempt to resolve currently signed-in worker for quicker access
  const workerIdLS = (localStorage.getItem('workerId') || '').toLowerCase();
  const fullNameLS = (localStorage.getItem('fullNameUpper') || '').toLowerCase();
  const roleLS = localStorage.getItem('role') || '';

  const results = document.getElementById('results');
  const countHint = document.getElementById('countHint');
  const searchBox = document.getElementById('searchBox');
  const downloadBtn = document.getElementById('downloadPdf');

  function resolveActiveWorker(){
    if (!list.length) return null;
    // Match by key or staffId first
    let match = list.find(w => w.key.toLowerCase() === workerIdLS || String(w.staffId).toLowerCase() === workerIdLS);
    if (match) return match;
    // Fallback: match by name fragment
    if (fullNameLS){
      match = list.find(w => w.name.toLowerCase().includes(fullNameLS));
      if (match) return match;
    }
    return null;
  }

  function renderList(filter=''){
    const f = filter.trim().toLowerCase();
    const view = list.filter(w => !f ||
      w.name.toLowerCase().includes(f) || String(w.staffId).toLowerCase().includes(f));
    countHint.textContent = `${view.length} of ${list.length}`;
    results.innerHTML = view.map(w => `
      <button data-k="${w.key}"
        class="w-full text-left p-3 hover:bg-slate-50 rounded transition">
        <div class="font-semibold">${w.name}</div>
        <div class="text-xs text-slate-500">ID: ${w.staffId} • ${w.role} — ${w.department}</div>
      </button>
    `).join('');
  }

  function setText(id, txt){ const el = document.getElementById(id); if (el) el.textContent = txt || '—'; }
  function setImg(id, src){ const el = document.getElementById(id); if (el) el.src = src || '../images/somap-logo.png.jpg'; }

  function loadWorker(w){
    setText('wName', w.name);
    setText('wRole', `${w.role} · ${w.department}`);
    setText('wId',   `Staff ID: ${w.staffId}`);
    setText('wPhone', w.phone);
    setText('wValid', `${new Date().getFullYear()}–${w.valid}`);
    setImg('wPhoto', w.photo);

    setText('bName', w.name);
    setText('bRole', w.role);
    setText('bDept', w.department);
    setText('bStaffId', w.staffId);
    setText('bPhone', w.phone);
    setText('bBlood', w.blood);
    setText('bEmerg', w.emergency || '—');
    setText('bIssued', w.issued);

    // QR (clear then re-create)
    const qrFront = document.getElementById('qrFront');
    const qrBack  = document.getElementById('qrBack');
    qrFront.innerHTML = ''; qrBack.innerHTML = '';
    const url = `https://somapv2i.com/verify?id=${encodeURIComponent(w.staffId || w.key)}`;
    new QRCode(qrFront, { text:url, width:120, height:120 });
    new QRCode(qrBack,  { text:url, width:120, height:120 });

    downloadBtn.onclick = () => exportPdf(w);
  }

  async function exportPdf(w){
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit:'mm', format:'a4', compress:true });

    const frontEl = document.getElementById('front');
    const backEl  = document.getElementById('back');

    const scale = 2; // sharp
    const frontCanvas = await html2canvas(frontEl, { scale, useCORS:true, logging:false });
    const backCanvas  = await html2canvas(backEl,  { scale, useCORS:true, logging:false });

    // Fit width (A4: 210x297 mm). Leave margins.
    const pageW = 210, margin = 10, drawW = pageW - margin*2;
    const ratio = frontCanvas.width / frontCanvas.height;
    const drawH = drawW / ratio;

    pdf.addImage(frontCanvas.toDataURL('image/png'), 'PNG', margin, margin, drawW, drawH);
    pdf.addImage(backCanvas.toDataURL('image/png'),  'PNG', margin, margin + drawH + 6, drawW, drawH);

    pdf.save(`${(w.name||'ID').replace(/\\s+/g,'_')}_Socrates_ID.pdf`);
  }

  // Wire UI
  results.addEventListener('click', (e)=>{
    const btn = e.target.closest('button[data-k]');
    if (!btn) return;
    const k = btn.getAttribute('data-k');
    const w = list.find(x => x.key === k);
    if (w) loadWorker(w);
  });

  searchBox.addEventListener('input', (e)=> renderList(e.target.value));
  const active = resolveActiveWorker();
  const defaultFilter = active ? (active.staffId || active.name) : '';
  renderList(defaultFilter);
  // Auto-load active worker if found; else first record
  if (active) {
    searchBox.value = defaultFilter;
    loadWorker(active);
  } else if (list.length) {
    loadWorker(list[0]);
  }
}
