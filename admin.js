// ===================== LOCAL USERS =====================
function getUsers() {
  try { return JSON.parse(localStorage.getItem('codemaq_users')) || [{ username:'admin', password:'codemaq2024', role:'Superadmin' }]; }
  catch { return [{ username:'admin', password:'codemaq2024', role:'Superadmin' }]; }
}
function saveUsers(u) { localStorage.setItem('codemaq_users', JSON.stringify(u)); }

// ===================== MODAL LOGIN =====================
function openAdminModal()  { document.getElementById('adminModal').classList.add('open'); }
function closeAdminModal() {
  document.getElementById('adminModal').classList.remove('open');
  document.getElementById('loginError').style.display = 'none';
}
function tryLogin() {
  const u = document.getElementById('adminUser').value.trim();
  const p = document.getElementById('adminPass').value;
  const found = getUsers().find(x => x.username === u && x.password === p);
  if (found) {
    closeAdminModal();
    document.getElementById('surveySection').style.display = 'none';
    document.getElementById('adminPanel').classList.add('open');
    document.getElementById('adminWelcome').textContent = 'Bienvenido, ' + found.username;
    loadAdminData();
  } else {
    document.getElementById('loginError').style.display = 'block';
  }
}
function logout() {
  document.getElementById('adminPanel').classList.remove('open');
  document.getElementById('surveySection').style.display = 'block';
}
function switchTab(tab) {
  ['stats','responses','questions','users'].forEach(t =>
    document.getElementById('tab_' + t).style.display = t === tab ? 'block' : 'none');
  document.querySelectorAll('.atab').forEach((b, i) =>
    b.classList.toggle('active', ['stats','responses','questions','users'][i] === tab));
  if (tab === 'questions') loadQuestionsEditor();
  if (tab === 'users')     renderUsers();
}

// ===================== DATA =====================
let cachedData      = [];
let adminPreguntas  = [];
let adminOpciones   = [];

async function loadAdminData() {
  document.getElementById('statsCards').innerHTML =
    '<div class="stat-card"><div class="stat-num">…</div><div class="stat-label">Cargando</div></div>';

  const { data: resp } = await db.from('respuestas_dinamicas').select('*').order('created_at', { ascending: false });
  const { data: pregs } = await db.from('preguntas').select('*').eq('activa', true).order('orden');
  const { data: opts  } = await db.from('opciones').select('*').order('orden');

  cachedData     = resp   || [];
  adminPreguntas = pregs  || [];
  adminOpciones  = opts   || [];

  renderStats();
  renderResponses();
}

// ===================== STATS =====================
function renderStats() {
  const res = cachedData;
  document.getElementById('statsCards').innerHTML = `
    <div class="stat-card"><div class="stat-num">${res.length}</div><div class="stat-label">Encuestas recibidas</div></div>
    <div class="stat-card"><div class="stat-num">${res.filter(r => { const rv = r.respuestas || {}; return Object.values(rv).some(v => v === 'Sí'); }).length}</div><div class="stat-label">Interesados en capacitación</div></div>
    <div class="stat-card"><div class="stat-num">${adminPreguntas.length}</div><div class="stat-label">Preguntas activas</div></div>
    <div class="stat-card"><div class="stat-num">${new Set(res.map(r=>r.profesion)).size}</div><div class="stat-label">Profesiones distintas</div></div>
  `;
  const area = document.getElementById('chartsArea');
  area.innerHTML = '';
  adminPreguntas.forEach((p, idx) => {
    area.innerHTML += buildChart(p, idx + 1);
  });
}

