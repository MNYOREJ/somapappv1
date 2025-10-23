import { toast } from './workers_helpers.js';

const HTML2PDF_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';

const STATUS_CLASS = {
  ok: 'status-ok',
  approved: 'status-ok',
  pending: 'status-pending',
  flagged: 'status-flagged',
  late: 'status-late',
  rejected: 'status-flagged',
  'salary-cut': 'status-flagged'
};

export function createCard({ title, subtitle, actions = [], body = '' }) {
  const card = document.createElement('section');
  card.className = 'workers-card';

  const header = document.createElement('header');
  header.className = 'workers-card__header';
  const hTitle = document.createElement('h2');
  hTitle.textContent = title;
  header.appendChild(hTitle);
  if (subtitle) {
    const sub = document.createElement('p');
    sub.className = 'workers-card__subtitle';
    sub.textContent = subtitle;
    header.appendChild(sub);
  }
  card.appendChild(header);

  if (actions.length) {
    const toolbar = document.createElement('div');
    toolbar.className = 'workers-card__actions';
    actions.forEach(action => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = action.label;
      btn.className = 'workers-btn';
      if (action.onClick) {
        btn.addEventListener('click', action.onClick);
      }
      toolbar.appendChild(btn);
    });
    card.appendChild(toolbar);
  }

  const content = document.createElement('div');
  content.className = 'workers-card__content';
  if (typeof body === 'string') {
    content.innerHTML = body;
  } else if (body instanceof Node) {
    content.appendChild(body);
  }
  card.appendChild(content);

  return card;
}

export function statusChip(status, label) {
  const chip = document.createElement('span');
  chip.className = `workers-chip ${STATUS_CLASS[status] || 'status-pending'}`;
  chip.textContent = label || status.toUpperCase();
  return chip;
}

export function renderTable(container, { columns, rows }) {
  container.innerHTML = '';
  const table = document.createElement('table');
  table.className = 'workers-table';
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  columns.forEach(col => {
    const th = document.createElement('th');
    th.textContent = col.label;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  rows.forEach(row => {
    const tr = document.createElement('tr');
    columns.forEach(col => {
      const td = document.createElement('td');
      const value = typeof col.value === 'function' ? col.value(row) : row[col.field];
      if (value instanceof Node) {
        td.appendChild(value);
      } else {
        td.textContent = value ?? '';
      }
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  container.appendChild(table);
}

export async function uploadFileToStorage(file, path) {
  if (!file) throw new Error('File is required');
  const storageRef = firebase.storage().ref(path);
  const metadata = { contentType: file.type || 'application/octet-stream' };
  await storageRef.put(file, metadata);
  return storageRef.getDownloadURL();
}

export function previewImage(file, imgElement) {
  if (!file || !imgElement) return;
  const reader = new FileReader();
  reader.onload = event => {
    imgElement.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

export async function ensureHtml2Pdf() {
  if (window.html2pdf) return;
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = HTML2PDF_SRC;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Failed to load html2pdf.js'));
    document.head.appendChild(script);
  }).catch(err => {
    toast(err.message, 'error');
    throw err;
  });
}

export function clearChildren(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function textEl(tag, text, className) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  el.textContent = text;
  return el;
}


