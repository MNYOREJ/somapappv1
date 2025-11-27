(function () {
  const db = firebase.database();
  const auth = firebase.auth();

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  const SOMAP_ALLOWED_YEARS = Array.from({ length: 20 }, (_, i) => 2023 + i);
  const DEFAULT_YEAR = 2025;
  const CLASS_ORDER = ['Baby Class', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7'];
  const ALLOWED_ROLES = new Set(['admin', 'head', 'academic', 'teacher']);
  const state = {
    user: null,
    role: null,
    currentYear: String(DEFAULT_YEAR),
    students: {},
    enrollAnchor: {},
    enrollYear: {},
    categories: {},
    awards: {},
    pickedStudent: null,
    categoriesRef: null,
    awardsRef: null,
  };

  const L = (s) => String(s || '').trim().toLowerCase();

  function getYear() {
    if (window.somapYearContext && typeof window.somapYearContext.getSelectedYear === 'function') {
      return window.somapYearContext.getSelectedYear();
    }
    return sessionStorage.getItem('somap_selected_year') || DEFAULT_YEAR;
  }

  function setYear(y) {
    if (window.somapYearContext && typeof window.somapYearContext.setSelectedYear === 'function') {
      window.somapYearContext.setSelectedYear(String(y));
    }
    sessionStorage.setItem('somap_selected_year', String(y));
    state.currentYear = String(y);
  }

  function shiftClass(baseClass, delta) {
    const i = CLASS_ORDER.findIndex((c) => L(c) === L(baseClass));
    if (i < 0) return baseClass || '';
    const j = i + Number(delta || 0);
    if (j < 0) return 'PRE-ADMISSION';
    if (j >= CLASS_ORDER.length) return 'GRADUATED';
    return CLASS_ORDER[j];
  }

  function resolveClassForYear(studentId, y) {
    const anchor = state.enrollAnchor[studentId] || {};
    const baseClass = anchor.className || anchor.classLevel || 'Baby Class';
    const yrRec = (state.enrollYear && state.enrollYear[studentId]) || {};
    if (yrRec.className || yrRec.classLevel) return yrRec.className || yrRec.classLevel;
    const delta = Number(y) - DEFAULT_YEAR;
    return shiftClass(baseClass, delta);
  }

  function fullName(S) {
    return [S.firstName, S.middleName, S.lastName].map((s) => String(s || '').trim()).filter(Boolean).join(' ');
  }

  function pickPhoto(S) {
    return S.passportPhotoUrl || S.passportUrl || S.photoUrl || '';
  }

  function pickPhone(S) {
    return S.motherPhone || S.parentPhone || S.primaryParentContact || S.phone || '';
  }

  function pickAdm(S, id) {
    return S.admissionNumber || id;
  }

  async function readOnce(path) {
    try {
      const snap = await db.ref(path).once('value');
      return snap.exists() ? snap.val() : null;
    } catch (err) {
      console.warn('Read failed', path, err);
      return null;
    }
  }

  async function getRole(uid) {
    return (
      (await readOnce(`users/${uid}/role`)) ||
      (await readOnce(`staff/${uid}/role`)) ||
      (await readOnce(`teachers/${uid}/role`)) ||
      'teacher'
    );
  }

  function initYearUI() {
    const sel = $('#yearSelect');
    const hint = $('#yearHint');
    const title = $('#yearTitle');
    sel.innerHTML = SOMAP_ALLOWED_YEARS.map((y) => `<option value="${y}">${y}</option>`).join('');
    const y = getYear();
    sel.value = y;
    if (hint) hint.textContent = y;
    if (title) title.textContent = y;
    sel.addEventListener('change', (e) => {
      setYear(e.target.value);
      if (hint) hint.textContent = e.target.value;
      if (title) title.textContent = e.target.value;
      refresh();
    });
  }

  function bindStaticControls() {
    $('#awardScope').addEventListener('change', (e) => {
      const clsSelect = $('#awardClass');
      const scope = e.target.value;
      clsSelect.disabled = scope !== 'class';
    });
    $('#awardScope').dispatchEvent(new Event('change'));

    $('#btnAddCategory').addEventListener('click', async () => {
      const name = ($('#newCategoryName').value || '').trim();
      const y = state.currentYear;
      if (!name) return;
      const ref = db.ref(`awardsCategories/${y}`).push();
      await ref.set({ name, createdBy: state.user?.email || state.user?.uid || 'staff', createdAt: Date.now() });
      $('#newCategoryName').value = '';
      await refresh();
    });

    $('#studentSearch').addEventListener('input', handleStudentSearch);
    $('#btnCreateAward').addEventListener('click', createAward);
    $('#filterText').addEventListener('input', renderAwardsTable);
    $('#awardsTbody').addEventListener('click', handleAwardsAction);
    $('#btnBulkPdf').addEventListener('click', bulkDownload);
  }

  function handleStudentSearch(e) {
    const q = String(e.target.value || '').toLowerCase();
    const pickBox = $('#studentPick');
    pickBox.innerHTML = '';
    state.pickedStudent = null;
    if (!q) return;
    const items = Object.keys(state.students)
      .slice(0, 600)
      .map((id) => ({ id, S: state.students[id] }))
      .filter(({ id, S }) => {
        const name = fullName(S).toLowerCase();
        const adm = String(pickAdm(S, id)).toLowerCase();
        const phone = String(pickPhone(S)).toLowerCase();
        return name.includes(q) || adm.includes(q) || phone.includes(q);
      })
      .slice(0, 8);
    items.forEach(({ id, S }) => {
      const btn = document.createElement('button');
      btn.className = 'text-left block w-full px-2 py-1 hover:bg-slate-100 rounded';
      btn.type = 'button';
      btn.textContent = `${fullName(S)} · ${pickAdm(S, id)}`;
      btn.addEventListener('click', () => {
        state.pickedStudent = { id, S };
        const cls = resolveClassForYear(id, state.currentYear);
        $('#awardClass').value = cls || $('#awardClass').value;
        pickBox.innerHTML = `Picked: <b>${fullName(S)}</b> (${pickAdm(S, id)})`;
      });
      pickBox.appendChild(btn);
    });
  }

  async function loadData() {
    const y = state.currentYear;
    const [studentsSnap, enrollAnchorSnap, enrollYearSnap] = await Promise.all([
      db.ref('students').once('value'),
      db.ref(`enrollments/${DEFAULT_YEAR}`).once('value'),
      db.ref(`enrollments/${y}`).once('value'),
    ]);
    state.students = studentsSnap.val() || {};
    state.enrollAnchor = enrollAnchorSnap.val() || {};
    state.enrollYear = enrollYearSnap.val() || {};
  }

  function attachCategoryListener(y) {
    if (state.categoriesRef) state.categoriesRef.off();
    const ref = db.ref(`awardsCategories/${y}`);
    ref.on('value', (snap) => {
      state.categories = snap.val() || {};
      renderCategories();
    });
    state.categoriesRef = ref;
  }

  function attachAwardsListener(y) {
    if (state.awardsRef) state.awardsRef.off();
    const ref = db.ref(`studentAwards/${y}`);
    ref.on('value', (snap) => {
      state.awards = snap.val() || {};
      renderAwardsTable();
    });
    state.awardsRef = ref;
  }

  function renderCategories() {
    const wrap = $('#categoriesWrap');
    const select = $('#awardCategory');
    wrap.innerHTML = '';
    select.innerHTML = '';
    const entries = Object.entries(state.categories);
    if (!entries.length) {
      wrap.textContent = 'No categories yet. Add one to get started.';
      select.innerHTML = '<option value="">Add a category first</option>';
      return;
    }
    entries.forEach(([cid, c]) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'px-3 py-1 rounded-full border text-sm';
      chip.textContent = c.name;
      wrap.appendChild(chip);

      const opt = document.createElement('option');
      opt.value = cid;
      opt.textContent = c.name;
      select.appendChild(opt);
    });
  }

  function renderAwardsTable() {
    const tbody = $('#awardsTbody');
    const filter = String($('#filterText').value || '').toLowerCase();
    tbody.innerHTML = '';
    const entries = Object.entries(state.awards || {}).sort(([, a], [, b]) => (b.createdAt || 0) - (a.createdAt || 0));
    entries.forEach(([id, aw]) => {
      const hay = `${aw.studentName || ''} ${aw.categoryName || ''} ${aw.className || ''}`.toLowerCase();
      if (filter && !hay.includes(filter)) return;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="p-2 text-left">${aw.studentName || '—'}</td>
        <td class="p-2 text-center">${aw.categoryName || '—'}</td>
        <td class="p-2 text-center">${aw.scope || '—'}</td>
        <td class="p-2 text-center">${aw.className || '—'}</td>
        <td class="p-2 text-center">${aw.rank || '—'}</td>
        <td class="p-2 text-center">${aw.createdByEmail || aw.createdByUid || '—'}</td>
        <td class="p-2 text-right">
          <button class="px-2 py-1 border rounded mr-1" data-act="prev" data-id="${id}">Preview</button>
          <button class="px-2 py-1 border rounded mr-1" data-act="png" data-id="${id}">PNG</button>
          <button class="px-2 py-1 bg-slate-900 text-white rounded mr-1" data-act="pdf" data-id="${id}">PDF</button>
          <button class="px-2 py-1 border rounded text-red-700" data-act="del" data-id="${id}">Delete</button>
        </td>`;
      tbody.appendChild(tr);
    });
  }

  function offscreen() {
    return $('#offscreen');
  }

  function clearOffscreen() {
    offscreen().innerHTML = '';
  }

  function bindTemplate(node, d) {
    node.querySelector('#studentName').textContent = d.studentName || '—';
    node.querySelector('#categoryText').textContent = d.categoryName || '—';
    node.querySelector('#scopeText').textContent = d.scope === 'school' ? '(Whole School)' : '';
    node.querySelector('#classText').textContent = d.scope === 'class' ? `• ${d.className || ''}` : '';
    node.querySelector('#yearText').textContent = d.year || '—';
    node.querySelector('#rankText').textContent = d.rank || '—';
    node.querySelector('#issuedDate').textContent = d.issuedDate || '—';
    if (d.photoUrl) node.querySelector('#passport').src = d.photoUrl;
    if (d.logoUrl) node.querySelector('#logoImg').src = d.logoUrl;
  }

  function renderCert(d) {
    const tpl = $('#awardCertTemplate');
    const node = tpl.content.firstElementChild.cloneNode(true);
    bindTemplate(node, d);
    offscreen().appendChild(node);
    return node;
  }

  async function toCanvas(node) {
    return await html2canvas(node, { scale: 2, useCORS: true });
  }

  async function downloadPNG(node, fname) {
    const c = await toCanvas(node);
    const a = document.createElement('a');
    a.href = c.toDataURL('image/png');
    a.download = `${fname}.png`;
    a.click();
  }

  async function downloadPDF(node, fname) {
    const c = await toCanvas(node);
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const ratio = c.width / c.height;
    const w = pageW - 40;
    const h = w / ratio;
    const x = 20;
    const y = (pageH - h) / 2;
    pdf.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', x, y, w, h);
    pdf.save(`${fname}.pdf`);
  }

  function certDataFromAward(aw) {
    return {
      ...aw,
      year: state.currentYear,
      issuedDate: new Date().toLocaleDateString(),
      logoUrl: '../images/somap-logo.png.jpg',
    };
  }

  async function createAward() {
    const cid = $('#awardCategory').value;
    const scope = $('#awardScope').value;
    const cls = scope === 'class' ? $('#awardClass').value : null;
    const rank = Number($('#awardRank').value || 1);
    const categoryName = state.categories[cid]?.name;
    if (!cid || !categoryName) {
      alert('Please choose a category.');
      return;
    }
    if (!state.pickedStudent) {
      alert('Please search and pick a student.');
      return;
    }
    if (scope === 'class' && !cls) {
      alert('Please choose a class for this award.');
      return;
    }

    const { id: sid, S } = state.pickedStudent;
    const d = {
      categoryId: cid,
      categoryName,
      scope,
      className: cls,
      rank,
      studentId: sid,
      studentName: fullName(S),
      admissionNumber: pickAdm(S, sid),
      phone: pickPhone(S),
      photoUrl: pickPhoto(S),
      createdByUid: state.user?.uid || '',
      createdByEmail: state.user?.email || '',
      createdAt: Date.now(),
    };
    const y = state.currentYear;
    const ref = db.ref(`studentAwards/${y}`).push();
    await ref.set(d);
    await db.ref(`studentAwardsByStudent/${y}/${sid}/${ref.key}`).set(true);

    // Auto-generate PDF certificate
    clearOffscreen();
    const node = renderCert(certDataFromAward(d));
    const fname = `${d.studentName.replace(/\s+/g, '_')}_${y}_${categoryName.replace(/\s+/g, '_')}`;
    await downloadPDF(node, fname);
    await refresh();
  }

  async function handleAwardsAction(e) {
    const btn = e.target.closest('button[data-id]');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    const act = btn.getAttribute('data-act');
    const aw = state.awards[id];
    if (!aw) return;
    if (act === 'del') {
      if (!confirm('Delete this award?')) return;
      await db.ref(`studentAwards/${state.currentYear}/${id}`).remove();
      await db.ref(`studentAwardsByStudent/${state.currentYear}/${aw.studentId}/${id}`).remove();
      delete state.awards[id];
      renderAwardsTable();
      return;
    }
    clearOffscreen();
    const node = renderCert(certDataFromAward(aw));
    const fname = `${aw.studentName.replace(/\s+/g, '_')}_${state.currentYear}_${aw.categoryName.replace(/\s+/g, '_')}`;
    if (act === 'prev') {
      const canvas = await toCanvas(node);
      const w = window.open('');
      if (w) {
        w.document.write(`<img src="${canvas.toDataURL('image/png')}"/>`);
      } else {
        alert('Popup blocked. Please allow popups to preview.');
      }
      clearOffscreen();
      return;
    }
    if (act === 'png') {
      await downloadPNG(node, fname);
      clearOffscreen();
      return;
    }
    if (act === 'pdf') {
      await downloadPDF(node, fname);
      clearOffscreen();
    }
  }

  async function bulkDownload() {
    const entries = Object.entries(state.awards || {});
    if (!entries.length) {
      alert('No awards to download.');
      return;
    }
    clearOffscreen();
    for (const [, aw] of entries) {
      const node = renderCert(certDataFromAward(aw));
      const fname = `${aw.studentName.replace(/\s+/g, '_')}_${state.currentYear}_${aw.categoryName.replace(/\s+/g, '_')}`;
      await downloadPDF(node, fname);
      clearOffscreen();
    }
  }

  async function refresh() {
    const user = auth.currentUser;
    if (!user) {
      location.href = '../index.html';
      return;
    }
    state.user = user;
    state.currentYear = String(getYear());
    $('#yearHint').textContent = state.currentYear;
    $('#yearTitle').textContent = state.currentYear;
    $('#yearSelect').value = state.currentYear;

    if (!state.role) {
      state.role = await getRole(user.uid);
      if (!ALLOWED_ROLES.has(String(state.role || '').toLowerCase())) {
        alert('Access denied.');
        location.href = '../index.html';
        return;
      }
    }

    await loadData();
    state.pickedStudent = null;
    $('#studentPick').textContent = '';
    $('#studentSearch').value = '';
    state.categories = {};
    state.awards = {};
    renderCategories();
    renderAwardsTable();
    attachCategoryListener(state.currentYear);
    attachAwardsListener(state.currentYear);
  }

  document.addEventListener('DOMContentLoaded', () => {
    initYearUI();
    bindStaticControls();
    auth.onAuthStateChanged((u) => {
      if (!u) {
        location.href = '../index.html';
        return;
      }
      refresh();
    });
  });
})();
