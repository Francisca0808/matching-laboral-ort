'use strict';

// Datos ficticios: el catálogo real se consultará desde un backend autenticado.
const opportunities = [
  { id: 'demo-1', initials: 'N', title: 'Asistente de marketing digital', company: 'Nexo · Empresa ficticia', modality: 'Híbrida', hours: '20 h semanales', area: 'Marketing', description: 'Participá en campañas digitales, creación de contenido y análisis de resultados junto a un equipo creativo.' },
  { id: 'demo-2', initials: 'P', title: 'Analista de datos junior', company: 'Prisma · Empresa ficticia', modality: 'Remota', hours: '30 h semanales', area: 'Datos', description: 'Transformá información en ideas: colaborá en reportes, visualizaciones y seguimiento de indicadores.' },
  { id: 'demo-3', initials: 'S', title: 'Pasante de administración', company: 'Sur · Empresa ficticia', modality: 'Presencial', hours: '20 h semanales', area: 'Administración', description: 'Sumá experiencia en organización de procesos, atención a clientes y apoyo a la gestión del equipo.' },
];
const saved = new Set();
let currentView = 'all';
let toastTimer;
const grid = document.querySelector('#job-grid');
const dialog = document.querySelector('#profile-dialog');
const form = document.querySelector('#profile-form');
let profileTrigger;

async function checkSupabaseConnection() {
  const status = document.querySelector('#connection-status');
  try {
    const response = await fetch('/api/supabase-status');
    const result = await response.json();
    if (!response.ok || !result.connected) throw new Error();
    status.textContent = '● Base conectada';
    status.style.color = '#4f7936';
  } catch {
    status.textContent = '● Base sin conectar';
    status.style.color = '#a04f45';
  }
}

function notify(message) {
  const toast = document.querySelector('#toast');
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.hidden = false;
  toastTimer = setTimeout(() => { toast.hidden = true; }, 5000);
}

function render() {
  const modality = document.querySelector('#modality').value;
  const visible = opportunities.filter(job => (modality === 'all' || job.modality === modality) && (currentView === 'all' || saved.has(job.id)));
  grid.replaceChildren();
  for (const job of visible) {
    const card = document.createElement('article');
    card.className = 'job-card';
    // Todas las interpolaciones son constantes locales; no se inserta texto del formulario.
    card.innerHTML = `<div class="job-top"><span class="company-icon" aria-hidden="true">${job.initials}</span><span class="sample-label">OFERTA DE EJEMPLO</span></div><h3>${job.title}</h3><p class="company-name">${job.company}</p><div class="job-tags"><span>${job.modality}</span><span>${job.hours}</span><span>${job.area}</span></div><p class="job-description">${job.description}</p><div class="job-footer"><span>Montevideo, Uruguay</span><button class="save-button" type="button" aria-pressed="${saved.has(job.id)}" aria-label="${saved.has(job.id) ? 'Quitar de guardadas' : 'Guardar'}: ${job.title}">${saved.has(job.id) ? 'Guardada ✓' : 'Guardar +'}</button></div>`;
    card.querySelector('button').addEventListener('click', () => {
      if (saved.has(job.id)) { saved.delete(job.id); notify('Oferta quitada de guardadas.'); }
      else { saved.add(job.id); notify('Oferta guardada durante esta visita.'); }
      render();
      const replacement = [...grid.querySelectorAll('article')].find(item => item.querySelector('h3').textContent === job.title);
      if (replacement) replacement.querySelector('button').focus();
      else document.querySelector('[data-view="saved"]').focus();
    });
    grid.append(card);
  }
  document.querySelector('#saved-count').textContent = saved.size;
  document.querySelector('#all-count').textContent = opportunities.length;
  document.querySelector('#empty-state').hidden = visible.length > 0;
}

document.querySelectorAll('[data-view]').forEach(button => {
  button.addEventListener('click', () => {
    currentView = button.dataset.view;
    document.querySelectorAll('[data-view]').forEach(tab => {
      const active = tab.dataset.view === currentView;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-pressed', String(active));
    });
    render();
  });
});
document.querySelector('#modality').addEventListener('change', render);
document.querySelectorAll('[data-open-profile]').forEach(button => {
  button.addEventListener('click', () => {
    profileTrigger = button;
    dialog.showModal();
  });
});
document.querySelector('#close-profile').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => profileTrigger?.focus());
form.addEventListener('submit', event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const name = new FormData(form).get('name').trim();
  dialog.close();
  notify(`${name || 'Tu perfil'}: formulario completado en la demo. La conexión y las recomendaciones reales están pendientes.`);
});
render();
checkSupabaseConnection();
