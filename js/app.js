(() => {
  'use strict';

  // ---------- Referencias al DOM ----------
  const form = document.getElementById('taskForm');
  const fields = {
    title: document.getElementById('title'),
    description: document.getElementById('description'),
    category: document.getElementById('category'),
    priority: document.getElementById('priority'),
    status: document.getElementById('status'),
    dueDate: document.getElementById('dueDate'),
    reference: document.getElementById('reference')
  };
  const FIELD_NAMES = Object.keys(fields);
  const formAlert = document.getElementById('formAlert');
  const formAlertTitle = document.getElementById('formAlertTitle');
  const formAlertList = document.getElementById('formAlertList');
  const taskList = document.getElementById('taskList');
  const emptyState = document.getElementById('emptyState');
  const filter = document.getElementById('filter');

  // ---------- Constantes ----------
  const STORAGE_KEY = 'sectask.tasks';
  const CVE_REGEX = /^CVE-\d{4}-\d{4,}$/i;
  const SEV_LABEL = { critica: 'Crítica', alta: 'Alta', media: 'Media', baja: 'Baja' };
  const STATUS_LABEL = { pendiente: 'Pendiente', 'en-proceso': 'En proceso', finalizada: 'Finalizada' };
  // Qué hace el botón principal de cada tarjeta según su estado actual
  const NEXT_STEP = {
    pendiente: { label: 'Iniciar', next: 'en-proceso', style: 'btn-outline-info' },
    'en-proceso': { label: 'Completar', next: 'finalizada', style: 'btn-outline-success' },
    finalizada: { label: 'Reabrir', next: 'pendiente', style: 'btn-outline-warning' }
  };

  let tasks = loadTasks();

  // ---------- Datos de ejemplo (Tarea 2: cinco tarjetas) ----------
  function getSampleTasks() {
    const base = Date.now();
    return [
      { id: base + 1, title: 'Parchear Log4Shell en producción', description: 'Actualizar las librerías afectadas y validar con un escaneo posterior.', category: 'AppSec / DevSecOps', priority: 'critica', dueDate: '2026-11-12', reference: 'CVE-2021-44228', status: 'en-proceso' },
      { id: base + 2, title: 'Triage de alertas del SIEM', description: 'Clasificar las alertas de las últimas 24 horas y escalar los incidentes confirmados.', category: 'Blue Team / SOC', priority: 'alta', dueDate: '2026-11-09', reference: '', status: 'pendiente' },
      { id: base + 3, title: 'Pentest a la API de pagos', description: 'Probar autenticación, autorización y validación de entradas según OWASP API Top 10.', category: 'Pentesting / Red Team', priority: 'alta', dueDate: '2026-11-20', reference: '', status: 'pendiente' },
      { id: base + 4, title: 'Informe de inteligencia de amenazas', description: 'Resumir las campañas de phishing del mes y sus indicadores de compromiso.', category: 'Threat Intelligence', priority: 'media', dueDate: '2026-11-15', reference: '', status: 'en-proceso' },
      { id: base + 5, title: 'Revisar política de contraseñas', description: 'Comparar la política vigente con los controles ISO 27001 y proponer ajustes.', category: 'GRC / Cumplimiento', priority: 'baja', dueDate: '2026-11-30', reference: '', status: 'finalizada' }
    ];
  }

  // ---------- Persistencia (localStorage) ----------
  // Convierte tareas de versiones anteriores (campo "done") al campo "status".
  function normalizeTask(t) {
    const { done, ...rest } = t;
    const status = STATUS_LABEL[rest.status] ? rest.status : (done ? 'finalizada' : 'pendiente');
    return { ...rest, status };
  }

  function loadTasks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) {
        // Primera visita: se cargan las cinco tareas de ejemplo
        const sample = getSampleTasks();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sample));
        return sample;
      }
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data.map(normalizeTask) : [];
    } catch {
      return getSampleTasks();
    }
  }
  function saveTasks() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); } catch { /* sin almacenamiento */ }
  }

  // ---------- Utilidades ----------
  const todayISO = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };
  fields.dueDate.min = todayISO();

  // ---------- Validación (Tarea 3) ----------
  // Recibe un objeto con los datos del formulario y devuelve { valid, errors }.
  // No toca el DOM: solo decide si los datos son correctos.
  function validFormFieldInput(data) {
    const errors = {};
    const title = (data.title || '').trim();
    const description = (data.description || '').trim();
    const reference = (data.reference || '').trim();

    if (title.length === 0) errors.title = 'El nombre de la tarea no puede estar vacío.';
    else if (title.length < 5) errors.title = 'El nombre debe tener mínimo 5 caracteres.';
    else if (title.length > 80) errors.title = 'El nombre debe tener máximo 80 caracteres.';

    if (description.length === 0) errors.description = 'La descripción no puede estar vacía.';
    else if (description.length > 250) errors.description = 'La descripción debe tener máximo 250 caracteres.';

    if (!data.category) errors.category = 'Selecciona un área.';
    if (!data.priority) errors.priority = 'Selecciona la severidad.';
    if (!data.status) errors.status = 'Selecciona un estado.';

    if (!data.dueDate) errors.dueDate = 'Debes indicar una fecha de entrega.';
    else if (data.dueDate < todayISO()) errors.dueDate = 'La fecha de entrega no puede ser anterior a hoy.';

    if (reference !== '' && !CVE_REGEX.test(reference)) errors.reference = 'El formato esperado es CVE-AAAA-NNNN.';

    return { valid: Object.keys(errors).length === 0, errors };
  }

  // Lee los valores actuales del formulario
  function readFormData() {
    const data = {};
    FIELD_NAMES.forEach(name => { data[name] = fields[name].value; });
    return data;
  }

  // Pinta un campo en verde o rojo según el resultado
  function paintField(name, errors) {
    const input = fields[name];
    const message = errors[name];
    input.classList.toggle('is-invalid', Boolean(message));
    input.classList.toggle('is-valid', !message && input.value.trim() !== '');
    if (message) document.getElementById(`${name}Error`).textContent = message;
  }

  // Muestra la alerta de Bootstrap con la lista de errores
  function showAlert(errors) {
    const messages = Object.values(errors);
    formAlertTitle.textContent = messages.length === 1
      ? 'Hay 1 dato por corregir:'
      : `Hay ${messages.length} datos por corregir:`;
    formAlertList.replaceChildren(...messages.map(msg => {
      const li = document.createElement('li');
      li.textContent = msg;
      return li;
    }));
    formAlert.classList.remove('d-none');
  }
  function hideAlert() {
    formAlert.classList.add('d-none');
    formAlertList.replaceChildren();
  }

  function clearValidation() {
    Object.values(fields).forEach(f => f.classList.remove('is-valid', 'is-invalid'));
    hideAlert();
  }

  // Validación en vivo: al editar un campo se revisa ese campo,
  // y si la alerta está visible, se actualiza (o se oculta si ya todo es válido).
  function validateLive(name) {
    const { errors } = validFormFieldInput(readFormData());
    paintField(name, errors);
    if (!formAlert.classList.contains('d-none')) {
      if (Object.keys(errors).length > 0) showAlert(errors);
      else hideAlert();
    }
  }
  FIELD_NAMES.forEach(name => {
    const input = fields[name];
    const eventName = (input.tagName === 'SELECT' || input.type === 'date') ? 'change' : 'input';
    input.addEventListener(eventName, () => validateLive(name));
  });

  // ---------- Envío del formulario ----------
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const data = readFormData();
    console.log('Datos del formulario:', data); // comprobación de lectura de campos

    const { valid, errors } = validFormFieldInput(data);
    FIELD_NAMES.forEach(name => paintField(name, errors));

    if (!valid) {
      showAlert(errors);
      form.querySelector('.is-invalid')?.focus();
      return;
    }

    hideAlert();
    tasks.unshift({
      id: Date.now(),
      title: data.title.trim(),
      description: data.description.trim(),
      category: data.category,
      priority: data.priority,
      status: data.status,
      dueDate: data.dueDate,
      reference: data.reference.trim().toUpperCase()
    });
    saveTasks();
    resetForm();
    render();
  });

  function resetForm() {
    form.reset();
    clearValidation();
  }
  form.addEventListener('reset', () => setTimeout(clearValidation, 0));

  // ---------- Componente Tarjeta de Tarea (Tarea 2) ----------
  // Se construye con createElement/textContent (nunca innerHTML con datos del usuario)
  // para evitar inyección de HTML/XSS.
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function createTaskCard(task) {
    const card = el('article', `task-card sev-${task.priority}${task.status === 'finalizada' ? ' done' : ''}`);

    const top = el('div', 'd-flex justify-content-between align-items-start gap-2 mb-1');
    top.appendChild(el('h3', 'h6 task-title mb-0', task.title));
    const badges = el('div', 'd-flex flex-wrap justify-content-end gap-1 flex-shrink-0');
    badges.appendChild(el('span', `badge badge-sev-${task.priority}`, SEV_LABEL[task.priority]));
    badges.appendChild(el('span', `badge badge-status-${task.status}`, STATUS_LABEL[task.status]));
    top.appendChild(badges);
    card.appendChild(top);

    if (task.description) card.appendChild(el('p', 'task-desc mb-2', task.description));

    const meta = el('div', 'task-meta d-flex flex-wrap gap-3 mb-3');
    meta.appendChild(el('span', '', `🛡 ${task.category}`));
    meta.appendChild(el('span', '', `⏱ ${task.dueDate}`));
    if (task.reference) meta.appendChild(el('span', 'ref-tag', task.reference));
    card.appendChild(meta);

    const step = NEXT_STEP[task.status];
    const actions = el('div', 'd-flex gap-2');
    const btnStep = el('button', `btn btn-sm ${step.style}`, step.label);
    btnStep.type = 'button';
    btnStep.addEventListener('click', () => {
      task.status = step.next;
      saveTasks();
      render();
    });
    const btnDelete = el('button', 'btn btn-sm btn-outline-danger', 'Eliminar');
    btnDelete.type = 'button';
    btnDelete.addEventListener('click', () => {
      tasks = tasks.filter(t => t.id !== task.id);
      saveTasks();
      render();
    });
    actions.append(btnStep, btnDelete);
    card.appendChild(actions);

    return card;
  }

  // ---------- Render de la lista y los contadores ----------
  filter.addEventListener('change', render);

  function render() {
    const mode = filter.value;
    const visible = tasks.filter(t => mode === 'todas' || t.status === mode);

    taskList.replaceChildren(...visible.map(createTaskCard));
    emptyState.classList.toggle('d-none', visible.length > 0);

    const count = (status) => tasks.filter(t => t.status === status).length;
    document.getElementById('countTotal').textContent = tasks.length;
    document.getElementById('countPending').textContent = count('pendiente');
    document.getElementById('countProgress').textContent = count('en-proceso');
    document.getElementById('countDone').textContent = count('finalizada');
  }

  render();
})();