function buildChart(p, num) {
  const freq = {};
  cachedData.forEach(r => {
    const rv = r.respuestas || {};
    const val = rv[p.id];
    if (!val) return;
    const vals = Array.isArray(val) ? val : [val];
    vals.forEach(v => { if (v) freq[v] = (freq[v] || 0) + 1; });
  });
  if (!Object.keys(freq).length)
    return `<div class="card chart-wrap"><div class="chart-title">${num}. ${esc2(p.texto)}</div><div class="empty-state"><div>📊</div>Sin respuestas aún</div></div>`;
  const max = Math.max(...Object.values(freq), 1);
  const rows = Object.entries(freq).sort((a,b) => b[1]-a[1]).map(([k,v]) => `
    <div class="bar-row">
      <div class="bar-label">${esc2(k).replace(/[\u{1F300}-\u{1FAF8}]/gu,'').trim().slice(0,30)}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.round(v/max*100)}%"></div></div>
      <div class="bar-count">${v}</div>
    </div>`).join('');
  return `<div class="card chart-wrap"><div class="chart-title">${num}. ${esc2(p.texto)}</div>${rows}</div>`;
}
function esc2(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// ===================== RESPONSES =====================
function renderResponses() {
  const tbody = document.getElementById('respBody');
  if (!cachedData.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--texto-muted);padding:32px;">Aún no hay respuestas.</td></tr>';
    return;
  }
  tbody.innerHTML = cachedData.map((r, i) => `
    <tr>
      <td>${i+1}</td>
      <td><strong>${esc2(r.nombre||'')}</strong></td>
      <td>${esc2(r.telefono||'')}</td>
      <td style="font-size:12px;">${esc2(r.correo||'')}</td>
      <td>${esc2(r.profesion||'')}</td>
      <td>${esc2(r.experiencia||'')}</td>
      <td>${esc2(r.taller||'—')}</td>
      <td style="font-size:11px;color:var(--texto-muted);">${r.created_at ? new Date(r.created_at).toLocaleDateString('es-EC') : ''}</td>
    </tr>`).join('');
}

// ===================== QUESTIONS EDITOR =====================
async function loadQuestionsEditor() {
  const el = document.getElementById('questionsEditor');
  el.innerHTML = '<div style="text-align:center;padding:24px;color:var(--texto-muted);">Cargando preguntas…</div>';

  const { data: pregs } = await db.from('preguntas').select('*').order('orden');
  const { data: opts  } = await db.from('opciones').select('*').order('orden');
  adminPreguntas = pregs || [];
  adminOpciones  = opts  || [];

  renderQuestionsEditor();
}

