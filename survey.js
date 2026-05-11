// ===================== SUPABASE =====================
const SUPA_URL = 'https://qvmaedmmctuhdfumqcrl.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2bWFlZG1tY3R1aGRmdW1xY3JsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwOTgxNzIsImV4cCI6MjA5MzY3NDE3Mn0.Y3rix9xLkiwtA0xg0o12hYxh4E4cCbk2uIpCnF_LvNI';
const db = supabase.createClient(SUPA_URL, SUPA_KEY);

// ===================== TOAST =====================
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast ' + type;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3200);
}

// ===================== STATE =====================
let userData = {};
let preguntasCargadas = [];

// ===================== LOAD & RENDER SURVEY =====================
async function cargarEncuesta() {
  const loading   = document.getElementById('surveyLoading');
  const container = document.getElementById('surveyQuestions');
  loading.style.display   = 'flex';
  container.style.display = 'none';

  const { data: preguntas, error: ep } = await db
    .from('preguntas').select('*').eq('activa', true).order('orden');
  const { data: opciones,  error: eo } = await db
    .from('opciones').select('*').order('orden');

  if (ep || eo) { showToast('Error al cargar la encuesta', 'error'); return; }

  preguntasCargadas = preguntas.map(p => ({
    ...p,
    opciones: opciones.filter(o => o.pregunta_id === p.id)
  }));

  renderEncuesta();
  loading.style.display   = 'none';
  container.style.display = 'block';
}

