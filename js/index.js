(() => {
  'use strict';

  // ---------- Instancia de TaskManager ----------
  // taskManager.js se carga antes que este archivo, por eso la clase ya existe.
  const taskManager = new TaskManager();
  console.log(taskManager.tasks);

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
  const filter = document.getElementById('filter');

  // ---------- Constantes ----------
  const CVE_REGEX = /^CVE-\d{4}-\d{4,}$/i;

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

  // ---------- Envío del formulario (agregar tarea) ----------
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const data = readFormData();
    const { valid, errors } = validFormFieldInput(data);
    FIELD_NAMES.forEach(name => paintField(name, errors));

    if (!valid) {
      showAlert(errors);
      form.querySelector('.is-invalid')?.focus();
      return;
    }

    hideAlert();
    taskManager.addTask({
      title: data.title.trim(),
      description: data.description.trim(),
      category: data.category,
      priority: data.priority,
      status: data.status,
      dueDate: data.dueDate,
      reference: data.reference.trim().toUpperCase()
    });
    taskManager.save();
    taskManager.render();
    resetForm();
  });

  function resetForm() {
    form.reset();
    clearValidation();
  }
  form.addEventListener('reset', () => setTimeout(clearValidation, 0));

  // ---------- Listener de click de la Lista de Tareas ----------
  // Un solo listener (delegación de eventos) para todos los botones de las tarjetas.
  taskList.addEventListener('click', (event) => {
    // Tarea 4 · Parte 2: marcar / desmarcar como completada
    if (event.target.classList.contains('toggle-button')) {
      const parentTask = event.target.closest('[data-task-id]');
      const taskId = Number(parentTask.dataset.taskId);
      taskManager.toggleTaskStatus(taskId);
      taskManager.save();
      taskManager.render();
    }

    // Tarea 6: eliminar una tarea
    if (event.target.classList.contains('delete-button')) {
      const parentTask = event.target.closest('[data-task-id]'); // el <article> que tiene data-task-id
      const taskId = Number(parentTask.dataset.taskId);          // el dataset llega como texto
      taskManager.deleteTask(taskId);
      taskManager.save();
      taskManager.render();
    }
  });

  // ---------- Filtro de la lista ----------
  filter.addEventListener('change', () => taskManager.render());

  // ---------- Render inicial ----------
  taskManager.render();
})();