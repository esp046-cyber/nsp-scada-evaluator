const STORE = 'gridproof_db_v3';

const criteria = [
  { id: 'interface', tip: 'Ask for the named 33kV substation or connection point ID, the NSP connection agreement reference and the interface single-line diagram.', flags: 'Site-wide plant SCADA offered as proof; no connection point ID; references that name the plant but not the NSP interface.', title: 'NSP-facing 33kV SCADA interface',
    desc: 'Connection-point SCADA delivered to the network service provider, not site-side plant SCADA.',
    options: [
      { t: 'Named 33kV connection point delivered and documented', p: 30, ok: true },
      { t: 'In-plant MV/LV distribution SCADA only', p: 5 },
      { t: 'No MV connection interface experience', p: 0 } ] },
  { id: 'protocols', tip: 'Ask for IED/RTU models, protocol point lists or configuration files, and an NSP contact who can confirm live telemetry.', flags: 'Modbus/OPC-only history; lab testing with no commissioning record; DNP3 claimed with no point list.', title: 'IEC 61850 / DNP3 telemetry in service',
    desc: 'Protocol-level delivery for protection, metering and remote control in live utility service.',
    options: [
      { t: 'IEC 61850 / DNP3 configured and operational in utility service', p: 30, ok: true },
      { t: 'Theoretical knowledge or lab testing without live service', p: 10 },
      { t: 'Generic industrial protocols only (Modbus, OPC)', p: 0 } ] },
  { id: 'testing', tip: "Ask for signed FAT, SAT and energisation sheets showing NSP engineer names and dates, run to the NSP's own procedure.", flags: "Unsigned or self-certified sheets; the only witness is the EPC or vendor; the test procedure is not the NSP's.", title: 'NSP-witnessed FAT, SAT and energisation',
    desc: "Acceptance testing executed to the NSP's own connection procedures.",
    options: [
      { t: 'Signed FAT/SAT/energisation witnessed by NSP engineers', p: 25, ok: true },
      { t: 'Internal factory testing only, self-certified', p: 5 },
      { t: 'No utility commissioning experience', p: 0 } ] },
  { id: 'relationship', tip: 'Ask for a pre-qualification letter, an approved-vendor list entry or a grid-code sign-off that names the NSP.', flags: 'Letters from end clients only; expired approvals; equivalent-operator claims with no documents.', title: 'Prior NSP relationship on record',
    desc: "Evidence the vendor has cleared this NSP's (or an equivalent utility's) compliance gate.",
    options: [
      { t: 'Formal pre-qualification or grid-code sign-off on record', p: 15, ok: true },
      { t: 'Equivalent regional transmission operator experience', p: 10 },
      { t: 'First-time transmission interface applicant', p: 0 } ] }
];

const fields = [
  { id: 'vendor', label: 'Vendor' },
  { id: 'nsp', label: 'Network service provider' },
  { id: 'project', label: 'Named project reference' },
  { id: 'capacity', label: 'Project capacity (MW / MWh)' },
  { id: 'connpoint', label: '33kV connection point ID' },
  { id: 'devices', label: 'IED / RTU models' },
  { id: 'signoffs', label: 'Signed test sheet references', type: 'area' },
  { id: 'notes', label: 'Assessor notes', type: 'area' }
];


const points = [
  { id: 'cb_status', t: '33kV circuit breaker status (open/closed/intermediate)', req: true },
  { id: 'cb_control', t: '33kV circuit breaker remote control (trip/close with sync-check)', req: true },
  { id: 'prot_trip', t: 'Feeder protection relay trip and alarm signals', req: true },
  { id: 'soe', t: 'Protection SOE timestamping (resolution under 1 ms)', req: true },
  { id: 'rev_meter', t: 'Revenue meter data via DNP3 or Modbus', req: true },
  { id: 'chk_meter', t: 'Check meter data', req: false },
  { id: 'analogs', t: 'Connection point P, Q, V, f analog telemetry', req: true },
  { id: 'setpoints', t: 'NSP remote setpoints and curtailment commands (P/Q)', req: false },
  { id: 'watchdog', t: 'RTU / gateway watchdog status', req: true },
  { id: 'failover', t: 'NSP telecommunications link failover status', req: false }
];
const scopeOpts = [ ['yes', 'In delivered scope'], ['part', 'Partial'], ['no', 'Not in scope'] ];

