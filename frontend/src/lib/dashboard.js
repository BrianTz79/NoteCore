import { api, requireLogin, logout } from './api.js';

requireLogin();

const DIAS = ['', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
const DIAS_FULL = ['', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
const HOURS = Array.from({ length: 15 }, (_, i) => i + 7);

let subjects = [];
let stats = [];
let absences = [];
let weekOffset = 0;
let currentTab = 'schedule';

// ── Theme ──────────────────────────────────────────────────────────────────
function applyTheme(dark) {
  document.documentElement.classList.toggle('dark', dark);
  document.getElementById('btn-theme').textContent = dark ? '☀️' : '🌙';
  localStorage.setItem('theme', dark ? 'dark' : 'light');
}

const savedTheme = localStorage.getItem('theme');
applyTheme(savedTheme === null ? true : savedTheme === 'dark');

document.getElementById('btn-theme').addEventListener('click', function() {
  applyTheme(!document.documentElement.classList.contains('dark'));
});

// ── Semester selector ──────────────────────────────────────────────────────
function buildSemesters() {
  const now = new Date();
  const year = now.getFullYear();
  const options = [];
  for (let y = year - 1; y <= year + 1; y++) {
    options.push({ label: 'Ene-Jun ' + y, value: y + '-1' });
    options.push({ label: 'Jul-Dic ' + y, value: y + '-2' });
  }
  const sel = document.getElementById('semester-select');
  const month = now.getMonth();
  const currentVal = year + '-' + (month < 6 ? '1' : '2');
  sel.innerHTML = options.map(function(o) {
    return '<option value="' + o.value + '"' + (o.value === currentVal ? ' selected' : '') + '>' + o.label + '</option>';
  }).join('');
}
buildSemesters();

// ── User info ──────────────────────────────────────────────────────────────
const userRaw = localStorage.getItem('user');
if (userRaw) {
  try {
    const u = JSON.parse(userRaw);
    document.getElementById('user-name').textContent = u.nombre;
  } catch (_) {}
}
document.getElementById('btn-logout').addEventListener('click', logout);

// ── Tab navigation (mobile) ────────────────────────────────────────────────
const PANELS = {
  schedule: document.getElementById('panel-schedule'),
  stats: document.getElementById('panel-stats'),
  absences: document.getElementById('panel-absences'),
};

function switchTab(tab) {
  currentTab = tab;
  const isMobile = window.innerWidth < 768;

  if (!isMobile) {
    Object.values(PANELS).forEach(function(p) { p && p.classList.remove('hidden'); });
    const rightPanel = document.getElementById('panel-right');
    if (rightPanel) rightPanel.classList.remove('hidden');
    return;
  }

  // Mobile: show correct panel inside panel-right or the schedule section
  PANELS.schedule.classList.toggle('hidden', tab !== 'schedule');

  const rightPanel = document.getElementById('panel-right');
  rightPanel.classList.remove('hidden');
  rightPanel.classList.toggle('md:flex', false);

  if (tab === 'stats') {
    rightPanel.classList.remove('hidden');
    PANELS.stats.classList.remove('hidden');
    PANELS.absences.classList.add('hidden');
  } else if (tab === 'absences') {
    rightPanel.classList.remove('hidden');
    PANELS.stats.classList.add('hidden');
    PANELS.absences.classList.remove('hidden');
  } else {
    rightPanel.classList.add('hidden');
  }

  document.querySelectorAll('.tab-btn').forEach(function(btn) {
    const active = btn.dataset.tab === tab;
    btn.classList.toggle('text-indigo-600', active);
    btn.classList.toggle('dark:text-indigo-400', active);
    btn.classList.toggle('border-indigo-500', active);
    btn.classList.toggle('text-gray-500', !active);
    btn.classList.toggle('dark:text-gray-400', !active);
    btn.classList.toggle('border-transparent', !active);
  });
}

document.querySelectorAll('.tab-btn').forEach(function(btn) {
  btn.addEventListener('click', function() { switchTab(btn.dataset.tab); });
});

window.addEventListener('resize', function() { switchTab(currentTab); });
switchTab('schedule');

// ── Helpers ────────────────────────────────────────────────────────────────
function timeToMinutes(t) {
  const parts = t.split(':');
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}
function minutesToPct(m) {
  const start = 7 * 60, end = 22 * 60;
  return ((m - start) / (end - start)) * 100;
}
function getWeekDates(offset) {
  const now = new Date();
  const day = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + 1 + offset * 7);
  return Array.from({ length: 6 }, function(_, i) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}
function fmtDate(d) {
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
}
function fmtDateFull(iso) {
  const d = new Date(iso + 'T12:00:00');
  const day = DIAS_FULL[d.getDay() === 0 ? 7 : d.getDay()];
  return day + ', ' + d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}
function isoDate(d) {
  return d.toISOString().split('T')[0];
}
function semaphore(faltas, limite) {
  if (limite <= 0) return { color: 'text-gray-400', icon: '⚪', label: 'Sin limite' };
  const ratio = faltas / limite;
  if (ratio >= 1) return { color: 'text-red-500', icon: '🔴', label: 'Reprobado por faltas' };
  if (ratio >= 0.7) return { color: 'text-yellow-500', icon: '🟡', label: 'Quedan ' + (limite - faltas) + ' falta(s)' };
  return { color: 'text-green-500', icon: '🟢', label: (limite - faltas) + ' faltas disponibles' };
}

// ── Schedule grid ──────────────────────────────────────────────────────────
function buildGrid() {
  const weekDates = getWeekDates(weekOffset);
  const monday = weekDates[0];
  const friday = weekDates[4];
  document.getElementById('week-label').textContent = fmtDate(monday) + ' – ' + fmtDate(friday);

  const header = document.getElementById('grid-header');
  header.innerHTML = '';
  header.style.gridTemplateColumns = '44px repeat(6, 1fr)';
  header.innerHTML = '<div class="py-2 px-1"></div>' +
    weekDates.map(function(d, i) {
      const today = isoDate(new Date()) === isoDate(d);
      return '<div class="py-2 px-1 text-center">' +
        '<div class="font-medium ' + (today ? 'text-indigo-500' : '') + '">' + DIAS[i + 1] + '</div>' +
        '<div class="text-gray-400" style="font-size:9px">' + fmtDate(d) + '</div>' +
        '</div>';
    }).join('');

  const body = document.getElementById('grid-body');
  body.innerHTML = '';
  const relative = document.createElement('div');
  relative.className = 'relative';
  relative.style.display = 'grid';
  relative.style.gridTemplateColumns = '44px repeat(6, 1fr)';

  const timeCol = document.createElement('div');
  timeCol.className = 'relative';
  timeCol.style.height = (HOURS.length * 56) + 'px';
  HOURS.forEach(function(h, i) {
    const label = document.createElement('div');
    label.className = 'absolute text-gray-400 text-right pr-1 w-full';
    label.style.fontSize = '9px';
    label.style.top = (i * 56 - 5) + 'px';
    label.textContent = String(h).padStart(2, '0') + ':00';
    timeCol.appendChild(label);
  });
  relative.appendChild(timeCol);

  for (let dia = 1; dia <= 6; dia++) {
    const col = document.createElement('div');
    col.className = 'relative border-l border-gray-200 dark:border-gray-800';
    col.style.height = (HOURS.length * 56) + 'px';

    HOURS.forEach(function(_, i) {
      const line = document.createElement('div');
      line.className = 'absolute w-full border-t border-gray-100 dark:border-gray-800/50';
      line.style.top = (i * 56) + 'px';
      col.appendChild(line);
    });

    const weekDate = weekDates[dia - 1];
    const dayBlocks = subjects.flatMap(function(s) {
      return (s.bloques || [])
        .filter(function(b) { return b.dia_semana === dia; })
        .map(function(b) { return Object.assign({}, b, { subject: s }); });
    });

    dayBlocks.forEach(function(block) {
      const startMin = timeToMinutes(block.hora_inicio);
      const endMin = timeToMinutes(block.hora_fin);
      const topPct = minutesToPct(startMin);
      const heightPct = minutesToPct(endMin) - topPct;

      const el = document.createElement('div');
      el.className = 'absolute inset-x-0.5 rounded-lg p-1 cursor-pointer hover:brightness-110 transition-all overflow-hidden group';
      el.style.cssText = [
        'top:' + topPct + '%',
        'height:' + Math.max(heightPct, 4) + '%',
        'background-color:' + block.subject.color + '25',
        'border-left:3px solid ' + block.subject.color,
        'color:' + block.subject.color,
      ].join(';');

      const dateStr = isoDate(weekDate);
      const hasAbsence = absences.some(function(a) {
        return a.schedule_block_id === block.id && a.fecha === dateStr;
      });

      // Show name, aula, and time range inside the block
      const startLabel = block.hora_inicio.substring(0, 5);
      const endLabel = block.hora_fin.substring(0, 5);

      let inner = '<div class="font-semibold leading-tight truncate" style="font-size:10px">' + block.subject.nombre + '</div>';
      inner += '<div style="font-size:9px;opacity:0.8">' + startLabel + '-' + endLabel + '</div>';
      if (block.aula) inner += '<div style="font-size:9px;opacity:0.65">' + block.aula + '</div>';
      if (hasAbsence) {
        inner += '<div class="absolute top-0.5 right-0.5 bg-red-500 text-white rounded px-0.5" style="font-size:8px">F</div>';
      }
      inner += '<div class="hidden group-hover:flex absolute bottom-0.5 right-0.5">' +
        '<button class="btn-mark-absent px-1 py-0.5 bg-red-600 text-white rounded" style="font-size:9px"' +
        ' data-subject-id="' + block.subject.id + '"' +
        ' data-block-id="' + block.id + '"' +
        ' data-subject-name="' + block.subject.nombre + '"' +
        ' data-date="' + dateStr + '">Falta</button>' +
        '</div>';
      el.innerHTML = inner;
      col.appendChild(el);
    });

    relative.appendChild(col);
  }

  body.appendChild(relative);

  document.querySelectorAll('.btn-mark-absent').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      openAbsenceModal(btn.dataset.subjectId, btn.dataset.blockId, btn.dataset.subjectName, btn.dataset.date);
    });
  });
}

