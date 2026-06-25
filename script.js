// ===== Firebase Imports (CDN ESM) =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getFirestore, collection, doc,
  getDocs, addDoc, deleteDoc, updateDoc, setDoc, getDoc
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// ===== Firebase Init =====
const app = initializeApp({
  apiKey:            "AIzaSyCnRlZB5_EkW1DFTqjDh3xs9iMcdg3yC7c",
  authDomain:        "it-prep-dashboard.firebaseapp.com",
  projectId:         "it-prep-dashboard",
  storageBucket:     "it-prep-dashboard.firebasestorage.app",
  messagingSenderId: "665070534927",
  appId:             "1:665070534927:web:25cffa9a6f71979ba13e7a",
  measurementId:     "G-3EMXE1V6FR",
});
const db = getFirestore(app);

// ===== Default Data =====
const DEFAULT_DDAYS = [
  { label: 'OPIc',        date: '2026-08-09', url: 'https://www.opic.or.kr' },
  { label: 'SQLD',        date: '2026-07-07', url: 'https://www.dataq.or.kr' },
  { label: '정보처리기사', date: '2026-11-14', url: 'https://www.q-net.or.kr' },
];

const DEFAULT_CHECKLIST = [
  { text: 'ADsP 취득',    done: false },
  { text: 'SQLD 취득',    done: false },
  { text: 'OPIc IH 이상', done: false },
  { text: 'NCS 정리',     done: false },
];

// ===== Certifications =====
const CERTS = [
  {
    category: '필수',
    items: [
      { name: '정보처리기사',              keyword: '정보처리기사', url: 'https://www.q-net.or.kr' },
      { name: 'SQLD (SQL 개발자)',         keyword: 'sqld',         url: 'https://www.dataq.or.kr' },
      { name: '컴퓨터활용능력 1급',        keyword: '컴퓨터활용',   url: 'https://license.korcham.net' },
    ],
  },
  {
    category: '우대',
    items: [
      { name: '정보보안기사',              keyword: '정보보안기사', url: 'https://www.q-net.or.kr' },
      { name: '리눅스마스터 1급',          keyword: '리눅스마스터', url: 'https://www.lpi.or.kr' },
      { name: '네트워크관리사',            keyword: '네트워크관리', url: 'https://www.icqa.or.kr' },
      { name: 'ADsP (데이터분석 준전문가)', keyword: 'adsp',         url: 'https://www.dataq.or.kr' },
      { name: 'OPIc IH 이상',             keyword: 'opic',          url: 'https://www.opic.or.kr' },
    ],
  },
];

// ===== URL Auto-Match =====
const URL_MAP = [
  { keywords: ['토익', 'toeic', '토스'],  url: 'https://exam.yb.co.kr' },
  { keywords: ['opic'],                   url: 'https://www.opic.or.kr' },
  { keywords: ['sqld', 'sqlp', 'adsp'],  url: 'https://www.dataq.or.kr' },
  { keywords: ['정보처리'],               url: 'https://www.q-net.or.kr' },
];

function guessUrl(label) {
  const lower = label.toLowerCase();
  for (const { keywords, url } of URL_MAP) {
    if (keywords.some(k => lower.includes(k))) return url;
  }
  return null;
}

// ===== State =====
let ddays      = [];
let checklist  = [];
let certStatus = {}; // { [certName]: { acquired: boolean, date: string|null } }

// ===== Pure Helpers =====
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
  if (d < 0)   return `D+${Math.abs(d)}`;
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
  const [y, m, day] = dateStr.split('-');
  return `${y}.${m}.${day}`;
}

