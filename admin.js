// ===================== LOCAL USERS =====================
function getUsers() {
  try {
    return JSON.parse(localStorage.getItem('codemaq_users')) ||
      [{ username: 'admin', password: 'codemaq2024', role: 'Superadmin' }];
  } catch {
    return [{ username: 'admin', password: 'codemaq2024', role: 'Superadmin' }];
  }
}
function saveUsers(u) { localStorage.setItem('codemaq_users', JSON.stringify(u)); }

// ===================== MODAL =====================
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
    renderQuestions();
    renderUsers();
  } else {
    document.getElementById('loginError').style.display = 'block';
  }
}

function logout() {
  document.getElementById('adminPanel').classList.remove('open');
  document.getElementById('surveySection').style.display = 'block';
}

function switchTab(tab) {
  ['stats','responses','questions','users'].forEach(t => {
    document.getElementById('tab_' + t).style.display = t === tab ? 'block' : 'none';
  });
  document.querySelectorAll('.atab').forEach((b, i) => {
    b.classList.toggle('active', ['stats','responses','questions','users'][i] === tab);
  });
}

// ===================== LOAD DATA =====================
let cachedData = [];

async function loadAdminData() {
  document.getElementById('statsCards').innerHTML =
    '<div class="stat-card"><div class="stat-num">…</div><div class="stat-label">Cargando datos</div></div>';

  const { data, error } = await db.from('encuestas').select('*').order('created_at', { ascending: false });
  if (error) { showToast('Error al cargar datos de Supabase', 'error'); return; }
  cachedData = data || [];
  renderStats(cachedData);
  renderResponses(cachedData);
}

// ===================== STATS =====================
function renderStats(res) {
  const interes = res.filter(r => r.q9 === 'Sí').length;
  document.getElementById('statsCards').innerHTML = `
    <div class="stat-card"><div class="stat-num">${res.length}</div><div class="stat-label">Encuestas recibidas</div></div>
    <div class="stat-card"><div class="stat-num">${interes}</div><div class="stat-label">Interesados en capacitación</div></div>
    <div class="stat-card"><div class="stat-num">${topValue(res,'q4')}</div><div class="stat-label">Rango de compra frecuente</div></div>
    <div class="stat-card"><div class="stat-num">${topValue(res,'q7')}</div><div class="stat-label">Riel más utilizado</div></div>
  `;
  const area = document.getElementById('chartsArea');
  area.innerHTML = '';
  [
    { field:'q1', title:'Materia prima utilizada',        multi:true  },
    { field:'q2', title:'Problemas al comprar',           multi:true  },
    { field:'q3', title:'Beneficios percibidos',          multi:true  },
    { field:'q4', title:'Promedio de compras semanales',  multi:false },
    { field:'q5', title:'Mejoras deseadas en el servicio',multi:true  },
    { field:'q6', title:'Bisagras más utilizadas',        multi:true  },
    { field:'q7', title:'Rieles más utilizados',          multi:false },
    { field:'q8', title:'Tornillos más utilizados',       multi:true  },
    { field:'q9', title:'Interés en capacitaciones',      multi:false },
  ].forEach(q => area.innerHTML += buildChart(res, q.field, q.title, q.multi));
}

function topValue(res, field) {
  if (!res.length) return '—';
  const freq = {};
  res.forEach(r => {
    const v = Array.isArray(r[field]) ? r[field] : [r[field]];
    v.forEach(x => { if (x) freq[x] = (freq[x] || 0) + 1; });
  });
  const top = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
  if (!top) return '—';
  return top[0].length > 12 ? top[0].slice(0, 12) + '…' : top[0];
}

function buildChart(res, field, title, isMulti) {
  const freq = {};
  res.forEach(r => {
    const vals = isMulti ? (r[field] || []) : [r[field]];
    vals.forEach(v => { if (v) freq[v] = (freq[v] || 0) + 1; });
  });
  if (!Object.keys(freq).length)
    return `<div class="card chart-wrap"><div class="chart-title">${title}</div><div class="empty-state"><div>📊</div>Sin datos aún</div></div>`;
  const max = Math.max(...Object.values(freq), 1);
  const rows = Object.entries(freq).sort((a, b) => b[1] - a[1]).map(([k, v]) => {
    const label = k.replace(/[\u{1F300}-\u{1FAF8}]/gu, '').trim().slice(0, 28);
    return `<div class="bar-row">
      <div class="bar-label">${label}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.round(v / max * 100)}%"></div></div>
      <div class="bar-count">${v}</div>
    </div>`;
  }).join('');
  return `<div class="card chart-wrap"><div class="chart-title">${title}</div>${rows}</div>`;
}