// ── Stats ──────────────────────────────────────────────────────────────────
function buildStats() {
  const list = document.getElementById('stats-list');
  if (!stats.length) {
    list.innerHTML = '<p class="text-gray-400 text-xs">Sin materias registradas.</p>';
    return;
  }
  list.innerHTML = stats.map(function(s) {
    const limite = parseInt(s.limite_faltas) || 0;
    const faltas = parseInt(s.faltas) || 0;
    const pct = limite > 0 ? Math.min((faltas / limite) * 100, 100) : 0;
    const sem = semaphore(faltas, limite);
    const barColor = pct >= 100 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-green-500';

    let html = '<div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">';
    html += '<div class="flex items-start justify-between mb-1.5"><div class="flex-1 min-w-0">';
    html += '<div class="text-sm font-medium text-gray-900 dark:text-white leading-tight truncate">' + s.nombre + '</div>';
    if (s.paquete) html += '<div class="text-gray-400" style="font-size:11px">' + s.paquete + '</div>';
    html += '</div>';
    html += '<div class="flex items-center gap-1.5 ml-2">';
    html += '<span class="text-base">' + sem.icon + '</span>';
    html += '<button class="btn-edit-subject p-1 text-gray-400 hover:text-indigo-500 rounded" style="font-size:12px" data-id="' + s.id + '" title="Editar">✏️</button>';
    html += '<button class="btn-del-subject p-1 text-gray-400 hover:text-red-400 rounded" style="font-size:12px" data-id="' + s.id + '" title="Eliminar">🗑</button>';
    html += '</div></div>';
    html += '<div class="flex items-center gap-2 mb-1">';
    html += '<div class="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden" style="height:5px">';
    html += '<div class="' + barColor + ' h-full rounded-full transition-all" style="width:' + pct + '%"></div></div>';
    html += '<span class="text-gray-500 whitespace-nowrap" style="font-size:11px">' + faltas + ' / ' + limite + '</span>';
    html += '</div>';
    html += '<p class="' + sem.color + '" style="font-size:11px">' + sem.label + '</p>';
    html += '</div>';
    return html;
  }).join('');

  document.querySelectorAll('.btn-edit-subject').forEach(function(btn) {
    btn.addEventListener('click', function() { openEditModal(btn.dataset.id); });
  });
  document.querySelectorAll('.btn-del-subject').forEach(function(btn) {
    btn.addEventListener('click', async function() {
      if (!confirm('¿Eliminar esta materia y todas sus faltas?')) return;
      await api.subjects.delete(btn.dataset.id);
      await loadAll();
    });
  });
}

