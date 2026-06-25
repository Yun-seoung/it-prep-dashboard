// ===== Storage Keys =====
const KEY = {
  DDAYS: 'it-prep-ddays',
  CHECKLIST: 'it-prep-checklist',
  MEMO: 'it-prep-memo',
};

// Default data (dates calculated so OPIc = D-45, SQLD = D-12 from 2026-06-25)
const DEFAULT_DDAYS = [
  { id: 1, label: 'OPIc',  date: '2026-08-09', url: 'https://www.opic.or.kr' },
  { id: 2, label: 'SQLD',  date: '2026-07-07', url: 'https://www.dataq.or.kr' },
];

const URL_MAP = [
  { keywords: ['토익', 'toeic', '토스'],    url: 'https://exam.yb.co.kr' },
  { keywords: ['opic'],                     url: 'https://www.opic.or.kr' },
  { keywords: ['sqld', 'sqlp', 'adsp'],    url: 'https://www.dataq.or.kr' },
  { keywords: ['정보처리'],                  url: 'https://www.q-net.or.kr' },
];

function guessUrl(label) {
  const lower = label.toLowerCase();
  for (const { keywords, url } of URL_MAP) {
    if (keywords.some(k => lower.includes(k))) return url;
  }
  return null;
}

const DEFAULT_CHECKLIST = [
  { id: 1, text: 'ADsP 취득',     done: false },
  { id: 2, text: 'SQLD 취득',     done: false },
  { id: 3, text: 'OPIc IH 이상',  done: false },
  { id: 4, text: 'NCS 정리',      done: false },
];

// ===== Utilities =====
function storageLoad(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}

function storageSave(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

function escHtml(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(str));
  return d.innerHTML;
}

function calcDday(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
}

function ddayLabel(d) {
  if (d < 0)  return `D+${Math.abs(d)}`;
  if (d === 0) return 'D-Day';
  return `D-${d}`;
}

function ddayClass(d) {
  if (d < 0)   return 'expired';
  if (d <= 7)  return 'urgent';
  if (d <= 30) return 'soon';
  return 'safe';
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${y}.${m}.${d}`;
}

// ===== State =====
let ddays     = storageLoad(KEY.DDAYS,     DEFAULT_DDAYS);
let checklist = storageLoad(KEY.CHECKLIST, DEFAULT_CHECKLIST);

// ===== Today Header =====
function renderToday() {
  const d = new Date();
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  document.getElementById('todayDate').textContent =
    `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${dayNames[d.getDay()]})`;
}

// ===== D-Day =====
function renderDdays() {
  const el = document.getElementById('ddayList');

  if (ddays.length === 0) {
    el.innerHTML = '<p class="dday-empty">등록된 일정이 없습니다.</p>';
    return;
  }

  const sorted = [...ddays].sort((a, b) => new Date(a.date) - new Date(b.date));

  el.innerHTML = sorted.map(item => {
    const d   = calcDday(item.date);
    const cls = ddayClass(d);
    const url = item.url || guessUrl(item.label);
    return `
      <div class="dday-card ${cls}">
        <div class="dday-top">
          <div class="dday-info">
            <div class="dday-name">${escHtml(item.label)}</div>
            <div class="dday-num">${ddayLabel(d)}</div>
            <div class="dday-date-str">${formatDate(item.date)}</div>
          </div>
          <button class="dday-del" data-id="${item.id}" title="삭제">×</button>
        </div>
        ${url ? `<a class="dday-link" href="${url}" target="_blank" rel="noopener noreferrer">↗ 접수 바로가기</a>` : ''}
      </div>
    `;
  }).join('');

  el.querySelectorAll('.dday-del').forEach(btn => {
    btn.addEventListener('click', () => {
      ddays = ddays.filter(x => x.id !== Number(btn.dataset.id));
      storageSave(KEY.DDAYS, ddays);
      renderDdays();
    });
  });
}

const ddayForm   = document.getElementById('ddayForm');
const ddayLabelI = document.getElementById('ddayLabel');
const ddayDateI  = document.getElementById('ddayDate');

document.getElementById('openDdayForm').addEventListener('click', () => {
  ddayForm.classList.toggle('hidden');
  if (!ddayForm.classList.contains('hidden')) ddayLabelI.focus();
});

document.getElementById('cancelDday').addEventListener('click', closeDdayForm);

document.getElementById('saveDday').addEventListener('click', saveDday);

ddayDateI.addEventListener('keydown', e => { if (e.key === 'Enter') saveDday(); });

function saveDday() {
  const label = ddayLabelI.value.trim();
  const date  = ddayDateI.value;
  if (!label || !date) {
    if (!label) ddayLabelI.focus();
    else ddayDateI.focus();
    return;
  }
  ddays.push({ id: Date.now(), label, date, url: guessUrl(label) });
  storageSave(KEY.DDAYS, ddays);
  renderDdays();
  closeDdayForm();
}

function closeDdayForm() {
  ddayForm.classList.add('hidden');
  ddayLabelI.value = '';
  ddayDateI.value  = '';
}

// ===== Checklist =====
function renderChecklist() {
  const el   = document.getElementById('checklistEl');
  const done = checklist.filter(x => x.done).length;

  document.getElementById('checkProgress').textContent = `${done} / ${checklist.length}`;

  if (checklist.length === 0) {
    el.innerHTML = '<li style="color:#a0aec0;font-size:0.85rem;padding:10px 4px;">항목이 없습니다.</li>';
    return;
  }

  el.innerHTML = checklist.map(item => `
    <li class="check-item ${item.done ? 'done' : ''}">
      <input type="checkbox" id="chk-${item.id}" ${item.done ? 'checked' : ''} data-id="${item.id}" />
      <label for="chk-${item.id}">${escHtml(item.text)}</label>
      <button class="check-del" data-id="${item.id}" title="삭제">×</button>
    </li>
  `).join('');

  el.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      const id = Number(cb.dataset.id);
      checklist = checklist.map(x => x.id === id ? { ...x, done: cb.checked } : x);
      storageSave(KEY.CHECKLIST, checklist);
      renderChecklist();
    });
  });

  el.querySelectorAll('.check-del').forEach(btn => {
    btn.addEventListener('click', () => {
      checklist = checklist.filter(x => x.id !== Number(btn.dataset.id));
      storageSave(KEY.CHECKLIST, checklist);
      renderChecklist();
    });
  });
}

function addCheckItem() {
  const input = document.getElementById('newCheckText');
  const text  = input.value.trim();
  if (!text) { input.focus(); return; }
  checklist.push({ id: Date.now(), text, done: false });
  storageSave(KEY.CHECKLIST, checklist);
  renderChecklist();
  input.value = '';
  input.focus();
}

document.getElementById('addCheckBtn').addEventListener('click', addCheckItem);
document.getElementById('newCheckText').addEventListener('keydown', e => {
  if (e.key === 'Enter') addCheckItem();
});

// ===== Memo =====
const memoArea      = document.getElementById('memoArea');
const autoSaveLabel = document.getElementById('autoSaveLabel');

memoArea.value = localStorage.getItem(KEY.MEMO) || '';

let memoTimer = null;
memoArea.addEventListener('input', () => {
  clearTimeout(memoTimer);
  autoSaveLabel.textContent = '저장 중...';
  memoTimer = setTimeout(() => {
    localStorage.setItem(KEY.MEMO, memoArea.value);
    autoSaveLabel.textContent = '저장됨 ✓';
    setTimeout(() => { autoSaveLabel.textContent = ''; }, 1800);
  }, 600);
});

// ===== Init =====
renderToday();
renderDdays();
renderChecklist();