const OLD_STORE = 'gridproof_state_v2';
const blank = (name) => ({ name, answers: {}, dossier: {}, points: {}, files: [] });
let db = loadDb();
let state = db.profiles[db.active];

function loadDb() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE));
    if (raw && raw.profiles && raw.active && raw.profiles[raw.active]) {
      Object.values(raw.profiles).forEach((p) => { p.points = p.points || {}; p.files = p.files || []; });
      return raw;
    }
  } catch (e) {}
  const first = blank('Assessment 1');
  try { // migrate single assessment from the previous version
    const old = JSON.parse(localStorage.getItem(OLD_STORE));
    if (old) { first.answers = old.answers || {}; first.dossier = old.dossier || {}; first.name = old.dossier && old.dossier.vendor ? old.dossier.vendor : first.name; }
  } catch (e) {}
  const id = 'p' + Date.now();
  return { active: id, profiles: { [id]: first } };
}
function save() { try { localStorage.setItem(STORE, JSON.stringify(db)); } catch (e) {} }
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (id) => document.getElementById(id);

function render() {
  state = db.profiles[db.active];
  renderProfiles();
  $('questions').innerHTML = criteria.map((c) => `
    <div class="criterion" data-id="${c.id}">
      <h3>${esc(c.title)}</h3><p class="desc">${esc(c.desc)}</p>
      <details class="tip"><summary>Auditor tip</summary><p><b>What to ask for:</b> ${esc(c.tip)}</p><p><b>Red flags:</b> ${esc(c.flags)}</p></details>
      ${c.options.map((o, i) => `<label><input type="radio" name="${c.id}" value="${i}" ${state.answers[c.id] === i ? 'checked' : ''}><span>${esc(o.t)}</span></label>`).join('')}
    </div>`).join('');
  $('dossier').innerHTML = fields.map((f) => `
    <div class="field ${f.type === 'area' ? 'wide' : ''}">
      <label for="f_${f.id}">${esc(f.label)}</label>
      ${f.type === 'area' ? `<textarea id="f_${f.id}"></textarea>` : `<input type="text" id="f_${f.id}">`}
    </div>`).join('');
  fields.forEach((f) => {
    const el = $('f_' + f.id);
    el.value = state.dossier[f.id] || '';
    el.addEventListener('input', () => { state.dossier[f.id] = el.value; save(); });
  });
  document.querySelectorAll('#questions input').forEach((r) =>
    r.addEventListener('change', () => { state.answers[r.name] = +r.value; save(); evaluate(); }));
  renderPoints();
  renderFiles();
  evaluate();
}

/* ---------- profiles ---------- */
function renderProfiles() {
  $('profileSelect').innerHTML = Object.entries(db.profiles)
    .map(([id, p]) => `<option value="${id}" ${id === db.active ? 'selected' : ''}>${esc(p.name)}</option>`).join('');
  $('deleteProfile').disabled = Object.keys(db.profiles).length < 2;
}
$('profileSelect').onchange = (e) => { db.active = e.target.value; save(); render(); };
$('newProfile').onclick = () => {
  const name = prompt('Name for the new assessment (vendor and project):', 'Vendor ' + (Object.keys(db.profiles).length + 1));
  if (!name || !name.trim()) return;
  const id = 'p' + Date.now();
  db.profiles[id] = blank(name.trim()); db.active = id; save(); render();
};
$('renameProfile').onclick = () => {
  const name = prompt('Rename assessment:', state.name);
  if (!name || !name.trim()) return;
  state.name = name.trim(); save(); renderProfiles();
};
$('deleteProfile').onclick = () => {
  if (Object.keys(db.profiles).length < 2) return;
  if (!confirm(`Delete "${state.name}" and its evidence log? This cannot be undone.`)) return;
  delete db.profiles[db.active];
  db.active = Object.keys(db.profiles)[0]; save(); render();
};

/* ---------- wizard ---------- */
let step = 0;
function setStep(n) {
  step = Math.max(0, Math.min(4, n));
  document.querySelectorAll('.tabpane').forEach((p) => { p.hidden = p.id !== 'pane-' + step; });
  document.querySelectorAll('.step').forEach((b) => {
    const i = +b.dataset.step;
    if (i === step) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    b.classList.toggle('done', i < step);
  });
  $('backBtn').disabled = step === 0;
  $('nextBtn').hidden = step === 4;
  window.scrollTo(0, 0);
}
document.querySelectorAll('.step').forEach((b) => b.addEventListener('click', () => setStep(+b.dataset.step)));
$('backBtn').onclick = () => setStep(step - 1);
$('nextBtn').onclick = () => setStep(step + 1);