// ── Absences list ──────────────────────────────────────────────────────────
function buildAbsencesList() {
  const list = document.getElementById('absences-list');
  if (!absences.length) {
    list.innerHTML = '<p class="text-gray-400 text-xs">Sin faltas registradas.</p>';
    return;
  }
  list.innerHTML = absences.map(function(a) {
    return '<div class="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-xl" data-id="' + a.id + '">' +
      '<div class="w-2 h-2 rounded-full flex-shrink-0" style="background-color:' + a.materia_color + '"></div>' +
      '<div class="flex-1 min-w-0">' +
      '<div class="text-xs font-medium text-gray-900 dark:text-white truncate">' + a.materia_nombre + '</div>' +
      '<div class="text-gray-400" style="font-size:10px">' + fmtDateFull(a.fecha) + '</div>' +
      '</div>' +
      '<div class="flex items-center gap-1">' +
      '<button class="btn-justify px-1.5 py-0.5 rounded text-xs ' + (a.justificada ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' : 'bg-gray-200 dark:bg-gray-700 text-gray-500') + ' hover:opacity-80" data-id="' + a.id + '">' + (a.justificada ? 'Justif.' : 'Pend.') + '</button>' +
      '<button class="btn-del-absence text-gray-400 hover:text-red-400 px-1 text-base leading-none" data-id="' + a.id + '">&times;</button>' +
      '</div></div>';
  }).join('');

  document.querySelectorAll('.btn-justify').forEach(function(btn) {
    btn.addEventListener('click', async function() {
      await api.absences.justificar(btn.dataset.id);
      await loadAll();
    });
  });
  document.querySelectorAll('.btn-del-absence').forEach(function(btn) {
    btn.addEventListener('click', async function() {
      await api.absences.delete(btn.dataset.id);
      await loadAll();
    });
  });
}

// ── Load all ───────────────────────────────────────────────────────────────
async function loadAll() {
  const results = await Promise.all([
    api.subjects.list(),
    api.absences.stats(),
    api.absences.list(),
  ]);
  subjects = results[0];
  stats = results[1];
  absences = results[2];
  buildGrid();
  buildStats();
  buildAbsencesList();
}

// ── Week nav ───────────────────────────────────────────────────────────────
document.getElementById('prev-week').addEventListener('click', function() { weekOffset--; buildGrid(); });
document.getElementById('next-week').addEventListener('click', function() { weekOffset++; buildGrid(); });

// ── Add subject modal ──────────────────────────────────────────────────────
const modalAdd = document.getElementById('modal-add');
const formAdd = document.getElementById('form-add-subject');
const bloquesContainer = document.getElementById('bloques-container');

function makeBloqueRow(container, vals) {
  const row = document.createElement('div');
  row.className = 'bloque-row grid gap-1.5';
  row.style.gridTemplateColumns = '2fr 1fr 1fr 1fr';
  const options = DIAS_FULL.slice(1).map(function(d, i) {
    return '<option value="' + (i + 1) + '"' + (vals && vals.dia_semana === (i + 1) ? ' selected' : '') + '>' + d + '</option>';
  }).join('');
  row.innerHTML = '<select class="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-2 text-xs text-gray-900 dark:text-white">' + options + '</select>' +
    '<input type="time" class="hora-inicio bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-2 text-xs text-gray-900 dark:text-white" value="' + (vals ? vals.hora_inicio.substring(0, 5) : '08:00') + '" />' +
    '<input type="time" class="hora-fin bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-2 text-xs text-gray-900 dark:text-white" value="' + (vals ? vals.hora_fin.substring(0, 5) : '09:00') + '" />' +
    '<div class="flex gap-1">' +
    '<input type="text" class="aula flex-1 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-2 text-xs text-gray-900 dark:text-white placeholder-gray-400 min-w-0" placeholder="Aula" value="' + (vals && vals.aula ? vals.aula : '') + '" />' +
    '<button type="button" class="btn-del-bloque text-gray-400 hover:text-red-400 px-1 text-base leading-none">&times;</button>' +
    '</div>';
  row.querySelector('.btn-del-bloque').addEventListener('click', function() { row.remove(); });
  container.appendChild(row);
}

document.getElementById('btn-add').addEventListener('click', function() { modalAdd.classList.remove('hidden'); });
document.getElementById('btn-cancel-add').addEventListener('click', function() {
  modalAdd.classList.add('hidden');
  formAdd.reset();
  bloquesContainer.querySelectorAll('.bloque-row').forEach(function(el) { el.remove(); });
});
document.getElementById('btn-add-bloque').addEventListener('click', function() { makeBloqueRow(bloquesContainer, null); });

formAdd.addEventListener('submit', async function(e) {
  e.preventDefault();
  const fd = new FormData(formAdd);
  const bloques = Array.from(bloquesContainer.querySelectorAll('.bloque-row')).map(function(row) {
    return {
      dia_semana: parseInt(row.querySelector('select').value),
      hora_inicio: row.querySelector('.hora-inicio').value,
      hora_fin: row.querySelector('.hora-fin').value,
      aula: row.querySelector('.aula').value,
    };
  });
  await api.subjects.create({ nombre: fd.get('nombre'), paquete: fd.get('paquete'), bloques: bloques });
  modalAdd.classList.add('hidden');
  formAdd.reset();
  bloquesContainer.querySelectorAll('.bloque-row').forEach(function(el) { el.remove(); });
  await loadAll();
});

// ── Edit subject modal ─────────────────────────────────────────────────────
const modalEdit = document.getElementById('modal-edit');
const formEdit = document.getElementById('form-edit-subject');
const editBloquesContainer = document.getElementById('edit-bloques-container');

function openEditModal(subjectId) {
  const s = subjects.find(function(x) { return x.id === subjectId; });
  if (!s) return;
  formEdit.elements.id.value = s.id;
  formEdit.elements.nombre.value = s.nombre;
  formEdit.elements.paquete.value = s.paquete || '';
  formEdit.elements.color.value = s.color || '#6366f1';
  editBloquesContainer.querySelectorAll('.bloque-row').forEach(function(el) { el.remove(); });
  (s.bloques || []).forEach(function(b) { makeBloqueRow(editBloquesContainer, b); });
  modalEdit.classList.remove('hidden');
}

document.getElementById('btn-cancel-edit').addEventListener('click', function() {
  modalEdit.classList.add('hidden');
  editBloquesContainer.querySelectorAll('.bloque-row').forEach(function(el) { el.remove(); });
});
document.getElementById('btn-edit-add-bloque').addEventListener('click', function() { makeBloqueRow(editBloquesContainer, null); });

formEdit.addEventListener('submit', async function(e) {
  e.preventDefault();
  const fd = new FormData(formEdit);
  const id = fd.get('id');
  const bloques = Array.from(editBloquesContainer.querySelectorAll('.bloque-row')).map(function(row) {
    return {
      dia_semana: parseInt(row.querySelector('select').value),
      hora_inicio: row.querySelector('.hora-inicio').value,
      hora_fin: row.querySelector('.hora-fin').value,
      aula: row.querySelector('.aula').value,
    };
  });
  await api.subjects.update(id, { nombre: fd.get('nombre'), paquete: fd.get('paquete'), color: fd.get('color'), bloques: bloques });
  modalEdit.classList.add('hidden');
  editBloquesContainer.querySelectorAll('.bloque-row').forEach(function(el) { el.remove(); });
  await loadAll();
});

// ── Clear all subjects ─────────────────────────────────────────────────────
const modalConfirmClear = document.getElementById('modal-confirm-clear');
document.getElementById('btn-clear').addEventListener('click', function() { modalConfirmClear.classList.remove('hidden'); });
document.getElementById('btn-cancel-clear').addEventListener('click', function() { modalConfirmClear.classList.add('hidden'); });
document.getElementById('btn-confirm-clear').addEventListener('click', async function() {
  await api.subjects.deleteAll();
  modalConfirmClear.classList.add('hidden');
  await loadAll();
});

// ── Import JSON modal ──────────────────────────────────────────────────────
const PROMPT_TEXT = 'Actúa como un extractor de datos estructurados. Analiza la imagen adjunta de mi horario universitario. Ignora los elementos de la interfaz de la página web y extrae únicamente la información de las clases. Genera como respuesta exclusivamente un archivo JSON con la siguiente estructura, sin formato Markdown extra ni explicaciones:\n[\n  {\n    "materia": "Nombre de la Materia",\n    "paquete": "07B",\n    "sesiones": [\n      {\n        "dia": "Lunes",\n        "hora_inicio": "15:00",\n        "hora_fin": "16:00",\n        "aula": "91L4"\n      }\n    ]\n  }\n]\nAsegúrate de agrupar todas las sesiones (días y horas) que correspondan a la misma materia dentro del arreglo "sesiones".';
document.getElementById('prompt-text').textContent = PROMPT_TEXT;

const modalImport = document.getElementById('modal-import');
document.getElementById('btn-import').addEventListener('click', function() { modalImport.classList.remove('hidden'); });
document.getElementById('btn-cancel-import').addEventListener('click', function() {
  modalImport.classList.add('hidden');
  document.getElementById('json-input').value = '';
  document.getElementById('import-error').classList.add('hidden');
});
document.getElementById('btn-copy-prompt').addEventListener('click', function() {
  navigator.clipboard.writeText(PROMPT_TEXT);
  const btn = document.getElementById('btn-copy-prompt');
  btn.textContent = '¡Copiado!';
  setTimeout(function() { btn.textContent = 'Copiar'; }, 2000);
});
document.getElementById('btn-do-import').addEventListener('click', async function() {
  const raw = document.getElementById('json-input').value.trim();
  const errEl = document.getElementById('import-error');
  errEl.classList.add('hidden');
  try {
    const materias = JSON.parse(raw);
    if (!Array.isArray(materias)) throw new Error('El JSON debe ser un arreglo de materias');
    await api.subjects.importar(materias);
    modalImport.classList.add('hidden');
    document.getElementById('json-input').value = '';
    await loadAll();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  }
});

// ── Absence modal ──────────────────────────────────────────────────────────
const modalAbsence = document.getElementById('modal-absence');
const formAbsence = document.getElementById('form-absence');

function openAbsenceModal(subjectId, blockId, subjectName, date) {
  formAbsence.elements.subject_id.value = subjectId;
  formAbsence.elements.schedule_block_id.value = blockId;
  formAbsence.elements.fecha.value = date;
  document.getElementById('absence-subject-name').textContent = subjectName;
  modalAbsence.classList.remove('hidden');
}

document.getElementById('btn-cancel-absence').addEventListener('click', function() {
  modalAbsence.classList.add('hidden');
  formAbsence.reset();
});
formAbsence.addEventListener('submit', async function(e) {
  e.preventDefault();
  const fd = new FormData(formAbsence);
  await api.absences.create({
    subject_id: fd.get('subject_id'),
    schedule_block_id: fd.get('schedule_block_id') || null,
    fecha: fd.get('fecha'),
    notas: fd.get('notas') || null,
  });
  modalAbsence.classList.add('hidden');
  formAbsence.reset();
  await loadAll();
  switchTab('absences');
});

loadAll();