// ===================== RESPONSES TABLE =====================
function renderResponses(res) {
  const tbody = document.getElementById('respBody');
  if (!res.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--texto-muted);padding:32px;">Aún no hay respuestas en Supabase.</td></tr>';
    return;
  }
  tbody.innerHTML = res.map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${r.nombre || ''}</strong></td>
      <td>${r.telefono || ''}</td>
      <td style="font-size:12px;">${r.correo || ''}</td>
      <td>${r.profesion || ''}</td>
      <td>${r.experiencia || ''}</td>
      <td>${r.taller || '—'}</td>
      <td style="font-size:11px;color:var(--texto-muted);">${r.created_at ? new Date(r.created_at).toLocaleDateString('es-EC') : ''}</td>
    </tr>`).join('');
}

// ===================== QUESTIONS =====================
const QUESTIONS_DEF = [
  { n:1, text:'¿Qué tipo de materia prima utiliza?',                                 type:'Múltiple selección' },
  { n:2, text:'¿Qué problemas ha tenido al comprar estos productos?',                 type:'Múltiple selección' },
  { n:3, text:'¿Cuáles son los mayores beneficios al trabajar con estos productos?',  type:'Múltiple selección' },
  { n:4, text:'¿Cuál es su promedio de compras semanales?',                           type:'Selección única'    },
  { n:5, text:'¿Qué le gustaría que mejore en el servicio de corte y canteado?',      type:'Múltiple selección' },
  { n:6, text:'¿Qué tipo de bisagras usa con más frecuencia?',                        type:'Múltiple selección' },
  { n:7, text:'¿Qué tipo de rieles para cajones usa con más frecuencia?',             type:'Selección única'    },
  { n:8, text:'¿Qué medidas de tornillos utiliza con más frecuencia?',                type:'Múltiple selección' },
  { n:9, text:'¿Le gustaría asistir a capacitaciones?',                               type:'Sí / No'            },
];

function renderQuestions() {
  document.getElementById('questionsEditor').innerHTML = QUESTIONS_DEF.map(q => `
    <div class="q-edit-card">
      <div class="q-edit-header">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="background:var(--verde);color:#fff;width:26px;height:26px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;">${q.n}</span>
          <span class="q-edit-text">${q.text}</span>
        </div>
        <span class="badge-type">${q.type}</span>
      </div>
    </div>`).join('');
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
  showToast('Usuario agregado correctamente.');
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
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const res = cachedData;

  // Header
  doc.setFillColor(42, 125, 44);
  doc.rect(0, 0, 210, 36, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18);
  doc.text('Melamínicos CODEMAQ', 14, 16);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  doc.text('Informe de Resultados de Encuesta', 14, 24);
  doc.text('Generado: ' + new Date().toLocaleDateString('es-EC', { day:'2-digit', month:'long', year:'numeric' }), 14, 31);

  let y = 46;
  doc.setTextColor(42, 125, 44); doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
  doc.text('Resumen General', 14, y); y += 8;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(50, 50, 50);
  doc.text('Total de encuestas: ' + res.length, 14, y); y += 6;
  doc.text('Interesados en capacitación: ' + res.filter(r => r.q9 === 'Sí').length, 14, y); y += 12;

  // Per-question breakdown
  const qs = [
    { label:'1. Materia prima',          field:'q1', multi:true  },
    { label:'2. Problemas al comprar',   field:'q2', multi:true  },
    { label:'3. Beneficios',             field:'q3', multi:true  },
    { label:'4. Promedio de compras',    field:'q4', multi:false },
    { label:'5. Mejoras deseadas',       field:'q5', multi:true  },
    { label:'6. Bisagras',               field:'q6', multi:true  },
    { label:'7. Rieles',                 field:'q7', multi:false },
    { label:'8. Tornillos',              field:'q8', multi:true  },
    { label:'9. Interés capacitación',   field:'q9', multi:false },
  ];

  qs.forEach(q => {
    if (y > 265) { doc.addPage(); y = 16; }
    doc.setTextColor(42, 125, 44); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text(q.label, 14, y); y += 6;
    const freq = {};
    res.forEach(r => {
      const vals = q.multi ? (r[q.field] || []) : [r[q.field]];
      vals.forEach(v => { if (v) freq[v] = (freq[v] || 0) + 1; });
    });
    const entries = Object.entries(freq).sort((a, b) => b[1] - a[1]);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(60, 60, 60);
    if (!entries.length) { doc.text('Sin datos', 18, y); y += 5; return; }
    entries.forEach(([k, v]) => {
      if (y > 272) { doc.addPage(); y = 16; }
      const clean = k.replace(/[^\w\s\-$.,áéíóúñÁÉÍÓÚÑ]/g, '').trim().slice(0, 60);
      doc.text('• ' + clean + ': ' + v + ' respuesta' + (v !== 1 ? 's' : ''), 18, y);
      y += 5;
    });
    y += 4;
  });

  // Respondents list
  if (res.length) {
    doc.addPage(); y = 16;
    doc.setTextColor(42, 125, 44); doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
    doc.text('Listado de Encuestados', 14, y); y += 10;
    doc.setFontSize(8);
    doc.text('Nombre', 14, y); doc.text('Teléfono', 70, y); doc.text('Correo', 110, y); doc.text('Profesión', 160, y);
    y += 4; doc.setDrawColor(42, 125, 44); doc.line(14, y, 196, y); y += 4;
    doc.setFont('helvetica', 'normal'); doc.setTextColor(50, 50, 50);
    res.forEach(r => {
      if (y > 275) { doc.addPage(); y = 16; }
      doc.text((r.nombre    || '').slice(0, 22), 14,  y);
      doc.text((r.telefono  || '').slice(0, 14), 70,  y);
      doc.text((r.correo    || '').slice(0, 22), 110, y);
      doc.text((r.profesion || '').slice(0, 18), 160, y);
      y += 5;
    });
  }

  // Footer on every page
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFillColor(42, 125, 44); doc.rect(0, 287, 210, 10, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(8);
    doc.text('Melamínicos CODEMAQ · Encuesta de necesidades', 14, 293);
    doc.text('Página ' + i + ' de ' + pages, 172, 293);
  }

  doc.save('codemaq-resultados-' + new Date().toISOString().slice(0, 10) + '.pdf');
  showToast('PDF generado y descargado.');
}