/* ---------- help ---------- */
const SEEN = 'gridproof_help_seen';
function openHelp() { const d = $('helpDialog'); if (!d.open) (d.showModal ? d.showModal() : d.setAttribute('open', '')); }
function closeHelp() { const d = $('helpDialog'); try { localStorage.setItem(SEEN, '1'); } catch (e) {} d.close ? d.close() : d.removeAttribute('open'); }
$('helpBtn').onclick = openHelp;
$('helpClose').onclick = closeHelp;
$('helpDialog').addEventListener('close', () => { try { localStorage.setItem(SEEN, '1'); } catch (e) {} });
$('helpDemo').onclick = () => { closeHelp(); loadDemo('pass'); };

/* ---------- demo data ---------- */
async function sampleHash(text) {
  try { return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))); }
  catch (e) { return 'sample-hash-unavailable-without-secure-context'; }
}
async function loadDemo(kind) {
  const pass = kind === 'pass';
  const p = blank(pass ? 'DEMO: Vendor A, 33kV BESS interconnection' : 'DEMO: Vendor B, rooftop solar');
  p.answers = pass ? { interface: 0, protocols: 0, testing: 0, relationship: 0 } : { interface: 1, protocols: 2, testing: 1, relationship: 2 };
  p.dossier = pass
    ? { vendor: 'Vendor A Controls (sample)', nsp: 'Sample Network Co', project: 'Northfield BESS', capacity: '50 MW / 100 MWh', connpoint: 'NF-33-CB01',
        devices: 'Sample RTU-X; protection relays: sample brand', signoffs: 'FAT-NF-001, SAT-NF-001, ENG-NF-001 (sample references)', notes: 'Sample data for demonstration only.' }
    : { vendor: 'Vendor B Solar Systems (sample)', nsp: 'Sample Network Co', project: 'Rooftop array, 4 sites', capacity: '6 MW', connpoint: '',
        devices: 'Generic PLC and Modbus gateways', signoffs: 'Internal factory test sheet only', notes: 'Sample data for demonstration only.' };
  points.forEach((pt) => { p.points[pt.id] = pass ? 'yes' : (['cb_status', 'analogs', 'rev_meter'].includes(pt.id) ? 'part' : 'no'); });
  const names = pass ? ['SAT-NF-001-signed.pdf', 'NF-33kV-SLD-rev3.pdf'] : ['factory-test-sheet.pdf'];
  for (const n of names) p.files.push({ name: n, size: 184320, type: 'application/pdf', sha256: await sampleHash('DEMO ' + n), addedAt: new Date().toISOString() });
  const id = 'p' + Date.now();
  db.profiles[id] = p; db.active = id; save(); render(); setStep(4);
}
$('demoPass').onclick = () => loadDemo('pass');
$('demoFail').onclick = () => loadDemo('fail');

/* ---------- final report view ---------- */
function renderReport() {
  const r = result(), d = report();
  const scopeLabel = { yes: 'In delivered scope', part: 'Partial', no: 'Not in scope' };
  $('report').innerHTML = `<div class="rep">
    <p><b>${esc(state.name)}</b>: <span class="${r.level}"><b>${esc(r.label)}</b></span>, score ${r.score}%</p>
    <p class="desc">${esc(r.remarks)}</p>
    <h3>Blockers</h3><ul>${r.blockers.length ? r.blockers.map((b) => `<li>${esc(b)}</li>`).join('') : '<li>None</li>'}</ul>
    <h3>Criteria</h3><ul>${d.criteria.map((c) => `<li><b>${esc(c.criterion)}:</b> ${esc(c.selected || 'Not answered')}</li>`).join('')}</ul>
    <h3>Point list</h3><ul>${d.pointList.map((p) => `<li>${esc(p.point)}${p.required ? ' (required)' : ''}: ${esc(scopeLabel[p.scope] || 'Not assessed')}</li>`).join('')}</ul>
    <h3>Evidence files</h3><ul>${d.evidenceFiles.length ? d.evidenceFiles.map((f) => `<li>${esc(f.name)}<br><code>${f.sha256}</code></li>`).join('') : '<li>None logged</li>'}</ul>
  </div>`;
}