// ===== Firestore: D-Day (exams) =====
async function dbLoadDdays() {
  const snap = await getDocs(collection(db, 'exams'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function dbAddDday(label, date) {
  const url = guessUrl(label);
  const ref = await addDoc(collection(db, 'exams'), {
    label, date, url: url ?? null, createdAt: Date.now(),
  });
  return { id: ref.id, label, date, url };
}

async function dbDeleteDday(id) {
  await deleteDoc(doc(db, 'exams', id));
}

// ===== Firestore: Checklist =====
async function dbLoadChecklist() {
  const snap = await getDocs(collection(db, 'checklist'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function dbAddCheckItem(text) {
  const ref = await addDoc(collection(db, 'checklist'), {
    text, done: false, createdAt: Date.now(),
  });
  return { id: ref.id, text, done: false };
}

async function dbToggleCheckItem(id, done) {
  await updateDoc(doc(db, 'checklist', id), { done });
}

async function dbDeleteCheckItem(id) {
  await deleteDoc(doc(db, 'checklist', id));
}

// ===== Firestore: Memo =====
async function dbLoadMemo() {
  const snap = await getDoc(doc(db, 'memo', 'today'));
  return snap.exists() ? (snap.data().text ?? '') : '';
}

async function dbSaveMemo(text) {
  await setDoc(doc(db, 'memo', 'today'), { text });
}

// ===== Firestore: Spec =====
async function dbLoadSpec() {
  const snap = await getDoc(doc(db, 'spec', 'tracker'));
  return snap.exists() ? snap.data() : {};
}

async function dbSaveSpec(data) {
  await setDoc(doc(db, 'spec', 'tracker'), data, { merge: true });
}

// ===== Firestore: Cert Status =====
async function dbLoadCertStatus() {
  const snap = await getDocs(collection(db, 'certStatus'));
  const result = {};
  snap.docs.forEach(d => { result[d.id] = d.data(); });
  return result;
}

async function dbToggleCertStatus(certName, acquired) {
  await setDoc(doc(db, 'certStatus', certName), {
    acquired,
    date: acquired ? new Date().toISOString().split('T')[0] : null,
  });
}

// ===== Firestore: Gauge =====
async function dbLoadGaugeTarget() {
  const snap = await getDoc(doc(db, 'gauge', 'cert'));
  return snap.exists() ? (snap.data().targetCount ?? 8) : 8;
}

async function dbSaveGaugeTarget(count) {
  await setDoc(doc(db, 'gauge', 'cert'), { targetCount: count });
}

// ===== Default Data Seed (only when collections are empty) =====
async function seedDefaultData() {
  const [examSnap, checkSnap] = await Promise.all([
    getDocs(collection(db, 'exams')),
    getDocs(collection(db, 'checklist')),
  ]);

  const writes = [];

  if (examSnap.empty) {
    DEFAULT_DDAYS.forEach((item, i) => {
      writes.push(
        addDoc(collection(db, 'exams'), { ...item, createdAt: Date.now() + i })
      );
    });
  }

  if (checkSnap.empty) {
    DEFAULT_CHECKLIST.forEach((item, i) => {
      writes.push(
        addDoc(collection(db, 'checklist'), { ...item, createdAt: Date.now() + 100 + i })
      );
    });
  }

  if (writes.length) await Promise.all(writes);
}

// ===== Render: Today =====
function renderToday() {
  const d = new Date();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  document.getElementById('todayDate').textContent =
    `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

// ===== Render: D-Day =====
function renderDdays() {
  const el = document.getElementById('ddayList');

  if (ddays.length === 0) {
    el.innerHTML = '<p class="dday-empty">등록된 일정이 없습니다.</p>';
    renderCerts();
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
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      await dbDeleteDday(id);
      ddays = ddays.filter(x => x.id !== id);
      renderDdays();
    });
  });

  renderCerts();
}

// ===== Render: Certifications =====
function renderCerts() {
  const el = document.getElementById('certList');
  if (!el) return;

  el.innerHTML = CERTS.flatMap(group => {
    const isMandatory = group.category === '필수';
    const badgeClass  = isMandatory ? 'required' : 'optional';

    return group.items.map(cert => {
      const acquired = certStatus[cert.name]?.acquired === true;
      const studying = !acquired && ddays.some(d =>
        d.label.toLowerCase().includes(cert.keyword)
      );

      const statusBadge = acquired
        ? '<span class="cert-status acquired">취득</span>'
        : studying
          ? '<span class="cert-status studying">준비중</span>'
          : '';

      const toggleBtn = acquired
        ? `<button class="cert-acquire-btn acquired" data-name="${escHtml(cert.name)}">✓ 취득</button>`
        : `<button class="cert-acquire-btn" data-name="${escHtml(cert.name)}">취득하기</button>`;

      return `
        <div class="cert-item">
          <div class="cert-info">
            <span class="cert-badge ${badgeClass}">${group.category}</span>
            <span class="cert-name">${escHtml(cert.name)}</span>
            ${statusBadge}
          </div>
          <div class="cert-actions">
            ${toggleBtn}
            <a class="cert-link" href="${cert.url}" target="_blank" rel="noopener noreferrer">↗ 접수 바로가기</a>
          </div>
        </div>
      `;
    });
  }).join('');

  el.querySelectorAll('.cert-acquire-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const name     = btn.dataset.name;
      const newState = !(certStatus[name]?.acquired === true);
      certStatus[name] = {
        acquired: newState,
        date: newState ? new Date().toISOString().split('T')[0] : null,
      };
      btn.disabled = true;
      await dbToggleCertStatus(name, newState);
      renderCerts();
      renderGauges();
    });
  });
}

// ===== Pixel Gauges =====
function getAcquiredCertCount() {
  return CERTS.flatMap(g => g.items).filter(cert =>
    certStatus[cert.name]?.acquired === true
  ).length;
}

function renderPixelBar(barId, filledClass, pct) {
  const bar = document.getElementById(barId);
  if (!bar) return;
  const filled = Math.round((Math.min(pct, 100) / 100) * 8);
  bar.innerHTML = Array.from({ length: 8 }, (_, i) =>
    `<span class="pixel-block ${i < filled ? filledClass : 'empty'}"></span>`
  ).join('');
}

function renderGauges() {
  const targetEl = document.getElementById('certGaugeTarget');
  if (!targetEl) return;

  const certTarget   = Math.max(1, parseInt(targetEl.value) || 8);
  const certAcquired = getAcquiredCertCount();
  const certPct      = Math.min(Math.round((certAcquired / certTarget) * 100), 100);

  document.getElementById('certGaugePct').textContent   = `${certPct}%`;
  document.getElementById('certGaugeCount').textContent = `${certAcquired} / ${certTarget}개`;
  renderPixelBar('certGaugeBar', 'filled-cert', certPct);

  const total    = checklist.length;
  const done     = checklist.filter(x => x.done).length;
  const checkPct = total > 0 ? Math.min(Math.round((done / total) * 100), 100) : 0;

  document.getElementById('checkGaugePct').textContent   = `${checkPct}%`;
  document.getElementById('checkGaugeCount').textContent = `${done} / ${total}개`;
  renderPixelBar('checkGaugeBar', 'filled-check', checkPct);
}

// ===== Spec Tracker =====
function updateSpecProgress() {
  const gpaGoal = parseFloat(document.getElementById('gpaGoal').value);
  const gpaCurr = parseFloat(document.getElementById('gpaCurrent').value);
  if (gpaGoal > 0 && !isNaN(gpaCurr)) {
    const pct = Math.min(Math.round((gpaCurr / gpaGoal) * 100), 100);
    document.getElementById('gpaFill').style.width = `${pct}%`;
    document.getElementById('gpaPct').textContent  = `${pct}%`;
    document.getElementById('gpaFill').style.background = pct >= 100 ? '#3a8a5e' : '#2c6fad';
  } else {
    document.getElementById('gpaFill').style.width = '0%';
    document.getElementById('gpaPct').textContent  = '—';
  }

  const certGoal = parseInt(document.getElementById('certGoal').value);
  const certCurr = parseInt(document.getElementById('certCurrent').value);
  if (certGoal > 0 && !isNaN(certCurr)) {
    const pct = Math.min(Math.round((certCurr / certGoal) * 100), 100);
    document.getElementById('certFill').style.width = `${pct}%`;
    document.getElementById('certPct').textContent  = `${pct}%`;
    document.getElementById('certFill').style.background = pct >= 100 ? '#3a8a5e' : '#2c6fad';
  } else {
    document.getElementById('certFill').style.width = '0%';
    document.getElementById('certPct').textContent  = '—';
  }
}

async function loadSpec() {
  const data = await dbLoadSpec();
  document.getElementById('gpaGoal').value        = data.gpaGoal        ?? '';
  document.getElementById('gpaCurrent').value     = data.gpaCurrent     ?? '';
  document.getElementById('englishGoal').value    = data.englishGoal    ?? '';
  document.getElementById('englishCurrent').value = data.englishCurrent ?? '';
  document.getElementById('certGoal').value       = data.certGoal       ?? '';
  document.getElementById('certCurrent').value    = data.certCurrent    ?? '';
  document.getElementById('internGoal').value     = data.internGoal     ?? '';
  document.getElementById('internCurrent').value  = data.internCurrent  ?? '';
  document.getElementById('extraGoal').value      = data.extraGoal      ?? '';
  document.getElementById('extraCurrent').value   = data.extraCurrent   ?? '';
  updateSpecProgress();
}

document.getElementById('saveGoal').addEventListener('click', async () => {
  const btn = document.getElementById('saveGoal');
  btn.textContent = '저장 중...';
  btn.disabled = true;
  await dbSaveSpec({
    gpaGoal:     document.getElementById('gpaGoal').value,
    englishGoal: document.getElementById('englishGoal').value,
    certGoal:    document.getElementById('certGoal').value,
    internGoal:  document.getElementById('internGoal').value,
    extraGoal:   document.getElementById('extraGoal').value,
  });
  btn.textContent = '저장됨 ✓';
  setTimeout(() => { btn.textContent = '목표 저장'; btn.disabled = false; }, 1600);
});

document.getElementById('saveCurrent').addEventListener('click', async () => {
  const btn = document.getElementById('saveCurrent');
  btn.textContent = '저장 중...';
  btn.disabled = true;
  await dbSaveSpec({
    gpaCurrent:     document.getElementById('gpaCurrent').value,
    englishCurrent: document.getElementById('englishCurrent').value,
    certCurrent:    document.getElementById('certCurrent').value,
    internCurrent:  document.getElementById('internCurrent').value,
    extraCurrent:   document.getElementById('extraCurrent').value,
  });
  updateSpecProgress();
  btn.textContent = '저장됨 ✓';
  setTimeout(() => { btn.textContent = '현재 저장'; btn.disabled = false; }, 1600);
});

['gpaGoal', 'gpaCurrent', 'certGoal', 'certCurrent'].forEach(id => {
  document.getElementById(id).addEventListener('input', updateSpecProgress);
});

// ===== D-Day Form =====
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

async function saveDday() {
  const label = ddayLabelI.value.trim();
  const date  = ddayDateI.value;
  if (!label || !date) {
    if (!label) ddayLabelI.focus();
    else ddayDateI.focus();
    return;
  }
  const newItem = await dbAddDday(label, date);
  ddays.push(newItem);
  renderDdays();
  closeDdayForm();
}

function closeDdayForm() {
  ddayForm.classList.add('hidden');
  ddayLabelI.value = '';
  ddayDateI.value  = '';
}

// ===== Render: Checklist =====
function renderChecklist() {
  const el   = document.getElementById('checklistEl');
  const done = checklist.filter(x => x.done).length;

  document.getElementById('checkProgress').textContent = `${done} / ${checklist.length}`;

  if (checklist.length === 0) {
    el.innerHTML = '<li style="color:#9b9b9b;font-size:0.85rem;padding:6px 8px;">항목이 없습니다.</li>';
    return;
  }

  el.innerHTML = checklist.map(item => `
    <li class="check-item ${item.done ? 'done' : ''}" data-id="${item.id}">
      <input type="checkbox" id="chk-${item.id}" ${item.done ? 'checked' : ''} data-id="${item.id}" />
      <label for="chk-${item.id}">${escHtml(item.text)}</label>
      <button class="check-del" data-id="${item.id}" title="삭제">×</button>
    </li>
  `).join('');

  el.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', async () => {
      const id = cb.dataset.id;
      checklist = checklist.map(x => x.id === id ? { ...x, done: cb.checked } : x);
      renderChecklist();
      await dbToggleCheckItem(id, cb.checked);
    });
  });

  el.querySelectorAll('.check-del').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      await dbDeleteCheckItem(id);
      checklist = checklist.filter(x => x.id !== id);
      renderChecklist();
    });
  });

  renderCerts();
  renderGauges();
}

// ===== Checklist Add =====
async function addCheckItem() {
  const input = document.getElementById('newCheckText');
  const text  = input.value.trim();
  if (!text) { input.focus(); return; }
  const newItem = await dbAddCheckItem(text);
  checklist.push(newItem);
  renderChecklist();
  input.value = '';
  input.focus();
}

document.getElementById('addCheckBtn').addEventListener('click', addCheckItem);
document.getElementById('newCheckText').addEventListener('keydown', e => {
  if (e.key === 'Enter') addCheckItem();
});

// ===== Gauge Target Input =====
let gaugeTimer = null;
document.getElementById('certGaugeTarget').addEventListener('input', () => {
  renderGauges();
  clearTimeout(gaugeTimer);
  gaugeTimer = setTimeout(async () => {
    const val = parseInt(document.getElementById('certGaugeTarget').value);
    if (val > 0) await dbSaveGaugeTarget(val);
  }, 600);
});

// ===== Tab Switching =====
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
    tab.classList.add('active');
    document.getElementById(`tab-${tab.dataset.tab}`).classList.remove('hidden');
  });
});

// ===== Memo =====
const memoArea      = document.getElementById('memoArea');
const autoSaveLabel = document.getElementById('autoSaveLabel');

let memoTimer = null;
memoArea.addEventListener('input', () => {
  clearTimeout(memoTimer);
  autoSaveLabel.textContent = '저장 중...';
  memoTimer = setTimeout(async () => {
    await dbSaveMemo(memoArea.value);
    autoSaveLabel.textContent = '저장됨 ✓';
    setTimeout(() => { autoSaveLabel.textContent = ''; }, 1800);
  }, 600);
});

// ===== Init =====
async function init() {
  renderToday();
  try {
    await seedDefaultData();

    const [ddaysData, checklistData, memoText, gaugeTarget, certStatusData] = await Promise.all([
      dbLoadDdays(),
      dbLoadChecklist(),
      dbLoadMemo(),
      dbLoadGaugeTarget(),
      dbLoadCertStatus(),
    ]);

    ddays      = ddaysData;
    checklist  = checklistData;
    certStatus = certStatusData;
    memoArea.value = memoText;
    document.getElementById('certGaugeTarget').value = gaugeTarget;

    ddays.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
    checklist.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));

    renderDdays();
    renderChecklist();
    await loadSpec();
  } catch (err) {
    console.error('[Firebase 오류]', err);
  }
}

init();
