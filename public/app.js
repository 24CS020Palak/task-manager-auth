const API = '/api';
const $ = (id) => document.getElementById(id);

const getToken = () => localStorage.getItem('token');

function showMessage(text, type = 'error') {
  const el = $('message');
  el.textContent = text; // textContent => safe against XSS
  el.className = `message ${type}`;
  setTimeout(() => el.classList.add('hidden'), 4000);
}

// Central fetch helper: attaches Bearer token, handles 401 (expired/invalid token)
async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (getToken()) headers.Authorization = `Bearer ${getToken()}`;

  const res = await fetch(API + path, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  // Token expired / invalid on a protected request -> back to login
  if (res.status === 401 && getToken()) {
    logout();
    throw new Error(data.message || 'Session expired. Please login again');
  }
  if (!res.ok) {
    const detail = data.errors ? ': ' + data.errors.join(', ') : '';
    throw new Error((data.message || 'Request failed') + detail);
  }
  return data;
}

// ---------- View switching ----------
function showAuth() { $('authView').classList.remove('hidden'); $('taskView').classList.add('hidden'); }
function showTasks() { $('authView').classList.add('hidden'); $('taskView').classList.remove('hidden'); }

function logout() {
  localStorage.removeItem('token'); // logout = clear token from client
  $('taskList').innerHTML = '';
  showAuth();
}

// ---------- Tabs ----------
$('tabLogin').onclick = () => {
  $('loginForm').classList.remove('hidden'); $('registerForm').classList.add('hidden');
  $('tabLogin').classList.add('active'); $('tabRegister').classList.remove('active');
};
$('tabRegister').onclick = () => {
  $('registerForm').classList.remove('hidden'); $('loginForm').classList.add('hidden');
  $('tabRegister').classList.add('active'); $('tabLogin').classList.remove('active');
};

// ---------- Register ----------
$('registerForm').onsubmit = async (e) => {
  e.preventDefault();
  try {
    await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: $('regName').value,
        email: $('regEmail').value,
        password: $('regPassword').value,
      }),
    });
    showMessage('Registered! Please login.', 'success');
    $('registerForm').reset();
    $('tabLogin').click();
  } catch (err) { showMessage(err.message); }
};

// ---------- Login ----------
$('loginForm').onsubmit = async (e) => {
  e.preventDefault();
  try {
    const data = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: $('loginEmail').value, password: $('loginPassword').value }),
    });
    localStorage.setItem('token', data.token);
    $('loginForm').reset();
    await loadApp();
  } catch (err) { showMessage(err.message); }
};

$('logoutBtn').onclick = () => { logout(); showMessage('Logged out', 'success'); };

// ---------- Tasks ----------
async function loadApp() {
  try {
    const { user } = await request('/auth/me');
    $('userInfo').textContent = `Logged in as ${user.name || user.email}`;
    showTasks();
    await loadTasks();
  } catch (err) { showMessage(err.message); }
}

async function loadTasks() {
  const tasks = await request('/tasks');
  const list = $('taskList');
  list.innerHTML = '';
  if (!tasks.length) { list.innerHTML = '<li>No tasks yet.</li>'; return; }

  tasks.forEach((t) => {
    const li = document.createElement('li');
    if (t.status === 'completed') li.classList.add('completed');

    const info = document.createElement('div');
    info.className = 'info';
    const title = document.createElement('div'); title.className = 'title'; title.textContent = t.title;
    const desc = document.createElement('div'); desc.className = 'desc'; desc.textContent = t.description || '';
    info.append(title, desc);

    const actions = document.createElement('div');
    actions.className = 'actions';

    const select = document.createElement('select');
    ['pending', 'in-progress', 'completed'].forEach((s) => {
      const o = document.createElement('option'); o.value = s; o.textContent = s; o.selected = s === t.status;
      select.appendChild(o);
    });
    select.onchange = () => updateTask(t._id, { status: select.value });

    const edit = document.createElement('button'); edit.textContent = 'Edit';
    edit.onclick = () => {
      const newTitle = prompt('New title:', t.title);
      if (newTitle !== null) updateTask(t._id, { title: newTitle });
    };

    const del = document.createElement('button'); del.textContent = 'Delete'; del.className = 'danger';
    del.onclick = () => deleteTask(t._id);

    actions.append(select, edit, del);
    li.append(info, actions);
    list.appendChild(li);
  });
}

$('taskForm').onsubmit = async (e) => {
  e.preventDefault();
  try {
    await request('/tasks', {
      method: 'POST',
      body: JSON.stringify({ title: $('taskTitle').value, description: $('taskDesc').value }),
    });
    $('taskForm').reset();
    await loadTasks();
  } catch (err) { showMessage(err.message); }
};

async function updateTask(id, body) {
  try { await request(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(body) }); await loadTasks(); }
  catch (err) { showMessage(err.message); await loadTasks().catch(() => {}); }
}

async function deleteTask(id) {
  if (!confirm('Delete this task?')) return;
  try { await request(`/tasks/${id}`, { method: 'DELETE' }); await loadTasks(); }
  catch (err) { showMessage(err.message); }
}

// ---------- On page load ----------
if (getToken()) loadApp(); else showAuth();