function renderQuestionsEditor() {
  const el = document.getElementById('questionsEditor');
  el.innerHTML = '';

  // Add new question form
  el.innerHTML += `
    <div class="card" style="border:2px dashed var(--verde);background:var(--verde-pale);">
      <div class="card-title" style="color:var(--verde-dark);font-size:16px;">+ Agregar nueva pregunta</div>
      <div class="field" style="margin-top:12px;">
        <label>Texto de la pregunta *</label>
        <input type="text" id="newQText" placeholder="Ej: ¿Qué marca prefiere?">
      </div>
      <div class="field">
        <label>Tipo de pregunta *</label>
        <select id="newQTipo" onchange="toggleNewOpts()">
          <option value="multiple">Selección múltiple</option>
          <option value="unica">Selección única</option>
          <option value="sino">Sí / No</option>
        </select>
      </div>
      <div id="newOptsWrap">
        <label style="font-size:13px;font-weight:600;display:block;margin-bottom:8px;">Opciones de respuesta</label>
        <div id="newOptsList"></div>
        <button class="btn-small" style="margin-top:8px;" onclick="addNewOpt()">+ Agregar opción</button>
      </div>
      <button class="btn-primary" style="margin-top:16px;" onclick="saveNewQuestion()">Guardar pregunta</button>
    </div>`;

  // Existing questions
  adminPreguntas.forEach((p, idx) => {
    const opts = adminOpciones.filter(o => o.pregunta_id === p.id);
    const tipoLabel = { multiple:'Selección múltiple', unica:'Selección única', sino:'Sí / No' }[p.tipo] || p.tipo;
    const optsHTML = p.tipo !== 'sino'
      ? `<div style="margin-top:12px;">
          <div style="font-size:12px;font-weight:700;color:var(--texto-muted);margin-bottom:8px;">OPCIONES</div>
          <div id="opts_${p.id}">
            ${opts.map(o => `
              <div class="opt-edit-row" id="optrow_${o.id}" style="display:flex;gap:8px;align-items:center;margin-bottom:6px;">
                <input type="text" value="${esc2(o.texto)}" id="opttext_${o.id}"
                  style="flex:1;padding:7px 10px;border:1.5px solid var(--crema-dark);border-radius:6px;font-size:13px;font-family:'Plus Jakarta Sans',sans-serif;outline:none;">
                <button onclick="saveOpt('${o.id}','${p.id}')" style="background:var(--verde);color:#fff;border:none;border-radius:6px;padding:7px 12px;font-size:12px;font-weight:700;cursor:pointer;">✓</button>
                <button onclick="deleteOpt('${o.id}','${p.id}')" style="background:none;border:1.5px solid #e74c3c;color:#e74c3c;border-radius:6px;padding:6px 10px;font-size:12px;font-weight:700;cursor:pointer;">✕</button>
              </div>`).join('')}
          </div>
          <button class="btn-small" style="margin-top:6px;font-size:12px;" onclick="addOptToQuestion('${p.id}')">+ Opción</button>
        </div>` : '';

    el.innerHTML += `
      <div class="q-edit-card" id="qcard_${p.id}">
        <div class="q-edit-header">
          <div style="display:flex;align-items:center;gap:10px;flex:1;">
            <span style="background:var(--verde);color:#fff;width:26px;height:26px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;">${idx+1}</span>
            <input type="text" id="qtxt_${p.id}" value="${esc2(p.texto)}"
              style="flex:1;padding:8px 10px;border:1.5px solid var(--crema-dark);border-radius:6px;font-size:14px;font-weight:600;font-family:'Plus Jakarta Sans',sans-serif;outline:none;">
          </div>
          <span class="badge-type">${tipoLabel}</span>
        </div>
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
          <button onclick="saveQuestionText('${p.id}')" class="btn-small">Guardar texto</button>
          <button onclick="deleteQuestion('${p.id}')" class="btn-danger" style="font-size:12px;">Eliminar pregunta</button>
        </div>
        ${optsHTML}
      </div>`;
  });

  toggleNewOpts();
}

// ---- New question form helpers ----
function toggleNewOpts() {
  const tipo = document.getElementById('newQTipo').value;
  document.getElementById('newOptsWrap').style.display = tipo === 'sino' ? 'none' : 'block';
}

let newOptCount = 0;
function addNewOpt() {
  newOptCount++;
  const id = 'newopt_' + newOptCount;
  const div = document.createElement('div');
  div.id = 'newoptrow_' + newOptCount;
  div.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:6px;';
  div.innerHTML = `
    <input type="text" id="${id}" placeholder="Texto de la opción"
      style="flex:1;padding:7px 10px;border:1.5px solid var(--crema-dark);border-radius:6px;font-size:13px;font-family:'Plus Jakarta Sans',sans-serif;outline:none;">
    <button onclick="this.closest('[id^=newoptrow]').remove()"
      style="background:none;border:1.5px solid #e74c3c;color:#e74c3c;border-radius:6px;padding:6px 10px;font-size:12px;font-weight:700;cursor:pointer;">✕</button>`;
  document.getElementById('newOptsList').appendChild(div);
}

async function saveNewQuestion() {
  const texto = document.getElementById('newQText').value.trim();
  const tipo  = document.getElementById('newQTipo').value;
  if (!texto) { showToast('Escribe el texto de la pregunta.', 'error'); return; }

  // Get max orden
  const maxOrden = adminPreguntas.length > 0
    ? Math.max(...adminPreguntas.map(p => p.orden)) + 1 : 1;

  const { data: newP, error: ep } = await db
    .from('preguntas').insert([{ texto, tipo, orden: maxOrden, activa: true }]).select().single();
  if (ep) { showToast('Error al guardar la pregunta.', 'error'); return; }

  // Save options if not sino
  if (tipo !== 'sino') {
    const inputs = document.querySelectorAll('#newOptsList input[type=text]');
    const opts = Array.from(inputs).map((inp, i) => ({
      pregunta_id: newP.id, texto: inp.value.trim(), orden: i + 1
    })).filter(o => o.texto);
    if (opts.length) await db.from('opciones').insert(opts);
  }

  showToast('¡Pregunta guardada correctamente!');
  document.getElementById('newQText').value = '';
  document.getElementById('newOptsList').innerHTML = '';
  loadQuestionsEditor();
}

