import { getUser, showToast } from './utils.js';
import { initMap, goToLocation } from './map.js';
import { renderProfile } from './profile.js';
import { updateSidebarButtons } from './reviews.js';

// Глобально експонуємо деякі функції для інших модулів
window.goToLocation = goToLocation;

export function updateUIForUser() {
  const user = getUser();
  const userInfo = document.getElementById('userInfo');
  const loginBtn = document.getElementById('loginBtn');
  const registerBtn = document.getElementById('registerBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const profileBtn = document.getElementById('profileBtn');

  if (user) {
    userInfo.innerHTML = `👤 <span>${user.username}</span>`;
    loginBtn.style.display = 'none';
    registerBtn.style.display = 'none';
    logoutBtn.style.display = 'inline-block';
    profileBtn.style.display = 'inline-block';
  } else {
    userInfo.innerHTML = '👤 Гість';
    loginBtn.style.display = 'inline-block';
    registerBtn.style.display = 'inline-block';
    logoutBtn.style.display = 'none';
    profileBtn.style.display = 'none';
  }
  updateSidebarButtons();
  const profilePage = document.getElementById('profilePage');
  if (profilePage.classList.contains('active')) {
    if (user) renderProfile();
    else {
      profilePage.classList.remove('active');
      document.getElementById('map').style.display = 'block';
    }
  }
}

// Профіль
document.getElementById('profileBtn').addEventListener('click', function () {
  if (!getUser()) {
    showToast('Увійдіть, щоб переглянути профіль');
    return;
  }
  document.getElementById('profilePage').classList.add('active');
  document.getElementById('map').style.display = 'none';
  renderProfile();
});
document.getElementById('closeProfileBtn').addEventListener('click', function () {
  document.getElementById('profilePage').classList.remove('active');
  document.getElementById('map').style.display = 'block';
});

// Ініціалізація
initMap();
updateUIForUser();