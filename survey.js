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

// ===================== SURVEY INTERACTIONS =====================
let userData = {};

function toggleCheck(label) {
  const cb = label.querySelector('input[type=checkbox]');
  cb.checked = !cb.checked;
  label.classList.toggle('selected', cb.checked);
  updateProgress();
}

function toggleOther(label, inputId) {
  const cb = label.querySelector('input[type=checkbox]');
  cb.checked = !cb.checked;
  label.classList.toggle('selected', cb.checked);
  const inp = document.getElementById(inputId);
  if (inp) inp.classList.toggle('visible', cb.checked);
  updateProgress();
}

function selectScale(btn, groupId) {
  document.querySelectorAll('#' + groupId + ' .scale-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  updateProgress();
}

function selectYN(btn, val) {
  document.querySelectorAll('.yn-btn').forEach(b => b.classList.remove('selected-yes', 'selected-no'));
  btn.classList.add(val === 'si' ? 'selected-yes' : 'selected-no');
  updateProgress();
}

function updateProgress() {
  let done = 0;
  [1, 2, 3, 5, 6, 8].forEach(n => {
    if (document.querySelectorAll('#q' + n + ' input[type=checkbox]:checked').length > 0) done++;
  });
  [4, 7].forEach(n => {
    if (document.querySelector('#q' + n + ' .scale-btn.selected')) done++;
  });
  if (document.querySelector('.yn-btn.selected-yes,.yn-btn.selected-no')) done++;
  const pct = Math.round(done / 9 * 100);
  document.getElementById('progFill').style.width = pct + '%';
  document.getElementById('progPct').textContent = pct + '%';
}

function getChecked(groupId) {
  return Array.from(document.querySelectorAll('#' + groupId + ' input[type=checkbox]:checked')).map(c => c.value);
}

// ===================== NAVIGATION =====================
function goToSurvey() {
  const nombre     = document.getElementById('f_nombre').value.trim();
  const telefono   = document.getElementById('f_telefono').value.trim();
  const correo     = document.getElementById('f_correo').value.trim();
  const profesion  = document.getElementById('f_profesion').value.trim();
  const experiencia = document.getElementById('f_experiencia').value.trim();

  if (!nombre || !telefono || !correo || !profesion || !experiencia) {
    showToast('Por favor completa todos los campos obligatorios (*)', 'error');
    return;
  }
  userData = {
    nombre, telefono, correo, profesion, experiencia,
    taller: document.getElementById('f_taller').value.trim()
  };
  document.getElementById('step1').style.display = 'none';
  document.getElementById('step2').style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goBackToStep1() {
  document.getElementById('step2').style.display = 'none';
  document.getElementById('step1').style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===================== SUBMIT TO SUPABASE =====================
async function submitSurvey() {
  const q4el = document.querySelector('#q4 .scale-btn.selected');
  const q7el = document.querySelector('#q7 .scale-btn.selected');
  const q9el = document.querySelector('.yn-btn.selected-yes,.yn-btn.selected-no');

  if (!q4el || !q7el || !q9el || getChecked('q1').length === 0) {
    showToast('Por favor responde todas las preguntas antes de enviar.', 'error');
    return;
  }

  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Enviando...';

  const record = {
    nombre:      userData.nombre,
    telefono:    userData.telefono,
    correo:      userData.correo,
    profesion:   userData.profesion,
    experiencia: userData.experiencia,
    taller:      userData.taller || null,
    q1:          getChecked('q1'),
    q1_other:    document.getElementById('q1_other').value || null,
    q2:          getChecked('q2'),
    q2_other:    document.getElementById('q2_other').value || null,
    q3:          getChecked('q3'),
    q3_other:    document.getElementById('q3_other').value || null,
    q4:          q4el.textContent,
    q5:          getChecked('q5'),
    q5_other:    document.getElementById('q5_other').value || null,
    q6:          getChecked('q6'),
    q7:          q7el.textContent,
    q8:          getChecked('q8'),
    q8_other:    document.getElementById('q8_other').value || null,
    q9:          document.querySelector('.yn-btn.selected-yes') ? 'Sí' : 'No',
  };

  const { error } = await db.from('encuestas').insert([record]);

  if (error) {
    console.error(error);
    showToast('Error al enviar. Verifica tu conexión e intenta de nuevo.', 'error');
    btn.disabled = false;
    btn.innerHTML = '✓ Enviar encuesta';
    return;
  }

  document.getElementById('step2').style.display = 'none';
  document.getElementById('thankYou').style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===================== RESTART =====================
function restartSurvey() {
  document.getElementById('thankYou').style.display = 'none';
  document.getElementById('step1').style.display = 'block';
  ['f_nombre','f_telefono','f_correo','f_profesion','f_experiencia','f_taller']
    .forEach(id => document.getElementById(id).value = '');
  document.querySelectorAll('.opt-item').forEach(l => {
    l.classList.remove('selected');
    const cb = l.querySelector('input[type=checkbox]');
    if (cb) cb.checked = false;
  });
  document.querySelectorAll('.opt-other-input').forEach(i => { i.classList.remove('visible'); i.value = ''; });
  document.querySelectorAll('.scale-btn').forEach(b => b.classList.remove('selected'));
  document.querySelectorAll('.yn-btn').forEach(b => b.classList.remove('selected-yes','selected-no'));
  document.getElementById('progFill').style.width = '0%';
  document.getElementById('progPct').textContent = '0%';
  document.getElementById('submitBtn').disabled = false;
  document.getElementById('submitBtn').innerHTML = '✓ Enviar encuesta';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
