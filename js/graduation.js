(function (window) {
  'use strict';

  // ---------- BASIC GUARDS ----------
  if (!window.firebase) {
    console.error('GraduationSuite: firebase SDK missing');
    return;
  }

  // ---------- SETTINGS / CONSTANTS ----------
  const AUTHORIZED_EMAILS = new Set([
    'ssclass42023@gmail.com',
    'socratesschool2020@gmail.com',
  ]);

  const YEAR_START = 2024;
  const YEAR_END = Math.max(2032, new Date().getFullYear() + 5);
  const YEARS = [];
  for (let year = YEAR_START; year <= YEAR_END; year += 1) YEARS.push(year);

  // ---------- STATE ----------
  const state = {
    page: 'dashboard',
    user: null,
    currentYear: new Date().getFullYear(),
    meta: {},
    students: {},
    payments: {},
    expenses: {},
    certificates: {},
    galleries: {},
    audits: {},
    masterStudents: null,
    totalPresentToday: null,
    filters: { search: '', classLevel: 'all' },
    watchers: [],
  };

  // ---------- DOM HELPERS ----------
  const domCache = {};
  function $(selector) {
    if (!selector) return null;
    domCache[selector] = domCache[selector] || document.querySelector(selector);
    return domCache[selector];
  }

  function db() { return firebase.database(); }
  function auth() { return firebase.auth(); }
  function storage() {
    if (!firebase.storage) throw new Error('Firebase storage SDK missing');
    return firebase.storage();
  }

  function toStr(value) { return value == null ? '' : String(value); }
  function sanitizeKey(raw) { return toStr(raw).replace(/[.#$/[\]]/g, '_'); }

  function formatCurrency(amount) {
    return `TSh ${Number(amount || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  }

  function showToast(message, type = 'success', duration = 4000) {
    let host = $('#grad-toast');
    if (!host) {
      host = document.createElement('div');
      host.id = 'grad-toast';
      host.style.position = 'fixed';
      host.style.bottom = '24px';
      host.style.right = '24px';
      host.style.zIndex = '999';
      host.style.padding = '12px 18px';
      host.style.borderRadius = '14px';
      host.style.fontFamily = 'Inter, system-ui, sans-serif';
      host.style.color = '#fff';
      host.style.boxShadow = '0 20px 40px rgba(15,23,42,0.28)';
      host.style.backdropFilter = 'blur(14px)';
      document.body.appendChild(host);
    }
    const palette = type === 'error'
      ? 'linear-gradient(135deg,#f87171,#ef4444)'
      : type === 'warn'
        ? 'linear-gradient(135deg,#f97316,#facc15)'
        : 'linear-gradient(135deg,#34d399,#10b981)';
    host.style.background = palette;
    host.textContent = message;
    host.style.opacity = '1';
    clearTimeout(host.__timer);
    host.__timer = setTimeout(() => {
      host.style.transition = 'opacity .35s ease';
      host.style.opacity = '0';
    }, duration);
  }

  function setBusy(selector, busy) {
    const node = $(selector);
    if (!node) return;
    node.disabled = !!busy;
    if (busy) {
      node.dataset.originalText = node.dataset.originalText || node.textContent;
      node.textContent = 'Processing...';
    } else if (node.dataset.originalText) {
      node.textContent = node.dataset.originalText;
    }
  }

  function setText(selector, value) {
    const node = $(selector);
    if (node) node.textContent = value;
  }

  function detachWatchers() {
    state.watchers.forEach((off) => {
      try { off(); } catch (err) { console.warn('GraduationSuite watcher cleanup', err); }
    });
    state.watchers = [];
  }

  function listen(path, handler) {
    const ref = db().ref(path);
    const wrapped = (snapshot) => handler(snapshot.val() || {});
    ref.on('value', wrapped);
    state.watchers.push(() => ref.off('value', wrapped));
  }

  // ---------- BUSINESS HELPERS ----------
  function computeExpectedFee(className, metaObj) {
    const meta = metaObj || state.meta || {};
    const high = Number(meta.feePreunitAnd7 || 45000);
    const low = Number(meta.feeOthers || 10000);
    const cls = toStr(className).toLowerCase();
    if (!cls) return low;
    const graduandTokens = ['preunit', 'pre-unit', 'pre unit', 'preparatory', 'class 7', 'std 7', 'grade 7'];
    if (graduandTokens.some((token) => cls.includes(token))) return high;
    return low;
  }

  function isGraduand(className) {
    return computeExpectedFee(className) > Number(state.meta?.feeOthers || 10000);
  }

  function normalizeYear(yearCandidate) {
    const numeric = Number(yearCandidate || state.currentYear || new Date().getFullYear());
    if (!Number.isInteger(numeric)) return new Date().getFullYear();
    if (numeric < YEAR_START) return YEAR_START;
    if (numeric > YEAR_END) return YEAR_END;
    return numeric;
  }

  function isAuthorized(email) {
    if (!email) return false;
    return AUTHORIZED_EMAILS.has(email.toLowerCase());
  }

  function showAuthGate(allowed) {
    const gate = $('#authGate');
    const shell = $('#appShell');
    if (gate) gate.style.display = allowed ? 'none' : 'flex';
    if (shell) shell.style.display = allowed ? 'block' : 'none';
  }

  // ---------- PUBLIC API ----------
  window.GraduationSuite = {
    init,
    loadYear,
    computeExpectedFee,
    generateCertificate,
    generateAllCertificates,
  };

  // ---------- INIT ----------
  function init(options = {}) {
    state.page = options.page || document.body.dataset.page || 'dashboard';
    state.currentYear = normalizeYear(options.year || new Date().getFullYear());
    buildYearSelector();
    attachBaseListeners();
    auth().onAuthStateChanged(handleAuthChange);
  }

  // ---------- YEAR TABS ----------
  function buildYearSelector() {
    const host = $('#yearTabs');
    if (!host) return;
    host.innerHTML = YEARS.map((year) => `<button data-year="${year}" class="year-chip">${year}</button>`).join('');
    host.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-year]');
      if (!button) return;
      const year = normalizeYear(button.dataset.year);
      if (year === state.currentYear) return;
      highlightYear(year);
      loadYear(year);
    });
    highlightYear(state.currentYear);
  }

  function highlightYear(year) {
    const host = $('#yearTabs');
    if (!host) return;
    host.querySelectorAll('button[data-year]').forEach((btn) => {
      btn.classList.toggle('active', Number(btn.dataset.year) === Number(year));
    });
  }

  // ---------- BASE LISTENERS ----------
  function attachBaseListeners() {
    const searchBox = $('#studentSearch');
    if (searchBox) {
      searchBox.addEventListener('input', (event) => {
        state.filters.search = event.target.value;
        renderStudentTable();
      });
    }

    const classFilter = $('#classFilter');
    if (classFilter) {
      classFilter.addEventListener('change', (event) => {
        state.filters.classLevel = event.target.value || 'all';
        renderStudentTable();
      });
    }

    const paymentForm = $('#paymentForm');
    if (paymentForm) paymentForm.addEventListener('submit', handlePaymentSubmit);

    const expenseForm = $('#expenseForm');
    if (expenseForm) expenseForm.addEventListener('submit', handleExpenseSubmit);

    const galleryForm = $('#galleryForm');
    if (galleryForm) galleryForm.addEventListener('submit', handleGallerySubmit);

    document.querySelectorAll('[data-export]').forEach((button) => {
      button.addEventListener('click', (event) => {
        const type = event.currentTarget.dataset.export;
        const format = event.currentTarget.dataset.format || 'csv';
        handleExport(type, format);
      });
    });

    document.querySelectorAll('[data-link]').forEach((button) => {
      const target = button.dataset.link;
      if (target === 'expenses') button.addEventListener('click', () => { window.location.href = 'gradexpenses.html'; });
      if (target === 'certificates') button.addEventListener('click', () => { window.location.href = 'gradcertificates.html'; });
      if (target === 'galleries') button.addEventListener('click', () => { window.location.href = 'gradgalleries.html'; });
    });

    // ✅ Wire up "Generate All Pending Certificates"
    const genAllBtn = $('#generateAllCertificates');
    if (genAllBtn) {
      genAllBtn.addEventListener('click', async () => {
        try {
          setBusy('#generateAllCertificates', true);
          await generateAllCertificates();
          showToast('Certificates generated for all graduands.');
        } catch (err) {
          console.error(err);
          showToast(err?.message || 'Bulk generation failed', 'error');
        } finally {
          setBusy('#generateAllCertificates', false);
        }
      });
    }
  }

  // ---------- AUTH & YEAR BOOTSTRAP ----------
  function handleAuthChange(user) {
    state.user = user;
    const allowed = isAuthorized(user?.email || '');
    showAuthGate(allowed);
    if (!allowed) return;

    ensureYearReady(state.currentYear)
      .then(() => {
        attachYearListeners(state.currentYear);
        renderAll();
        refreshTodayAttendance();
      })
      .catch((err) => {
        console.error(err);
        showToast(err?.message || 'Failed to load graduation data', 'error');
      });
  }

  async function ensureYearReady(year) {
    const normalized = normalizeYear(year);
    state.currentYear = normalized;
    await ensureMeta(normalized);
    await ensureStudents(normalized);
  }

  function ensureMeta(year) {
    const ref = db().ref(`graduation/${year}/meta`);
    return ref.once('value').then((snapshot) => {
      const meta = snapshot.val();
      state.meta = meta || {};
      if (meta) return meta;
      const fresh = {
        feePreunitAnd7: 45000,
        feeOthers: 10000,
        debtCutoffISO: `${year}-11-07`,
        createdBy: state.user?.email || 'system',
        createdAt: firebase.database.ServerValue.TIMESTAMP,
      };
      state.meta = fresh;
      return ref.set(fresh).then(() => fresh);
    });
  }

  async function ensureStudents(year) {
    const ref = db().ref(`graduation/${year}/students`);
    const snapshot = await ref.once('value');
    const existing = snapshot.val();
    if (existing && Object.keys(existing).length) {
      state.students = existing;
      return existing;
    }
    const master = await fetchMasterStudents();
    const payload = {};
    master.forEach((student) => {
      const adm = sanitizeKey(student.admissionNumber || student.__key);
      payload[adm] = {
        admissionNo: student.admissionNumber,
        name: student.fullName,
        class: student.classLevel,
        parentPhone: student.parentPhone,
        parentName: student.parentName,
        parentEmail: student.parentEmail,
        expectedFee: computeExpectedFee(student.classLevel),
        paid: 0,
        status: 'unpaid',
        lastPaymentAt: null,
        isGraduand: student.isGraduand,
        photoUrl: student.photoUrl || '',
        notes: '',
      };
    });
    await ref.set(payload);
    state.students = payload;
    await db().ref(`graduation/${year}/audits`).push({
      actor: state.user?.email || 'system',
      action: 'seed:students',
      refType: 'students',
      at: firebase.database.ServerValue.TIMESTAMP,
      after: { count: Object.keys(payload).length },
    });
    return payload;
  }

  async function fetchMasterStudents(force = false) {
    if (state.masterStudents && !force) return state.masterStudents;
    const snapshot = await db().ref('students').once('value');
    const obj = snapshot.val() || {};
    const list = Object.entries(obj).map(([key, val]) => {
      const entry = val || {};
      entry.__key = key;
      entry.admissionNumber = entry.admissionNumber || entry.pupilId || entry.admNo || sanitizeKey(key);
      entry.classLevel = entry.classLevel || entry.class || entry.grade || entry.level || '';
      entry.fullName = [entry.firstName, entry.middleName, entry.lastName].filter(Boolean).join(' ') || entry.name || 'Student';
      entry.parentPhone = extractPrimaryPhone(entry);
      entry.parentName = extractPrimaryName(entry);
      entry.parentEmail = extractPrimaryEmail(entry);
      entry.photoUrl = entry.photoUrl || entry.passportPhotoUrl || entry.photo || '';
      entry.isGraduand = isGraduand(entry.classLevel);
      return entry;
    });
    list.sort((a, b) => a.fullName.localeCompare(b.fullName, 'en'));
    state.masterStudents = list;
    return list;
  }

  function extractPrimaryPhone(student) {
    const candidates = [
      student.primaryParentContact,
      student.parentPhone,
      student.parentContact,
      student.guardianPhone,
      student.guardianContact,
      student.fatherPhone,
      student.motherPhone,
      student.phone1,
      student.phone2,
      student.phone,
      student.whatsapp,
      student.contact,
    ];
    for (const entry of candidates) {
      if (!entry) continue;
      if (typeof entry === 'string' || typeof entry === 'number') {
        const normalized = String(entry).trim();
        if (normalized) return normalized;
      } else if (Array.isArray(entry)) {
        const match = entry.map((item) => String(item || '').trim()).find(Boolean);
        if (match) return match;
      } else if (typeof entry === 'object') {
        const match = Object.values(entry).map((item) => String(item || '').trim()).find(Boolean);
        if (match) return match;
      }
    }
    return '';
  }

  function extractPrimaryEmail(student) {
    const candidates = [
      student.parentEmail,
      student.parentEmails,
      student.guardianEmail,
      student.guardianEmails,
      student.fatherEmail,
      student.motherEmail,
      student.parent1Email,
      student.parent2Email,
      student.email,
      student.contactEmail,
    ];
    for (const entry of candidates) {
      if (!entry) continue;
      if (typeof entry === 'string') {
        const normalized = entry.trim().toLowerCase();
        if (normalized && normalized.includes('@')) return normalized;
      } else if (Array.isArray(entry)) {
        const match = entry.map((item) => String(item || '').trim().toLowerCase()).find((val) => val && val.includes('@'));
        if (match) return match;
      } else if (typeof entry === 'object') {
        const match = Object.values(entry).map((item) => String(item || '').trim().toLowerCase()).find((val) => val && val.includes('@'));
        if (match) return match;
      }
    }
    return '';
  }

  function extractPrimaryName(student) {
    const candidates = [
      student.parentName,
      student.parent,
      student.guardianName,
      student.fatherName,
      student.motherName,
      student.primaryGuardian,
    ];
    for (const entry of candidates) {
      if (!entry) continue;
      if (typeof entry === 'string' || typeof entry === 'number') {
        const normalized = String(entry).trim();
        if (normalized) return normalized;
      } else if (typeof entry === 'object') {
        const match = Object.values(entry).map((item) => String(item || '').trim()).find(Boolean);
        if (match) return match;
      }
    }
    return '';
  }

  // ---------- REALTIME LISTENERS PER YEAR ----------
  function attachYearListeners(year) {
    detachWatchers();
    listen(`graduation/${year}/meta`, (meta) => {
      state.meta = meta;
      renderDashboardSummary();
    });
    listen(`graduation/${year}/students`, (students) => {
      state.students = students;
      populateStudentSelect();
      renderStudentTable();
      renderDashboardSummary();
      renderExpenseTotals();
    });
    const needsPayments = document.querySelector('#paymentsBody') || document.querySelector('#paymentStudent') || document.querySelector('#paymentForm');
    if (needsPayments) {
      listen(`graduation/${year}/payments`, (payments) => {
        state.payments = payments;
        renderPaymentsTable();
        renderDashboardSummary();
        renderExpenseTotals();
      });
    }
    const needsExpenses = document.querySelector('#expensesBody') || document.querySelector('#expenseForm');
    if (needsExpenses) {
      listen(`graduation/${year}/expenses`, (expenses) => {
        state.expenses = expenses;
        renderExpensesTable();
      });
    }
    const needsAudits = document.querySelector('#auditBody');
    if (needsAudits) {
      listen(`graduation/${year}/audits`, (audits) => {
        state.audits = audits;
        renderAuditLog();
      });
    }
    const needsCertificates = document.querySelector('#certificatesBody');
    if (needsCertificates) {
      listen(`graduation/${year}/certificates`, (certificates) => {
        state.certificates = certificates;
        renderCertificatesTable();
      });
    }
    const needsGallery = document.querySelector('#galleryGrid') || document.querySelector('#galleryForm');
    if (needsGallery) {
      listen(`graduation/${year}/galleries`, (galleries) => {
        state.galleries = galleries;
        renderGallery();
      });
    }
  }

  // ---------- RENDERERS ----------
  function renderAll() {
    renderDashboardSummary();
    renderStudentTable();
    renderPaymentsTable();
    renderExpensesTable();
    renderAuditLog();
    renderCertificatesTable();
    renderGallery();
  }

  function renderDashboardSummary() {
    if (state.page !== 'dashboard') return;
    const students = Object.values(state.students || {});
    const totalStudents = state.masterStudents ? state.masterStudents.length : students.length;
    const graduands = students.filter((student) => student.isGraduand);
    const expected = students.reduce((sum, student) => sum + Number(student.expectedFee || 0), 0);
    const collected = students.reduce((sum, student) => sum + Number(student.paid || 0), 0);
    const balance = Math.max(0, expected - collected);

    const statuses = { paid: 0, unpaid: 0, partial: 0, debt: 0 };
    students.forEach((student) => {
      const status = computeStatus(student);
      statuses[status] = (statuses[status] || 0) + 1;
    });
    statuses.unpaid += statuses.partial;

    setText('#cardTotalStudents', totalStudents ? totalStudents.toLocaleString('en-US') : '--');
    setText('#cardTotalPresent', state.totalPresentToday != null ? state.totalPresentToday.toLocaleString('en-US') : '--');
    setText('#cardGraduands', graduands.length ? graduands.length.toLocaleString('en-US') : '0');
    setText('#cardExpected', formatCurrency(expected));
    setText('#cardCollected', formatCurrency(collected));
    setText('#cardBalance', formatCurrency(balance));
    setText('#cardPaidCount', statuses.paid ? statuses.paid.toLocaleString('en-US') : '0');
    setText('#cardUnpaidCount', statuses.unpaid ? statuses.unpaid.toLocaleString('en-US') : '0');
  }

  function computeStatus(student) {
    const expected = Number(student.expectedFee || 0);
    const paid = Number(student.paid || 0);
    const cutoff = new Date(state.meta?.debtCutoffISO || `${state.currentYear}-11-07`);
    const now = new Date();
    if (paid >= expected && expected > 0) return 'paid';
    if (now > cutoff && paid < expected) return 'debt';
    if (paid > 0 && paid < expected) return 'partial';
    return 'unpaid';
  }

  function renderStudentTable() {
    if (state.page !== 'dashboard') return;
    const tbody = $('#studentsBody');
    if (!tbody) return;

    const search = toStr(state.filters.search).toLowerCase();
    const classFilter = state.filters.classLevel;
    const rows = Object.values(state.students || {});
    const filtered = rows.filter((student) => {
      const haystack = `${toStr(student.name)} ${toStr(student.admissionNo)} ${toStr(student.parentPhone)}`.toLowerCase();
      const matchesSearch = !search || haystack.includes(search);
      const matchesClass = classFilter === 'all'
        || toStr(student.class).toLowerCase() === toStr(classFilter).toLowerCase();
      return matchesSearch && matchesClass;
    });

    if (!filtered.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="py-8 text-center text-slate-500">
            No students for ${state.currentYear}. Seed students first.
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = filtered.map((student) => {
      const status = computeStatus(student);
      const debtTag = status === 'debt' ? '<span class="debt-pill">DEBT</span>' : '';
      const badge = status === 'paid'
        ? 'status-badge paid'
        : status === 'partial'
          ? 'status-badge partial'
          : status === 'debt'
            ? 'status-badge debt'
            : 'status-badge unpaid';
      const balance = Math.max(0, Number(student.expectedFee || 0) - Number(student.paid || 0));
      return `
        <tr class="${status === 'debt' ? 'row-debt' : ''}">
          <td>
            <div class="flex items-center gap-3">
              ${student.photoUrl
                ? `<img src="${student.photoUrl}" class="w-10 h-10 rounded-full object-cover border border-white/10" alt="${toStr(student.name)}">`
                : '<div class="w-10 h-10 rounded-full bg-sky-200 flex items-center justify-center text-sky-700 font-semibold">GR</div>'}
              <div>
                <div class="font-semibold text-slate-900">${toStr(student.name)}</div>
                <div class="text-xs text-slate-500">${toStr(student.admissionNo)}</div>
              </div>
            </div>
          </td>
          <td>${toStr(student.class) || '--'}</td>
          <td class="text-right">${formatCurrency(student.expectedFee)}</td>
          <td class="text-right ${Number(student.paid || 0) >= Number(student.expectedFee || 0) ? 'text-emerald-600 font-semibold' : ''}">
            ${formatCurrency(student.paid)}
          </td>
          <td class="text-right">${formatCurrency(balance)}</td>
          <td><span class="${badge}">${status.toUpperCase()}</span> ${debtTag}</td>
          <td>
            <div class="text-sm text-slate-700">${toStr(student.parentPhone) || '--'}</div>
            <div class="text-xs text-slate-400">${toStr(student.parentName) || ''}</div>
          </td>
          <td class="text-right">
            <button class="action-btn" data-action="pay" data-adm="${sanitizeKey(student.admissionNo)}">Record Payment</button>
            <button class="action-btn secondary" data-action="note" data-adm="${sanitizeKey(student.admissionNo)}">Note</button>
          </td>
        </tr>`;
    }).join('');
  }

  function populateStudentSelect() {
    const select = $('#paymentStudent');
    if (!select) return;
    const rows = Object.values(state.students || {});
    select.innerHTML = `<option value="">Select student</option>${
      rows.map((student) =>
        `<option value="${sanitizeKey(student.admissionNo)}">${toStr(student.name)}  -  ${toStr(student.class)}  -  ${toStr(student.admissionNo)}</option>`
      ).join('')
    }`;
  }

  function renderPaymentsTable() {
    const tbody = $('#paymentsBody');
    if (!tbody) return;
    const rows = Object.entries(state.payments || {}).map(([key, value]) => ({ key, ...(value || {}) }));
    if (!rows.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="py-6 text-center text-slate-500">No graduation payments yet.</td>
        </tr>`;
      return;
    }
    rows.sort((a, b) => Number(b.createdAt || b.timestamp || 0) - Number(a.createdAt || a.timestamp || 0));
    tbody.innerHTML = rows.map((payment) => {
      const student = state.students?.[sanitizeKey(payment.admissionNo)];
      const timestamp = new Date(Number(payment.createdAt || payment.timestamp || Date.now()));
      return `
        <tr>
          <td>${student?.name || payment.admissionNo || '--'}</td>
          <td>${formatCurrency(payment.amount)}</td>
          <td>${timestamp.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
          <td>${toStr(payment.method) || 'Cash'}${payment.note ? `<div class="text-xs text-slate-500">${toStr(payment.note)}</div>` : ''}</td>
          <td class="text-right text-xs text-slate-400 uppercase">${toStr(payment.recordedBy || '').split('@')[0]}</td>
        </tr>`;
    }).join('');
  }

  function renderExpensesTable() {
    const tbody = $('#expensesBody');
    if (!tbody) return;
    const rows = Object.entries(state.expenses || {}).map(([key, value]) => ({ key, ...(value || {}) }));
    if (!rows.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="py-8 text-center text-slate-500">No expenses recorded yet. Attach proof for every outflow.</td>
        </tr>`;
      renderExpenseTotals();
      return;
    }
    rows.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
    tbody.innerHTML = rows.map((expense) => {
      const total = Number(expense.total || (Number(expense.priceEach || 0) * Number(expense.quantity || 0)));
      const timestamp = new Date(Number(expense.createdAt || Date.now()));
      return `
        <tr>
          <td>${toStr(expense.item)}</td>
          <td>${toStr(expense.seller) || '--'}<div class="text-xs text-slate-400">${toStr(expense.sellerPhone) || ''}</div></td>
          <td>${Number(expense.quantity || 0).toLocaleString('en-US')}</td>
          <td>${formatCurrency(expense.priceEach)}</td>
          <td>${formatCurrency(total)}</td>
          <td>${timestamp.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}<div class="text-xs text-slate-400 uppercase">${toStr(expense.recordedBy || '').split('@')[0]}</div></td>
          <td>${expense.proofUrl ? `<a href="${expense.proofUrl}" target="_blank" class="proof-link">Proof</a>` : '<span class="text-xs text-red-500">Missing</span>'}</td>
        </tr>`;
    }).join('');
    renderExpenseTotals();
  }

  function renderExpenseTotals() {
    const expenses = Object.values(state.expenses || {});
    const total = expenses.reduce((sum, expense) => sum + Number(expense.total || (Number(expense.priceEach || 0) * Number(expense.quantity || 0))), 0);
    const count = expenses.length;
    const collectedFromStudents = Object.values(state.students || {}).reduce((sum, student) => sum + Number(student.paid || 0), 0);
    const collectedFromPayments = Object.values(state.payments || {}).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const collected = collectedFromStudents || collectedFromPayments || 0;
    const balance = collected - total;

    setText('#expensesTotal', formatCurrency(total));
    setText('#expensesCount', count ? `${count} entr${count === 1 ? 'y' : 'ies'}` : '0 entries');
    setText('#expensesCollectedTotal', formatCurrency(collected));
    setText('#expensesNetBalance', formatCurrency(balance));

    const balanceNode = $('#expensesNetBalance');
    if (balanceNode) {
      balanceNode.classList.toggle('negative', balance < 0);
      balanceNode.classList.toggle('positive', balance >= 0);
    }
  }

  function renderAuditLog() {
    const tbody = $('#auditBody');
    if (!tbody) return;
    const rows = Object.entries(state.audits || {}).map(([key, value]) => ({ key, ...(value || {}) }));
    if (!rows.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="py-6 text-center text-slate-500">No audit trail yet.</td>
        </tr>`;
      return;
    }
    rows.sort((a, b) => Number(b.at || 0) - Number(a.at || 0));
    tbody.innerHTML = rows.slice(0, 120).map((entry) => `
      <tr>
        <td>${new Date(Number(entry.at || Date.now())).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
        <td>${toStr(entry.action)}</td>
        <td>${toStr(entry.refType)}</td>
        <td>${toStr(entry.actor || '').split('@')[0]}</td>
        <td><code class="text-xs break-all">${JSON.stringify(entry.after || {}).slice(0, 120)}${JSON.stringify(entry.after || {}).length > 120 ? '...' : ''}</code></td>
      </tr>`).join('');
  }

  function renderCertificatesTable() {
    const tbody = $('#certificatesBody');
    if (!tbody) return;
    const rows = Object.values(state.students || {}).filter((student) => student.isGraduand);
    if (!rows.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="py-8 text-center text-slate-500">No graduands for ${state.currentYear}.</td>
        </tr>`;
      return;
    }
    rows.sort((a, b) => toStr(a.name).localeCompare(toStr(b.name)));
    tbody.innerHTML = rows.map((student) => {
      const certificate = state.certificates?.[sanitizeKey(student.admissionNo)];
      const generatedAt = certificate?.generatedAt ? new Date(Number(certificate.generatedAt)) : null;
      return `
        <tr>
          <td>
            <div class="font-semibold">${toStr(student.name)}</div>
            <div class="text-xs text-slate-400">${toStr(student.class)}  -  ${toStr(student.admissionNo)}</div>
          </td>
          <td>${certificate?.urlPdf ? 'Ready' : 'Pending'}</td>
          <td>${generatedAt ? generatedAt.toLocaleDateString('en-GB') : '--'}</td>
          <td>${certificate?.generatedBy ? toStr(certificate.generatedBy).split('@')[0] : '--'}</td>
          <td class="text-right">
            <button class="action-btn" data-action="generate-cert" data-adm="${sanitizeKey(student.admissionNo)}">Generate</button>
          </td>
          <td class="text-right">
            ${certificate?.urlPdf ? `<a class="action-btn tertiary" target="_blank" href="${certificate.urlPdf}">PDF</a>` : '<span class="text-xs text-slate-400">No PDF</span>'}
            ${certificate?.urlPreview ? `<a class="action-btn tertiary" target="_blank" href="${certificate.urlPreview}">Preview</a>` : ''}
          </td>
        </tr>`;
    }).join('');
  }

  function renderGallery() {
    const grid = $('#galleryGrid');
    if (!grid) return;
    const rows = Object.entries(state.galleries || {}).map(([key, value]) => ({ key, ...(value || {}) }));
    if (!rows.length) {
      grid.innerHTML = `
        <div class="empty-gallery">Upload curated graduation photos so parents can relive the day.</div>`;
      return;
    }
    rows.sort((a, b) => Number(b.uploadedAt || 0) - Number(a.uploadedAt || 0));
    grid.innerHTML = rows.map((photo) => `
      <article class="gallery-card">
        <img src="${photo.url}" alt="${toStr(photo.caption) || 'Graduation photo'}" loading="lazy" class="gallery-image">
        <div class="gallery-meta">
          <p class="caption">${toStr(photo.caption) || 'Graduation moment'}</p>
          <p class="meta">${new Date(Number(photo.uploadedAt || Date.now())).toLocaleDateString('en-GB')}  -  ${toStr(photo.uploadedBy || '').split('@')[0]}</p>
        </div>
      </article>`).join('');
  }

  // ---------- FORMS: PAYMENTS / EXPENSES / GALLERY ----------
  function handlePaymentSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const admissionNo = sanitizeKey(data.get('admissionNo'));
    const amount = Number(data.get('amount') || 0);
    const method = toStr(data.get('method') || 'Cash');
    const reference = toStr(data.get('reference') || '');
    const note = toStr(data.get('note') || '');

    if (!admissionNo) {
      showToast('Select a student before recording payment.', 'error');
      return;
    }
    if (!amount || amount <= 0) {
      showToast('Amount must be greater than 0.', 'error');
      return;
    }

    setBusy('#paymentSubmit', true);
    recordPayment({ admissionNo, amount, method, note, reference })
      .then(() => {
        form.reset();
        showToast('Payment sent to admin for approval.');
      })
      .catch((err) => {
        console.error(err);
        showToast(err?.message || 'Payment failed', 'error');
      })
      .finally(() => setBusy('#paymentSubmit', false));
  }

  function recordPayment({ admissionNo, amount, method, note, reference }) {
    const year = state.currentYear;
    const student = state.students?.[sanitizeKey(admissionNo)] || state.students?.[admissionNo];
    if (!student) {
      return Promise.reject(new Error('Student not found in graduation roster.'));
    }
    const expected = Number(student.expectedFee || computeExpectedFee(student.class, state.meta));
    const paidBefore = Number(student.paid || 0);
    const newBalance = Math.max(0, expected - Math.min(expected, paidBefore + Number(amount || 0)));
    const recordedBy = state.user?.email || 'unknown';
    const timestamp = Date.now();
    const parentContact = student.parentPhone || student.guardianPhone || student.contact || student.parentContact || '--';
    const pendingRef = db().ref('approvalsPending').push();

    return pendingRef.set({
      approvalId: pendingRef.key,
      sourceModule: 'graduation',
      studentAdm: admissionNo,
      studentName: toStr(student.name) || admissionNo,
      className: toStr(student.class) || toStr(student.classLevel) || '',
      parentContact,
      amountPaidNow: Number(amount),
      paymentMethod: method,
      paymentReferenceCode: reference || 'N/A',
      datePaid: timestamp,
      recordedBy,
      status: 'pending',
      notes: note,
      totalRequired: expected,
      totalPaidBefore: paidBefore,
      newBalanceAfterThis: newBalance,
      createdAt: firebase.database.ServerValue.TIMESTAMP,
      modulePayload: {
        year,
        admission: admissionNo,
        payment: {
          admissionNo,
          amount: Number(amount),
          method,
          note,
          reference,
          recordedBy,
          timestamp,
        },
        breakdown: [
          { label: 'Class', value: toStr(student.class) || '--' },
          { label: 'Expected Fee', value: formatCurrency(expected) },
          { label: 'Paid Before', value: formatCurrency(paidBefore) },
          { label: 'Balance After Approval', value: formatCurrency(newBalance) },
        ],
      },
    });
  }

  async function handleExpenseSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = {
      item: toStr(data.get('item')),
      seller: toStr(data.get('seller')),
      sellerPhone: toStr(data.get('sellerPhone')),
      quantity: Number(data.get('quantity') || 0),
      priceEach: Number(data.get('priceEach') || 0),
      note: toStr(data.get('note')),
      proofFile: data.get('proofFile'),
    };

    if (!payload.item) {
      showToast('Expense item required.', 'error');
      return;
    }
    if (!payload.proofFile || !payload.proofFile.size) {
      showToast('Attach proof (receipt/photo).', 'error');
      return;
    }
    if (!payload.quantity || !payload.priceEach) {
      showToast('Quantity and price must be provided.', 'error');
      return;
    }

    setBusy('#expenseSubmit', true);
    try {
      await recordExpense(payload);
      form.reset();
      showToast('Expense recorded with proof.');
    } catch (err) {
      console.error(err);
      showToast(err?.message || 'Expense failed', 'error');
    } finally {
      setBusy('#expenseSubmit', false);
    }
  }

  function recordExpense({ item, seller, sellerPhone, quantity, priceEach, note, proofFile }) {
    const year = state.currentYear;
    const expenseRef = db().ref(`graduation/${year}/expenses`).push();
    const expenseId = expenseRef.key;
    const total = Number(quantity || 0) * Number(priceEach || 0);
    const storagePath = `graduation/${year}/expenses/${expenseId}/${encodeURIComponent(proofFile.name)}`;
    const storageRef = storage().ref(storagePath);

    if (proofFile.size > 12 * 1024 * 1024) {
      return Promise.reject(new Error('Proof file too large. Max 12MB.'));
    }

    return uploadWithProgress(storageRef, proofFile, (progress) => {
      const btn = $('#expenseSubmit');
      if (btn) btn.textContent = progress < 100 ? `Uploading ${progress}%...` : 'Processing...';
    })
      .then((url) => expenseRef.set({
        item,
        seller,
        sellerPhone,
        quantity: Number(quantity),
        priceEach: Number(priceEach),
        total,
        proofUrl: url,
        proofPath: storagePath,
        note,
        recordedBy: state.user?.email || 'unknown',
        createdAt: firebase.database.ServerValue.TIMESTAMP,
      }).then(() => url))
      .then((url) => db().ref(`graduation/${year}/audits`).push({
        actor: state.user?.email || 'unknown',
        action: 'expense:add',
        refType: 'expense',
        refId: expenseId,
        after: { item, seller, sellerPhone, quantity, priceEach, total, proofUrl: url },
        at: firebase.database.ServerValue.TIMESTAMP,
      }));
  }

  function handleGallerySubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = {
      caption: toStr(data.get('caption')),
      file: data.get('photo'),
    };

    if (!payload.file || !payload.file.size) {
      showToast('Select a photo to upload.', 'error');
      return;
    }

    setBusy('#gallerySubmit', true);
    uploadGalleryPhoto(payload)
      .then(() => {
        form.reset();
        showToast('Gallery photo uploaded.');
      })
      .catch((err) => {
        console.error(err);
        showToast(err?.message || 'Upload failed', 'error');
      })
      .finally(() => setBusy('#gallerySubmit', false));
  }

  function uploadGalleryPhoto({ caption, file }) {
    const year = state.currentYear;
    const entryRef = db().ref(`graduation/${year}/galleries`).push();
    const galleryId = entryRef.key;
    const storagePath = `graduation/${year}/gallery/${galleryId}-${encodeURIComponent(file.name)}`;
    const storageRef = storage().ref(storagePath);

    return storageRef.put(file)
      .then(() => storageRef.getDownloadURL())
      .then((url) => entryRef.set({
        caption,
        url,
        uploadedBy: state.user?.email || 'unknown',
        uploadedAt: firebase.database.ServerValue.TIMESTAMP,
        storagePath,
      }).then(() => url))
      .then((url) => db().ref(`graduation/${year}/audits`).push({
        actor: state.user?.email || 'unknown',
        action: 'gallery:add',
        refType: 'gallery',
        refId: galleryId,
        after: { caption, url },
        at: firebase.database.ServerValue.TIMESTAMP,
      }));
  }

  // ---------- EXPORTS ----------
  function handleExport(type, format) {
    if (format === 'csv') {
      downloadCsv(type);
    } else if (format === 'pdf') {
      downloadPdf(type);
    } else {
      showToast(`Unsupported export format: ${format}`, 'error');
    }
  }

  function downloadCsv(type) {
    let headers = [];
    let rows = [];
    if (type === 'students') {
      headers = ['Admission', 'Name', 'Class', 'Expected', 'Paid', 'Balance', 'Status', 'Parent Phone'];
      rows = Object.values(state.students || {}).map((student) => {
        const balance = Math.max(0, Number(student.expectedFee || 0) - Number(student.paid || 0));
        return [
          toStr(student.admissionNo),
          toStr(student.name),
          toStr(student.class),
          Number(student.expectedFee || 0),
          Number(student.paid || 0),
          Number(balance),
          computeStatus(student),
          toStr(student.parentPhone),
        ];
      });
    } else if (type === 'paid') {
      headers = ['Admission', 'Name', 'Amount', 'Method', 'Recorded By', 'Timestamp'];
      rows = Object.values(state.payments || {}).map((payment) => [
        toStr(payment.admissionNo),
        state.students?.[sanitizeKey(payment.admissionNo)]?.name || '--',
        Number(payment.amount || 0),
        toStr(payment.method),
        toStr(payment.recordedBy),
        new Date(Number(payment.createdAt || payment.timestamp || Date.now())).toISOString(),
      ]);
    } else if (type === 'unpaid') {
      headers = ['Admission', 'Name', 'Class', 'Expected', 'Paid', 'Balance', 'Status', 'Parent Phone'];
      rows = Object.values(state.students || {}).filter((student) => {
        const status = computeStatus(student);
        return status === 'unpaid' || status === 'partial' || status === 'debt';
      }).map((student) => [
        toStr(student.admissionNo),
        toStr(student.name),
        toStr(student.class),
        Number(student.expectedFee || 0),
        Number(student.paid || 0),
        Number(Math.max(0, Number(student.expectedFee || 0) - Number(student.paid || 0))),
        computeStatus(student),
        toStr(student.parentPhone),
      ]);
    } else if (type === 'expenses') {
      headers = ['Item', 'Seller', 'Phone', 'Qty', 'Price Each', 'Total', 'Recorded By', 'Timestamp', 'Proof'];
      rows = Object.values(state.expenses || {}).map((expense) => [
        toStr(expense.item),
        toStr(expense.seller),
        toStr(expense.sellerPhone),
        Number(expense.quantity || 0),
        Number(expense.priceEach || 0),
        Number(expense.total || (Number(expense.priceEach || 0) * Number(expense.quantity || 0))),
        toStr(expense.recordedBy),
        new Date(Number(expense.createdAt || Date.now())).toISOString(),
        toStr(expense.proofUrl),
      ]);
    } else if (type === 'audit') {
      headers = ['Timestamp', 'Actor', 'Action', 'Ref', 'Details'];
      rows = Object.values(state.audits || {}).map((entry) => [
        new Date(Number(entry.at || Date.now())).toISOString(),
        toStr(entry.actor),
        toStr(entry.action),
        `${toStr(entry.refType)}  -  ${toStr(entry.refId)}`,
        JSON.stringify(entry.after || {}),
      ]);
    } else {
      showToast(`Unknown export type: ${type}`, 'error');
      return;
    }

    const lines = [headers.join(',')].concat(rows.map((row) => row.map((cell) => {
      const text = toStr(cell);
      if (/[,"\n]/.test(text)) return '"' + text.replace(/"/g, '""') + '"';
      return text;
    }).join(',')));

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `graduation_${state.currentYear}_${type}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function downloadPdf(type) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      showToast('jsPDF library required for PDF export.', 'error');
      return;
    }
    const doc = new window.jspdf.jsPDF('landscape');
    doc.setFontSize(16);
    doc.text(`Graduation ${state.currentYear}  -  ${type.toUpperCase()}`, 14, 16);
    doc.setFontSize(10);
    doc.text(`Generated ${new Date().toLocaleString()}`, 14, 26);

    let headers = [];
    let body = [];
    if (type === 'students') {
      headers = ['Admission', 'Name', 'Class', 'Expected', 'Paid', 'Balance', 'Status'];
      body = Object.values(state.students || {}).map((student) => [
        toStr(student.admissionNo),
        toStr(student.name),
        toStr(student.class),
        formatCurrency(student.expectedFee),
        formatCurrency(student.paid),
        formatCurrency(Math.max(0, Number(student.expectedFee || 0) - Number(student.paid || 0))),
        computeStatus(student).toUpperCase(),
      ]);
    } else if (type === 'paid') {
      headers = ['Admission', 'Name', 'Amount', 'Method', 'Recorded By', 'When'];
      body = Object.values(state.payments || {}).map((payment) => [
        toStr(payment.admissionNo),
        state.students?.[sanitizeKey(payment.admissionNo)]?.name || '--',
        formatCurrency(payment.amount),
        toStr(payment.method),
        toStr(payment.recordedBy),
        new Date(Number(payment.createdAt || payment.timestamp || Date.now())).toLocaleString('en-GB'),
      ]);
    } else if (type === 'unpaid') {
      headers = ['Admission', 'Name', 'Class', 'Expected', 'Paid', 'Balance', 'Status'];
      body = Object.values(state.students || {}).filter((student) => {
        const status = computeStatus(student);
        return status === 'unpaid' || status === 'partial' || status === 'debt';
      }).map((student) => [
        toStr(student.admissionNo),
        toStr(student.name),
        toStr(student.class),
        formatCurrency(student.expectedFee),
        formatCurrency(student.paid),
        formatCurrency(Math.max(0, Number(student.expectedFee || 0) - Number(student.paid || 0))),
        computeStatus(student).toUpperCase(),
      ]);
    } else if (type === 'expenses') {
      headers = ['Item', 'Seller', 'Qty', 'Price Each', 'Total', 'Recorded', 'Proof'];
      body = Object.values(state.expenses || {}).map((expense) => [
        toStr(expense.item),
        `${toStr(expense.seller)}  -  ${toStr(expense.sellerPhone)}`,
        Number(expense.quantity || 0),
        formatCurrency(expense.priceEach),
        formatCurrency(expense.total || (Number(expense.priceEach || 0) * Number(expense.quantity || 0))),
        `${toStr(expense.recordedBy)}  -  ${new Date(Number(expense.createdAt || Date.now())).toLocaleString('en-GB')}`,
        expense.proofUrl ? 'Attached' : 'Missing',
      ]);
    } else if (type === 'audit') {
      headers = ['When', 'Actor', 'Action', 'Ref', 'Details'];
      body = Object.values(state.audits || {}).map((entry) => [
        new Date(Number(entry.at || Date.now())).toLocaleString('en-GB'),
        toStr(entry.actor),
        toStr(entry.action),
        `${toStr(entry.refType)}  -  ${toStr(entry.refId)}`,
        JSON.stringify(entry.after || {}),
      ]);
    } else {
      showToast(`Unknown export type: ${type}`, 'error');
      return;
    }

    if (doc.autoTable) {
      doc.autoTable({
        head: [headers],
        body,
        startY: 32,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [15, 23, 42] },
      });
    } else {
      doc.text('jsPDF AutoTable plugin missing.', 14, 42);
    }
    doc.save(`graduation_${state.currentYear}_${type}.pdf`);
  }

  // ---------- CERTIFICATE GENERATION ----------
  async function generateCertificate(admissionNoRaw, options = {}) {
    const { triggerDownload = false } = options;
    const admissionNo = sanitizeKey(admissionNoRaw);
    const student = state.students?.[admissionNo];
    if (!student) throw new Error('Student not found');
    if (!student.isGraduand) throw new Error('Certificates available only for graduands');

    // Use <template>.content and an offscreen sandbox so html2canvas can render it.
    const template = document.getElementById('certificateTemplate');
    if (!template || !template.content) throw new Error('Certificate template missing in DOM');

    let sandbox = document.getElementById('renderSandbox');
    if (!sandbox) {
      sandbox = document.createElement('div');
      sandbox.id = 'renderSandbox';
      sandbox.style.position = 'fixed';
      sandbox.style.left = '-10000px';
      sandbox.style.top = '-10000px';
      sandbox.style.pointerEvents = 'none';
      document.body.appendChild(sandbox);
    }
    sandbox.innerHTML = '';
    const fragment = template.content.cloneNode(true);
    sandbox.appendChild(fragment);
    const certNode = sandbox.firstElementChild;

    // hydrate
    certNode.querySelector('[data-cert="studentName"]').textContent = toStr(student.name);
    certNode.querySelector('[data-cert="classLevel"]').textContent = `${toStr(student.class)}  -  ${state.currentYear}`;
    certNode.querySelector('[data-cert="issuedDate"]').textContent = new Date().toLocaleDateString('en-GB');
    certNode.querySelector('[data-cert="admission"]').textContent = toStr(student.admissionNo);

    // photo with crossOrigin - fetch from master students if not in graduation record
    const photoNode = certNode.querySelector('[data-cert="photo"]');
    if (photoNode) {
      photoNode.crossOrigin = 'anonymous';
      let photoUrl = student.photoUrl || '';
      // If no photo in graduation record, fetch from master students RTDB
      if (!photoUrl) {
        try {
          const masterSnapshot = await db().ref('students').orderByChild('admissionNumber').equalTo(student.admissionNo).once('value');
          const masterData = masterSnapshot.val() || {};
          const masterStudent = Object.values(masterData)[0];
          if (masterStudent) {
            photoUrl = masterStudent.passportPhotoUrl || masterStudent.passportPhotoURL || masterStudent.photoUrl || masterStudent.photo || '';
          }
        } catch (err) {
          console.warn('Failed to fetch photo from RTDB:', err?.message || err);
        }
      }
      photoNode.src = photoUrl || '../images/somap-logo.png.jpg';
      await new Promise((resolve) => {
        if (photoNode.complete) return resolve();
        photoNode.onload = () => resolve();
        photoNode.onerror = () => resolve(); // don't block if image fails
      });
    }

    if (!window.html2canvas || !window.jspdf || !window.jspdf.jsPDF) {
      throw new Error('html2canvas + jsPDF are required for certificate generation');
    }

    const canvas = await window.html2canvas(certNode, {
      scale: 2,
      useCORS: true,
      backgroundColor: null,
    });

    const dataUrl = canvas.toDataURL('image/png');
    const pdf = new window.jspdf.jsPDF('landscape', 'pt', 'a4');
    const width = pdf.internal.pageSize.getWidth();
    const height = pdf.internal.pageSize.getHeight();
    pdf.addImage(dataUrl, 'PNG', 0, 0, width, height);
    const pdfBlob = pdf.output('blob');

    if (triggerDownload) {
      const safeName = `${toStr(student.name).replace(/[^\w\s-]+/g, ' ').trim().replace(/\s+/g, '_') || admissionNo}_${state.currentYear}.pdf`;
      const downloadUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = safeName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        URL.revokeObjectURL(downloadUrl);
        link.remove();
      }, 1200);
    }

    const year = state.currentYear;
    const base = `graduation/${year}/certificates/${admissionNo}`;
    const pdfRef = storage().ref(`${base}.pdf`);
    const pngRef = storage().ref(`${base}.png`);

    await pdfRef.put(pdfBlob, { contentType: 'application/pdf' });
    let urlPreview = null;
    try {
      const previewBlob = await new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas could not produce a preview blob'));
        }, 'image/png');
      });
      await pngRef.put(previewBlob, { contentType: 'image/png' });
      urlPreview = await pngRef.getDownloadURL();
    } catch (err) {
      console.warn('Certificate preview upload skipped', err?.message || err);
    }

    const urlPdf = await pdfRef.getDownloadURL();

    await db().ref(`graduation/${year}/certificates/${admissionNo}`).set({
      urlPdf,
      urlPreview,
      generatedAt: firebase.database.ServerValue.TIMESTAMP,
      generatedBy: state.user?.email || 'unknown',
    });

    await db().ref(`graduation/${year}/audits`).push({
      actor: state.user?.email || 'unknown',
      action: 'certificate:generate',
      refType: 'certificate',
      refId: admissionNo,
      after: { urlPdf },
      at: firebase.database.ServerValue.TIMESTAMP,
    });
  }

  async function generateAllCertificates() {
    const graduands = Object.values(state.students || {}).filter((s) => s.isGraduand);
    if (!graduands.length) {
      showToast('No graduands available.', 'warn');
      return;
    }
    for (const s of graduands) {
      const adm = sanitizeKey(s.admissionNo);
      const existing = state.certificates?.[adm];
      if (existing?.urlPdf) continue;
      try {
        await generateCertificate(adm);
        await new Promise((r) => setTimeout(r, 400));
      } catch (err) {
        console.warn('Certificate generation failed for', adm, err?.message || err);
      }
    }
  }

  // ---------- ATTENDANCE SUMMARY ----------
  async function refreshTodayAttendance() {
    try {
      const master = await fetchMasterStudents();
      const classes = Array.from(new Set(master.map((student) => toStr(student.classLevel).trim()).filter(Boolean)));
      if (!classes.length) return;
      const today = new Date();
      const yymm = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
      const day = String(today.getDate()).padStart(2, '0');
      let present = 0;
      await Promise.all(classes.map(async (cls) => {
        try {
          const snap = await db().ref(`attendance/${cls}/${yymm}/${day}`).once('value');
          const record = snap.val();
          if (record && typeof record.present === 'number') present += record.present;
        } catch (err) {
          console.warn('Attendance read failed', cls, err?.message || err);
        }
      }));
      state.totalPresentToday = present || null;
      renderDashboardSummary();
    } catch (err) {
      console.warn('Attendance summary unavailable', err?.message || err);
    }
  }

  // ---------- YEAR SWITCH ----------
  function loadYear(year) {
    const normalized = normalizeYear(year);
    state.currentYear = normalized;
    ensureYearReady(normalized)
      .then(() => {
        attachYearListeners(normalized);
        renderAll();
      })
      .catch((err) => {
        console.error(err);
        showToast(err?.message || 'Failed to switch academic year', 'error');
      });
  }

  // Upload helper with progress + timeout for faster feedback on large files or stalled uploads.
  function uploadWithProgress(storageRef, file, onProgress, timeoutMs = 20000) {
    return new Promise((resolve, reject) => {
      const task = storageRef.put(file);
      const timer = setTimeout(() => {
        try { task.cancel(); } catch (_) { /* ignore */ }
        reject(new Error('Upload taking too long. Please try again with a smaller file.'));
      }, timeoutMs);

      task.on('state_changed', (snapshot) => {
        const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        if (onProgress) onProgress(pct);
      }, (err) => {
        clearTimeout(timer);
        reject(err);
      }, () => {
        clearTimeout(timer);
        storageRef.getDownloadURL().then(resolve).catch(reject);
      });
    });
  }

  // ---------- ACTION BUTTON DELEGATION ----------
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action][data-adm]');
    if (!button) return;
    const action = button.dataset.action;
    const admission = button.dataset.adm;

    if (action === 'pay') {
      const select = $('#paymentStudent');
      if (select) {
        select.value = admission;
        select.dispatchEvent(new Event('change'));
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      showToast('Student selected in payment form.', 'warn', 2200);
    } else if (action === 'note') {
      const ref = db().ref(`graduation/${state.currentYear}/students/${admission}`);
      const student = state.students?.[admission];
      const before = toStr(student?.notes || '');
      const updated = window.prompt(`Notes for ${student?.name || admission}`, before);
      if (updated === null) return;
      ref.update({
        notes: updated,
        notesUpdatedBy: state.user?.email || 'unknown',
        notesUpdatedAt: firebase.database.ServerValue.TIMESTAMP,
      }).then(() => db().ref(`graduation/${state.currentYear}/audits`).push({
        actor: state.user?.email || 'unknown',
        action: 'student:note',
        refType: 'student',
        refId: admission,
        before,
        after: updated,
        at: firebase.database.ServerValue.TIMESTAMP,
      }));
    } else if (action === 'generate-cert') {
      button.disabled = true;
      button.textContent = 'Generating...';
      generateCertificate(admission, { triggerDownload: true })
        .then(() => showToast('Certificate ready.'))
        .catch((err) => {
          console.error(err);
          showToast(err?.message || 'Generation failed', 'error');
        })
        .finally(() => {
          button.disabled = false;
          button.textContent = 'Generate';
        });
    }
  });

  // ---------- DEBT AUTO-MARKER ----------
  setInterval(() => {
    const cutoff = new Date(state.meta?.debtCutoffISO || `${state.currentYear}-11-07`);
    const now = new Date();
    if (now <= cutoff) return;
    const updates = {};
    Object.entries(state.students || {}).forEach(([key, student]) => {
      const expected = Number(student.expectedFee || 0);
      const paid = Number(student.paid || 0);
      if (paid < expected && student.status !== 'debt') {
        updates[`graduation/${state.currentYear}/students/${key}/status`] = 'debt';
      }
    });
    if (!Object.keys(updates).length) return;
    db().ref().update(updates).catch((err) => console.warn('Debt updater error', err?.message || err));
  }, 15 * 60 * 1000);

  // ---------- AUTO CERT GENERATION (Oct 18) ----------
  const autoCertTimer = setInterval(() => {
    const today = new Date();
    if (today.getMonth() === 9 && today.getDate() === 18) { // 0-indexed months
      generateAllCertificates().catch((err) => console.warn('Auto certificate generation failed', err?.message || err));
      clearInterval(autoCertTimer);
    }
  }, 6 * 60 * 60 * 1000);

}(window));
