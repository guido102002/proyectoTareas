class TaskManager {
  constructor() {
    this.tasks = [];
    this.storageKey = 'sectask.tasks';

    this.SEV_LABEL = { critica: 'Crítica', alta: 'Alta', media: 'Media', baja: 'Baja' };
    this.STATUS_LABEL = { pendiente: 'Pendiente', 'en-proceso': 'En proceso', finalizada: 'Finalizada' };

    this.load();
  }

  // ---------- Datos de ejemplo (Tarea 2: cinco tarjetas) ----------
  getSampleTasks() {
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
  normalizeTask(t) {
    const { done, ...rest } = t;
    const status = this.STATUS_LABEL[rest.status] ? rest.status : (done ? 'finalizada' : 'pendiente');
    return { ...rest, status };
  }

  load() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw === null) {
        // Primera visita: se cargan las cinco tareas de ejemplo
        this.tasks = this.getSampleTasks();
        this.save();
        return;
      }
      const data = JSON.parse(raw);
      this.tasks = Array.isArray(data) ? data.map(t => this.normalizeTask(t)) : [];
    } catch {
      this.tasks = this.getSampleTasks();
    }
  }

  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.tasks));
    } catch { /* sin almacenamiento disponible */ }
  }

  // ---------- Gestión de tareas ----------
  // Agrega una tarea al inicio de la lista. Recibe un objeto con los datos ya validados.
  addTask({ title, description, category, priority, status, dueDate, reference }) {
    const task = {
      id: Date.now(),
      title,
      description,
      category,
      priority,
      status,
      dueDate,
      reference: reference || ''
    };
    this.tasks.unshift(task);
    return task;
  }

  // Marca / desmarca una tarea como completada (Tarea 4 · Parte 2)
  toggleTaskStatus(taskId) {
    for (let task of this.tasks) {
      if (task.id === taskId) {
        task.status = task.status === 'finalizada' ? 'pendiente' : 'finalizada';
      }
    }
  }

  // Tarea 6: conserva todas las tareas excepto la que tiene el id recibido
  deleteTask(taskId) {
    const newTasks = [];
    for (let task of this.tasks) {
      if (task.id !== taskId) {
        newTasks.push(task);
      }
    }
    this.tasks = newTasks;
  }

  // ---------- Render ----------
  // Se construye con createElement/textContent (nunca innerHTML con datos del usuario)
  // para evitar inyección de HTML/XSS.
  el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  createTaskHtml(task) {
    const isDone = task.status === 'finalizada';
    const card = this.el('article', `task-card sev-${task.priority}${isDone ? ' done' : ''}`);
    card.dataset.taskId = task.id; // <article data-task-id="...">

    const top = this.el('div', 'd-flex justify-content-between align-items-start gap-2 mb-1');
    const title = this.el('h3', 'h6 task-title mb-0');
    if (isDone) title.appendChild(this.el('span', 'check-icon me-1', '✔'));
    title.appendChild(this.el('span', 'task-title-text', task.title));
    top.appendChild(title);

    const badges = this.el('div', 'd-flex flex-wrap justify-content-end gap-1 flex-shrink-0');
    badges.appendChild(this.el('span', `badge badge-sev-${task.priority}`, this.SEV_LABEL[task.priority]));
    badges.appendChild(this.el('span', `badge badge-status-${task.status}`, this.STATUS_LABEL[task.status]));
    top.appendChild(badges);
    card.appendChild(top);

    if (task.description) card.appendChild(this.el('p', 'task-desc mb-2', task.description));

    const meta = this.el('div', 'task-meta d-flex flex-wrap gap-3 mb-3');
    meta.appendChild(this.el('span', '', `🛡 ${task.category}`));
    meta.appendChild(this.el('span', '', `⏱ ${task.dueDate}`));
    if (task.reference) meta.appendChild(this.el('span', 'ref-tag', task.reference));
    card.appendChild(meta);

    const actions = this.el('div', 'd-flex gap-2');

    // Botón toggle (clase toggle-button para identificarlo desde el listener)
    const btnToggle = this.el(
      'button',
      `toggle-button btn btn-sm ${isDone ? 'btn-outline-warning' : 'btn-outline-success'}`,
      isDone ? '↩ Desmarcar' : '✔ Marcar como completada'
    );
    btnToggle.type = 'button';
    btnToggle.setAttribute('aria-pressed', String(isDone));

    // Botón eliminar (clase delete-button, pedida por la guía)
    const btnDelete = this.el('button', 'delete-button btn btn-sm btn-outline-danger', 'Eliminar');
    btnDelete.type = 'button';

    actions.append(btnToggle, btnDelete);
    card.appendChild(actions);

    return card;
  }

  // Dibuja la lista y actualiza los contadores
  render() {
    const taskList = document.getElementById('taskList');
    const emptyState = document.getElementById('emptyState');
    const mode = document.getElementById('filter').value;

    const visible = this.tasks.filter(t => mode === 'todas' || t.status === mode);

    taskList.replaceChildren(...visible.map(task => this.createTaskHtml(task)));
    emptyState.classList.toggle('d-none', visible.length > 0);

    const count = (status) => this.tasks.filter(t => t.status === status).length;
    document.getElementById('countTotal').textContent = this.tasks.length;
    document.getElementById('countPending').textContent = count('pendiente');
    document.getElementById('countProgress').textContent = count('en-proceso');
    document.getElementById('countDone').textContent = count('finalizada');
  }
}