/* ---------- point list ---------- */
function pointSummary() {
  const yes = points.filter((p) => state.points[p.id] === 'yes').length;
  const gaps = points.filter((p) => p.req && state.points[p.id] !== 'yes' && state.points[p.id] !== undefined);
  const unset = points.filter((p) => p.req && state.points[p.id] === undefined).length;
  return { yes, gaps, unset };
}
function renderPoints() {
  $('points').innerHTML = points.map((p) => `
    <div class="point">
      <h3>${esc(p.t)}${p.req ? '<span class="req">Required</span>' : ''}</h3>
      <div class="seg">${scopeOpts.map(([v, l]) => `<label><input type="radio" name="pt_${p.id}" value="${v}" ${state.points[p.id] === v ? 'checked' : ''}>${l}</label>`).join('')}</div>
    </div>`).join('');
  document.querySelectorAll('#points input').forEach((r) =>
    r.addEventListener('change', () => { state.points[r.name.slice(3)] = r.value; save(); updatePointSummary(); evaluate(); }));
  updatePointSummary();
}
function updatePointSummary() {
  const s = pointSummary();
  const el = $('pointSummary');
  let msg = `${s.yes} of ${points.length} points in delivered scope.`;
  if (s.gaps.length) msg += ' Required points not fully delivered: ' + s.gaps.map((p) => p.t.split(' (')[0]).join('; ') + '.';
  if (s.unset) msg += ` ${s.unset} required point${s.unset > 1 ? 's' : ''} not yet assessed.`;
  el.textContent = msg;
  el.className = 'pointsummary ' + (s.gaps.length ? 'bad' : s.unset ? 'warn' : 'ok');
}

/* ---------- evidence files ---------- */
const hex = (buf) => Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
const fmtSize = (n) => n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(1) + ' KB' : (n / 1048576).toFixed(2) + ' MB';

async function addFiles(list) {
  if (!(window.crypto && crypto.subtle)) {
    alert('Hashing needs a secure context. Open the app over https:// or http://localhost.');
    return;
  }
  for (const f of list) {
    try {
      const h = hex(await crypto.subtle.digest('SHA-256', await f.arrayBuffer()));
      state.files.push({ name: f.name, size: f.size, type: f.type || 'unknown', sha256: h, addedAt: new Date().toISOString() });
    } catch (e) { alert('Could not read ' + f.name); }
  }
  save(); renderFiles();
}
function renderFiles() {
  $('fileList').innerHTML = state.files.length ? state.files.map((f, i) => `
    <div class="file"><b>${esc(f.name)}</b> (${fmtSize(f.size)})
      <code>SHA-256 ${f.sha256}</code>
      Logged ${esc(new Date(f.addedAt).toLocaleString())}
      <button class="ghost" data-del="${i}">Remove</button></div>`).join('')
    : '<p class="desc" style="margin-top:.8rem">No evidence logged yet.</p>';
  document.querySelectorAll('[data-del]').forEach((b) => b.onclick = () => { state.files.splice(+b.dataset.del, 1); save(); renderFiles(); evaluate(); });
}
const dz = $('dropzone'), fi = $('fileInput');
dz.onclick = () => fi.click();
dz.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fi.click(); } };
fi.onchange = () => { addFiles(Array.from(fi.files)); fi.value = ''; };
['dragenter', 'dragover'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('over'); }));
['dragleave', 'drop'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove('over'); }));
dz.addEventListener('drop', (e) => addFiles(Array.from(e.dataTransfer.files)));