function esc(str) {
  return (str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function renderEncuesta() {
  const container = document.getElementById('surveyQuestions');
  container.innerHTML = '';

  preguntasCargadas.forEach((p, idx) => {
    const card = document.createElement('div');
    card.className = 'card';

    const hint = p.tipo === 'multiple' ? '<span class="q-hint">(múltiple)</span>' : '';
    let body = '';

    if (p.tipo === 'multiple') {
      body = `<div class="options-grid" id="qd_${p.id}">
        ${p.opciones.map(o => `
          <label class="opt-item" onclick="toggleCheck(this)">
            <input type="checkbox" value="${esc(o.texto)}">
            <span class="opt-label">${esc(o.texto)}</span>
          </label>`).join('')}
        <label class="opt-item" onclick="toggleOtherDyn(this,'qother_${p.id}')">
          <input type="checkbox" value="__otro__">
          <span class="opt-label">✏️ Otro</span>
          <input type="text" class="opt-other-input" id="qother_${p.id}" placeholder="Especifique..." onclick="event.stopPropagation()">
        </label>
      </div>`;
    } else if (p.tipo === 'unica') {
      body = `<div class="scale-opts" id="qd_${p.id}">
        ${p.opciones.map(o => `
          <button class="scale-btn" onclick="selectScaleDyn(this,'qd_${p.id}')">${esc(o.texto)}</button>
        `).join('')}
      </div>`;
    } else if (p.tipo === 'sino') {
      body = `<div class="yesno" id="qd_${p.id}">
        <button class="yn-btn" onclick="selectYNDyn(this,'si')">👍 Sí, me interesa</button>
        <button class="yn-btn" onclick="selectYNDyn(this,'no')">👎 No, por ahora no</button>
      </div>`;
    }

    card.innerHTML = `
      <div class="q-title"><span class="q-number">${idx+1}</span>${esc(p.texto)} ${hint}</div>
      ${body}`;
    container.appendChild(card);
  });

  // Submit card
  const sc = document.createElement('div');
  sc.className = 'card';
  sc.style.cssText = 'background:var(--verde-pale);border-color:var(--verde);';
  sc.innerHTML = `
    <div class="card-title" style="color:var(--verde-dark);">¡Ya casi terminamos!</div>
    <div class="card-desc">Revisa tus respuestas y envía la encuesta. Tu opinión es muy valiosa.</div>
    <button class="btn-primary" id="submitBtn" onclick="submitSurvey()">✓ Enviar encuesta</button>
    <button class="btn-secondary" onclick="goBackToStep1()">← Volver al inicio</button>`;
  container.appendChild(sc);
}

// ===================== INTERACTIONS =====================
function toggleCheck(label) {
  const cb = label.querySelector('input[type=checkbox]');
  cb.checked = !cb.checked;
  label.classList.toggle('selected', cb.checked);
  updateProgress();
}
function toggleOtherDyn(label, inputId) {
  const cb = label.querySelector('input[type=checkbox]');
  cb.checked = !cb.checked;
  label.classList.toggle('selected', cb.checked);
  const inp = document.getElementById(inputId);
  if (inp) inp.classList.toggle('visible', cb.checked);
  updateProgress();
}
function selectScaleDyn(btn, groupId) {
  document.querySelectorAll('#' + groupId + ' .scale-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  updateProgress();
}
function selectYNDyn(btn, val) {
  btn.closest('.yesno').querySelectorAll('.yn-btn').forEach(b => b.classList.remove('selected-yes','selected-no'));
  btn.classList.add(val === 'si' ? 'selected-yes' : 'selected-no');
  updateProgress();
}
function updateProgress() {
  const total = preguntasCargadas.length;
  let done = 0;
  preguntasCargadas.forEach(p => {
    const grp = document.getElementById('qd_' + p.id);
    if (!grp) return;
    if (p.tipo === 'multiple' && grp.querySelectorAll('input[type=checkbox]:checked').length > 0) done++;
    if (p.tipo === 'unica'    && grp.querySelector('.scale-btn.selected'))                        done++;
    if (p.tipo === 'sino'     && grp.querySelector('.yn-btn.selected-yes,.yn-btn.selected-no'))   done++;
  });
  const pct = total > 0 ? Math.round(done / total * 100) : 0;
  document.getElementById('progFill').style.width = pct + '%';
  document.getElementById('progPct').textContent  = pct + '%';
}

// ===================== NAVIGATION =====================
function goToSurvey() {
  const nombre      = document.getElementById('f_nombre').value.trim();
  const telefono    = document.getElementById('f_telefono').value.trim();
  const correo      = document.getElementById('f_correo').value.trim();
  const profesion   = document.getElementById('f_profesion').value.trim();
  const experiencia = document.getElementById('f_experiencia').value.trim();
  if (!nombre || !telefono || !correo || !profesion || !experiencia) {
    showToast('Por favor completa todos los campos obligatorios (*)', 'error'); return;
  }
  userData = { nombre, telefono, correo, profesion, experiencia, taller: document.getElementById('f_taller').value.trim() };
  document.getElementById('step1').style.display = 'none';
  document.getElementById('step2').style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function goBackToStep1() {
  document.getElementById('step2').style.display = 'none';
  document.getElementById('step1').style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===================== SUBMIT =====================
async function submitSurvey() {
  let allDone = true;
  preguntasCargadas.forEach(p => {
    const grp = document.getElementById('qd_' + p.id);
    if (!grp) return;
    if (p.tipo === 'multiple' && grp.querySelectorAll('input[type=checkbox]:checked').length === 0) allDone = false;
    if (p.tipo === 'unica'    && !grp.querySelector('.scale-btn.selected'))                         allDone = false;
    if (p.tipo === 'sino'     && !grp.querySelector('.yn-btn.selected-yes,.yn-btn.selected-no'))    allDone = false;
  });
  if (!allDone) { showToast('Por favor responde todas las preguntas.', 'error'); return; }

  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Enviando...';

  const respuestas = {};
  preguntasCargadas.forEach(p => {
    const grp = document.getElementById('qd_' + p.id);
    if (!grp) return;
    if (p.tipo === 'multiple') {
      respuestas[p.id] = Array.from(grp.querySelectorAll('input[type=checkbox]:checked')).map(c => {
        if (c.value === '__otro__') {
          const inp = document.getElementById('qother_' + p.id);
          return 'Otro: ' + (inp ? inp.value : '');
        }
        return c.value;
      });
    } else if (p.tipo === 'unica') {
      const sel = grp.querySelector('.scale-btn.selected');
      respuestas[p.id] = sel ? sel.textContent.trim() : '';
    } else if (p.tipo === 'sino') {
      respuestas[p.id] = grp.querySelector('.yn-btn.selected-yes') ? 'Sí' : 'No';
    }
  });

  const { error } = await db.from('respuestas_dinamicas').insert([{
    nombre: userData.nombre, telefono: userData.telefono,
    correo: userData.correo, profesion: userData.profesion,
    experiencia: userData.experiencia, taller: userData.taller || null,
    respuestas
  }]);

  if (error) {
    console.error(error);
    showToast('Error al enviar. Intenta de nuevo.', 'error');
    btn.disabled = false;
    btn.innerHTML = '✓ Enviar encuesta';
    return;
  }
  document.getElementById('step2').style.display   = 'none';
  document.getElementById('thankYou').style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===================== RESTART =====================
function restartSurvey() {
  document.getElementById('thankYou').style.display = 'none';
  document.getElementById('step1').style.display    = 'block';
  ['f_nombre','f_telefono','f_correo','f_profesion','f_experiencia','f_taller']
    .forEach(id => document.getElementById(id).value = '');
  document.getElementById('progFill').style.width = '0%';
  document.getElementById('progPct').textContent  = '0%';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.addEventListener('DOMContentLoaded', cargarEncuesta);