// ---- Edit existing ----
async function saveQuestionText(id) {
  const texto = document.getElementById('qtxt_' + id).value.trim();
  if (!texto) { showToast('El texto no puede estar vacío.', 'error'); return; }
  const { error } = await db.from('preguntas').update({ texto }).eq('id', id);
  if (error) { showToast('Error al guardar.', 'error'); return; }
  showToast('Pregunta actualizada.');
  loadQuestionsEditor();
}

async function deleteQuestion(id) {
  if (!confirm('¿Eliminar esta pregunta y todas sus opciones?')) return;
  await db.from('preguntas').delete().eq('id', id);
  showToast('Pregunta eliminada.');
  loadQuestionsEditor();
}

async function saveOpt(optId, pregId) {
  const texto = document.getElementById('opttext_' + optId).value.trim();
  if (!texto) { showToast('El texto no puede estar vacío.', 'error'); return; }
  const { error } = await db.from('opciones').update({ texto }).eq('id', optId);
  if (error) { showToast('Error al guardar opción.', 'error'); return; }
  showToast('Opción actualizada.');
  loadQuestionsEditor();
}

async function deleteOpt(optId, pregId) {
  if (!confirm('¿Eliminar esta opción?')) return;
  await db.from('opciones').delete().eq('id', optId);
  showToast('Opción eliminada.');
  loadQuestionsEditor();
}

async function addOptToQuestion(pregId) {
  const texto = prompt('Texto de la nueva opción:');
  if (!texto || !texto.trim()) return;
  const opts = adminOpciones.filter(o => o.pregunta_id === pregId);
  const orden = opts.length > 0 ? Math.max(...opts.map(o => o.orden)) + 1 : 1;
  const { error } = await db.from('opciones').insert([{ pregunta_id: pregId, texto: texto.trim(), orden }]);
  if (error) { showToast('Error al agregar opción.', 'error'); return; }
  showToast('Opción agregada.');
  loadQuestionsEditor();
}

// ===================== USERS =====================
function renderUsers() {
  const users = getUsers();
  document.getElementById('usersList').innerHTML = users.map((u, i) => `
    <div class="user-row">
      <div class="user-info">
        <strong>${u.username}</strong>
        <small>${u.role || 'Admin'}</small>
      </div>
      <div style="display:flex;align-items:center;gap:10px;">
        <span class="badge-role">${u.role || 'Admin'}</span>
        ${i > 0
          ? `<button class="btn-danger" onclick="removeUser(${i})">Eliminar</button>`
          : '<span style="font-size:11px;color:var(--texto-muted);">Principal</span>'}
      </div>
    </div>`).join('');
}
function addUser() {
  const n = document.getElementById('newUserName').value.trim();
  const p = document.getElementById('newUserPass').value.trim();
  if (!n || !p) { showToast('Completa usuario y contraseña.', 'error'); return; }
  const users = getUsers();
  if (users.find(u => u.username === n)) { showToast('Ese usuario ya existe.', 'error'); return; }
  users.push({ username: n, password: p, role: 'Admin' });
  saveUsers(users);
  document.getElementById('newUserName').value = '';
  document.getElementById('newUserPass').value = '';
  renderUsers();
  showToast('Usuario agregado.');
}
function removeUser(i) {
  if (!confirm('¿Eliminar este usuario?')) return;
  const users = getUsers();
  users.splice(i, 1);
  saveUsers(users);
  renderUsers();
  showToast('Usuario eliminado.');
}

