import { getUser, setUser, removeUser, setToken, removeToken, apiFetch, showToast } from './utils.js';
import { updateUIForUser } from './main.js';

// Реєстрація
document.getElementById('registerForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  const username = document.getElementById('regUsername').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value.trim();
  const errorEl = document.getElementById('registerError');
  errorEl.style.display = 'none';
  if (!username || !email || !password) {
    errorEl.textContent = 'Заповніть усі поля';
    errorEl.style.display = 'block';
    return;
  }
  try {
    await apiFetch('register/', {
      method: 'POST',
      body: JSON.stringify({ username, email, password })
    });
    const tokenResp = await apiFetch('token/', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    setToken(tokenResp.access);
    setUser({ username, email });
    closeModal('registerModal');
    showToast('Реєстрація успішна!');
    updateUIForUser();
    document.getElementById('registerForm').reset();
  } catch (err) {
    errorEl.textContent = err.message || 'Помилка реєстрації';
    errorEl.style.display = 'block';
  }
});

// Вхід
document.getElementById('loginForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  const login = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  const errorEl = document.getElementById('loginError');
  errorEl.style.display = 'none';
  if (!login || !password) {
    errorEl.textContent = 'Введіть логін/email та пароль';
    errorEl.style.display = 'block';
    return;
  }
  try {
    const tokenResp = await apiFetch('token/', {
      method: 'POST',
      body: JSON.stringify({ username: login, password })
    });
    setToken(tokenResp.access);
    setUser({ username: login, email: '' });
    closeModal('loginModal');
    showToast('Вхід виконано!');
    updateUIForUser();
    document.getElementById('loginForm').reset();
  } catch (err) {
    errorEl.textContent = 'Невірний логін або пароль';
    errorEl.style.display = 'block';
  }
});

// Вихід
document.getElementById('logoutBtn').addEventListener('click', function () {
  removeToken();
  removeUser();
  showToast('Ви вийшли');
  updateUIForUser();
  const sidebar = document.getElementById('sidebar');
  if (sidebar.classList.contains('open')) sidebar.classList.remove('open');
});

// Перемикання між модалками
document.getElementById('switchToLogin').addEventListener('click', (e) => {
  e.preventDefault();
  closeModal('registerModal');
  openModal('loginModal');
});
document.getElementById('switchToRegister').addEventListener('click', (e) => {
  e.preventDefault();
  closeModal('loginModal');
  openModal('registerModal');
});

// Відкриття/закриття модалок
document.getElementById('loginBtn').addEventListener('click', () => openModal('loginModal'));
document.getElementById('registerBtn').addEventListener('click', () => openModal('registerModal'));

document.querySelectorAll('.close-modal').forEach(el => {
  el.addEventListener('click', function () {
    closeModal(this.dataset.close);
  });
});
window.addEventListener('click', function (e) {
  if (e.target.classList.contains('modal')) {
    e.target.classList.remove('active');
  }
});

function openModal(id) {
  document.getElementById(id).classList.add('active');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}