/* ---------- scoring ---------- */
function result() {
  let score = 0; const blockers = []; let answered = 0;
  criteria.forEach((c) => {
    const i = state.answers[c.id];
    if (i === undefined) return;
    answered++; score += c.options[i].p;
  });
  criteria.slice(0, 3).forEach((c) => {
    const i = state.answers[c.id];
    if (i !== undefined && !c.options[i].ok) blockers.push(c.title + ': generic or internal evidence does not satisfy the NSP requirement.');
  });
  const ps = pointSummary();
  ps.gaps.forEach((p) => blockers.push('Point list: ' + p.t.split(' (')[0] + ' is not fully in delivered scope.'));
  let level, label, remarks;
  if (answered < criteria.length) { level = 'warn'; label = 'Incomplete'; remarks = `${answered} of ${criteria.length} criteria answered.`; }
  else if (blockers.length) { level = 'bad'; label = 'High risk'; remarks = 'Critical blocker present. Plant SCADA experience cannot substitute for a named 33kV interface, live protocols, witnessed sign-offs or required demarcation points.'; }
  else if (ps.unset) { level = 'warn'; label = 'Conditional'; remarks = `Criteria pass, but ${ps.unset} required demarcation point${ps.unset > 1 ? 's are' : ' is'} not yet assessed.`; }
  else if (score >= 85) { level = 'ok'; label = 'Grid-ready'; remarks = 'Named interface, in-service protocols, witnessed sign-offs and required demarcation points are all evidenced.'; }
  else { level = 'warn'; label = 'Conditional'; remarks = 'No critical blocker, but a formal NSP pre-qualification review is needed before the procurement gate.'; }
  return { score, blockers, level, label, remarks, answered };
}

function evaluate() {
  const r = result();
  $('score').textContent = r.score + '%';
  $('score').className = 'score ' + r.level;
  $('badge').textContent = r.label;
  $('badge').className = 'badge ' + r.level;
  $('remarks').textContent = r.remarks;
  $('blockers').innerHTML = r.blockers.map((b) => `<li>${esc(b)}</li>`).join('');
  renderReport();
  document.querySelectorAll('.criterion').forEach((el) => {
    const idx = criteria.findIndex((x) => x.id === el.dataset.id), c = criteria[idx], i = state.answers[c.id];
    el.classList.toggle('met', i !== undefined && !!c.options[i].ok);
    el.classList.toggle('blocker', i !== undefined && !c.options[i].ok && idx < 3);
  });
}

/* ---------- export ---------- */
function download(name, type, text) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const slug = () => state.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase();

function report() {
  const r = result();
  return {
    assessment: state.name, evaluatedAt: new Date().toISOString(), score: r.score, status: r.label, remarks: r.remarks, blockers: r.blockers,
    criteria: criteria.map((c) => ({ criterion: c.title, selected: state.answers[c.id] === undefined ? null : c.options[state.answers[c.id]].t })),
    pointList: points.map((p) => ({ point: p.t, required: p.req, scope: state.points[p.id] || null })),
    dossier: state.dossier,
    evidenceFiles: state.files
  };
}

$('exportJson').onclick = () => download(`gridproof-${slug()}-${Date.now()}.json`, 'application/json', JSON.stringify(report(), null, 2));
$('exportMd').onclick = () => {
  const d = report();
  const scopeLabel = { yes: 'In delivered scope', part: 'Partial', no: 'Not in scope' };
  const md = [`# GridProof assessment: ${d.assessment}`, `Date: ${d.evaluatedAt}`, `**Score:** ${d.score}%  |  **Status:** ${d.status}`, d.remarks, '',
    '## Blockers', ...(d.blockers.length ? d.blockers.map((b) => `- ${b}`) : ['- None']), '', '## Criteria',
    ...d.criteria.map((c) => `- **${c.criterion}:** ${c.selected || 'Not answered'}`), '', '## 33kV point list',
    ...d.pointList.map((p) => `- ${p.point}${p.required ? ' (required)' : ''}: ${scopeLabel[p.scope] || 'Not assessed'}`), '', '## Evidence dossier',
    ...fields.map((f) => `- **${f.label}:** ${d.dossier[f.id] || ''}`), '', '## Evidence files (SHA-256)',
    ...(d.evidenceFiles.length ? d.evidenceFiles.map((f) => `- ${f.name} (${fmtSize(f.size)}), logged ${f.addedAt}\n  \`${f.sha256}\``) : ['- None'])].join('\n');
  download(`gridproof-${slug()}-${Date.now()}.md`, 'text/markdown', md);
};
$('printBtn').onclick = () => window.print();
$('resetBtn').onclick = () => {
  if (!confirm(`Clear all answers, point list and evidence log for "${state.name}"?`)) return;
  db.profiles[db.active] = blank(state.name); save(); render();
};

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(console.error));
}
render();
setStep(0);
try { if (!localStorage.getItem(SEEN)) openHelp(); } catch (e) {}