// ===================== PDF =====================
function generatePDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation:'p', unit:'mm', format:'a4' });
  const res = cachedData;

  doc.setFillColor(42,125,44); doc.rect(0,0,210,36,'F');
  doc.setTextColor(255,255,255);
  doc.setFont('helvetica','bold'); doc.setFontSize(18);
  doc.text('Melamínicos CODEMAQ', 14, 16);
  doc.setFont('helvetica','normal'); doc.setFontSize(10);
  doc.text('Informe de Resultados de Encuesta', 14, 24);
  doc.text('Generado: ' + new Date().toLocaleDateString('es-EC',{day:'2-digit',month:'long',year:'numeric'}), 14, 31);

  let y = 46;
  doc.setTextColor(42,125,44); doc.setFont('helvetica','bold'); doc.setFontSize(13);
  doc.text('Resumen General', 14, y); y += 8;
  doc.setFont('helvetica','normal'); doc.setFontSize(10); doc.setTextColor(50,50,50);
  doc.text('Total de encuestas: ' + res.length, 14, y); y += 6;
  doc.text('Preguntas activas: ' + adminPreguntas.length, 14, y); y += 12;

  adminPreguntas.forEach((p, idx) => {
    if (y > 265) { doc.addPage(); y = 16; }
    doc.setTextColor(42,125,44); doc.setFont('helvetica','bold'); doc.setFontSize(11);
    const label = (idx+1) + '. ' + p.texto.slice(0,70);
    doc.text(label, 14, y); y += 6;
    const freq = {};
    res.forEach(r => {
      const val = (r.respuestas || {})[p.id];
      if (!val) return;
      const vals = Array.isArray(val) ? val : [val];
      vals.forEach(v => { if (v) freq[v] = (freq[v]||0)+1; });
    });
    const entries = Object.entries(freq).sort((a,b)=>b[1]-a[1]);
    doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(60,60,60);
    if (!entries.length) { doc.text('Sin datos', 18, y); y += 5; return; }
    entries.forEach(([k,v]) => {
      if (y > 272) { doc.addPage(); y = 16; }
      const clean = k.replace(/[^\w\s\-$.,áéíóúñÁÉÍÓÚÑ]/g,'').trim().slice(0,55);
      doc.text('• ' + clean + ': ' + v + ' respuesta' + (v!==1?'s':''), 18, y); y += 5;
    });
    y += 4;
  });

  // Respondents
  if (res.length) {
    doc.addPage(); y = 16;
    doc.setTextColor(42,125,44); doc.setFont('helvetica','bold'); doc.setFontSize(13);
    doc.text('Listado de Encuestados', 14, y); y += 10;
    doc.setFontSize(8);
    doc.text('Nombre',14,y); doc.text('Teléfono',70,y); doc.text('Correo',110,y); doc.text('Profesión',160,y);
    y += 4; doc.setDrawColor(42,125,44); doc.line(14,y,196,y); y += 4;
    doc.setFont('helvetica','normal'); doc.setTextColor(50,50,50);
    res.forEach(r => {
      if (y > 275) { doc.addPage(); y = 16; }
      doc.text((r.nombre||'').slice(0,22),14,y);
      doc.text((r.telefono||'').slice(0,14),70,y);
      doc.text((r.correo||'').slice(0,22),110,y);
      doc.text((r.profesion||'').slice(0,18),160,y);
      y += 5;
    });
  }

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFillColor(42,125,44); doc.rect(0,287,210,10,'F');
    doc.setTextColor(255,255,255); doc.setFontSize(8);
    doc.text('Melamínicos CODEMAQ · Encuesta de necesidades', 14, 293);
    doc.text('Página ' + i + ' de ' + pages, 172, 293);
  }
  doc.save('codemaq-resultados-' + new Date().toISOString().slice(0,10) + '.pdf');
  showToast('PDF generado y descargado.');
}
