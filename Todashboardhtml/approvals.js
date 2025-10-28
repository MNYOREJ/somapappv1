﻿
(function () {
  'use strict';

  const ADMIN_EMAIL = 'socratesschool2020@gmail.com';
  const COST_PER_FRIDAY = 1000;
  const MODULE_LABELS = {
    finance: 'School Fees',
    transport: 'Transport',
    prefonefinance: 'Preform One',
    graduation: 'Graduation',
    fridaymoney: 'Friday Money',
  };

  if (!window.firebase || !window.db) {
    console.error('Approvals: Firebase not initialised. Ensure firebase.js is loaded before approvals.js');
    return;
  }

  const db = window.db;
  const auth = firebase.auth();

  const els = {
    loader: document.getElementById('page-loader'),
    refresh: document.getElementById('refreshApprovals'),
    filterModule: document.getElementById('filterModule'),
    filterMonth: document.getElementById('filterMonth'),
    filterSearch: document.getElementById('filterSearch'),
    pendingBody: document.getElementById('pendingBody'),
    historyList: document.getElementById('historyList'),
    historyEmpty: document.getElementById('historyEmpty'),
    historyMonth: document.getElementById('historyMonth'),
    viewMoreHistory: document.getElementById('viewMoreHistory'),
    detailModal: document.getElementById('detailModal'),
    detailContent: document.getElementById('detailContent'),
    approveBtn: document.getElementById('approvePayment'),
    denyBtn: document.getElementById('denyPayment'),
    closeDetailBtn: document.getElementById('closeDetailModal'),
    toastHost: document.getElementById('toastHost'),
    summary: {
      finance: {
        required: document.getElementById('finance-required'),
        approved: document.getElementById('finance-approved'),
        balance: document.getElementById('finance-balance'),
        pending: document.getElementById('finance-pending-count'),
      },
      transport: {
        required: document.getElementById('transport-required'),
        approved: document.getElementById('transport-approved'),
        balance: document.getElementById('transport-balance'),
        pending: document.getElementById('transport-pending-count'),
      },
      prefonefinance: {
        required: document.getElementById('prefone-required'),
        approved: document.getElementById('prefone-approved'),
        balance: document.getElementById('prefone-balance'),
        pending: document.getElementById('prefone-pending-count'),
      },
      graduation: {
        required: document.getElementById('graduation-required'),
        approved: document.getElementById('graduation-approved'),
        balance: document.getElementById('graduation-balance'),
        pending: document.getElementById('graduation-pending-count'),
      },
      fridaymoney: {
        required: document.getElementById('friday-required'),
        approved: document.getElementById('friday-approved'),
        balance: document.getElementById('friday-balance'),
        pending: document.getElementById('friday-pending-count'),
      },
    },
  };

  const state = {
    user: null,
    pending: {},
    pendingList: [],
    selectedRecord: null,
    filters: {
      module: '',
      search: '',
      month: '',
    },
    historyEntries: [],
    historyLimit: 30,
    historyFilterMonth: '',
    summary: {
      finance: { required: 0, approved: 0, balance: 0, pendingAmount: 0, pendingCount: 0 },
      transport: { required: 0, approved: 0, balance: 0, pendingAmount: 0, pendingCount: 0 },
      prefonefinance: { required: 0, approved: 0, balance: 0, pendingAmount: 0, pendingCount: 0 },
      graduation: { required: 0, approved: 0, balance: 0, pendingAmount: 0, pendingCount: 0 },
      fridaymoney: { required: 0, approved: 0, balance: 0, pendingAmount: 0, pendingCount: 0 },
    },
    unsubPending: null,
    historyMonthOptions: [],
  };
  function formatCurrency(amount) {
    const numeric = Number(amount) || 0;
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      maximumFractionDigits: 0,
    }).format(numeric);
  }

  function formatDate(value) {
    if (!value) return '--';
    const date = new Date(Number(value));
    if (Number.isNaN(date.getTime())) return '--';
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function showLoader(show) {
    if (!els.loader) return;
    els.loader.classList.toggle('hidden', !show);
    if (show) els.loader.classList.add('flex');
    else els.loader.classList.remove('flex');
  }

  function toast(message, tone = 'info', duration = 4200) {
    if (!els.toastHost) return;
    const node = document.createElement('div');
    node.className = 'pointer-events-auto rounded-2xl px-4 py-3 text-sm font-semibold shadow-glow';
    const palette = tone === 'success'
      ? 'linear-gradient(135deg,#22c55e,#15803d)'
      : tone === 'danger'
        ? 'linear-gradient(135deg,#ef4444,#b91c1c)'
        : tone === 'warning'
          ? 'linear-gradient(135deg,#f97316,#f59e0b)'
          : 'linear-gradient(135deg,#38bdf8,#0ea5e9)';
    node.style.background = palette;
    node.style.color = '#f8fafc';
    node.style.backdropFilter = 'blur(12px)';
    node.textContent = message;
    els.toastHost.appendChild(node);
    setTimeout(() => {
      node.style.opacity = '0';
      node.style.transform = 'translateY(12px)';
      setTimeout(() => node.remove(), 360);
    }, duration);
  }

  function guardAccess(user) {
    if (!user) {
      window.location.href = '../index.html';
      return false;
    }
    const email = (user.email || '').toLowerCase();
    if (email !== ADMIN_EMAIL) {
      Swal.fire({
        icon: 'error',
        title: 'Restricted',
        text: 'Payment approvals are restricted to the main admin account.',
        confirmButtonColor: '#0ea5e9',
      }).then(() => {
        window.location.href = '../dashboard.html';
      });
      return false;
    }
    return true;
  }

  function attachListeners() {
    if (els.refresh) {
      els.refresh.addEventListener('click', () => {
        loadAllData();
      });
    }
    if (els.filterModule) {
      els.filterModule.addEventListener('change', (e) => {
        state.filters.module = e.target.value;
        renderPendingTable();
      });
    }
    if (els.filterMonth) {
      els.filterMonth.addEventListener('change', (e) => {
        state.filters.month = e.target.value;
        renderPendingTable();
      });
    }
    if (els.filterSearch) {
      els.filterSearch.addEventListener('input', (e) => {
        state.filters.search = (e.target.value || '').trim().toLowerCase();
        renderPendingTable();
      });
    }
    if (els.closeDetailBtn) {
      els.closeDetailBtn.addEventListener('click', hideDetailModal);
    }
    if (els.detailModal) {
      els.detailModal.addEventListener('click', (event) => {
        if (event.target === els.detailModal) hideDetailModal();
      });
    }
    if (els.approveBtn) {
      els.approveBtn.addEventListener('click', () => {
        approveSelectedRecord();
      });
    }
    if (els.denyBtn) {
      els.denyBtn.addEventListener('click', () => {
        rejectSelectedRecord();
      });
    }
    if (els.historyMonth) {
      els.historyMonth.addEventListener('change', (event) => {
        state.historyFilterMonth = event.target.value || '';
        renderHistory();
      });
    }
    if (els.viewMoreHistory) {
      els.viewMoreHistory.addEventListener('click', () => {
        state.historyLimit += 30;
        renderHistory();
      });
    }
  }
  function loadAllData() {
    showLoader(true);
    Promise.all([
      watchPendingApprovals(),
      loadHistorySnapshot(),
      loadSummaries(),
    ]).catch((err) => {
      console.error('Approvals: data load failed', err);
      toast(err?.message || 'Failed to refresh approvals data', 'danger');
    }).finally(() => showLoader(false));
  }

  function watchPendingApprovals() {
    if (state.unsubPending) {
      try { state.unsubPending(); } catch (err) { console.warn('Approvals: failed to detach previous listener', err); }
      state.unsubPending = null;
    }
    const ref = db.ref('approvalsPending');
    const handler = (snapshot) => {
      state.pending = snapshot.val() || {};
      state.pendingList = Object.entries(state.pending).map(([key, value]) => ({
        approvalId: key,
        ...(value || {}),
      })).sort((a, b) => Number(b.createdAt || b.datePaid || 0) - Number(a.createdAt || a.datePaid || 0));
      renderPendingTable();
      recomputePendingSummaries();
    };
    ref.on('value', handler);
    state.unsubPending = () => ref.off('value', handler);
  }

  function renderPendingTable() {
    if (!els.pendingBody) return;
    if (!state.pendingList.length) {
      els.pendingBody.innerHTML = `
        <tr>
          <td colspan="9" class="py-12 text-center text-sm text-slate-400">
            No pending approvals &mdash; accountants must submit payments first.
          </td>
        </tr>`;
      return;
    }

    const monthFilter = state.filters.month;
    const moduleFilter = state.filters.module;
    const search = state.filters.search;

    const filtered = state.pendingList.filter((row) => {
      const matchesModule = !moduleFilter || row.sourceModule === moduleFilter;
      const matchesSearch = !search
        || (row.studentName || '').toLowerCase().includes(search)
        || (row.studentAdm || '').toLowerCase().includes(search);
      let matchesMonth = true;
      if (monthFilter) {
        const stamp = Number(row.datePaid || row.createdAt || 0);
        if (stamp) {
          const d = new Date(stamp);
          const monthValue = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          matchesMonth = monthValue === monthFilter;
        } else {
          matchesMonth = false;
        }
      }
      return matchesModule && matchesSearch && matchesMonth;
    });

    if (!filtered.length) {
      els.pendingBody.innerHTML = `
        <tr>
          <td colspan="9" class="py-10 text-center text-sm text-slate-400">
            No matches for the selected filters.
          </td>
        </tr>`;
      return;
    }

    const frag = document.createDocumentFragment();
    filtered.forEach((row) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${formatDate(row.datePaid || row.createdAt)}</td>
        <td>
          <div class="font-semibold text-slate-100">${row.studentName || '--'}</div>
          <div class="text-xs text-slate-400">${row.studentAdm || ''}</div>
        </td>
        <td>${row.className || '--'}</td>
        <td>${row.parentContact || '--'}</td>
        <td>
          <span class="pill pill-pending">${MODULE_LABELS[row.sourceModule] || row.sourceModule}</span>
        </td>
        <td class="font-semibold text-emerald-200">${formatCurrency(row.amountPaidNow)}</td>
        <td>${row.recordedBy || '--'}</td>
        <td><span class="pill pill-pending">${(row.status || 'pending').toUpperCase()}</span></td>
        <td class="text-right">
          <div class="flex justify-end gap-2">
            <button class="inline-flex items-center gap-1 rounded-full border border-slate-500/40 px-3 py-1 text-xs text-slate-200 hover:border-slate-300/60">
              <i class="fas fa-eye"></i> View
            </button>
            <button class="inline-flex items-center gap-1 rounded-full border border-emerald-500/60 px-3 py-1 text-xs text-emerald-100 hover:border-emerald-300/60">
              <i class="fas fa-check"></i> Approve
            </button>
          </div>
        </td>`;

      const [viewBtn, approveBtn] = tr.querySelectorAll('button');
      viewBtn?.addEventListener('click', () => openDetailModal(row));
      approveBtn?.addEventListener('click', () => approveRecord(row));
      frag.appendChild(tr);
    });
    els.pendingBody.innerHTML = '';
    els.pendingBody.appendChild(frag);
  }
  function openDetailModal(record) {
    state.selectedRecord = record;
    if (!els.detailContent || !els.detailModal) return;

    const dataRows = [
      { label: 'Student', value: `${record.studentName || '--'} (${record.studentAdm || '--'})` },
      { label: 'Class', value: record.className || '--' },
      { label: 'Parent Contact', value: record.parentContact || '--' },
      { label: 'Source Module', value: MODULE_LABELS[record.sourceModule] || record.sourceModule },
      { label: 'Amount Claimed', value: formatCurrency(record.amountPaidNow) },
      { label: 'Payment Method', value: record.paymentMethod || '--' },
      { label: 'Reference Code', value: record.paymentReferenceCode || '--' },
      { label: 'Recorded By', value: record.recordedBy || '--' },
      { label: 'Recorded At', value: formatDate(record.datePaid || record.createdAt) },
      { label: 'Total Required', value: formatCurrency(record.totalRequired) },
      { label: 'Paid Before', value: formatCurrency(record.totalPaidBefore) },
      { label: 'New Balance After Approval', value: formatCurrency(record.newBalanceAfterThis) },
    ];

    const notesHtml = record.notes
      ? `<div class="rounded-2xl border border-slate-500/30 bg-slate-900/50 px-4 py-3 text-sm text-slate-200">
          <p class="uppercase text-xs tracking-[0.3em] text-slate-400/70 mb-1">Accountant Note</p>
          <p>${record.notes}</p>
        </div>`
      : '';

    const metaHtml = `
      <div class="grid gap-2 md:grid-cols-2">
        ${dataRows.map((row) => `
          <div class="rounded-2xl border border-slate-600/40 bg-slate-900/40 px-4 py-3 text-sm">
            <p class="text-xs uppercase tracking-[0.28em] text-slate-400/70">${row.label}</p>
            <p class="mt-1 font-semibold text-slate-100">${row.value}</p>
          </div>`).join('')}
      </div>`;

    const moduleMessage = buildModuleReminder(record.sourceModule);

    els.detailContent.innerHTML = `
      <div class="space-y-4">
        ${moduleMessage}
        ${metaHtml}
        ${notesHtml}
        ${buildLedgerPreview(record)}
      </div>`;

    els.detailModal.classList.add('active');
    els.detailModal.classList.remove('hidden');
  }

  function hideDetailModal() {
    state.selectedRecord = null;
    if (!els.detailModal) return;
    els.detailModal.classList.add('hidden');
    els.detailModal.classList.remove('active');
  }

  function buildModuleReminder(sourceModule) {
    const reminder = {
      finance: 'Verify the student ledger in finance.html before approving.',
      transport: 'Check transport payments module to confirm the month and amount.',
      prefonefinance: 'Cross-check Preform One finance records before approval.',
      graduation: 'Check graduation dashboard to ensure totals align.',
      fridaymoney: 'Confirm Friday register entries match payments.',
    };
    return `
      <div class="rounded-2xl border border-sky-500/40 bg-sky-500/15 px-4 py-3 text-sm text-sky-100">
        <p class="font-semibold uppercase tracking-[0.24em] text-xs">Reminder</p>
        <p class="mt-1">${reminder[sourceModule] || 'Confirm supporting records before approving this payment.'}</p>
      </div>`;
  }

  function buildLedgerPreview(record) {
    const extra = record.modulePayload?.breakdown;
    if (!extra || !Array.isArray(extra) || !extra.length) {
      return '';
    }
    const rows = extra.map((item) => `
      <tr>
        <td class="border-b border-slate-700/40 px-3 py-2">${item.label || ''}</td>
        <td class="border-b border-slate-700/40 px-3 py-2 text-right text-slate-100">${item.value || ''}</td>
      </tr>`).join('');
    return `
      <div class="rounded-2xl border border-slate-600/40 bg-slate-900/40">
        <div class="border-b border-slate-600/40 px-4 py-3 text-xs uppercase tracking-[0.3em] text-slate-400/70">
          Snapshot from Module
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full text-sm">
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;
  }
  function approveRecord(record) {
    state.selectedRecord = record;
    approveSelectedRecord();
  }

  function approveSelectedRecord() {
    const record = state.selectedRecord;
    if (!record) return;
    Swal.fire({
      icon: 'question',
      title: 'Approve payment?',
      html: `<p class="text-slate-600">You are about to approve <strong>${formatCurrency(record.amountPaidNow)}</strong> for <strong>${record.studentName || record.studentAdm}</strong>.</p>
             <p class="mt-2 text-sm text-slate-500">The system will write this payment to <strong>${MODULE_LABELS[record.sourceModule] || record.sourceModule}</strong> and archive the approval.</p>`,
      showCancelButton: true,
      confirmButtonColor: '#22c55e',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Yes, approve',
    }).then((result) => {
      if (!result.isConfirmed) return;
      processApproval(record).catch((err) => {
        console.error('Approvals: approval failed', err);
        toast(err?.message || 'Failed to approve payment. Check console.', 'danger');
      });
    });
  }

  function rejectSelectedRecord() {
    const record = state.selectedRecord;
    if (!record) return;
    Swal.fire({
      icon: 'warning',
      title: 'Reject this payment?',
      html: `<p class="text-slate-600">This will remove the pending item and log it as rejected. The payment will <strong>NOT</strong> be written to any module.</p>`,
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Reject Payment',
    }).then((result) => {
      if (!result.isConfirmed) return;
      moveApprovalToHistory(record, 'rejected')
        .then(() => {
          toast('Payment rejected. Record archived for audit.', 'warning');
          hideDetailModal();
        })
        .catch((err) => {
          console.error('Approvals: rejection failed', err);
          toast(err?.message || 'Rejection failed', 'danger');
        });
    });
  }

  async function processApproval(record) {
    showLoader(true);
    try {
      switch (record.sourceModule) {
        case 'finance':
          await commitFinancePayment(record);
          break;
        case 'transport':
          await commitTransportPayment(record);
          break;
        case 'prefonefinance':
          await commitPrefonePayment(record);
          break;
        case 'graduation':
          await commitGraduationPayment(record);
          break;
        case 'fridaymoney':
          await commitFridayPayment(record);
          break;
        default:
          throw new Error(`Unknown module ${record.sourceModule}`);
      }
      await moveApprovalToHistory(record, 'approved');
      toast('Student approved. Payment saved.', 'success');
      hideDetailModal();
    } finally {
      showLoader(false);
    }
  }

  async function commitFinancePayment(record) {
    const studentKey = record.modulePayload?.studentKey;
    const paymentData = record.modulePayload?.payment;
    if (!studentKey || !paymentData) throw new Error('Missing finance payload.');

    const updates = {};
    const pushRef = db.ref(`students/${studentKey}/payments`).push();
    updates[`students/${studentKey}/payments/${pushRef.key}`] = {
      ...paymentData,
      approvedAt: firebase.database.ServerValue.TIMESTAMP,
      approvedBy: state.user?.email || ADMIN_EMAIL,
      referenceCode: record.paymentReferenceCode || null,
    };
    updates[`students/${studentKey}/lastPaymentAt`] = firebase.database.ServerValue.TIMESTAMP;
    await db.ref().update(updates);
  }

  async function commitTransportPayment(record) {
    const studentKey = record.modulePayload?.studentKey;
    const paymentData = record.modulePayload?.payment;
    if (!studentKey || !paymentData) throw new Error('Missing transport payload.');

    const pushRef = db.ref(`transport_payments/${studentKey}`).push();
    await pushRef.set({
      ...paymentData,
      approvedAt: firebase.database.ServerValue.TIMESTAMP,
      approvedBy: state.user?.email || ADMIN_EMAIL,
    });
  }

  async function commitPrefonePayment(record) {
    const basePath = record.modulePayload?.basePath;
    const admission = record.modulePayload?.admission;
    const paymentData = record.modulePayload?.payment;
    if (!basePath || !admission || !paymentData) throw new Error('Missing Preform One payload.');

    const pushRef = db.ref(`${basePath}/students/${admission}/payments`).push();
    await pushRef.set({
      ...paymentData,
      approvedAt: firebase.database.ServerValue.TIMESTAMP,
      approvedBy: state.user?.email || ADMIN_EMAIL,
    });
    await db.ref(`${basePath}/students/${admission}`).update({
      updatedAt: firebase.database.ServerValue.TIMESTAMP,
    });
  }

  async function commitGraduationPayment(record) {
    const year = Number(record.modulePayload?.year);
    const admission = record.modulePayload?.admission;
    const paymentData = record.modulePayload?.payment;
    if (!year || !admission || !paymentData) throw new Error('Missing graduation payload.');

    const ref = db.ref(`graduation/${year}/payments`).push();
    const paymentId = ref.key;
    await ref.set({
      ...paymentData,
      receiptRefId: paymentId,
      approvedAt: firebase.database.ServerValue.TIMESTAMP,
      approvedBy: state.user?.email || ADMIN_EMAIL,
    });

    await db.ref(`graduation/${year}/students/${admission}`).transaction((stu) => {
      if (!stu) return stu;
      const paid = Number(stu.paid || 0) + Number(paymentData.amount || 0);
      const expected = Number(stu.expectedFee || record.totalRequired || 0);
      let status = stu.status || 'unpaid';
      if (expected > 0) {
        if (paid >= expected) status = 'paid';
        else if (paid > 0 && paid < expected) status = 'partial';
        else status = 'unpaid';
      }
      return {
        ...stu,
        paid,
        status,
        lastPaymentAt: firebase.database.ServerValue.TIMESTAMP,
      };
    });

    const note = paymentData.note || `Graduation ${year}`;
    await db.ref(`receipts/${admission}/${year}/${paymentId}`).set({
      type: 'graduation',
      amount: Number(paymentData.amount || 0),
      method: paymentData.method,
      note,
      reference: paymentData.reference || null,
      recordedBy: state.user?.email || ADMIN_EMAIL,
      timestamp: firebase.database.ServerValue.TIMESTAMP,
      graduationYear: year,
      _src: `graduation/${year}/payments/${paymentId}`,
    });

    await db.ref(`graduation/${year}/audits`).push({
      actor: state.user?.email || ADMIN_EMAIL,
      action: 'payment:approve',
      refType: 'payment',
      refId: paymentId,
      after: {
        admissionNo: admission,
        amount: paymentData.amount,
        method: paymentData.method,
        note,
        reference: paymentData.reference || null,
      },
      at: firebase.database.ServerValue.TIMESTAMP,
    });
  }

  async function commitFridayPayment(record) {
    const fridayId = record.modulePayload?.fridayId;
    const studentId = record.modulePayload?.studentId;
    const entryUpdate = record.modulePayload?.entryUpdate;
    if (!fridayId || !studentId || !entryUpdate) throw new Error('Missing Friday payment payload.');

    await db.ref(`fridayMoney/${fridayId}/${studentId}`).update({
      ...entryUpdate,
      approvedBy: state.user?.email || ADMIN_EMAIL,
      approvedAt: firebase.database.ServerValue.TIMESTAMP,
    });
  }

  async function moveApprovalToHistory(record, finalStatus) {
    const approvalId = record.approvalId;
    if (!approvalId) throw new Error('Missing approvalId');
    const stamp = Number(record.datePaid || record.createdAt || Date.now());
    const date = new Date(stamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const historyPath = `approvalsHistory/${year}/${month}/${approvalId}`;

    const payload = {
      ...record,
      status: 'completed',
      finalStatus,
      approvedBy: state.user?.email || ADMIN_EMAIL,
      approvedAt: firebase.database.ServerValue.TIMESTAMP,
    };

    const updates = {};
    updates[`approvalsPending/${approvalId}`] = null;
    updates[historyPath] = payload;
    await db.ref().update(updates);
  }
  async function loadHistorySnapshot() {
    const snapshot = await db.ref('approvalsHistory').once('value');
    const tree = snapshot.val() || {};
    const entries = [];
    const monthOptions = [];

    Object.entries(tree).forEach(([year, months]) => {
      Object.entries(months || {}).forEach(([month, records]) => {
        const ym = `${year}-${month}`;
        if (!monthOptions.includes(ym)) monthOptions.push(ym);
        Object.entries(records || {}).forEach(([key, value]) => {
          entries.push({
            approvalId: key,
            year: Number(year),
            month,
            ...(value || {}),
          });
        });
      });
    });

    entries.sort((a, b) => Number(b.approvedAt || b.datePaid || 0) - Number(a.approvedAt || a.datePaid || 0));
    monthOptions.sort().reverse();

    state.historyEntries = entries;
    state.historyMonthOptions = monthOptions;
    populateHistoryMonthOptions();
    renderHistory();
  }

  function populateHistoryMonthOptions() {
    if (!els.historyMonth) return;
    const opts = ['<option value="">Latest 30 approvals</option>'];
    state.historyMonthOptions.forEach((ym) => {
      const [year, month] = ym.split('-');
      const label = `${monthName(Number(month) - 1)} ${year}`;
      opts.push(`<option value="${ym}">${label}</option>`);
    });
    els.historyMonth.innerHTML = opts.join('');
  }

  function renderHistory() {
    if (!els.historyList || !els.historyEmpty) return;
    const { historyEntries, historyFilterMonth, historyLimit } = state;
    const filtered = historyFilterMonth
      ? historyEntries.filter((entry) => `${entry.year}-${entry.month}` === historyFilterMonth)
      : historyEntries.slice(0, historyLimit);

    if (!filtered.length) {
      els.historyEmpty.classList.remove('hidden');
      els.historyList.innerHTML = '';
      return;
    }

    els.historyEmpty.classList.add('hidden');
    const grouped = new Map();
    filtered.forEach((entry) => {
      const keyStamp = Number(entry.approvedAt || entry.datePaid || entry.createdAt || Date.now());
      const keyDate = new Date(keyStamp);
      const groupKey = keyDate.toISOString().slice(0, 10);
      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, []);
      }
      grouped.get(groupKey).push(entry);
    });

    const html = Array.from(grouped.entries()).sort((a, b) => (a[0] > b[0] ? -1 : 1)).map(([date, rows]) => {
      const total = rows.reduce((sum, r) => sum + Number(r.amountPaidNow || 0), 0);
      const items = rows.map((r) => `
        <div class="history-row grid gap-3 md:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <p class="font-semibold text-slate-100">${r.studentName || '--'} <span class="text-xs text-slate-400">(${r.studentAdm || ''})</span></p>
            <p class="text-xs text-slate-400">By ${r.recordedBy || '--'} · Ref ${r.paymentReferenceCode || 'N/A'}</p>
          </div>
          <div>
            <p class="text-sm text-slate-300">${MODULE_LABELS[r.sourceModule] || r.sourceModule}</p>
            <p class="text-xs text-slate-500">Approved by ${(r.approvedBy || '').split('@')[0] || '--'}</p>
          </div>
          <div class="text-right">
            <p class="font-semibold text-emerald-200">${formatCurrency(r.amountPaidNow)}</p>
            <p class="text-xs text-slate-400">${formatDate(r.approvedAt)}</p>
          </div>
        </div>`).join('');

      return `
        <article class="history-group p-5">
          <header class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-600/30 pb-3">
            <div>
              <p class="text-xs uppercase tracking-[0.28em] text-slate-400/70">${formatDate(date)}</p>
              <p class="text-sm text-slate-300">Total Approved: <span class="font-semibold text-emerald-200">${formatCurrency(total)}</span></p>
            </div>
            <span class="pill pill-approved">${rows.length} approvals</span>
          </header>
          <div class="mt-3 divide-y divide-slate-700/30">${items}</div>
        </article>`;
    }).join('');

    els.historyList.innerHTML = html;
  }

  function monthName(index) {
    return ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][index] || 'Month';
  }
  function recomputePendingSummaries() {
    const totals = {
      finance: { count: 0, amount: 0 },
      transport: { count: 0, amount: 0 },
      prefonefinance: { count: 0, amount: 0 },
      graduation: { count: 0, amount: 0 },
      fridaymoney: { count: 0, amount: 0 },
    };

    state.pendingList.forEach((row) => {
      const bucket = totals[row.sourceModule];
      if (!bucket) return;
      bucket.count += 1;
      bucket.amount += Number(row.amountPaidNow || 0);
    });

    Object.entries(totals).forEach(([module, data]) => {
      state.summary[module].pendingAmount = data.amount;
      state.summary[module].pendingCount = data.count;
      const pendEl = els.summary[module]?.pending;
      if (pendEl) {
        pendEl.textContent = data.count ? `${data.count} Pending (${formatCurrency(data.amount)})` : 'All Clear';
      }
    });
  }

  async function loadSummaries() {
    await Promise.all([
      computeFinanceSummary(),
      computeTransportSummary(),
      computePrefoneSummary(),
      computeGraduationSummary(),
      computeFridaySummary(),
    ]);
  }

  async function computeFinanceSummary() {
    const snap = await db.ref('students').once('value');
    const students = snap.val() || {};
    let required = 0;
    let approved = 0;
    Object.values(students).forEach((student) => {
      const fee = Number(student.feePerYear || student.totalFee || student.fees || 0);
      if (!Number.isNaN(fee)) required += fee;
      const payments = Object.values(student.payments || {});
      const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      approved += totalPaid;
    });
    const balance = Math.max(0, required - approved - state.summary.finance.pendingAmount);
    updateSummaryCard('finance', { required, approved, balance });
  }

  function computeTransportStatus(enrollment = {}, payments = []) {
    const amStop = enrollment.amStop || '';
    const pmStop = enrollment.pmStop || '';
    let expected = 0;
    let paid = 0;
    for (let month = 1; month <= 12; month += 1) {
      const monthExpected = window.TransportPricing
        ? window.TransportPricing.expectedForMonth(amStop, pmStop, month)
        : 0;
      expected += monthExpected;
      const monthPaid = payments.filter((p) => Number(p.month) === month)
        .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
      paid += monthPaid;
    }
    return { expected, paid };
  }

  async function computeTransportSummary() {
    const [enrollSnap, paymentsSnap] = await Promise.all([
      db.ref('transport_enrollments').once('value'),
      db.ref('transport_payments').once('value'),
    ]);
    const enrollments = enrollSnap.val() || {};
    const payments = paymentsSnap.val() || {};
    let required = 0;
    let approved = 0;

    Object.entries(enrollments).forEach(([studentId, enrollment]) => {
      const studentPayments = Object.values(payments[studentId] || {});
      const status = computeTransportStatus(enrollment, studentPayments);
      required += status.expected;
      approved += status.paid;
    });

    const balance = Math.max(0, required - approved - state.summary.transport.pendingAmount);
    updateSummaryCard('transport', { required, approved, balance });
  }

  async function detectPrefoneBasePath() {
    const year = new Date().getFullYear();
    try {
      const schoolsSnap = await db.ref('/schools').once('value');
      const schools = schoolsSnap.val() || {};
      let key = Object.keys(schools).find((k) => k === 'Socrates School Preform one');
      if (!key) {
        key = Object.keys(schools).find((k) => /pre\s*form\s*one/i.test(k));
      }
      if (!key) {
        key = Object.keys(schools).find((k) => /pre/i.test(k) && /one/i.test(k)) || 'Socrates School Preform one';
      }
      return `/schools/${key}/${year}`;
    } catch (err) {
      console.warn('Approvals: Preform one base detection failed, using default', err);
      return `/schools/Socrates School Preform one/${year}`;
    }
  }

  async function computePrefoneSummary() {
    const basePath = await detectPrefoneBasePath();
    const snap = await db.ref(`${basePath}/students`).once('value');
    const students = snap.val() || {};
    let required = 0;
    let approved = 0;

    Object.values(students).forEach((student) => {
      const fee = Number(student.totalFee || student.required || 0);
      required += fee;
      const payments = Object.values(student.payments || {});
      const paid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      approved += paid;
    });

    const balance = Math.max(0, required - approved - state.summary.prefonefinance.pendingAmount);
    updateSummaryCard('prefonefinance', { required, approved, balance });
  }

  function computeGraduationExpected(className, meta) {
    const high = Number(meta?.feePreunitAnd7 || 45000);
    const low = Number(meta?.feeOthers || 10000);
    const cls = (className || '').toLowerCase();
    if (!cls) return low;
    const tokens = ['preunit', 'pre-unit', 'pre unit', 'preparatory', 'class 7', 'std 7', 'grade 7'];
    if (tokens.some((token) => cls.includes(token))) return high;
    return low;
  }

  async function computeGraduationSummary() {
    const year = new Date().getFullYear();
    const [studentsSnap, metaSnap] = await Promise.all([
      db.ref(`graduation/${year}/students`).once('value'),
      db.ref(`graduation/${year}/meta`).once('value'),
    ]);
    const students = studentsSnap.val() || {};
    const meta = metaSnap.val() || {};
    let required = 0;
    let approved = 0;

    Object.values(students).forEach((student) => {
      const expected = Number(student.expectedFee != null ? student.expectedFee : computeGraduationExpected(student.class, meta));
      required += expected;
      approved += Number(student.paid || 0);
    });

    const balance = Math.max(0, required - approved - state.summary.graduation.pendingAmount);
    updateSummaryCard('graduation', { required, approved, balance });
  }

  async function computeFridaySummary() {
    const snap = await db.ref('fridayMoney').once('value');
    const moneyTree = snap.val() || {};
    const fridayIds = Object.keys(moneyTree).sort();
    if (!fridayIds.length) {
      updateSummaryCard('fridaymoney', { required: 0, approved: 0, balance: state.summary.fridaymoney.pendingAmount });
      return;
    }
    const latestId = fridayIds[fridayIds.length - 1];
    const entries = Object.values(moneyTree[latestId] || {});
    let paidCount = 0;
    let presentCount = 0;
    entries.forEach((entry) => {
      if (entry.attendance === 'present') presentCount += 1;
      if (entry.payment === 'paid') paidCount += 1;
    });
    const collected = paidCount * COST_PER_FRIDAY;
    const expected = presentCount * COST_PER_FRIDAY;
    const approved = collected;
    const pendingFromModule = Math.max(0, expected - approved);
    const pendingTotal = state.summary.fridaymoney.pendingAmount + pendingFromModule;
    updateSummaryCard('fridaymoney', { required: collected, approved, balance: pendingTotal });
  }

  function updateSummaryCard(module, { required, approved, balance }) {
    const card = els.summary[module];
    if (!card) return;
    state.summary[module].required = required;
    state.summary[module].approved = approved;
    state.summary[module].balance = balance;
    if (card.required) card.required.textContent = formatCurrency(required);
    if (card.approved) card.approved.textContent = formatCurrency(approved);
    if (card.balance) card.balance.textContent = formatCurrency(balance);
  }

  function init() {
    attachListeners();
    auth.onAuthStateChanged((user) => {
      if (!guardAccess(user)) return;
      state.user = user;
      loadAllData();
    });
  }

  init();
})();
