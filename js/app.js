(() => {
  'use strict';

  // ---------- Referencias al DOM ----------
  const form = document.getElementById('taskForm');
  const fields = {
    title: document.getElementById('title'),
    description: document.getElementById('description'),
    category: document.getElementById('category'),
    priority: document.getElementById('priority'),
    dueDate: document.getElementById('dueDate'),
    reference: document.getElementById('reference')
  };
  const titleError = document.getElementById('titleError');
  const dueDateError = document.getElementById('dueDateError');
  const taskList = document.getElementById('taskList');
  const emptyState = document.getElementById('emptyState');
  const filter = document.getElementById('filter');
  const STORAGE_KEY = 'sectask.tasks';
  const SEV_LABEL = { critica: 'Crítica', alta: 'Alta', media: 'Media', baja: 'Baja' };
  const CVE_REGEX = /^CVE-\d{4}-\d{4,}$/i;

  let tasks = loadTasks();

  // ---------- Persistencia (localStorage) ----------
  function loadTasks() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Array.isArray(data) ? data : [];
    } catch { return []; }
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

  function setValidity(input, ok, message, errorEl) {
    input.classList.toggle('is-valid', ok);
    input.classList.toggle('is-invalid', !ok);
    if (!ok && errorEl && message) errorEl.textContent = message;
    return ok;
  }

  // ---------- Validaciones (Tarea 3) ----------
  function validateTitle() {
    const v = fields.title.value.trim();
    if (v.length === 0) return setValidity(fields.title, false, 'El título es obligatorio.', titleError);
    if (v.length < 5) return setValidity(fields.title, false, 'Mínimo 5 caracteres.', titleError);
    if (v.length > 80) return setValidity(fields.title, false, 'Máximo 80 caracteres.', titleError);
    return setValidity(fields.title, true);
  }
  function validateDescription() {
    return setValidity(fields.description, fields.description.value.trim().length <= 250);
  }
  function validateSelect(input) {
    return setValidity(input, input.value !== '');
  }
  function validateDueDate() {
    const v = fields.dueDate.value;
    if (!v) return setValidity(fields.dueDate, false, 'La fecha límite es obligatoria.', dueDateError);
    if (v < todayISO()) return setValidity(fields.dueDate, false, 'La fecha no puede ser anterior a hoy.', dueDateError);
    return setValidity(fields.dueDate, true);
  }
  function validateReference() {
    const v = fields.reference.value.trim();
    if (v === '') { fields.reference.classList.remove('is-valid', 'is-invalid'); return true; }
    return setValidity(fields.reference, CVE_REGEX.test(v));
  }
  function validateAll() {
    // Se ejecutan todas (sin cortocircuito) para marcar todos los errores a la vez
    const results = [
      validateTitle(), validateDescription(),
      validateSelect(fields.category), validateSelect(fields.priority),
      validateDueDate(), validateReference()
    ];
    return results.every(Boolean);
  }

  // Validación en vivo
  fields.title.addEventListener('input', validateTitle);
  fields.description.addEventListener('input', validateDescription);
  fields.category.addEventListener('change', () => validateSelect(fields.category));
  fields.priority.addEventListener('change', () => validateSelect(fields.priority));
  fields.dueDate.addEventListener('change', validateDueDate);
  fields.reference.addEventListener('input', validateReference);

  // ---------- Envío del formulario ----------
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validateAll()) {
      form.querySelector('.is-invalid')?.focus();
      return;
    }
    tasks.unshift({
      id: Date.now(),
      title: fields.title.value.trim(),
      description: fields.description.value.trim(),
      category: fields.category.value,
      priority: fields.priority.value,
      dueDate: fields.dueDate.value,
      reference: fields.reference.value.trim().toUpperCase(),
      done: false
    });
    saveTasks();
    resetForm();
    render();
  });

  function resetForm() {
    form.reset();
    Object.values(fields).forEach(f => f.classList.remove('is-valid', 'is-invalid'));
  }
  form.addEventListener('reset', () => {
    setTimeout(() => Object.values(fields).forEach(f => f.classList.remove('is-valid', 'is-invalid')), 0);
  });

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
    const card = el('article', `task-card sev-${task.priority}${task.done ? ' done' : ''}`);

    const top = el('div', 'd-flex justify-content-between align-items-start gap-2 mb-1');
    top.appendChild(el('h3', 'h6 task-title mb-0', task.title));
    top.appendChild(el('span', `badge badge-sev-${task.priority}`, SEV_LABEL[task.priority]));
    card.appendChild(top);

    if (task.description) card.appendChild(el('p', 'task-desc mb-2', task.description));

    const meta = el('div', 'task-meta d-flex flex-wrap gap-3 mb-3');
    meta.appendChild(el('span', '', `🛡 ${task.category}`));
    meta.appendChild(el('span', '', `⏱ ${task.dueDate}`));
    if (task.reference) meta.appendChild(el('span', 'ref-tag', task.reference));
    card.appendChild(meta);

    const actions = el('div', 'd-flex gap-2');
    const btnDone = el('button', `btn btn-sm ${task.done ? 'btn-outline-warning' : 'btn-outline-success'}`, task.done ? 'Reabrir' : 'Completar');
    btnDone.type = 'button';
    btnDone.addEventListener('click', () => {
      task.done = !task.done;
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
    actions.append(btnDone, btnDelete);
    card.appendChild(actions);

    return card;
  }

  // ---------- Render de la lista ----------
  filter.addEventListener('change', render);

  function render() {
    const mode = filter.value;
    const visible = tasks.filter(t =>
      mode === 'todas' || (mode === 'pendientes' ? !t.done : t.done));

    taskList.replaceChildren(...visible.map(createTaskCard));
    emptyState.classList.toggle('d-none', visible.length > 0);

    const done = tasks.filter(t => t.done).length;
    document.getElementById('countTotal').textContent = tasks.length;
    document.getElementById('countDone').textContent = done;
    document.getElementById('countPending').textContent = tasks.length - done;
  }

  render();
})();